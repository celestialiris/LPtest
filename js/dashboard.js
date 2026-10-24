import {
  configured, onUser, logout, getMyProfile, saveProfile, claim, isAvailable, validUsername,
  profileUrl, toast, escapeHtml, loadPublic, hasPasswordLogin, changeEmail, changePassword, authMessage
} from "./firebase.js";
import { applyBrand, cursorGlow } from "./ui.js";
import { renderCard } from "./card.js";

applyBrand(); cursorGlow();

const $ = (id) => document.getElementById(id);
const show = (id) => ["loading", "noName", "dash"].forEach((x) => ($(x).hidden = x !== id));
const form = $("editForm");
const linksBox = $("links");
let user = null, profile = null;

$("outBtn").onclick = async () => { await logout(); location.href = "index.html"; };

// ---------- links editor ----------
function linkRow(l = { title: "", url: "" }) {
  const row = document.createElement("div");
  row.className = "link-row";
  row.innerHTML = `
    <input class="input t" placeholder="Judul" maxlength="40" value="${escapeHtml(l.title)}">
    <input class="input u" placeholder="https://…" maxlength="300" value="${escapeHtml(l.url)}">
    <button type="button" class="icon-btn" aria-label="Hapus">×</button>`;
  row.querySelector("button").onclick = () => { row.remove(); update(); };
  row.addEventListener("input", update);
  linksBox.append(row);
}
$("addLink").onclick = () => {
  if (linksBox.children.length >= 20) return toast("Maksimal 20 link.", "bad");
  linkRow(); linksBox.lastElementChild.querySelector(".t").focus();
};

function readForm() {
  const f = new FormData(form);
  return {
    displayName: String(f.get("displayName") || "").trim().slice(0, 40),
    bio: String(f.get("bio") || "").slice(0, 160),
    avatar: String(f.get("avatar") || "").trim().slice(0, 500),
    bg: String(f.get("bg") || "").trim().slice(0, 500),
    accent: String(f.get("accent") || "#a855f7"),
    links: [...linksBox.children].map((r) => ({
      title: r.querySelector(".t").value.trim().slice(0, 40),
      url: r.querySelector(".u").value.trim().slice(0, 300)
    })).filter((l) => l.url)
  };
}

function update() {
  const data = readForm();
  $("bioCount").textContent = `${data.bio.length}/160`;
  renderCard($("preview"), { ...profile, ...data });
}
form.addEventListener("input", update);

function fill(p) {
  form.displayName.value = p.displayName || "";
  form.bio.value = p.bio || "";
  form.avatar.value = p.avatar || "";
  form.bg.value = p.bg || "";
  form.accent.value = p.accent || "#a855f7";
  linksBox.innerHTML = "";
  (p.links || []).forEach(linkRow);
  const url = profileUrl(p.username);
  $("shareUrl").textContent = url;
  $("viewBtn").href = url; $("viewBtn").hidden = false;
  update();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("saveBtn"); btn.disabled = true; btn.textContent = "Menyimpan…";
  try {
    const data = readForm();
    await saveProfile(user.uid, data);
    profile = { ...profile, ...data };
    toast("Tersimpan ✓", "ok");
  } catch (err) { toast("Gagal menyimpan: " + (err.code || err.message), "bad"); }
  finally { btn.disabled = false; btn.textContent = "Simpan perubahan"; }
});

$("copyBtn").onclick = async () => {
  try { await navigator.clipboard.writeText($("shareUrl").textContent); toast("Link disalin!", "ok"); }
  catch { toast("Tidak bisa menyalin otomatis.", "bad"); }
};

// ---------- akun: ganti email & password ----------
function renderAccount(u) {
  $("curEmail").textContent = u?.email || "—";
  const pw = hasPasswordLogin(u);
  $("pwBlock").hidden = !pw;
  $("noPw").hidden = pw;
}

async function withBtn(form, label, fn) {
  const btn = form.querySelector("button[type=submit]");
  const old = btn.textContent; btn.disabled = true; btn.textContent = label;
  try { await fn(); } finally { btn.disabled = false; btn.textContent = old; }
}

$("emailChange").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target;
  if (!configured) return toast("Mode demo: hubungkan Firebase dulu.", "bad");
  if (f.newEmail.value.trim().toLowerCase() === (user.email || "").toLowerCase()) return toast("Itu email yang sama.", "bad");
  withBtn(f, "Menyimpan…", async () => {
    try {
      const r = await changeEmail(f.current.value, f.newEmail.value);
      if (r === "updated") { toast("Email berhasil diganti ✓", "ok"); renderAccount(user); }
      else toast(`Link verifikasi dikirim ke ${f.newEmail.value}. Email berubah setelah link diklik.`, "ok");
      f.reset();
    } catch (err) { toast(authMessage(err), "bad"); }
  });
});

$("pwChange").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target;
  if (!configured) return toast("Mode demo: hubungkan Firebase dulu.", "bad");
  if (f.next.value !== f.confirm.value) return toast("Password baru tidak sama.", "bad");
  if (f.next.value === f.current.value) return toast("Password baru harus berbeda.", "bad");
  withBtn(f, "Menyimpan…", async () => {
    try { await changePassword(f.current.value, f.next.value); f.reset(); toast("Password berhasil diganti ✓", "ok"); }
    catch (err) { toast(authMessage(err), "bad"); }
  });
});

// ---------- claim (kalau belum punya) ----------
$("claimInput").addEventListener("input", (e) => (e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "")));
$("claimForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $("claimInput").value;
  if (!validUsername(name)) return toast("Username tidak valid.", "bad");
  try {
    if (!(await isAvailable(name))) return toast("Username sudah diambil.", "bad");
    await claim(name, user);
    toast(`🎉 ${name} milikmu!`, "ok");
    profile = await getMyProfile(user.uid);
    fill(profile); show("dash");
  } catch (err) { toast("Gagal klaim: " + (err.code || err.message), "bad"); }
});

// ---------- boot ----------
if (!configured) {
  // Mode demo: tampilkan editor dengan data contoh
  user = { uid: "demo", email: "demo@contoh.com", providerData: [{ providerId: "password" }] };
  renderAccount(user);
  profile = await loadPublic("demo");
  fill(profile); show("dash");
  form.addEventListener("submit", (e) => { e.stopImmediatePropagation(); e.preventDefault(); toast("Mode demo: hubungkan Firebase untuk menyimpan.", "bad"); }, true);
} else {
  onUser(async (u) => {
    if (!u) { location.href = "index.html"; return; }
    user = u;
    renderAccount(u);
    try {
      profile = await getMyProfile(u.uid);
      if (!profile) return show("noName");
      fill(profile); show("dash");
    } catch (err) { toast("Gagal memuat: " + (err.code || err.message), "bad"); }
  });
}
