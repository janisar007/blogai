// KeywordSuggest.jsx
import React, { useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import InPageNavigation from "./inpage-navigation.component";
import GeminiResultViewer from "./gemini-result.component";

export default function KeywordSuggest({
  seoWrapper,
  setSeoWrapper,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [des, setDes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleBlogDesChange = (e) => {
    let input = e.target;

    setDes(input.value);
  };

  const fetchSuggestions = async () => {
    if (!des || des.length < 0) {
      return toast.error("write your description first!");
    }
    setLoading(true);

    let loadingToast = toast.loading("Fetching related trending keywords!");
    try {
      const res = await axios.post(
        import.meta.env.VITE_SERVER_DOMAIN + "/get-keywords",
        { text: des, locale: "IN", max: 30 }
      );
      setSuggestions(res.data.suggestions || []);

      toast.dismiss(loadingToast);
      toast.success("Got it!");
    } catch (err) {
      console.error(err);
      toast.dismiss(loadingToast);
      toast.error("Something is not right. can't fetch keywords!");
    } finally {
      setLoading(false);
    }
  };

  const copyWord = (suggestion) => {
    navigator.clipboard.writeText(suggestion);

    toast.success(`${suggestion} copied !`);
  };

  return (
    <div
      className={
        "max-sm:w-[80%] fixed " +
        (seoWrapper
          ? "top-[5.8rem] sm:right-0"
          : "top-[100%] sm:right-[-100%]") +
        " duration-700 max-sm:right-0 sm:top-[5.8rem] w-[75%] min-w-[350px] h-[100%] z-50 bg-white shadow-2xl p-8 px-16 overflow-y-auto overflow-x-hidden"
      }
    >
      <Toaster />

      <InPageNavigation
        routes={["Improve SEO with Gemini", "Trending Keywrods"]}
        defaultActiveIndex={0}
      >
        <div>
          <button
            onClick={() => setSeoWrapper((prev) => !prev)}
            className="absolute top-0 right-4 flex justify-center items-center w-12 h-12 rounded-full bg-grey"
          >
            <i className="fi fi-br-cross text-2xl mt-1"></i>
          </button>

          <div className="p-4">
            <GeminiResultViewer setSeoWrapper={setSeoWrapper}/>
          </div>
        </div>

        <>
          <button
            onClick={() => setSeoWrapper((prev) => !prev)}
            className="absolute top-0 right-4 flex justify-center items-center w-12 h-12 rounded-full bg-grey"
          >
            <i className="fi fi-br-cross text-2xl mt-1"></i>
          </button>
          <div className="p-4 rounded relative">
            <textarea
              maxLength={500}
              placeholder="Write blog description"
              defaultValue={des}
              className="h-40 resize-none leading-7 input-box pl-4"
              onChange={handleBlogDesChange}
              // onKeyDown={handleDesKeyDown}
            ></textarea>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchSuggestions}
                className="px-3 py-1 bg-blue-600 text-white rounded"
              >
                Suggest keywords
              </button>
              {loading && <span>Loading…</span>}
            </div>

            <div className="mt-3">
              {suggestions.length === 0 && (
                <div className="text-sm text-gray-500">No suggestions yet</div>
              )}
              <ul>
                {suggestions.map((s, idx) => (
                  <li key={idx} className="py-1">
                    <button
                      onClick={() => copyWord(s.suggestion)}
                      className="text-left w-full"
                    >
                      <strong>{s.suggestion}</strong>
                      <span className="ml-2 text-xs text-gray-500">
                        score: {s.score}
                      </span>
                      <div className="text-xs text-gray-400">
                        seeds: {s.seeds.join(", ")}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      </InPageNavigation>
    </div>
  );
}
