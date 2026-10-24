import { loadPublic, addView, validUsername, SITE_NAME } from "./firebase.js";
import { applyBrand } from "./ui.js";
import { renderCard, applyBg, applyVideoBg } from "./card.js";

applyBrand();

const name = (new URLSearchParams(location.search).get("u") || "").toLowerCase();
const card = document.getElementById("card");
const enter = document.getElementById("enter");
const page = document.getElementById("page");

function notFound(msg) {
  enter.classList.add("gone"); page.classList.add("entered");
  card.innerHTML = `
    <h3 style="font-size:2.4rem;margin-bottom:8px">404</h3>
    <p class="bio">${msg}</p>
    <a class="btn btn-primary" href="index.html?claim=${encodeURIComponent(name)}">Klaim username ini</a>`;
  document.title = `Tidak ditemukan · ${SITE_NAME}`;
}

(async () => {
  if (!validUsername(name)) return notFound("Username tidak valid.");
  let p;
  try { p = await loadPublic(name); } catch (_) { return notFound("Gagal memuat profil."); }
  if (!p) return notFound(`<b>${name}</b> belum diklaim siapa pun.`);

  document.title = `${p.displayName || p.username} (@${p.username}) · ${SITE_NAME}`;
  const video = applyVideoBg(document.body, p);
  if (video) page.classList.add("has-video");
  else applyBg(document.getElementById("bg"), p.bg);
  renderCard(card, p);

  // Hitung 1 view per sesi browser
  const key = "viewed_" + p.username;
  try { if (!sessionStorage.getItem(key)) { sessionStorage.setItem(key, "1"); addView(p.uid); } } catch (_) {}

  enter.addEventListener("click", () => {
    enter.classList.add("gone"); page.classList.add("entered");
    if (video) video.play().catch(() => {});
  }, { once: true });
})();
