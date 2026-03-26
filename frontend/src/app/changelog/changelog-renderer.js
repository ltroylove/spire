import * as util from "util";

export function renderChangelogMarkdown(markdownRaw) {
  let source = markdownRaw || "";

  const youTubeSplit = source.split("[![](https://img.youtube.com/vi/");
  youTubeSplit.forEach((entry) => {
    if (entry.includes("/0.jpg)](https://www.youtube.com")) {
      const videoCodeSplit = entry.split("/0.jpg");
      if (videoCodeSplit.length > 0) {
        const videoCode = videoCodeSplit[0].trim();
        source = source.replace(
          util.format("[![](https://img.youtube.com/vi/%s/0.jpg)](https://www.youtube.com/watch?v=%s)", videoCode, videoCode),
          util.format('<div class="container"><iframe allow="autoplay" class="video lazy-video" data-src="https://www.youtube.com/embed/%s?mute=1&showinfo=0&controls=0&modestbranding=1&rel=0&loop=1&showsearch=0&iv_load_policy=3&playlist=%s" title="YouTube video player" frameborder="0" allowfullscreen></iframe></div>\n', videoCode, videoCode)
        );
      }
    }
  });

  const md = require("markdown-it")({
    html: true,
    xhtmlOut: false,
    breaks: true,
    typographer: false,
    linkify: true
  });

  source = md.render(source);
  source = source.replaceAll(
    "img src=",
    "img class='lazy-image lazy-image-unloaded' src='data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==' data-src="
  );

  return "<div>" + source + "</div>";
}

export function decorateChangelogDom(root) {
  if (!root) {
    return;
  }

  const anchors = root.getElementsByTagName("a");
  for (let i = 0; i < anchors.length; i++) {
    anchors[i].setAttribute("target", "_blank");
  }

  root.querySelectorAll("h1, h2, h3, h4").forEach(($heading) => {
    const id = $heading.getAttribute("id") ||
      $heading.innerText
        .toLowerCase()
        .replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, "")
        .replace(/ +/g, "-");

    $heading.setAttribute("id", id);
    $heading.classList.add("anchor-heading");

    if (!$heading.querySelector(".anchor-link")) {
      const $anchor = document.createElement("a");
      $anchor.className = "anchor-link";
      $anchor.href = "#" + id;
      $anchor.innerText = " # ";
      $anchor.style.color = "#666";
      $heading.append($anchor);
    }
  });

  root.querySelectorAll("table").forEach((table) => {
    if (!table.classList.contains("eq-table")) {
      table.classList.add("eq-table");
      table.classList.add("bordered");
    }

    const parent = table.parentElement;
    if (parent && parent.classList.contains("changelog-table-wrapper")) {
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "eq-window-simple mt-3 mb-3 p-0 changelog-table-wrapper";
    wrapper.style.overflowY = "hidden";

    if (parent) {
      parent.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    }
  });
}
