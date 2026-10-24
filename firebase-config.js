// Konfigurasi Firebase project "lptest-4a4c2".
// apiKey ini memang aman berada di kode publik — keamanan dijaga oleh firestore.rules
// dan daftar Authorized domains di Firebase Authentication.
export const firebaseConfig = {
  apiKey: "AIzaSyAJpe9jGClwibrIf4hlW8_JAZXMjOQgmVY",
  authDomain: "lptest-4a4c2.firebaseapp.com",
  projectId: "lptest-4a4c2",
  storageBucket: "lptest-4a4c2.firebasestorage.app",
  messagingSenderId: "306053053723",
  appId: "1:306053053723:web:3f61aed8bcf59def68a7be"
};

// Nama & domain yang tampil di UI — ganti sesuka kamu.
export const SITE_NAME = "glint";
export const SITE_DOMAIN = "celestialiris.github.io/LPtest";

// Email akun superadmin (dibuat manual di Firebase Console → Authentication → Users).
// Dipakai sekali saat superadmin pertama kali membuka admin.html; setelah itu
// hak admin terikat ke UID akun, jadi email & password boleh diganti kapan saja.
// HARUS sama dengan email di firestore.rules (fungsi bootstrapEmail).
export const SUPERADMIN_EMAIL = "asdf@asdf.com";
