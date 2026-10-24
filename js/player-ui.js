// Pemutar mini kaca-blur di halaman profil: play/pause, mute, volume, judul video.
// Volume pilihan pengunjung diingat di browser masing-masing.

const ICON = {
  play: '<path d="M8 5v14l11-7z" fill="currentColor"/>',
  pause: '<path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/>',
  vol0: '<path d="M4 9v6h4l5 5V4L8 9z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  vol1: '<path d="M4 9v6h4l5 5V4L8 9z" fill="currentColor"/><path d="M16 9.5a3.5 3.5 0 010 5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',
  vol2: '<path d="M4 9v6h4l5 5V4L8 9z" fill="currentColor"/><path d="M16 9.5a3.5 3.5 0 010 5M18.5 7a7 7 0 010 10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>'
};
const svg = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;
const KEY = "bohye.volume";
const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

export function savedVolume(fallback) {
  try { const v = localStorage.getItem(KEY); return v === null ? fallback : Math.max(0, Math.min(100, +v)); } catch (_) { return fallback; }
}

export function mountPlayer(ctrl, { accent = "#a855f7" } = {}) {
  const el = document.createElement("div");
  el.className = "mini-player";
  el.style.setProperty("--pa", accent);
  el.innerHTML = `
    <button class="mp-btn" data-act="toggle" aria-label="Putar/jeda">${svg("pause")}</button>
    <div class="mp-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <div class="mp-title"><span>Memuat video…</span></div>
    <button class="mp-btn" data-act="mute" aria-label="Bisukan">${svg("vol2")}</button>
    <input class="mp-vol" type="range" min="0" max="100" step="1" aria-label="Volume">`;
  document.body.append(el);
  if (isIOS()) el.classList.add("ios"); // iOS: volume diatur tombol fisik, slider disembunyikan

  const $ = (s) => el.querySelector(s);
  const vol = $(".mp-vol");
  const sync = () => {
    const v = ctrl.getVolume(), muted = ctrl.isMuted() || v === 0;
    $('[data-act="toggle"]').innerHTML = svg(ctrl.isPlaying() ? "pause" : "play");
    $('[data-act="mute"]').innerHTML = svg(muted ? "vol0" : v < 50 ? "vol1" : "vol2");
    $('[data-act="mute"]').setAttribute("aria-label", muted ? "Nyalakan suara" : "Bisukan");
    vol.value = muted ? 0 : v;
    vol.style.setProperty("--pct", (muted ? 0 : v) + "%");
    el.classList.toggle("is-playing", ctrl.isPlaying() && !muted);
    const t = ctrl.title();
    if (t && $(".mp-title span").textContent !== t) {
      const span = $(".mp-title span");
      span.textContent = t;
      requestAnimationFrame(() => $(".mp-title").classList.toggle("scroll", span.scrollWidth > $(".mp-title").clientWidth));
    }
  };
  ctrl.onChange(sync);

  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    if (b.dataset.act === "toggle") ctrl.toggle();
    if (b.dataset.act === "mute") ctrl.isMuted() ? ctrl.unmute() : ctrl.mute();
  });
  vol.addEventListener("input", () => {
    ctrl.setVolume(+vol.value);
    try { localStorage.setItem(KEY, vol.value); } catch (_) {}
  });
  addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea")) return;
    if (e.key === "m" || e.key === "M") ctrl.isMuted() ? ctrl.unmute() : ctrl.mute();
    if (e.key === " " ) { e.preventDefault(); ctrl.toggle(); }
  });

  requestAnimationFrame(() => el.classList.add("show"));
  sync();
  return el;
}
