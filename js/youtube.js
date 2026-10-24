// Video background dari YouTube.
// Menerima link watch, youtu.be, shorts, embed, live, atau ID 11 karakter.

export function youtubeId(input = "") {
  const s = String(input).trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  let u;
  try { u = new URL(s.includes("://") ? s : "https://" + s); } catch { return ""; }
  const host = u.hostname.replace(/^(www|m|music)\./, "");
  let id = "";
  if (host === "youtu.be") id = u.pathname.split("/")[1] || "";
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch") id = u.searchParams.get("v") || "";
    else {
      const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/);
      if (m) id = m[1];
    }
  }
  return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : "";
}

export const ytThumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

export function ytEmbedUrl(id) {
  const p = new URLSearchParams({
    autoplay: "1", mute: "1", loop: "1", playlist: id, controls: "0", disablekb: "1",
    fs: "0", iv_load_policy: "3", modestbranding: "1", playsinline: "1", rel: "0", showinfo: "0"
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${p}`;
}

export function ytIframe(id, className) {
  const f = document.createElement("iframe");
  f.className = className;
  f.src = ytEmbedUrl(id);
  f.title = "Video background";
  f.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture");
  f.setAttribute("tabindex", "-1");
  f.setAttribute("aria-hidden", "true");
  f.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
  f.loading = "eager";
  return f;
}
