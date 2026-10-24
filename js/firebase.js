import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, updateProfile,
  sendPasswordResetEmail, EmailAuthProvider,
  reauthenticateWithCredential, updatePassword, updateEmail, verifyBeforeUpdateEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch, runTransaction,
  serverTimestamp, increment, collection, getCountFromServer, query, orderBy, limit, onSnapshot, where, addDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { deviceInfo } from "./device.js";
import { firebaseConfig, SITE_NAME, SITE_DOMAIN, SUPERADMIN_EMAIL } from "../firebase-config.js";

export { SITE_NAME, SITE_DOMAIN, SUPERADMIN_EMAIL };
export const configured = !String(firebaseConfig.apiKey).startsWith("YOUR");

let auth = null, db = null;
if (configured) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

export const USERNAME_RE = /^[a-z0-9_.]{2,20}$/;
export const RESERVED = new Set([
  "admin", "api", "app", "login", "logout", "dashboard", "profile", "settings", "help",
  "support", "about", "pricing", "terms", "privacy", "index", "404", "www", "root", "glint", "bohye", "bohyepage", "superadmin", "developer", "official"
]);

export function validUsername(n) {
  return USERNAME_RE.test(n) && !RESERVED.has(n);
}

export function onUser(cb) {
  if (!configured) { cb(null); return () => {}; }
  return onAuthStateChanged(auth, cb);
}

export async function logout() {
  if (!configured) return;
  if (auth.currentUser) { try { await logActivity("logout", auth.currentUser); } catch (_) {} }
  return signOut(auth);
}

// ---------- Email & password ----------
export async function signInEmail(email, password) {
  if (!configured) throw new Error("not-configured");
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  logActivity("login", cred.user);
  touchMember(cred.user);
  return cred;
}

// Daftar akun baru → simpan data anggota → kirim notifikasi ke superadmin
export async function signUpEmail(name, email, password) {
  if (!configured) throw new Error("not-configured");
  pendingSignupName = String(name || "").slice(0, 40);
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const user = cred.user;
  if (name) { try { await updateProfile(user, { displayName: name.slice(0, 40) }); } catch (_) {} }
  try { await ensureMember(user, name); } catch (err) { console.warn("ensureMember:", err); }
  try { await sendEmailVerification(user); } catch (_) {}
  logActivity("signup", user);
  return user;
}

// Membuat members/{uid} + notifications/{uid} bila belum ada (sekali per akun).
// Dipanggil dari beberapa tempat sekaligus, jadi dideduplikasi per UID.
const memberJobs = new Map();
let pendingSignupName = "";
export function ensureMember(user, name = "") {
  if (!configured || !user) return Promise.resolve();
  if (!memberJobs.has(user.uid)) {
    const job = _ensureMember(user, name).catch((err) => { memberJobs.delete(user.uid); throw err; });
    memberJobs.set(user.uid, job);
  }
  return memberJobs.get(user.uid);
}
async function _ensureMember(user, name) {
  const ref = doc(db, "members", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    if (snap.data().email !== user.email) { try { await updateDoc(ref, { email: user.email }); } catch (_) {} }
    return;
  }
  const displayName = String(name || pendingSignupName || user.displayName || "").slice(0, 40);
  const batch = writeBatch(db);
  batch.set(ref, { email: user.email, name: displayName, createdAt: serverTimestamp() });
  if (user.email?.toLowerCase() !== SUPERADMIN_EMAIL.toLowerCase()) {
    batch.set(doc(db, "notifications", user.uid), {
      type: "signup", uid: user.uid, email: user.email, name: displayName,
      read: false, createdAt: serverTimestamp()
    });
  }
  await batch.commit();
}

export async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email.trim());
}

export function hasPasswordLogin(user) {
  return !!user && user.providerData.some((p) => p.providerId === "password");
}

// Firebase meminta login ulang (password saat ini) sebelum mengubah email/password
async function reauth(currentPassword) {
  const u = auth.currentUser;
  const cred = EmailAuthProvider.credential(u.email, currentPassword);
  await reauthenticateWithCredential(u, cred);
  return u;
}

export async function changePassword(currentPassword, newPassword) {
  const u = await reauth(currentPassword);
  await updatePassword(u, newPassword);
  logActivity("password_change", u);
}

// "updated" bila langsung berubah, atau "verify" bila Firebase mengirim link verifikasi ke email baru.
export async function changeEmail(currentPassword, newEmail) {
  const u = await reauth(currentPassword);
  try {
    await updateEmail(u, newEmail.trim());
    try { await updateDoc(doc(db, "members", u.uid), { email: newEmail.trim() }); } catch (_) {}
    logActivity("email_change", u);
    return "updated";
  } catch (err) {
    if (err.code === "auth/operation-not-allowed") {
      await verifyBeforeUpdateEmail(u, newEmail.trim());
      return "verify";
    }
    throw err;
  }
}

