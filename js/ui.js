import { configured, SITE_NAME, SITE_DOMAIN } from "./firebase.js";

// Nama & domain dari config
export function applyBrand() {
  document.querySelectorAll("[data-site-name]").forEach((el) => (el.textContent = SITE_NAME));
  document.querySelectorAll("[data-site-domain]").forEach((el) => (el.textContent = SITE_DOMAIN));
  if (!configured && !document.querySelector(".demo-banner")) {
    const b = document.createElement("div");
    b.className = "demo-banner";
    b.textContent = "Mode demo — isi firebase-config.js";
    document.body.append(b);
  }
}

// Glow yang mengikuti kursor
export function cursorGlow() {
  const g = document.getElementById("glow");
  if (!g || matchMedia("(pointer: coarse)").matches) return;
  let x = 0, y = 0, cx = 0, cy = 0;
  addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; });
  (function loop() {
    cx += (x - cx) * 0.12; cy += (y - cy) * 0.12;
    g.style.left = cx + "px"; g.style.top = cy + "px";
    requestAnimationFrame(loop);
  })();
}

// Animasi muncul saat di-scroll
export function reveal() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en, i) => {
      if (en.isIntersecting) {
        setTimeout(() => en.target.classList.add("in"), (i % 4) * 70);
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
}

// Efek tilt 3D
export function tilt(el, max = 10) {
  if (!el || matchMedia("(pointer: coarse)").matches) return;
  el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${px * max}deg) rotateX(${-py * max}deg)`;
  });
  el.addEventListener("pointerleave", () => (el.style.transform = ""));
}

// Sorotan mengikuti kursor di kartu fitur
export function spotlight(selector) {
  document.querySelectorAll(selector).forEach((c) => {
    c.addEventListener("pointermove", (e) => {
      const r = c.getBoundingClientRect();
      c.style.setProperty("--mx", e.clientX - r.left + "px");
      c.style.setProperty("--my", e.clientY - r.top + "px");
    });
  });
}

// Efek mengetik berulang
export function typer(el, words, speed = 55) {
  if (!el || !words.length) return;
  let w = 0, i = 0, del = false;
  (function tick() {
    const word = words[w];
    el.textContent = word.slice(0, i);
    if (!del && i < word.length) i++;
    else if (!del) { del = true; return setTimeout(tick, 1800); }
    else if (i > 0) i--;
    else { del = false; w = (w + 1) % words.length; }
    setTimeout(tick, del ? speed / 2 : speed);
  })();
}

export function countUp(el, to, { suffix = "", decimals = 0, dur = 1600 } = {}) {
  const t0 = performance.now();
  (function step(t) {
    const p = Math.min(1, (t - t0) / dur);
    const v = to * (1 - Math.pow(1 - p, 3));
    el.textContent = (decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString("id-ID")) + suffix;
    if (p < 1) requestAnimationFrame(step);
  })(t0);
}
