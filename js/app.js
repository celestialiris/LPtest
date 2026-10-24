import {
  configured, onUser, logout, isAvailable, validUsername, claim, getMyProfile,
  countUsers, toast, escapeHtml, signInEmail, signUpEmail, resetPassword, authMessage,
  isAdmin, ensureMember, SUPERADMIN_EMAIL, requestAdminReset
} from "./firebase.js";
import { applyBrand, cursorGlow, reveal, tilt, spotlight, typer, countUp } from "./ui.js";

applyBrand(); cursorGlow(); reveal(); spotlight(".feat");
tilt(document.getElementById("tilt"));

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

// ---------- Auth & modal (Masuk / Daftar) ----------
const modal = document.getElementById("loginModal");
const tabs = modal.querySelector(".tabs");
function setTab(name) {
  tabs.dataset.on = name;
  tabs.querySelectorAll(".tab").forEach((t) => t.classList.toggle("on", t.dataset.tab === name));
  modal.querySelectorAll("[data-pane]").forEach((p) => (p.hidden = p.dataset.pane !== name));
  document.getElementById("loginTitle").textContent = name === "signup" ? "Buat akun baru" : "Selamat datang";
  setTimeout(() => modal.querySelector(`[data-pane="${name}"] input[type=email]`)?.focus(), 50);
}
tabs.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => setTab(t.dataset.tab)));

const openLogin = (tab = "login", sub) => {
  document.getElementById("loginSub").textContent = sub || "Masuk atau buat akun untuk mengklaim username.";
  setTab(tab);
  modal.classList.add("open");
};
const closeLogin = () => modal.classList.remove("open");
document.querySelectorAll("[data-open-login]").forEach((b) =>
  b.addEventListener("click", () => openLogin(b.dataset.openLogin || "login")));
modal.addEventListener("click", (e) => { if (e.target === modal || e.target.closest("[data-close]")) closeLogin(); });
addEventListener("keydown", (e) => e.key === "Escape" && closeLogin());

modal.querySelectorAll(".pw-toggle").forEach((btn) => btn.addEventListener("click", () => {
  const pw = btn.parentElement.querySelector("input");
  pw.type = pw.type === "password" ? "text" : "password";
  btn.classList.toggle("on", pw.type === "text");
}));

async function afterAuth(user) {
  closeLogin();
  if (sessionStorage.getItem("pendingClaim")) return; // klaim dilanjutkan oleh onUser
  const admin = await isAdmin(user.uid) || user.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();
  setTimeout(() => (location.href = admin ? "admin.html" : "dashboard.html"), 500);
}

// Masuk
const emailForm = document.getElementById("emailForm");
emailForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!configured) return toast("Isi firebase-config.js dulu untuk mengaktifkan login.", "bad");
  const btn = document.getElementById("emailBtn");
  btn.disabled = true; btn.textContent = "Masuk…";
  try {
    const { user } = await signInEmail(emailForm.email.value, emailForm.password.value);
    emailForm.reset();
    toast("Berhasil masuk ✓", "ok");
    await afterAuth(user);
  } catch (err) { toast(authMessage(err), "bad"); }
  finally { btn.disabled = false; btn.textContent = "Masuk"; }
});
const forgotBox = document.getElementById("forgotBox");
document.getElementById("forgotBtn").addEventListener("click", () => {
  forgotBox.hidden = !forgotBox.hidden;
  if (!emailForm.email.value) emailForm.email.focus();
});
const needEmail = () => {
  const email = emailForm.email.value.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { emailForm.email.focus(); toast("Tulis email akunmu dulu di kolom Email.", "bad"); return ""; }
  return email;
};
document.getElementById("forgotSelf").addEventListener("click", async () => {
  const email = needEmail(); if (!email) return;
  if (!configured) return toast("Mode demo.", "bad");
  try { await resetPassword(email); toast("Kalau email terdaftar, link reset sudah dikirim.", "ok"); }
  catch (err) { toast(authMessage(err), "bad"); }
});
document.getElementById("forgotAdmin").addEventListener("click", async () => {
  const email = needEmail(); if (!email) return;
  if (!configured) return toast("Mode demo.", "bad");
  try {
    await requestAdminReset(email, document.getElementById("forgotNote").value);
    toast("Permintaan terkirim ke superadmin. Kamu akan menerima link reset lewat email.", "ok");
    forgotBox.hidden = true; document.getElementById("forgotNote").value = "";
  } catch (err) {
    toast(err.code === "permission-denied" ? "Permintaan untuk email ini sudah ada dan sedang diproses." : authMessage(err), "bad");
  }
});

// Daftar
const signupForm = document.getElementById("signupForm");
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!configured) return toast("Isi firebase-config.js dulu untuk mengaktifkan pendaftaran.", "bad");
  const f = signupForm;
  if (f.password.value !== f.confirm.value) return toast("Password dan ulangi password tidak sama.", "bad");
  const btn = document.getElementById("signupBtn");
  btn.disabled = true; btn.textContent = "Membuat akun…";
  try {
    const user = await signUpEmail(f.name.value.trim(), f.email.value, f.password.value);
    f.reset();
    toast("Akun dibuat ✓ Cek email untuk verifikasi.", "ok");
    await afterAuth(user);
  } catch (err) { toast(authMessage(err), "bad"); }
  finally { btn.disabled = false; btn.textContent = "Buat akun"; }
});

let currentUser = null;
const navRight = document.getElementById("navRight");

onUser(async (user) => {
  currentUser = user;
  if (!user) return;
  ensureMember(user).catch(() => {});
  const admin = await isAdmin(user.uid);
  navRight.innerHTML = `<button class="btn btn-ghost" id="outBtn">Keluar</button>`
    + (admin ? `<a class="btn btn-ghost" href="admin.html">Admin</a>` : "")
    + `<a class="btn btn-primary" href="dashboard.html">Dashboard</a>`;
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
    return openLogin("signup", `Daftar atau masuk untuk mengamankan "${name}".`);
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