export function authMessage(err) {
  const m = {
    "auth/invalid-credential": "Email atau password salah.",
    "auth/wrong-password": "Password salah.",
    "auth/user-not-found": "Akun tidak ditemukan.",
    "auth/invalid-email": "Format email tidak valid.",
    "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi nanti.",
    "auth/weak-password": "Password minimal 6 karakter.",
    "auth/email-already-in-use": "Email itu sudah terdaftar. Silakan masuk.",
    "auth/requires-recent-login": "Silakan keluar lalu masuk lagi, kemudian ulangi.",
    "auth/operation-not-allowed": "Login Email/Password belum diaktifkan di Firebase.",
    "auth/unauthorized-domain": "Domain ini belum ada di Authorized domains Firebase.",
    "auth/network-request-failed": "Koneksi bermasalah. Coba lagi.",
    "permission-denied": "Akses ditolak — cek firestore.rules sudah dipublish."
  };
  return m[err?.code] || (err?.code || err?.message || "Terjadi kesalahan.");
}

// ---------- Superadmin ----------
export async function isAdmin(uid) {
  if (!configured || !uid) return false;
  try { return (await getDoc(doc(db, "admins", uid))).exists(); } catch (_) { return false; }
}

// Sekali saja: akun dengan SUPERADMIN_EMAIL mendaftarkan dirinya sebagai superadmin.
// Setelah itu terkunci (meta/admin), jadi email superadmin boleh diganti kapan pun.
export async function bootstrapAdmin(user) {
  if (!user || user.email?.toLowerCase() !== SUPERADMIN_EMAIL.toLowerCase()) return false;
  const lock = await getDoc(doc(db, "meta", "admin"));
  if (lock.exists()) return lock.data().uid === user.uid;
  const batch = writeBatch(db);
  batch.set(doc(db, "admins", user.uid), { email: user.email, createdAt: serverTimestamp() });
  batch.set(doc(db, "meta", "admin"), { uid: user.uid, createdAt: serverTimestamp() });
  await batch.commit();
  return true;
}

export function watchNotifications(cb, onErr) {
  const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(100));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })), snap), onErr);
}

export const markRead = (id) => updateDoc(doc(db, "notifications", id), { read: true });

export async function markAllRead(items) {
  const batch = writeBatch(db);
  items.filter((n) => !n.read).forEach((n) => batch.update(doc(db, "notifications", n.id), { read: true }));
  await batch.commit();
}

export async function listMembers() {
  const snap = await getDocs(query(collection(db, "members"), orderBy("createdAt", "desc"), limit(500)));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

export async function listProfiles() {
  const snap = await getDocs(collection(db, "users"));
  const map = {};
  snap.docs.forEach((d) => (map[d.id] = d.data()));
  return map;
}

// Admin: hapus profil publik & lepaskan username (akun login tetap ada)
export async function deleteProfile(uid, username) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "users", uid));
  if (username) batch.delete(doc(db, "usernames", username));
  await batch.commit();
}

// ---------- Username & profil ----------
export async function isAvailable(name) {
  if (!validUsername(name)) return false;
  if (!configured) return !["demo", "nova", "kai"].includes(name);
  const snap = await getDoc(doc(db, "usernames", name));
  return !snap.exists();
}

export async function getMyProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function claim(name, user) {
  if (!validUsername(name)) throw new Error("invalid");
  await runTransaction(db, async (tx) => {
    const nameRef = doc(db, "usernames", name);
    const userRef = doc(db, "users", user.uid);
    const nameSnap = await tx.get(nameRef);
    const userSnap = await tx.get(userRef);
    if (nameSnap.exists()) throw new Error("taken");
    if (userSnap.exists()) throw new Error("has-username");
    tx.set(nameRef, { uid: user.uid });
    tx.set(userRef, {
      username: name,
      displayName: (user.displayName || name).slice(0, 40),
      bio: "",
      avatar: user.photoURL || "",
      accent: "#a855f7",
      bg: "",
      links: [],
      badges: [],
      bgYoutube: "",
      bgBlur: 6,
      overlayColor: "#000000",
      overlayOpacity: 35,
      videoShape: "landscape",
      videoSound: true,
      videoVolume: 50,
      views: 0,
      createdAt: serverTimestamp()
    });
  });
}

export async function saveProfile(uid, data, before = {}) {
  await updateDoc(doc(db, "users", uid), data);
  logActivity("bgYoutube" in data && data.bgYoutube !== (before.bgYoutube || "") ? "video_upload" : "profile_save");
}

export async function countUsers() {
  if (!configured) return 12480;
  const snap = await getCountFromServer(collection(db, "users"));
  return snap.data().count;
}

export async function loadPublic(name) {
  if (!configured) {
    return {
      uid: "demo", username: name || "demo", displayName: "Nova", views: 2841,
      bio: "designer · night owl · building cool things ✦",
      avatar: "", accent: "#a855f7", bg: "", bgYoutube: "", bgBlur: 6, overlayColor: "#1e1b4b", overlayOpacity: 35,
      badges: ["verified", "developer", "gamer"],
      links: [
        { title: "GitHub", url: "https://github.com" },
        { title: "Instagram", url: "https://instagram.com" },
        { title: "Portfolio", url: "https://example.com" }
      ]
    };
  }
  const nameSnap = await getDoc(doc(db, "usernames", name));
  if (!nameSnap.exists()) return null;
  const uid = nameSnap.data().uid;
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { uid, ...snap.data() } : null;
}

