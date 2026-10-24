import {
  configured, onUser, logout, signInEmail, authMessage, isAdmin, bootstrapAdmin,
  watchNotifications, markRead, markAllRead, listMembers, listProfiles, deleteProfile,
  profileUrl, toast, escapeHtml, fmtDate, timeAgo
} from "./firebase.js";
import { applyBrand, cursorGlow } from "./ui.js";

applyBrand(); cursorGlow();

const $ = (id) => document.getElementById(id);
const show = (id) => ["loading", "needLogin", "denied", "admin"].forEach((x) => ($(x).hidden = x !== id));
const baseTitle = document.title;
let notifs = [], members = [], profiles = {}, firstSnap = true, unsub = null;

const doLogout = async () => { await logout(); location.reload(); };
$("outBtn").onclick = doLogout; $("outBtn2").onclick = doLogout;

$("adminLogin").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!configured) return toast("Isi firebase-config.js dulu.", "bad");
  const f = e.target, btn = f.querySelector("button");
  btn.disabled = true;
  try { await signInEmail(f.email.value, f.password.value); }
  catch (err) { toast(authMessage(err), "bad"); }
  finally { btn.disabled = false; }
});

// ---------- notifikasi ----------
function renderNotifs(newIds = new Set()) {
  const unread = notifs.filter((n) => !n.read).length;
  $("kUnread").textContent = unread;
  $("bellCount").textContent = unread; $("bellCount").hidden = unread === 0;
  document.title = unread ? `(${unread}) ${baseTitle}` : baseTitle;
  $("readAll").disabled = unread === 0;

  if (!notifs.length) { $("notifs").innerHTML = '<div class="empty">Belum ada pendaftaran.</div>'; return; }
  $("notifs").innerHTML = notifs.map((n) => `
    <div class="notif ${n.read ? "" : "unread"} ${newIds.has(n.id) ? "new" : ""}" data-id="${escapeHtml(n.id)}" title="${n.read ? "" : "Klik untuk tandai dibaca"}">
      <span class="dot"></span>
      <div>
        <b>${escapeHtml(n.name || n.email)}</b>
        <small>${n.name ? escapeHtml(n.email) + " · " : ""}mendaftar ${timeAgo(n.createdAt)}</small>
      </div>
    </div>`).join("");
}

$("notifs").addEventListener("click", async (e) => {
  const el = e.target.closest(".notif.unread");
  if (!el || !configured) return;
  try { await markRead(el.dataset.id); } catch (err) { toast(authMessage(err), "bad"); }
});
$("readAll").onclick = async () => {
  if (!configured) return;
  try { await markAllRead(notifs); toast("Semua ditandai dibaca ✓", "ok"); } catch (err) { toast(authMessage(err), "bad"); }
};
$("bellBtn").onclick = () => $("notifPanel").scrollIntoView({ behavior: "smooth", block: "start" });

// Notifikasi browser + bunyi saat ada pendaftar baru (selama halaman ini terbuka)
const pushBtn = $("pushBtn");
function syncPushBtn() {
  if (!("Notification" in window)) { pushBtn.hidden = true; return; }
  if (Notification.permission === "granted") { pushBtn.textContent = "🔔 Notifikasi browser aktif"; pushBtn.disabled = true; }
  if (Notification.permission === "denied") { pushBtn.textContent = "🔕 Notifikasi diblokir browser"; pushBtn.disabled = true; }
}
pushBtn.onclick = async () => { await Notification.requestPermission(); syncPushBtn(); };
syncPushBtn();

function ding() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f; o.type = "sine";
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + i * 0.12 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.12 + 0.35);
      o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + i * 0.12); o.stop(ctx.currentTime + i * 0.12 + 0.4);
    });
  } catch (_) {}
}

function announce(n) {
  const who = n.name ? `${n.name} (${n.email})` : n.email;
  toast(`🎉 Anggota baru: ${who}`, "ok");
  ding();
  if ("Notification" in window && Notification.permission === "granted") {
    try { new Notification("Anggota baru mendaftar", { body: who, tag: n.id }); } catch (_) {}
  }
}

