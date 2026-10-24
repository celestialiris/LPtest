import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, GithubAuthProvider, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut,
  signInWithEmailAndPassword, sendPasswordResetEmail, EmailAuthProvider,
  reauthenticateWithCredential, updatePassword, updateEmail, verifyBeforeUpdateEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, updateDoc, runTransaction, serverTimestamp, increment,
  collection, getCountFromServer
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, SITE_NAME, SITE_DOMAIN } from "../firebase-config.js";

export { SITE_NAME, SITE_DOMAIN };
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
  "support", "about", "pricing", "terms", "privacy", "index", "404", "www", "root", "glint"
]);

export function validUsername(n) {
  return USERNAME_RE.test(n) && !RESERVED.has(n);
}

export function onUser(cb) {
  if (!configured) { cb(null); return () => {}; }
  return onAuthStateChanged(auth, cb);
}

export async function signIn(kind) {
  if (!configured) throw new Error("not-configured");
  const provider = kind === "github" ? new GithubAuthProvider() : new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export const logout = () => configured && signOut(auth);

// ---------- Email & password ----------
export async function signInEmail(email, password) {
  if (!configured) throw new Error("not-configured");
  return signInWithEmailAndPassword(auth, email.trim(), password);
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
}

// Mengembalikan "updated" bila langsung berubah, atau "verify" bila
// Firebase mengirim link verifikasi ke email baru (default di project baru).
export async function changeEmail(currentPassword, newEmail) {
  const u = await reauth(currentPassword);
  try {
    await updateEmail(u, newEmail.trim());
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
    "auth/email-already-in-use": "Email itu sudah dipakai akun lain.",
    "auth/requires-recent-login": "Silakan keluar lalu masuk lagi, kemudian ulangi.",
    "auth/operation-not-allowed": "Metode login ini belum diaktifkan di Firebase.",
    "auth/unauthorized-domain": "Domain ini belum ada di Authorized domains Firebase.",
    "auth/popup-closed-by-user": "Login dibatalkan.",
    "auth/account-exists-with-different-credential": "Email ini sudah terdaftar lewat metode login lain."
  };
  return m[err?.code] || (err?.code || err?.message || "Terjadi kesalahan.");
}

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
      views: 0,
      createdAt: serverTimestamp()
    });
  });
}

export async function saveProfile(uid, data) {
  await updateDoc(doc(db, "users", uid), data);
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
      avatar: "", accent: "#a855f7", bg: "",
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

export function toast(msg, type = "") {
  let box = document.querySelector(".toasts");
  if (!box) { box = document.createElement("div"); box.className = "toasts"; document.body.append(box); }
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  box.append(t);
  setTimeout(() => t.classList.add("out"), 3200);
  setTimeout(() => t.remove(), 3700);
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
