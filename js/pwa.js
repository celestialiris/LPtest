// PWA: daftar service worker, tombol "Pasang aplikasi" (Android/PC),
// panduan "Tambah ke Layar Utama" (iOS), dan tawaran pembaruan versi baru.

let deferredPrompt = null;
let started = false;

const isStandalone = () =>
  matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = () =>
  /iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

function bar(html, cls = "") {
  let el = document.querySelector(".pwa-bar");
  if (!el) { el = document.createElement("div"); el.className = "pwa-bar"; document.body.append(el); }
  el.className = "pwa-bar show " + cls;
  el.innerHTML = html;
  el.querySelector("[data-x]")?.addEventListener("click", () => el.classList.remove("show"));
  return el;
}

function dismissed(key) { try { return localStorage.getItem(key) === "1"; } catch (_) { return false; } }
function dismiss(key) { try { localStorage.setItem(key, "1"); } catch (_) {} }

function offerInstall() {
  if (isStandalone() || dismissed("bohye.installDismissed")) return;
  const el = bar(`
    <span class="pwa-ic">📲</span>
    <div><b>Pasang Bohye Page</b><small>Buka lebih cepat langsung dari layar utama.</small></div>
    <button class="btn btn-primary" data-install>Pasang</button>
    <button class="pwa-x" data-x aria-label="Tutup">×</button>`);
  el.querySelector("[data-install]").onclick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    el.classList.remove("show");
  };
  el.querySelector("[data-x]").addEventListener("click", () => dismiss("bohye.installDismissed"));
}

function offerIOS() {
  if (!isIOS() || isStandalone() || dismissed("bohye.iosDismissed")) return;
  const el = bar(`
    <span class="pwa-ic">📲</span>
    <div><b>Pasang di iPhone / iPad</b><small>Ketuk <svg class="share-ic" viewBox="0 0 24 24"><path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6" fill="none" stroke="currentColor" stroke-width="2"/></svg> <b>Bagikan</b> di Safari, lalu pilih <b>Tambah ke Layar Utama</b>.</small></div>
    <button class="pwa-x" data-x aria-label="Tutup">×</button>`);
  el.querySelector("[data-x]").addEventListener("click", () => dismiss("bohye.iosDismissed"));
}

function offerUpdate(reg) {
  const el = bar(`
    <span class="pwa-ic">✨</span>
    <div><b>Versi baru tersedia</b><small>Muat ulang untuk memakai pembaruan terbaru.</small></div>
    <button class="btn btn-primary" data-update>Perbarui</button>
    <button class="pwa-x" data-x aria-label="Nanti">×</button>`, "update");
  el.querySelector("[data-update]").onclick = () => reg.waiting?.postMessage("skipWaiting");
}

export function initPwa() {
  if (started) return;
  started = true;

  addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    setTimeout(offerInstall, 2500);
  });
  addEventListener("appinstalled", () => document.querySelector(".pwa-bar")?.classList.remove("show"));
  setTimeout(offerIOS, 3000);

  // Tombol pasang manual (mis. di footer): <button data-install-app>
  document.querySelectorAll("[data-install-app]").forEach((b) => b.addEventListener("click", () => {
    if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; }
    else if (isIOS()) { try { localStorage.removeItem("bohye.iosDismissed"); } catch (_) {} offerIOS(); }
    else if (isStandalone()) bar(`<span class="pwa-ic">✅</span><div><b>Sudah terpasang</b><small>Kamu sedang memakai versi aplikasi.</small></div><button class="pwa-x" data-x>×</button>`);
    else bar(`<span class="pwa-ic">ℹ️</span><div><b>Pasang dari menu browser</b><small>Chrome/Edge: ikon ⊕ di address bar atau menu ⋮ → <b>Install</b>.</small></div><button class="pwa-x" data-x>×</button>`);
  }));

  if (!("serviceWorker" in navigator) || !isSecureContext) return;
  navigator.serviceWorker.register("sw.js").then((reg) => {
    if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg);
    reg.addEventListener("updatefound", () => {
      const w = reg.installing;
      w?.addEventListener("statechange", () => {
        if (w.state === "installed" && navigator.serviceWorker.controller) offerUpdate(reg);
      });
    });
    setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
  }).catch(() => {});

  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
}