export async function addView(uid) {
  if (!configured) return;
  try { await updateDoc(doc(db, "users", uid), { views: increment(1) }); } catch (_) {}
}

export function profileUrl(name) {
  // Link cantik: domain/username (diarahkan oleh 404.html ke profile.html?u=username)
  return new URL(encodeURIComponent(name), location.href).href;
}

// ---------- util ----------
export function toast(msg, type = "") {
  let box = document.querySelector(".toasts");
  if (!box) { box = document.createElement("div"); box.className = "toasts"; document.body.append(box); }
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  box.append(t);
  setTimeout(() => t.classList.add("out"), 3600);
  setTimeout(() => t.remove(), 4100);
}

export function escapeHtml(s = "") {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function safeUrl(u = "") {
  try {
    const url = new URL(u.includes("://") ? u : `https://${u}`);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.href : "#";
  } catch { return "#"; }
}

export function fmtDate(ts) {
  const d = ts?.toDate ? ts.toDate() : ts instanceof Date ? ts : null;
  if (!d) return "baru saja";
  return d.toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function timeAgo(ts) {
  const d = ts?.toDate ? ts.toDate() : null;
  if (!d) return "baru saja";
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "baru saja";
  if (s < 3600) return `${Math.floor(s / 60)} menit lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  return `${Math.floor(s / 86400)} hari lalu`;
}

// =====================================================================
//  Pengaturan situs (tema & logo) — hanya superadmin yang bisa mengubah
// =====================================================================
export function watchSiteSettings(cb) {
  if (!configured) { cb({}); return () => {}; }
  return onSnapshot(doc(db, "settings", "site"), (s) => cb(s.exists() ? s.data() : {}), () => cb({}));
}

export async function saveSiteSettings(data) {
  await setDoc(doc(db, "settings", "site"), { ...data, updatedAt: serverTimestamp() }, { merge: true });
  logActivity("site_settings");
}

// =====================================================================
//  Badge — hanya superadmin
// =====================================================================
export async function setBadges(uid, badges) {
  await updateDoc(doc(db, "users", uid), { badges: [...new Set(badges)].slice(0, 12) });
  logActivity("badge_update");
}

// =====================================================================
//  Permintaan reset password
//  Password tidak pernah bisa dilihat siapa pun (disimpan ter-hash oleh Firebase).
//  Superadmin mengirim link reset resmi Firebase ke email anggota.
// =====================================================================
const reqId = (email) => email.trim().toLowerCase();

export async function requestAdminReset(email, note = "") {
  const id = reqId(email);
  await setDoc(doc(db, "resetRequests", id), {
    email: id, note: String(note).slice(0, 200), status: "pending", createdAt: serverTimestamp()
  });
}

export function watchResetRequests(cb, onErr) {
  const q = query(collection(db, "resetRequests"), orderBy("createdAt", "desc"), limit(100));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), onErr);
}

export async function adminSendReset(email, requestId) {
  await sendPasswordResetEmail(auth, email.trim());
  if (requestId) {
    await updateDoc(doc(db, "resetRequests", requestId), { status: "done", handledAt: serverTimestamp() });
  }
  logActivity("admin_reset_sent");
}

export const dismissReset = (id) => deleteDoc(doc(db, "resetRequests", id));

// =====================================================================
//  Log aktivitas — perangkat, OS, browser, waktu, zona waktu (tanpa GPS/IP)
// =====================================================================
export const ACTIVITY_LABELS = {
  signup: "Mendaftar", login: "Masuk", logout: "Keluar",
  password_change: "Ganti password", email_change: "Ganti email",
  profile_save: "Simpan profil", video_upload: "Ganti video YouTube",
  site_settings: "Ubah tema/logo", badge_update: "Ubah badge", admin_reset_sent: "Kirim link reset"
};

export async function logActivity(event, user = auth?.currentUser) {
  if (!configured || !user || !ACTIVITY_LABELS[event]) return;
  try {
    await addDoc(collection(db, "activity"), {
      uid: user.uid, email: user.email || "", event, ...deviceInfo(), at: serverTimestamp()
    });
  } catch (err) { console.warn("activity:", err.code || err.message); }
}

export function watchActivity(cb, onErr, max = 200) {
  const q = query(collection(db, "activity"), orderBy("at", "desc"), limit(max));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), onErr);
}

export async function memberActivity(uid, max = 20) {
  // Tanpa orderBy agar tidak butuh composite index; diurutkan di browser.
  const snap = await getDocs(query(collection(db, "activity"), where("uid", "==", uid), limit(200)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.at?.toMillis?.() || 0) - (a.at?.toMillis?.() || 0)).slice(0, max);
}

// Catat waktu login terakhir & status verifikasi email di data anggota
export async function touchMember(user) {
  if (!configured || !user) return;
  try {
    await ensureMember(user);
    await updateDoc(doc(db, "members", user.uid), {
      email: user.email, emailVerified: !!user.emailVerified, lastLoginAt: serverTimestamp()
    });
  } catch (_) {}
}
