import {
  configured, onUser, signIn, logout, isAvailable, validUsername, claim, getMyProfile,
  countUsers, toast, escapeHtml, signInEmail, resetPassword, authMessage
} from "./firebase.js";
import { applyBrand, cursorGlow, reveal, tilt, spotlight, typer, countUp } from "./ui.js";

applyBrand(); cursorGlow(); reveal(); spotlight(".feat");
tilt(document.getElementById("tilt"));
document.getElementById("yr").textContent = new Date().getFullYear();

typer(document.getElementById("typed"), [
  "designer · night owl ✦", "building cool things", "lofi enjoyer 🎧", "say hi on discord"
]);

// Marquee
const words = ["Sosial media", "Musik", "Portfolio", "Statistik", "Badge", "Background kustom", "Discord", "GitHub", "Toko online", "Efek glow"];
document.getElementById("marquee").innerHTML = [...words, ...words].map((w) => `<span>${w}</span>`).join("");

// Statistik
const statsEl = document.querySelector(".stats");
let counted = false;
new IntersectionObserver(async ([e], o) => {
  if (!e.isIntersecting || counted) return;
  counted = true; o.disconnect();
  let n = 0;
  try { n = await countUsers(); } catch (_) {}
  countUp(document.getElementById("userCount"), n);
  document.querySelectorAll("[data-count]:not(#userCount)").forEach((el) => {
    const v = parseFloat(el.dataset.count);
    countUp(el, v, { suffix: el.dataset.suffix || "", decimals: v % 1 ? 1 : 0 });
  });
}).observe(statsEl);

// ---------- Auth & modal ----------
const modal = document.getElementById("loginModal");
const openLogin = (sub) => {
  if (sub) document.getElementById("loginSub").textContent = sub;
  modal.classList.add("open");
};
const closeLogin = () => modal.classList.remove("open");
document.querySelectorAll("[data-open-login]").forEach((b) => b.addEventListener("click", () => openLogin()));
modal.addEventListener("click", (e) => { if (e.target === modal || e.target.closest("[data-close]")) closeLogin(); });
addEventListener("keydown", (e) => e.key === "Escape" && closeLogin());

modal.querySelectorAll("[data-provider]").forEach((btn) =>
  btn.addEventListener("click", async () => {
    if (!configured) return toast("Isi firebase-config.js dulu untuk mengaktifkan login.", "bad");
    btn.disabled = true;
    try { await signIn(btn.dataset.provider); closeLogin(); }
    catch (err) { toast(authMessage(err), "bad"); }
    finally { btn.disabled = false; }
  })
);

// Login email & password
const emailForm = document.getElementById("emailForm");
emailForm.querySelector(".pw-toggle").addEventListener("click", (e) => {
  const pw = emailForm.password;
  pw.type = pw.type === "password" ? "text" : "password";
  e.currentTarget.classList.toggle("on", pw.type === "text");
});
emailForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!configured) return toast("Isi firebase-config.js dulu untuk mengaktifkan login.", "bad");
  const btn = document.getElementById("emailBtn");
  btn.disabled = true; btn.textContent = "Masuk…";
  try {
    await signInEmail(emailForm.email.value, emailForm.password.value);
    emailForm.reset(); closeLogin();
    toast("Berhasil masuk ✓", "ok");
    if (!sessionStorage.getItem("pendingClaim")) setTimeout(() => (location.href = "dashboard.html"), 500);
  } catch (err) { toast(authMessage(err), "bad"); }
  finally { btn.disabled = false; btn.textContent = "Masuk"; }
});
document.getElementById("forgotBtn").addEventListener("click", async () => {
  const email = emailForm.email.value.trim();
  if (!email) { emailForm.email.focus(); return toast("Tulis email kamu dulu, lalu klik lagi.", "bad"); }
  try { await resetPassword(email); toast("Kalau email terdaftar, link reset sudah dikirim.", "ok"); }
  catch (err) { toast(authMessage(err), "bad"); }
});

let currentUser = null;
const navRight = document.getElementById("navRight");

onUser(async (user) => {
  currentUser = user;
  if (!user) return;
  const photo = user.photoURL ? `<img class="avatar-sm" src="${escapeHtml(user.photoURL)}" alt="">` : "";
  navRight.innerHTML = `<button class="btn btn-ghost" id="outBtn">Keluar</button><a class="btn btn-primary" href="dashboard.html">Dashboard</a>${photo}`;
  document.getElementById("outBtn").onclick = () => logout().then(() => location.reload());

  // Lanjutkan klaim yang tertunda sebelum login
  const pending = sessionStorage.getItem("pendingClaim");
  if (pending) { sessionStorage.removeItem("pendingClaim"); doClaim(pending); }
});

// ---------- Klaim username ----------
const form = document.getElementById("claimForm");
const input = document.getElementById("claimInput");
const status = document.getElementById("claimStatus");
const setStatus = (t, cls = "") => { status.textContent = t; status.className = "claim-status " + cls; };

let timer;
input.addEventListener("input", () => {
  input.value = input.value.toLowerCase().replace(/[^a-z0-9_.]/g, "");
  clearTimeout(timer);
  const v = input.value;
  if (!v) return setStatus("Username 2–20 karakter: huruf kecil, angka, titik, atau underscore.");
  if (!validUsername(v)) return setStatus(v.length < 2 ? "Minimal 2 karakter." : "Username ini tidak bisa dipakai.", "bad");
  setStatus("Mengecek…");
  timer = setTimeout(async () => {
    try {
      const ok = await isAvailable(v);
      if (input.value !== v) return;
      ok ? setStatus(`✓ ${v} tersedia — ambil sebelum diambil orang!`, "ok") : setStatus(`✕ ${v} sudah diambil.`, "bad");
    } catch (_) { setStatus("Tidak bisa mengecek sekarang.", "bad"); }
  }, 350);
});

form.addEventListener("submit", (e) => { e.preventDefault(); doClaim(input.value.trim()); });
document.getElementById("ctaBtn").addEventListener("click", (e) => {
  e.preventDefault(); scrollTo({ top: 0, behavior: "smooth" }); setTimeout(() => input.focus(), 500);
});

async function doClaim(name) {
  if (!validUsername(name)) { setStatus("Masukkan username yang valid dulu.", "bad"); input.focus(); return; }
  if (!configured) return toast("Mode demo: hubungkan Firebase untuk mengklaim username.", "bad");
  if (!currentUser) {
    sessionStorage.setItem("pendingClaim", name);
    return openLogin(`Masuk untuk mengamankan "${name}".`);
  }
  const btn = document.getElementById("claimBtn");
  btn.disabled = true; btn.textContent = "Mengklaim…";
  try {
    const existing = await getMyProfile(currentUser.uid);
    if (existing) { toast(`Kamu sudah punya username: ${existing.username}`); location.href = "dashboard.html"; return; }
    await claim(name, currentUser);
    toast(`🎉 ${name} sekarang milikmu!`, "ok");
    setTimeout(() => (location.href = "dashboard.html"), 700);
  } catch (err) {
    const m = { taken: "Yah, username itu baru saja diambil.", "has-username": "Akunmu sudah punya username.", invalid: "Username tidak valid." };
    toast(m[err.message] || "Gagal klaim: " + (err.code || err.message), "bad");
  } finally { btn.disabled = false; btn.textContent = "Klaim sekarang"; }
}

// Prefill dari ?claim=nama
const pre = new URLSearchParams(location.search).get("claim");
if (pre) { input.value = pre.toLowerCase(); input.dispatchEvent(new Event("input")); }
