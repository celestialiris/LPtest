# ✦ glint — landing page bio-link (GitHub + Firebase)

Landing page bio-link bergaya gelap, glow & glassmorphism. Pengguna bisa **klaim username**, **login dengan GitHub/Google**, mengedit profil di **dashboard**, dan punya halaman publik `domainkamu/username` lengkap dengan penghitung views.

Tanpa build tool — cukup HTML, CSS & JavaScript (ES modules) + Firebase SDK dari CDN.

```
glint/
├── index.html          ← landing page
├── dashboard.html      ← editor profil (perlu login)
├── profile.html        ← halaman profil publik (?u=username)
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
5. **Build → Authentication → Get started → Sign-in method**:
   - **Email/Password** → Enable. Lalu tab **Users → Add user** untuk membuat akun (email + password). Pemilik akun bisa mengganti email & password sendiri di **Dashboard → Akun & keamanan**.
   - **Google** → Enable.
   - **GitHub** → Enable. Firebase akan menampilkan *callback URL* seperti `https://PROJECT.firebaseapp.com/__/auth/handler`. Lanjut ke langkah 2.

## 2. Buat GitHub OAuth App (untuk login GitHub)

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. *Homepage URL*: URL situsmu nanti (mis. `https://USERNAME.github.io/glint`).
3. *Authorization callback URL*: tempel callback URL dari Firebase tadi.
4. Salin **Client ID** dan buat **Client secret** → tempel keduanya di pengaturan provider GitHub di Firebase → **Save**.

## 3. Deploy ke GitHub Pages

```bash
cd glint
git init && git add . && git commit -m "glint landing page"
git branch -M main
git remote add origin https://github.com/USERNAME/glint.git
git push -u origin main
```

Lalu di repo GitHub: **Settings → Pages → Source: Deploy from a branch → `main` / root → Save**. Situs akan aktif di `https://USERNAME.github.io/glint/`.

**Penting:** tambahkan domain GitHub Pages ke Firebase → **Authentication → Settings → Authorized domains → Add domain** → `USERNAME.github.io`. Tanpa ini popup login akan ditolak.

Profil bisa dibuka di `https://USERNAME.github.io/glint/namauser` — `404.html` otomatis mengarahkannya ke halaman profil.

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
usernames/{username}  →  { uid }
users/{uid}           →  { username, displayName, bio, avatar, bg, accent, links[], views, createdAt }
```

Klaim username memakai transaksi, sehingga dua orang tidak bisa mengambil nama yang sama. Rules membatasi: satu akun = satu username, hanya pemilik yang bisa mengedit profil, dan pengunjung hanya bisa menambah `views` sebanyak 1.

## Catatan

- `apiKey` Firebase memang aman ada di kode publik; keamanan dijaga oleh `firestore.rules`.
- Bagian "Premium" di halaman harga hanya tampilan — belum terhubung ke sistem pembayaran.