// ---------- anggota ----------
function renderMembers() {
  const q = $("search").value.trim().toLowerCase();
  const rows = members.map((m) => ({ ...m, p: profiles[m.uid] }))
    .filter((m) => !q || [m.email, m.name, m.p?.username].some((v) => (v || "").toLowerCase().includes(q)));
  $("kMembers").textContent = members.length.toLocaleString("id-ID");
  $("kProfiles").textContent = Object.keys(profiles).length.toLocaleString("id-ID");
  $("kViews").textContent = Object.values(profiles).reduce((s, p) => s + (p.views || 0), 0).toLocaleString("id-ID");

  if (!rows.length) { $("rows").innerHTML = `<tr><td colspan="6" class="empty">${q ? "Tidak ada yang cocok." : "Belum ada anggota."}</td></tr>`; return; }
  $("rows").innerHTML = rows.map((m) => `
    <tr>
      <td>${escapeHtml(m.email || "—")}</td>
      <td class="muted">${escapeHtml(m.name || "—")}</td>
      <td>${m.p ? `<a class="u" href="${escapeHtml(profileUrl(m.p.username))}" target="_blank" rel="noopener">@${escapeHtml(m.p.username)}</a>` : '<span class="muted">—</span>'}</td>
      <td class="muted">${fmtDate(m.createdAt)}</td>
      <td class="num">${(m.p?.views || 0).toLocaleString("id-ID")}</td>
      <td>${m.p ? `<button class="del" data-uid="${escapeHtml(m.uid)}" data-name="${escapeHtml(m.p.username)}">Hapus</button>` : ""}</td>
    </tr>`).join("");
}
$("search").addEventListener("input", renderMembers);

$("rows").addEventListener("click", async (e) => {
  const b = e.target.closest(".del");
  if (!b) return;
  if (!configured) return toast("Mode demo.", "bad");
  if (!confirm(`Hapus profil @${b.dataset.name}? Username akan dilepas dan bisa diklaim orang lain. Akun login tetap ada.`)) return;
  try {
    await deleteProfile(b.dataset.uid, b.dataset.name);
    delete profiles[b.dataset.uid]; renderMembers();
    toast("Profil dihapus.", "ok");
  } catch (err) { toast(authMessage(err), "bad"); }
});

async function loadMembers() {
  try {
    [members, profiles] = await Promise.all([listMembers(), listProfiles()]);
    renderMembers();
  } catch (err) { toast("Gagal memuat anggota: " + authMessage(err), "bad"); }
}
$("refresh").onclick = loadMembers;

function enterAdmin(email) {
  $("adminEmail").textContent = email;
  ["bellBtn", "acctBtn", "outBtn"].forEach((id) => ($(id).hidden = false));
  show("admin");
}

// ---------- boot ----------
if (!configured) {
  const now = Date.now(), ts = (m) => ({ toDate: () => new Date(now - m * 60000) });
  notifs = [
    { id: "a", name: "Rani", email: "rani@contoh.com", read: false, createdAt: ts(2) },
    { id: "b", name: "", email: "budi.s@contoh.com", read: false, createdAt: ts(48) },
    { id: "c", name: "Kai", email: "kai@contoh.com", read: true, createdAt: ts(60 * 26) }
  ];
  members = notifs.map((n) => ({ uid: n.id, email: n.email, name: n.name, createdAt: n.createdAt }));
  profiles = { c: { username: "kai", views: 312 }, a: { username: "rani", views: 41 } };
  enterAdmin("demo@contoh.com"); renderNotifs(); renderMembers();
} else {
  onUser(async (user) => {
    if (unsub) { unsub(); unsub = null; }
    if (!user) return show("needLogin");
    show("loading");
    try { await bootstrapAdmin(user); } catch (err) { console.warn("bootstrap:", err); }
    if (!(await isAdmin(user.uid))) { $("deniedEmail").textContent = user.email; return show("denied"); }

    enterAdmin(user.email);
    loadMembers();
    unsub = watchNotifications((items, snap) => {
      const added = new Set();
      if (!firstSnap) {
        snap.docChanges().forEach((c) => {
          if (c.type === "added") { added.add(c.doc.id); announce({ id: c.doc.id, ...c.doc.data() }); }
        });
        if (added.size) loadMembers();
      }
      firstSnap = false;
      notifs = items;
      renderNotifs(added);
    }, (err) => toast("Notifikasi gagal dimuat: " + authMessage(err), "bad"));
  });
}
