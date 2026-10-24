import { escapeHtml, safeUrl } from "./firebase.js";
import { badgesHtml } from "./badges.js";
import { ytThumb, createBgPlayer } from "./youtube.js";

const ICONS = {
  github: '<path d="M12 .5a12 12 0 00-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 016 0C17.3 4.6 18.3 5 18.3 5c.7 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.1 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0012 .5z" fill="currentColor"/>',
  link: '<path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" fill="none" stroke="currentColor" stroke-width="2"/>'
};

function hexToRgb(h) {
  const m = /^#?([0-9a-f]{6})$/i.exec(h || "");
  if (!m) return "168,85,247";
  const n = parseInt(m[1], 16);
  return `${n >> 16},${(n >> 8) & 255},${n & 255}`;
}

// Render kartu profil (dipakai di halaman publik & preview dashboard)
export function renderCard(el, p, { previewVideo = false } = {}) {
  const accent = /^#[0-9a-f]{6}$/i.test(p.accent || "") ? p.accent : "#a855f7";
  const rgb = hexToRgb(accent);
  el.style.setProperty("--a1", accent);
  el.style.boxShadow = `0 40px 120px -30px rgba(${rgb},.6), inset 0 1px 0 rgba(255,255,255,.1)`;

  const name = escapeHtml(p.displayName || p.username || "");
  const initial = escapeHtml((p.displayName || p.username || "?").trim().charAt(0).toUpperCase());
  const avatar = p.avatar
    ? `<img src="${escapeHtml(safeUrl(p.avatar))}" alt="">`
    : `<div>${initial}</div>`;

  const links = (p.links || []).filter((l) => l && l.url).map((l) => {
    const isGh = /github\.com/i.test(l.url);
    return `<a class="lnk" href="${escapeHtml(safeUrl(l.url))}" target="_blank" rel="noopener nofollow" style="display:flex;align-items:center;justify-content:center;gap:8px">
      <svg viewBox="0 0 24 24" width="16" height="16">${isGh ? ICONS.github : ICONS.link}</svg>${escapeHtml(l.title || l.url)}</a>`;
  }).join("");

  el.innerHTML = `
    <div class="views"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>${Number(p.views || 0).toLocaleString("id-ID")}</div>
    <div class="ava" style="background:linear-gradient(135deg,${accent},#ec4899);box-shadow:0 0 40px rgba(${rgb},.6)">${avatar}</div>
    <h3>${name}<span class="badges">${badgesHtml(p.badges)}</span></h3>
    <div style="color:var(--mute);font-size:.85rem;margin-top:2px">@${escapeHtml(p.username || "")}</div>
    <p class="bio">${escapeHtml(p.bio || "")}</p>
    ${links || '<p style="color:#5f5a72;font-size:.85rem">Belum ada link.</p>'}`;

  // Preview video YouTube di dalam kartu (dipakai dashboard) — memakai thumbnail agar ringan
  const yid = p.bgYoutube || "";
  el.classList.toggle("has-video", previewVideo && !!yid);
  el.style.setProperty("--vblur", blurPx(p.bgBlur));
  if (previewVideo && yid) {
    const t = document.createElement("div");
    t.className = "preview-video";
    t.style.backgroundImage = `url("${ytThumb(yid)}")`;
    el.prepend(t);
  }
  if (previewVideo) {
    const o = document.createElement("div");
    o.className = "preview-overlay";
    o.style.background = overlayCss(p);
    el.prepend(o);
    if (yid) el.prepend(el.querySelector(".preview-video"));
  }


  const img = el.querySelector(".ava img");
  if (img) img.addEventListener("error", () => {
    const d = document.createElement("div");
    d.textContent = (p.displayName || p.username || "?").trim().charAt(0).toUpperCase();
    img.replaceWith(d);
  });
}

// Backdrop: lapisan warna dengan transparansi yang diatur anggota
export function overlayCss(p) {
  const c = /^#[0-9a-f]{6}$/i.test(p.overlayColor || "") ? p.overlayColor : "#000000";
  const op = Number.isFinite(+p.overlayOpacity) ? Math.max(0, Math.min(100, +p.overlayOpacity)) : 35;
  return `rgba(${hexToRgb(c)},${op / 100})`;
}

export function applyOverlay(container, p) {
  let o = container.querySelector(":scope > .profile-overlay");
  if (!o) { o = document.createElement("div"); o.className = "profile-overlay"; container.prepend(o); }
  o.style.background = overlayCss(p);
  return o;
}

export function blurPx(v) {
  const n = Number.isFinite(+v) ? Math.max(0, Math.min(20, +v)) : 6;
  return n + "px";
}

// Video YouTube layar penuh, di tengah, dengan efek blur (halaman profil publik).
// Mengembalikan controller pemutar (lihat createBgPlayer) atau false.
export function applyVideoBg(container, p) {
  const id = p.bgYoutube || "";
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return false;
  const wrap = document.createElement("div");
  wrap.className = "profile-video" + (p.videoShape === "portrait" ? " portrait" : "");
  wrap.style.setProperty("--vblur", blurPx(p.bgBlur));
  wrap.style.backgroundImage = `url("${ytThumb(id)}")`; // tampil selama video dimuat
  const vig = document.createElement("div");
  vig.className = "profile-vignette";
  container.prepend(wrap, vig);
  const vol = Number.isFinite(+p.videoVolume) ? Math.max(0, Math.min(100, +p.videoVolume)) : 50;
  const ctrl = createBgPlayer(wrap, id, { volume: vol });
  ctrl.wrap = wrap;
  return ctrl;
}

export function applyBg(el, url) {
  if (!el) return;
  el.style.backgroundImage = url ? `url("${safeUrl(url).replace(/"/g, "%22")}")` : "";
}
