// Tema & logo situs. Nilainya disimpan di Firestore (settings/site) oleh superadmin,
// lalu di-cache di localStorage agar langsung terpasang saat halaman dibuka.
import { watchSiteSettings } from "./firebase.js";

export const THEMES = {
  nebula: {
    name: "Nebula", desc: "Ungu–pink kosmik, glow lembut",
    swatch: ["#6366f1", "#a855f7", "#ec4899"], bg: "#07060b"
  },
  aurora: {
    name: "Aurora", desc: "Hijau–toska cahaya kutub",
    swatch: ["#22d3ee", "#10b981", "#a3e635"], bg: "#03100f"
  },
  inferno: {
    name: "Inferno", desc: "Merah darah & bara, nuansa darkness",
    swatch: ["#7f1d1d", "#ef4444", "#f97316"], bg: "#0a0405"
  },
  frost: {
    name: "Frost", desc: "Kaca es biru–perak, super blur",
    swatch: ["#93c5fd", "#60a5fa", "#e0e7ff"], bg: "#060a14"
  }
};

const KEY_THEME = "bohye.theme";
const KEY_LOGO = "bohye.logo";

export function applyTheme(theme) {
  const t = THEMES[theme] ? theme : "nebula";
  document.documentElement.setAttribute("data-theme", t);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEMES[t].bg);
  try { localStorage.setItem(KEY_THEME, t); } catch (_) {}
  return t;
}

export function applyLogo(dataUrl) {
  const valid = typeof dataUrl === "string" && /^data:image\/(png|jpeg|webp|svg\+xml);base64,/.test(dataUrl);
  document.documentElement.classList.toggle("has-logo", valid);
  document.querySelectorAll(".logo .mark").forEach((m) => {
    let img = m.querySelector("img.site-logo");
    if (valid) {
      if (!img) { img = document.createElement("img"); img.className = "site-logo"; img.alt = ""; m.prepend(img); }
      img.src = dataUrl;
    } else if (img) img.remove();
  });
  const icon = document.querySelector('link[rel="icon"]');
  if (icon) {
    if (!icon.dataset.default) icon.dataset.default = icon.href;
    icon.href = valid ? dataUrl : icon.dataset.default;
  }
  try { valid ? localStorage.setItem(KEY_LOGO, dataUrl) : localStorage.removeItem(KEY_LOGO); } catch (_) {}
}

// Pasang dari cache dulu, lalu ikuti perubahan dari Firestore secara live
export function initSite() {
  try { applyLogo(localStorage.getItem(KEY_LOGO)); } catch (_) {}
  watchSiteSettings((s) => {
    applyTheme(s.theme);
    applyLogo(s.logo || "");
  });
}

// Mengecilkan gambar logo menjadi PNG/WebP persegi (default 256 px) dalam bentuk data URL
export function resizeLogo(file, size = 256) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) return reject(new Error("Format harus PNG, JPG, WebP, atau SVG."));
    if (file.size > 5 * 1024 * 1024) return reject(new Error("Ukuran gambar maksimal 5 MB."));
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const ctx = c.getContext("2d");
      const s = Math.min(img.naturalWidth || size, img.naturalHeight || size);
      const sx = ((img.naturalWidth || size) - s) / 2, sy = ((img.naturalHeight || size) - s) / 2;
      ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      let out = c.toDataURL("image/webp", 0.9);
      if (!out.startsWith("data:image/webp")) out = c.toDataURL("image/png");
      if (out.length > 300000) return reject(new Error("Logo terlalu detail, coba gambar yang lebih sederhana."));
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Gambar tidak bisa dibaca.")); };
    img.src = url;
  });
}
