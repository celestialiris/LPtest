# ✦ Bohye Page — v2.2.0

Situs bio-link dengan Firebase (Auth & Firestore), di-host di GitHub Pages, dan bisa dipasang sebagai aplikasi (PWA) di Android, iOS & PC.

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
├── css/  style.css, themes.css
├── icons/
└── js/   firebase.js  ui.js  site.js  pwa.js  device.js  badges.js  youtube.js  player-ui.js  card.js
          app.js  dashboard.js  profile.js  admin.js  theme-boot.js  redirect.js
```

Semua JavaScript ada di file `.js` terpisah — tidak ada script di dalam HTML.

---

## 1. Setup Firebase

1. **Authentication → Sign-in method → Email/Password → Enable.**
2. **Authentication → Users → Add user** → buat akun superadmin (`asdf@asdf.com` + password kuat).
3. **Authentication → Settings → Authorized domains** → tambahkan `celestialiris.github.io`.
4. **Firestore → Rules** → tempel isi `firestore.rules` → **Publish**.
5. Buka `https://celestialiris.github.io/LPtest/admin.html` dan **langsung masuk** dengan akun superadmin. Login pertama ini mengaktifkan & mengunci status superadmin.

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
| **Log aktivitas** | Daftar, masuk, keluar, ganti password/email, simpan profil, ganti video, dll. — dengan perangkat, OS, browser, waktu, lokasi perkiraan & ukuran layar |
| **Tampilan** | Pilih 1 dari 4 tema & upload logo situs (berlaku langsung untuk semua pengunjung) |

Superadmin otomatis mendapat badge **Verified** + **Developer**.

**Tentang password:** password anggota tidak bisa dilihat oleh siapa pun, termasuk superadmin — Firebase menyimpannya sebagai hash yang tidak bisa dibalik, dan situs ini tidak pernah menyalinnya. Superadmin mengelola password dengan **mengirim link reset resmi Firebase** ke email anggota; anggota lalu membuat password barunya sendiri.

**Tentang lokasi di log:** diperkirakan dari zona waktu perangkat (mis. `Asia/Jakarta` → "Jakarta, Asia"). Tidak memakai GPS dan tidak menyimpan alamat IP.

### Tema
**Nebula** (ungu–pink), **Aurora** (hijau–toska), **Inferno** (merah–bara, nuansa darkness), **Frost** (kaca es biru, paling blur). Semua memakai efek kaca blur. Hanya superadmin yang bisa mengganti (dijaga oleh `firestore.rules`).

### Badge
Verified, Developer, Gamer, Technician, Creator, Moderator, VIP, Streamer, Musician, Artist, Supporter, OG Member. Hanya superadmin yang bisa memberi/mencabut. Tambah badge baru di `js/badges.js`.

### Anggota
Daftar dengan email sendiri, klaim username, atur profil, pasang **video background dari link YouTube** (video biasa, Shorts, atau live; berulang, selalu di tengah layar, bentuk landscape 16:9 atau vertikal 9:16), **suara video** yang menyala saat pengunjung klik "klik untuk masuk" dengan **volume awal** yang bisa diatur — pengunjung juga dapat pemutar mini untuk play/pause, mute & volume (di iPhone volume mengikuti tombol fisik HP), **slider blur 0–20 px**, dan **backdrop** berupa lapisan warna pilihan dengan **transparansi 0–100%**. Lupa password → kirim link sendiri, atau **minta bantuan superadmin**.

### PWA
- **Android / PC (Chrome, Edge):** muncul tombol **Pasang** otomatis, atau klik "📲 Pasang aplikasi" di footer.
- **iPhone / iPad (Safari):** ikuti panduan yang muncul — Bagikan → **Tambah ke Layar Utama**.

---

## Struktur data Firestore

```
users/{uid}              profil publik (+ badges, bgYoutube, bgBlur, overlayColor, overlayOpacity)
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
