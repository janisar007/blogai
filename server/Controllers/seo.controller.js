import axios from "axios";
import nlp from "compromise";
import googleTrends from "google-trends-api";

import { GoogleGenerativeAI } from "@google/generative-ai";

function parseLocale(locale) {
  // Accepts: "en", "en-US", "en_US", "hi-IN", "IN"
  if (!locale) return {};
  const norm = String(locale).replace("_", "-").trim();
  const parts = norm.split("-");
  const lang = parts[0].toLowerCase() || undefined; // e.g. "en"
  const region = parts[1] ? parts[1].toUpperCase() : undefined; // e.g. "IN"
  // Bing often expects "en-US" style for mkt; google-trends wants country code like "IN"
  const mkt = parts[1] ? `${parts[0]}-${parts[1]}` : undefined; // "en-US"
  const geo = region; // "IN" or undefined
  return { lang, region, mkt, geo };
}

function extractSeeds(text, maxSeeds = 6) {
  const doc = nlp(text || "");
  const nounPhrases = doc.nouns().out("array");
  const uniq = Array.from(
    new Set(nounPhrases.map((s) => s.trim()).filter(Boolean))
  );
  return uniq.slice(0, maxSeeds);
}

async function googleSuggest(query, localeOptions = {}) {
  const url = "https://suggestqueries.google.com/complete/search";
  const params = { client: "firefox", q: query };
  if (localeOptions.lang) params.hl = localeOptions.lang; // language e.g., "en"
  if (localeOptions.region) params.gl = localeOptions.region; // country e.g., "IN"
  const res = await axios.get(url, {
    params,
    headers: { "User-Agent": "Mozilla/5.0" },
    timeout: 5000,
  });
  const data = res.data;
  if (Array.isArray(data) && Array.isArray(data[1])) return data[1];
  return [];
}

async function bingSuggest(query, localeOptions = {}) {
  const url = "http://api.bing.com/osjson.aspx";
  const params = { query };
  // If we have mkt (like 'en-US'), pass it — Bing will try to localize suggestions
  if (localeOptions.mkt) params.mkt = localeOptions.mkt;
  try {
    const res = await axios.get(url, { params, timeout: 5000 });
    const data = res.data;
    if (Array.isArray(data) && Array.isArray(data[1])) return data[1];
  } catch (err) {
    // ignore, return empty
  }
  return [];
}

async function trendsFor(keyword, localeOptions = {}) {
  try {
    // google-trends-api accepts {keyword, geo} where geo is country code like "IN"
    const opts = { keyword };
    if (localeOptions.geo) opts.geo = localeOptions.geo;
    const related = await googleTrends.relatedQueries(opts);
    const parsed = JSON.parse(related);
    let relatedQueries = [];
    try {
      const rankedLists = parsed.default && parsed.default.rankedList;
      if (Array.isArray(rankedLists) && rankedLists.length) {
        const top = rankedLists[0].rankedKeyword || [];
        relatedQueries = top.map((r) => r.query);
      }
    } catch (e) {}
    return { relatedQueries };
  } catch (err) {
    return { relatedQueries: [] };
  }
}

export const getKeywords = async (req, res) => {
  const { text = "", locale = "", max = 25 } = req.body;
  if (!text || text.trim().length < 10)
    return res.status(400).json({ error: "Provide a draft with enough text" });

  try {
    const localeOptions = parseLocale(locale); // <-- use locale here
    const seeds = extractSeeds(text, 6);
    if (!seeds.length) {
      seeds.push(...text.split(/\s+/).slice(0, 3));
    }

    const suggestionMap = new Map();

    for (const seed of seeds) {
      // pass localeOptions into each helper
      const [gSuggestions, bSuggestions, trends] = await Promise.all([
        googleSuggest(seed, localeOptions),
        bingSuggest(seed, localeOptions),
        trendsFor(seed, localeOptions),
      ]);

      const combined = Array.from(
        new Set([
          ...(gSuggestions || []),
          ...(bSuggestions || []),
          ...(trends.relatedQueries || []),
        ])
      );

      combined.forEach((s, idx) => {
        const key = s.toLowerCase();
        const baseScore = 100 - idx;
        const trendBoost = (trends.relatedQueries || []).includes(s) ? 30 : 0;
        if (!suggestionMap.has(key)) {
          suggestionMap.set(key, {
            suggestion: s,
            score: baseScore + trendBoost,
            seeds: [seed],
          });
        } else {
          const obj = suggestionMap.get(key);
          obj.score += baseScore + trendBoost;
          if (!obj.seeds.includes(seed)) obj.seeds.push(seed);
          suggestionMap.set(key, obj);
        }
      });
    }

    const sorted = Array.from(suggestionMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, max);

    return res.json({ locale: localeOptions, seeds, suggestions: sorted });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err });
  }
};

export const improveBlogWithAI = async (req, res) => {
  const { editorJsData, description, keywords } = req.body;

  if (!editorJsData || !description) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const prompt = `
You are an SEO strategist, content writer, and editor.  
You are given a blog written in **EditorJS JSON format**.  
You must transform this into a **new, highly valuable blog** while preserving EditorJS compatibility.  

### Inputs:
- Blog Description: ${description}
- Blog Content (EditorJS JSON): ${JSON.stringify(editorJsData)}

### Instructions:
1. Carefully analyze the Blog Description to **extract the most relevant, trending, and high-volume SEO keywords/phrases**. Do NOT rely on user-provided keywords.  
2. Use the original blog as a **reference only**, then create an enhanced blog that is:  
   - More detailed and **knowledge-driven**  
   - **Human-readable** (no robotic tone)  
   - **SEO-friendly** (keywords should be naturally placed, not stuffed)  
   - Properly formatted with headings, subheadings, lists, paragraphs, highlights and code blocks.  
3. Keep the **EditorJS JSON structure intact**. Do NOT change block types unnecessarily.  
   - Expand with new blocks only where it adds real value (e.g., new heading, list, or paragraph).  
   - Improve existing text for clarity, engagement, and depth.  
4. Make the blog highly **valuable for readers** by answering questions they might have around the topic, adding examples, comparisons, or extra insights.  
5. At the end, generate **5–7 FAQs** that are helpful, natural, and relevant.  
   - These FAQs must also be in **EditorJS JSON block format** (so they can be directly rendered).  
   - Use heading for the FAQ title and then paragraph/list blocks for Q&A.  
6. Return the result in **strict JSON format** with two keys:  
   {
     "optimizedBlog": <Enhanced EditorJS JSON>,
     "faq": <EditorJS JSON containing FAQs as blocks>
   }
`;

  const geminiApiKey = process.env.GEMINI_API_KEY;

  const gemini = new GoogleGenerativeAI(geminiApiKey);

  const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });

  // Pass prompt as plain string
  const result = await model.generateContent(prompt);
  const response = await result.response;

  try {
    let text = response.text() || "{}";
    text = text.replace(/```json|```/g, "").trim();
    const finalResult = JSON.parse(text);

    return res.status(200).json(finalResult);
  } catch (err) {
    console.error("Failed to parse Gemini response:", err);
    return res.status(500).json({ error: err.message });
  }
};
