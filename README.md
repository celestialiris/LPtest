# ✦ Bohye Page — v2.0.0

Situs bio-link dengan Firebase (Auth, Firestore, Storage), di-host di GitHub Pages, dan bisa dipasang sebagai aplikasi (PWA) di Android, iOS & PC.

© Bohye 2026 Darkness 666

```
LPtest/
├── index.html            landing + daftar / masuk / lupa password
├── dashboard.html        editor profil anggota (video background, blur, akun)
├── profile.html          profil publik (/username)
├── admin.html            panel superadmin
├── 404.html              /username → profile.html?u=username
├── manifest.webmanifest  PWA
├── sw.js                 service worker (cache & offline)
├── version.js            versi aplikasi + copyright  ← naikkan setiap update
├── firebase-config.js    konfigurasi Firebase + email superadmin
├── firestore.rules       aturan database
├── storage.rules         aturan upload video
├── css/  style.css, themes.css
├── icons/
└── js/   firebase.js  ui.js  site.js  pwa.js  device.js  badges.js  card.js
          app.js  dashboard.js  profile.js  admin.js  theme-boot.js  redirect.js
```

Semua JavaScript ada di file `.js` terpisah — tidak ada script di dalam HTML.

---

## 1. Setup Firebase

1. **Authentication → Sign-in method → Email/Password → Enable.**
2. **Authentication → Users → Add user** → buat akun superadmin (`asdf@asdf.com` + password kuat).
3. **Authentication → Settings → Authorized domains** → tambahkan `celestialiris.github.io`.
4. **Firestore → Rules** → tempel isi `firestore.rules` → **Publish**.
5. **Storage** (untuk video background):
   - Firebase mewajibkan paket **Blaze** untuk Storage di project baru. Pemakaian kecil tetap gratis dalam kuota; pasang *budget alert* di Google Cloud agar aman.
   - **Storage → Get started** → **Rules** → tempel isi `storage.rules` → **Publish**.
   - Tanpa Storage, semua fitur lain tetap jalan; hanya upload video yang gagal.
6. Buka `https://celestialiris.github.io/LPtest/admin.html` dan **langsung masuk** dengan akun superadmin. Login pertama ini mengaktifkan & mengunci status superadmin.

## 2. Deploy ke GitHub Pages

Upload semua file ke repo `LPtest` (branch `main`, root). **Settings → Pages → Deploy from a branch → main / root.**

Setiap kali mengubah file, **naikkan `APP_VERSION` di `version.js`** (mis. `2.0.1`). Aplikasi yang sudah terpasang akan menampilkan tombol **Perbarui**.

---

## Fitur

### Superadmin (`admin.html`)
| Tab | Isi |
|---|---|
| **Ringkasan** | Pendaftaran baru (live, bunyi + notifikasi browser) & aktivitas terbaru |
| **Anggota** | Tabel semua anggota → **Detail**: email, status verifikasi, UID, tanggal bergabung, login terakhir, profil, views, aktivitas; tombol **kirim link reset password**, **beri badge**, hapus profil |
| **Reset password** | Permintaan dari anggota yang lupa password + form kirim link reset manual |
| **Log aktivitas** | Daftar, masuk, keluar, ganti password/email, simpan profil, upload video, dll. — dengan perangkat, OS, browser, waktu, lokasi perkiraan & ukuran layar |
| **Tampilan** | Pilih 1 dari 4 tema & upload logo situs (berlaku langsung untuk semua pengunjung) |

Superadmin otomatis mendapat badge **Verified** + **Developer**.

**Tentang password:** password anggota tidak bisa dilihat oleh siapa pun, termasuk superadmin — Firebase menyimpannya sebagai hash yang tidak bisa dibalik, dan situs ini tidak pernah menyalinnya. Superadmin mengelola password dengan **mengirim link reset resmi Firebase** ke email anggota; anggota lalu membuat password barunya sendiri.

**Tentang lokasi di log:** diperkirakan dari zona waktu perangkat (mis. `Asia/Jakarta` → "Jakarta, Asia"). Tidak memakai GPS dan tidak menyimpan alamat IP.

### Tema
**Nebula** (ungu–pink), **Aurora** (hijau–toska), **Inferno** (merah–bara, nuansa darkness), **Frost** (kaca es biru, paling blur). Semua memakai efek kaca blur. Hanya superadmin yang bisa mengganti (dijaga oleh `firestore.rules`).

### Badge
Verified, Developer, Gamer, Technician, Creator, Moderator, VIP, Streamer, Musician, Artist, Supporter, OG Member. Hanya superadmin yang bisa memberi/mencabut. Tambah badge baru di `js/badges.js`.

### Anggota
Daftar dengan email sendiri, klaim username, atur profil, upload **video background** (MP4/WebM/MOV, maks. 25 MB, otomatis tanpa suara & berulang) dengan **slider blur 0–20 px**. Lupa password → kirim link sendiri, atau **minta bantuan superadmin**.

### PWA
- **Android / PC (Chrome, Edge):** muncul tombol **Pasang** otomatis, atau klik "📲 Pasang aplikasi" di footer.
- **iPhone / iPad (Safari):** ikuti panduan yang muncul — Bagikan → **Tambah ke Layar Utama**.

---

## Struktur data Firestore

```
users/{uid}              profil publik (+ badges, bgVideo, bgBlur)
usernames/{name}         kunci username unik
members/{uid}            email, nama, status verifikasi, login terakhir   (pemilik & admin)
notifications/{uid}      notifikasi pendaftaran                           (admin)
resetRequests/{email}    permintaan reset password                        (admin)
activity/{id}            log aktivitas                                    (admin)
settings/site            tema & logo                                      (baca publik, tulis admin)
admins/{uid}, meta/admin penanda superadmin
```

## Catatan keamanan

- Rules belum diuji di emulator; uji langsung setelah publish (daftar akun tes, coba fitur satu per satu).
- Belum ada App Check / reCAPTCHA — bot masih bisa membuat akun palsu atau permintaan reset palsu.
- Penghitung views masih bisa digelembungkan oleh skrip.
- Gunakan password superadmin yang panjang dan unik.
