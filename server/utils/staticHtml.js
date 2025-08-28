export const generateBlogHTML = (title, banner, tags, des, blog_id, publishedAt, personal_info, content) => {

    const blogContentHTML = blocksToHTML(content.blocks);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- Primary SEO Meta Tags -->
  <title>${title}</title>
  <meta name="description" content="${des}" />
  <meta name="keywords" content="${tags.join(", ")}" />
  <meta name="author" content="${personal_info.fullname}" />

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${des}" />
  <meta property="og:image" content="${banner}" />
  <meta property="og:url" content="https://yourdomain.com/blog/${
    blog_id
  }" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${des}" />
  <meta name="twitter:image" content="${banner}" />

  <!-- Schema.org BlogPosting -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "${title}",
    "description": "${des}",
    "image": "${banner}",
    "author": {
      "@type": "Person",
      "name": "${personal_info.fullname}"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Your Blog Name",
      "logo": {
        "@type": "ImageObject",
        "url": "https://yourdomain.com/logo.png"
      }
    },
    "datePublished": "${publishedAt}",
    "dateModified": "${publishedAt}"
  }
  </script>
</head>
<body>
  <article>
    <header>
      <h1>${title}</h1>
      <p>By <span>${
        "blog.author.personal_info.fullname"
      }</span> on <time datetime="${publishedAt}">${new Date(publishedAt).toDateString()}</time></p>
      <img src="${banner}" alt="${title}" />
    </header>

    <section>
      ${blogContentHTML}
    </section>

    <footer>
      <p><strong>Tags:</strong> ${tags
        .map((tag) => `<a href="/tag/${tag}">${tag}</a>`)
        .join(", ")}</p>
    </footer>
  </article>
</body>
</html>
  `;
};


function blocksToHTML(blocks) {
  return blocks.map(block => {
    switch (block.type) {
      case "header":
        return `<h${block.data.level}>${block.data.text}</h${block.data.level}>`;

      case "paragraph":
        return `<p>${block.data.text}</p>`;

      case "quote":
        return `<blockquote>${block.data.text}<footer>${block.data.caption || ""}</footer></blockquote>`;

      case "list":
        const items = block.data.items.map(i => `<li>${i}</li>`).join("");
        return block.data.style === "ordered"
          ? `<ol>${items}</ol>`
          : `<ul>${items}</ul>`;

      case "codeBox":
        return `<pre><code>${block.data.code}</code></pre>`;

      case "image":
        return `<figure>
                  <img src="${block.data.file.url}" alt="${block.data.caption || "Blog image"}" />
                  ${block.data.caption ? `<figcaption>${block.data.caption}</figcaption>` : ""}
                </figure>`;

      default:
        return "";
    }
  }).join("\n");
}
