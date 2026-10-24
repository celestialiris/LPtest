import {
  configured, onUser, logout, signInEmail, authMessage, isAdmin, bootstrapAdmin,
  watchNotifications, markRead, markAllRead, listMembers, listProfiles, deleteProfile,
  profileUrl, toast, escapeHtml, fmtDate, timeAgo,
  watchSiteSettings, saveSiteSettings, setBadges,
  watchResetRequests, adminSendReset, dismissReset,
  watchActivity, memberActivity, ACTIVITY_LABELS, getMyProfile
} from "./firebase.js";
import { applyBrand, cursorGlow } from "./ui.js";
import { THEMES, applyTheme, applyLogo, resizeLogo } from "./site.js";
import { BADGES, BADGE_KEYS, SUPERADMIN_BADGES, badgesHtml, badgeHtml } from "./badges.js";

applyBrand(); cursorGlow();

const $ = (id) => document.getElementById(id);
const show = (id) => ["loading", "needLogin", "denied", "admin"].forEach((x) => ($(x).hidden = x !== id));
const baseTitle = document.title;
const subs = [];
let me = null;
let notifs = [], members = [], profiles = {}, resets = [], logs = [], site = {};
let firstNotif = true, firstReset = true;

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

// =================== tab bagian ===================
function goto(sec) {
  document.querySelectorAll("#seg button").forEach((b) => b.classList.toggle("on", b.dataset.sec === sec));
  document.querySelectorAll("[data-pane]").forEach((p) => (p.hidden = p.dataset.pane !== sec));
  try { sessionStorage.setItem("bohye.adminTab", sec); } catch (_) {}
}
document.querySelectorAll("#seg button").forEach((b) => b.addEventListener("click", () => goto(b.dataset.sec)));
document.querySelectorAll("[data-goto]").forEach((b) => b.addEventListener("click", () => goto(b.dataset.goto)));
$("bellBtn").onclick = () => goto("overview");

function updateCounts() {
  const unread = notifs.filter((n) => !n.read).length;
  const pending = resets.filter((r) => r.status === "pending").length;
  $("kTodo").textContent = unread + pending;
  $("pipNotif").textContent = unread; $("pipNotif").hidden = !unread;
  $("pipReset").textContent = pending; $("pipReset").hidden = !pending;
  $("bellCount").textContent = unread + pending; $("bellCount").hidden = !(unread + pending);
  document.title = unread + pending ? `(${unread + pending}) ${baseTitle}` : baseTitle;
  $("readAll").disabled = !unread;
}

// =================== notifikasi pendaftaran ===================
function renderNotifs(newIds = new Set()) {
  updateCounts();
  if (!notifs.length) { $("notifs").innerHTML = '<div class="empty">Belum ada pendaftaran.</div>'; return; }
  $("notifs").innerHTML = notifs.map((n) => `
    <div class="notif ${n.read ? "" : "unread"} ${newIds.has(n.id) ? "new" : ""}" data-id="${escapeHtml(n.id)}">
      <span class="dot"></span>
      <div>
        <b>${escapeHtml(n.name || n.email)}</b>
        <small>${n.name ? escapeHtml(n.email) + " · " : ""}mendaftar ${timeAgo(n.createdAt)}</small>
      </div>
    </div>`).join("");
}
$("notifs").addEventListener("click", async (e) => {
  const el = e.target.closest(".notif");
  if (!el) return;
  if (el.classList.contains("unread") && configured) { try { await markRead(el.dataset.id); } catch (_) {} }
  openMember(el.dataset.id);
});
$("readAll").onclick = async () => {
  if (!configured) return;
  try { await markAllRead(notifs); toast("Semua ditandai dibaca ✓", "ok"); } catch (err) { toast(authMessage(err), "bad"); }
};

// notifikasi browser + bunyi
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
      const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + i * 0.12;
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.15, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.4);
    });
  } catch (_) {}
}
function announce(title, body, tag) {
  toast(`${title}: ${body}`, "ok");
  ding();
  if ("Notification" in window && Notification.permission === "granted") {
    try { new Notification(title, { body, tag, icon: "icons/icon-192.png" }); } catch (_) {}
  }
}

