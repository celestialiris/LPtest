# ✦ glint — landing page bio-link (GitHub + Firebase)

Landing page bio-link bergaya gelap, glow & glassmorphism. Pengguna bisa **daftar dengan email**, **klaim username**, mengedit profil di **dashboard**, dan punya halaman publik `domainkamu/username` lengkap dengan penghitung views.

Tanpa build tool — cukup HTML, CSS & JavaScript (ES modules) + Firebase SDK dari CDN.

```
glint/
├── index.html          ← landing page
├── dashboard.html      ← editor profil (perlu login)
├── profile.html        ← halaman profil publik (?u=username)
├── admin.html          ← panel superadmin (notifikasi pendaftar + daftar anggota)
├── 404.html            ← mengubah /username → profile.html?u=username
├── firebase-config.js  ← ⚠️ ISI KONFIGURASI FIREBASE DI SINI
├── firestore.rules     ← aturan keamanan database
├── firebase.json
├── css/style.css
└── js/ (firebase.js, app.js, dashboard.js, profile.js, card.js, ui.js)
```

> Selama `firebase-config.js` masih berisi `YOUR_...`, situs berjalan dalam **mode demo** (tampilan lengkap, data contoh, tidak bisa login/simpan).

---

## 1. Siapkan Firebase

1. Buka <https://console.firebase.google.com> → **Add project**.
2. **Project settings → General → Your apps → Web (</>)** → daftarkan aplikasi → salin objek `firebaseConfig` ke `firebase-config.js`.
3. **Build → Firestore Database → Create database** (mode *production*, region terdekat, mis. `asia-southeast2` Jakarta).
4. Tab **Rules** → tempel isi `firestore.rules` → **Publish**.
5. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable.**

## 2. Buat akun superadmin (lakukan SEBELUM situs dipakai orang lain)

1. **Authentication → Users → Add user** → email `asdf@asdf.com` + password pilihanmu.
2. Publish `firestore.rules` (langkah 1.4).
3. Buka `https://USERNAME.github.io/LPtest/admin.html` dan masuk dengan akun itu. Pada login pertama, akun otomatis didaftarkan sebagai superadmin lalu **dikunci** — tidak ada akun lain yang bisa menjadi superadmin setelahnya.
4. Setelah itu email & password superadmin boleh diganti di **Akun saya → Akun & keamanan**; hak admin terikat ke akun (UID), bukan ke email.

Email superadmin awal diatur di dua tempat yang harus sama: `SUPERADMIN_EMAIL` di `firebase-config.js` dan `bootstrapEmail()` di `firestore.rules`.

### Notifikasi pendaftaran

Setiap orang yang mendaftar membuat satu dokumen di `notifications/{uid}`. Panel admin mendengarkannya secara real-time: muncul toast + bunyi, badge 🔔 dan judul tab bertambah, dan notifikasi browser bila diaktifkan (tombol "Aktifkan notifikasi browser"). Notifikasi muncul selama `admin.html` terbuka; pendaftar yang masuk saat panel tertutup tetap terlihat sebagai "belum dibaca" saat panel dibuka lagi.

> Notifikasi lewat **email** ke superadmin butuh Cloud Functions (paket Blaze) atau layanan seperti EmailJS — belum termasuk.

## 3. Deploy ke GitHub Pages

```bash
cd glint
git init && git add . && git commit -m "glint landing page"
git branch -M main
git remote add origin https://github.com/USERNAME/LPtest.git
git push -u origin main
```

Lalu di repo GitHub: **Settings → Pages → Source: Deploy from a branch → `main` / root → Save**. Situs akan aktif di `https://USERNAME.github.io/LPtest/`.

**Penting:** tambahkan domain GitHub Pages ke Firebase → **Authentication → Settings → Authorized domains → Add domain** → `USERNAME.github.io`. Tanpa ini popup login akan ditolak.

Profil bisa dibuka di `https://USERNAME.github.io/LPtest/namauser` — `404.html` otomatis mengarahkannya ke halaman profil.

### Alternatif: Firebase Hosting

```bash
npm i -g firebase-tools
firebase login
firebase use --add            # pilih project kamu
firebase deploy               # deploy hosting + firestore rules sekaligus
```

## 4. Kustomisasi

| Ingin mengubah… | Edit |
|---|---|
| Nama & domain yang tampil | `SITE_NAME`, `SITE_DOMAIN` di `firebase-config.js` |
| Warna utama (ungu/pink/indigo) | variabel `--a1`, `--a2`, `--a3` di `css/style.css` |
| Teks hero, fitur, harga, FAQ | `index.html` |
| Username terlarang | `RESERVED` di `js/firebase.js` |

## Struktur data Firestore

```
usernames/{username}    →  { uid }
users/{uid}             →  { username, displayName, bio, avatar, bg, accent, links[], views, createdAt }   (publik)
members/{uid}           →  { email, name, createdAt }                     (pemilik & admin saja)
notifications/{uid}     →  { type, uid, email, name, read, createdAt }    (admin saja)
admins/{uid}, meta/admin →  penanda superadmin
```

Klaim username memakai transaksi, sehingga dua orang tidak bisa mengambil nama yang sama. Rules membatasi: satu akun = satu username, hanya pemilik yang bisa mengedit profil, dan pengunjung hanya bisa menambah `views` sebanyak 1.

## Catatan

- `apiKey` Firebase memang aman ada di kode publik; keamanan dijaga oleh `firestore.rules`.
- Bagian "Premium" di halaman harga hanya tampilan — belum terhubung ke sistem pembayaran.
