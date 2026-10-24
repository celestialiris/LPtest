// Form "Akun & keamanan" (ganti email & password) — dipakai di dashboard dan panel admin.
// Elemen yang dibutuhkan: #curEmail, #pwBlock, #noPw, form#emailChange, form#pwChange
import { configured, hasPasswordLogin, changeEmail, changePassword, authMessage, toast } from "./firebase.js";

const $ = (id) => document.getElementById(id);

async function withBtn(form, label, fn) {
  const btn = form.querySelector("button[type=submit]");
  const old = btn.textContent; btn.disabled = true; btn.textContent = label;
  try { await fn(); } finally { btn.disabled = false; btn.textContent = old; }
}

export function setupAccount(getUser) {
  const render = () => {
    const u = getUser();
    $("curEmail").textContent = u?.email || "—";
    const pw = hasPasswordLogin(u);
    $("pwBlock").hidden = !pw;
    $("noPw").hidden = pw;
  };

  $("emailChange").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target, u = getUser();
    if (!configured) return toast("Mode demo: hubungkan Firebase dulu.", "bad");
    if (f.newEmail.value.trim().toLowerCase() === (u?.email || "").toLowerCase()) return toast("Itu email yang sama.", "bad");
    withBtn(f, "Menyimpan…", async () => {
      try {
        const r = await changeEmail(f.current.value, f.newEmail.value);
        if (r === "updated") { toast("Email berhasil diganti ✓", "ok"); render(); }
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

  return render;
}

// Markup form akun, disisipkan ke elemen target
export const ACCOUNT_HTML = `
  <div class="badge-mail">✉ <span id="curEmail">—</span></div>
  <div id="pwBlock">
    <form id="emailChange" autocomplete="off">
      <h3>Ganti email</h3>
      <p class="hint">Masukkan email baru dan password saat ini untuk konfirmasi.</p>
      <div class="field"><label>Email baru</label><input class="input" type="email" name="newEmail" required autocomplete="email"></div>
      <div class="field"><label>Password saat ini</label><input class="input" type="password" name="current" required autocomplete="current-password"></div>
      <button class="btn btn-ghost" type="submit">Simpan email</button>
    </form>
    <form id="pwChange" autocomplete="off">
      <h3>Ganti password</h3>
      <p class="hint">Minimal 6 karakter.</p>
      <div class="field"><label>Password saat ini</label><input class="input" type="password" name="current" required autocomplete="current-password"></div>
      <div class="row">
        <div class="field"><label>Password baru</label><input class="input" type="password" name="next" required minlength="6" autocomplete="new-password"></div>
        <div class="field"><label>Ulangi password baru</label><input class="input" type="password" name="confirm" required minlength="6" autocomplete="new-password"></div>
      </div>
      <button class="btn btn-ghost" type="submit">Simpan password</button>
    </form>
  </div>
  <p class="hint" id="noPw" hidden>Akun ini masuk lewat GitHub/Google, jadi email &amp; password dikelola di sana.</p>`;