// =================== anggota ===================
function renderMembers() {
  const q = $("search").value.trim().toLowerCase();
  $("kMembers").textContent = members.length.toLocaleString("id-ID");
  $("kProfiles").textContent = Object.keys(profiles).length.toLocaleString("id-ID");
  $("kViews").textContent = Object.values(profiles).reduce((s, p) => s + (p.views || 0), 0).toLocaleString("id-ID");

  const rows = members.map((m) => ({ ...m, p: profiles[m.uid] }))
    .filter((m) => !q || [m.email, m.name, m.p?.username].some((v) => (v || "").toLowerCase().includes(q)));
  if (!rows.length) { $("rows").innerHTML = `<tr><td colspan="8" class="empty">${q ? "Tidak ada yang cocok." : "Belum ada anggota."}</td></tr>`; return; }
  $("rows").innerHTML = rows.map((m) => `
    <tr>
      <td>${escapeHtml(m.email || "—")} ${m.emailVerified ? '<span class="pill-s ok">terverifikasi</span>' : ""}</td>
      <td class="muted">${escapeHtml(m.name || "—")}</td>
      <td>${m.p ? `<a class="u" href="${escapeHtml(profileUrl(m.p.username))}" target="_blank" rel="noopener">@${escapeHtml(m.p.username)}</a>` : '<span class="muted">—</span>'}</td>
      <td><span class="badges" style="justify-content:flex-start">${badgesHtml(m.p?.badges) || '<span class="muted">—</span>'}</span></td>
      <td class="muted">${fmtDate(m.createdAt)}</td>
      <td class="muted">${m.lastLoginAt ? timeAgo(m.lastLoginAt) : "—"}</td>
      <td class="num">${(m.p?.views || 0).toLocaleString("id-ID")}</td>
      <td><button class="view" data-uid="${escapeHtml(m.uid)}">Detail</button></td>
    </tr>`).join("");
}
$("search").addEventListener("input", renderMembers);
$("rows").addEventListener("click", (e) => { const b = e.target.closest(".view"); if (b) openMember(b.dataset.uid); });

async function loadMembers() {
  if (!configured) return renderMembers();
  try {
    [members, profiles] = await Promise.all([listMembers(), listProfiles()]);
    renderMembers();
  } catch (err) { toast("Gagal memuat anggota: " + authMessage(err), "bad"); }
}
$("refresh").onclick = loadMembers;

// =================== detail anggota ===================
const sheet = $("memberSheet");
let current = null;
sheet.addEventListener("click", (e) => { if (e.target === sheet || e.target.closest("[data-close]")) sheet.classList.remove("open"); });
addEventListener("keydown", (e) => e.key === "Escape" && sheet.classList.remove("open"));

async function openMember(uid) {
  const m = members.find((x) => x.uid === uid) || notifs.find((n) => n.uid === uid || n.id === uid) || { uid };
  const p = profiles[uid];
  current = { uid, m, p };
  const isMe = me && uid === me.uid;
  $("mRole").textContent = isMe ? "✦ Superadmin (kamu)" : "Anggota";
  $("mTitle").textContent = m.name || p?.displayName || m.email || uid;
  $("mSub").textContent = m.email || "";
  const row = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;
  $("mKv").innerHTML = [
    row("Email", escapeHtml(m.email || "—")),
    row("Status email", m.emailVerified ? '<span class="pill-s ok">terverifikasi</span>' : '<span class="pill-s warn">belum diverifikasi</span>'),
    row("Nama", escapeHtml(m.name || "—")),
    row("UID", `<code style="font-size:.8rem">${escapeHtml(uid)}</code>`),
    row("Bergabung", fmtDate(m.createdAt)),
    row("Login terakhir", m.lastLoginAt ? fmtDate(m.lastLoginAt) : "—"),
    row("Username", p ? "@" + escapeHtml(p.username) : "—"),
    row("Nama tampilan", escapeHtml(p?.displayName || "—")),
    row("Bio", escapeHtml(p?.bio || "—")),
    row("Jumlah link", String(p?.links?.length || 0)),
    row("Video background", p?.bgVideo ? "Ada" : "Tidak ada"),
    row("Views", (p?.views || 0).toLocaleString("id-ID")),
    row("Password", '<span class="muted">•••••••• (ter-hash, tidak bisa dilihat)</span>')
  ].join("");

  $("mProfile").hidden = !p;
  if (p) $("mProfile").href = profileUrl(p.username);
  $("mDelete").hidden = !p || isMe;
  $("mReset").disabled = !m.email;
  $("mBadgeWrap").hidden = !p; $("mNoProfile").hidden = !!p;
  $("mBadges").innerHTML = BADGE_KEYS.map((k) => `
    <label><input type="checkbox" value="${k}" ${(p?.badges || []).includes(k) ? "checked" : ""}>${badgeHtml(k, { withLabel: true })}</label>`).join("");

  sheet.classList.add("open");
  $("mLog").innerHTML = '<div class="empty">Memuat…</div>';
  let items = logs.filter((l) => l.uid === uid);
  if (configured) { try { items = await memberActivity(uid, 15); } catch (_) {} }
  if (current?.uid !== uid) return;
  $("mLog").innerHTML = items.length ? items.slice(0, 15).map((l) => `
    <div><b class="ev ev-${escapeHtml(l.event)}"><i class="ev-dot"></i>${escapeHtml(ACTIVITY_LABELS[l.event] || l.event)}</b>
    <span>${escapeHtml([l.device, l.os, l.browser].filter(Boolean).join(" · "))} · ${fmtDate(l.at)}</span></div>`).join("")
    : '<div class="empty">Belum ada aktivitas tercatat.</div>';
}

$("mReset").onclick = async () => {
  const email = current?.m?.email;
  if (!email) return;
  if (!configured) return toast("Mode demo.", "bad");
  if (!confirm(`Kirim link reset password ke ${email}?`)) return;
  try { await adminSendReset(email); toast(`Link reset dikirim ke ${email} ✓`, "ok"); }
  catch (err) { toast(authMessage(err), "bad"); }
};
$("mSaveBadges").onclick = async () => {
  if (!current?.p) return;
  const list = [...$("mBadges").querySelectorAll("input:checked")].map((i) => i.value);
  if (!configured) { profiles[current.uid].badges = list; renderMembers(); return toast("Mode demo: badge diubah di layar saja.", "ok"); }
  try {
    await setBadges(current.uid, list);
    profiles[current.uid] = { ...profiles[current.uid], badges: list };
    renderMembers(); toast("Badge disimpan ✓", "ok");
  } catch (err) { toast(authMessage(err), "bad"); }
};
$("mDelete").onclick = async () => {
  const p = current?.p;
  if (!p) return;
  if (!configured) return toast("Mode demo.", "bad");
  if (!confirm(`Hapus profil @${p.username}? Username dilepas dan bisa diklaim orang lain. Akun login tetap ada.`)) return;
  try {
    await deleteProfile(current.uid, p.username);
    delete profiles[current.uid]; renderMembers(); sheet.classList.remove("open");
    toast("Profil dihapus.", "ok");
  } catch (err) { toast(authMessage(err), "bad"); }
};

// =================== permintaan reset password ===================
function renderResets() {
  updateCounts();
  if (!resets.length) { $("resetList").innerHTML = '<div class="empty">Belum ada permintaan.</div>'; return; }
  $("resetList").innerHTML = resets.map((r) => `
    <div class="req ${r.status === "pending" ? "pending" : ""}">
      <div>
        <b>${escapeHtml(r.email)}</b>
        <small>${r.status === "pending" ? '<span class="pill-s warn">menunggu</span>' : '<span class="pill-s ok">link terkirim</span>'} · ${timeAgo(r.createdAt)}</small>
        ${r.note ? `<small style="display:block;margin-top:4px">“${escapeHtml(r.note)}”</small>` : ""}
      </div>
      <div class="acts">
        ${r.status === "pending" ? `<button class="btn btn-primary" data-send="${escapeHtml(r.id)}">Kirim link reset</button>` : ""}
        <button class="btn btn-ghost" data-dismiss="${escapeHtml(r.id)}">${r.status === "pending" ? "Tolak" : "Hapus"}</button>
      </div>
    </div>`).join("");
}
$("resetList").addEventListener("click", async (e) => {
  const send = e.target.closest("[data-send]"), dis = e.target.closest("[data-dismiss]");
  if (!configured) return toast("Mode demo.", "bad");
  try {
    if (send) {
      const r = resets.find((x) => x.id === send.dataset.send);
      send.disabled = true;
      await adminSendReset(r.email, r.id);
      toast(`Link reset dikirim ke ${r.email} ✓`, "ok");
    }
    if (dis) await dismissReset(dis.dataset.dismiss);
  } catch (err) { toast(authMessage(err), "bad"); if (send) send.disabled = false; }
});
$("manualReset").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!configured) return toast("Mode demo.", "bad");
  const email = e.target.email.value.trim();
  try { await adminSendReset(email); toast(`Kalau ${email} terdaftar, link reset sudah dikirim ✓`, "ok"); e.target.reset(); }
  catch (err) { toast(authMessage(err), "bad"); }
});

// =================== log aktivitas ===================
$("logEvent").innerHTML += Object.entries(ACTIVITY_LABELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
function renderLogs() {
  const q = $("logSearch").value.trim().toLowerCase(), ev = $("logEvent").value, dv = $("logDevice").value;
  const rows = logs.filter((l) => (!q || (l.email || "").toLowerCase().includes(q)) && (!ev || l.event === ev) && (!dv || (l.device || "").startsWith(dv)));
  $("logRows").innerHTML = rows.length ? rows.map((l) => `
    <tr>
      <td class="muted">${fmtDate(l.at)}</td>
      <td>${escapeHtml(l.email || "—")}</td>
      <td><span class="ev ev-${escapeHtml(l.event)}"><i class="ev-dot"></i>${escapeHtml(ACTIVITY_LABELS[l.event] || l.event)}</span></td>
      <td>${escapeHtml(l.device || "—")}</td>
      <td>${escapeHtml(l.os || "—")}</td>
      <td>${escapeHtml(l.browser || "—")}</td>
      <td class="muted" title="${escapeHtml(l.tz || "")}">${escapeHtml(l.region || "—")}</td>
      <td class="muted">${escapeHtml(l.screen || "—")}</td>
    </tr>`).join("") : '<tr><td colspan="8" class="empty">Tidak ada aktivitas.</td></tr>';

  $("recentLog").innerHTML = logs.length ? logs.slice(0, 8).map((l) => `
    <div><b class="ev ev-${escapeHtml(l.event)}"><i class="ev-dot"></i>${escapeHtml(ACTIVITY_LABELS[l.event] || l.event)}</b>
    <span>${escapeHtml(l.email || "")} · ${escapeHtml(l.device || "")} · ${timeAgo(l.at)}</span></div>`).join("")
    : '<div class="empty">Belum ada aktivitas.</div>';
}
["logSearch", "logEvent", "logDevice"].forEach((id) => $(id).addEventListener("input", renderLogs));

// =================== tema & logo ===================
function renderThemes() {
  const cur = site.theme || document.documentElement.dataset.theme || "nebula";
  $("themeGrid").innerHTML = Object.entries(THEMES).map(([k, t]) => `
    <button class="theme-card ${k === cur ? "on" : ""}" data-theme-key="${k}" type="button">
      <span class="chk">✓</span>
      <div class="prev" style="background:${t.bg}">
        <i style="background:${t.swatch[0]}"></i><i style="background:${t.swatch[1]}"></i><i style="background:${t.swatch[2]}"></i><b></b>
      </div>
      <strong>${t.name}</strong><small>${t.desc}</small>
    </button>`).join("");
  const logo = site.logo || "";
  $("logoPrev").style.backgroundImage = logo ? `url("${logo}")` : "";
  $("logoRemove").disabled = !logo;
}
$("themeGrid").addEventListener("click", async (e) => {
  const c = e.target.closest("[data-theme-key]");
  if (!c) return;
  const key = c.dataset.themeKey;
  applyTheme(key); site.theme = key; renderThemes();
  if (!configured) return toast(`Tema ${THEMES[key].name} (demo, tidak disimpan)`, "ok");
  try { await saveSiteSettings({ theme: key }); toast(`Tema ${THEMES[key].name} diterapkan ke seluruh situs ✓`, "ok"); }
  catch (err) { toast(authMessage(err), "bad"); }
});

async function handleLogo(file) {
  if (!file) return;
  try {
    const data = await resizeLogo(file);
    applyLogo(data); site.logo = data; renderThemes();
    if (!configured) return toast("Logo diganti (demo, tidak disimpan).", "ok");
    await saveSiteSettings({ logo: data });
    toast("Logo diperbarui ✓", "ok");
  } catch (err) { toast(err.message || authMessage(err), "bad"); }
  finally { $("logoFile").value = ""; }
}
$("logoFile").addEventListener("change", (e) => handleLogo(e.target.files[0]));
const ld = $("logoDrop");
["dragenter", "dragover"].forEach((t) => ld.addEventListener(t, (e) => { e.preventDefault(); ld.classList.add("over"); }));
["dragleave", "drop"].forEach((t) => ld.addEventListener(t, (e) => { e.preventDefault(); ld.classList.remove("over"); }));
ld.addEventListener("drop", (e) => handleLogo(e.dataTransfer.files[0]));
$("logoRemove").onclick = async () => {
  applyLogo(""); site.logo = ""; renderThemes();
  if (!configured) return;
  try { await saveSiteSettings({ logo: "" }); toast("Logo bawaan dipakai lagi.", "ok"); } catch (err) { toast(authMessage(err), "bad"); }
};

// =================== masuk ke panel ===================
async function ensureSuperBadges(uid) {
  try {
    const p = await getMyProfile(uid);
    if (!p) return;
    const have = new Set(p.badges || []);
    if (SUPERADMIN_BADGES.every((b) => have.has(b))) return;
    await setBadges(uid, [...SUPERADMIN_BADGES, ...have]);
  } catch (err) { console.warn("superadmin badges:", err); }
}

function enterAdmin(email) {
  $("adminEmail").textContent = email;
  $("adminBadges").innerHTML = badgesHtml(SUPERADMIN_BADGES);
  ["bellBtn", "acctBtn", "outBtn"].forEach((id) => ($(id).hidden = false));
  let tab = "overview";
  try { tab = sessionStorage.getItem("bohye.adminTab") || tab; } catch (_) {}
  goto(tab);
  show("admin");
}

if (!configured) {
  // ---------- mode demo ----------
  const now = Date.now(), ts = (m) => ({ toDate: () => new Date(now - m * 60000), toMillis: () => now - m * 60000 });
  notifs = [
    { id: "a", uid: "a", name: "Rani", email: "rani@contoh.com", read: false, createdAt: ts(2) },
    { id: "b", uid: "b", name: "", email: "budi.s@contoh.com", read: false, createdAt: ts(48) },
    { id: "c", uid: "c", name: "Kai", email: "kai@contoh.com", read: true, createdAt: ts(60 * 26) }
  ];
  members = notifs.map((n, i) => ({ uid: n.id, email: n.email, name: n.name, createdAt: n.createdAt, emailVerified: i !== 1, lastLoginAt: ts(5 + i * 90) }));
  profiles = { c: { username: "kai", views: 312, badges: ["gamer", "og"], links: [{}, {}], displayName: "Kai" }, a: { username: "rani", views: 41, badges: ["creator"], displayName: "Rani", bio: "suka foto senja" } };
  resets = [{ id: "budi.s@contoh.com", email: "budi.s@contoh.com", status: "pending", note: "Lupa password, tolong reset ya", createdAt: ts(12) }];
  logs = [
    { uid: "a", email: "rani@contoh.com", event: "login", device: "HP", os: "Android", browser: "Chrome 129", region: "Jakarta, Asia", tz: "Asia/Jakarta", screen: "412×915", at: ts(5) },
    { uid: "a", email: "rani@contoh.com", event: "signup", device: "HP", os: "Android", browser: "Chrome 129", region: "Jakarta, Asia", tz: "Asia/Jakarta", screen: "412×915", at: ts(2 + 0.5) },
    { uid: "c", email: "kai@contoh.com", event: "profile_save", device: "Desktop", os: "Windows", browser: "Edge 130", region: "Makassar, Asia", tz: "Asia/Makassar", screen: "1920×1080", at: ts(95) },
    { uid: "b", email: "budi.s@contoh.com", event: "login", device: "HP · aplikasi", os: "iOS", browser: "Safari 18", region: "Jayapura, Asia", tz: "Asia/Jayapura", screen: "390×844", at: ts(185) }
  ];
  enterAdmin("demo@contoh.com");
  renderNotifs(); renderMembers(); renderResets(); renderLogs(); renderThemes();
} else {
  onUser(async (user) => {
    subs.splice(0).forEach((u) => u());
    if (!user) return show("needLogin");
    show("loading");
    try { await bootstrapAdmin(user); } catch (err) { console.warn("bootstrap:", err); }
    if (!(await isAdmin(user.uid))) { $("deniedEmail").textContent = user.email; return show("denied"); }

    me = user;
    enterAdmin(user.email);
    ensureSuperBadges(user.uid).then(loadMembers);
    loadMembers();

    subs.push(watchNotifications((items, snap) => {
      const added = new Set();
      if (!firstNotif) {
        snap.docChanges().forEach((c) => {
          if (c.type !== "added") return;
          added.add(c.doc.id);
          const d = c.doc.data();
          announce("Anggota baru mendaftar", d.name ? `${d.name} (${d.email})` : d.email, c.doc.id);
        });
        if (added.size) loadMembers();
      }
      firstNotif = false; notifs = items; renderNotifs(added);
    }, (err) => toast("Notifikasi gagal dimuat: " + authMessage(err), "bad")));

    subs.push(watchResetRequests((items) => {
      if (!firstReset) {
        items.filter((r) => r.status === "pending" && !resets.some((o) => o.id === r.id && o.status === "pending"))
          .forEach((r) => announce("Permintaan reset password", r.email, "reset-" + r.id));
      }
      firstReset = false; resets = items; renderResets();
    }, (err) => toast("Permintaan reset gagal dimuat: " + authMessage(err), "bad")));

    subs.push(watchActivity((items) => { logs = items; renderLogs(); },
      (err) => toast("Log gagal dimuat: " + authMessage(err), "bad")));

    subs.push(watchSiteSettings((s) => { site = s; renderThemes(); }));
  });
}
