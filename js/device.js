// Informasi perangkat untuk log aktivitas.
// Lokasi hanya berupa perkiraan dari zona waktu & bahasa browser — tanpa GPS dan tanpa IP.

export function deviceInfo() {
  const ua = navigator.userAgent || "";
  const uaData = navigator.userAgentData;

  let os = "Lainnya";
  if (/Windows NT/i.test(ua)) os = "Windows";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPod/i.test(ua)) os = "iOS";
  else if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) os = "iPadOS";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/CrOS/i.test(ua)) os = "ChromeOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  let browser = "Lainnya";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/SamsungBrowser/i.test(ua)) browser = "Samsung Internet";
  else if (/Firefox|FxiOS/i.test(ua)) browser = "Firefox";
  else if (/CriOS|Chrome/i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua)) browser = "Safari";
  const ver = (ua.match(/(?:Edg|OPR|SamsungBrowser|Firefox|FxiOS|CriOS|Chrome|Version)\/(\d+)/i) || [])[1];
  if (ver && browser !== "Lainnya") browser += " " + ver;

  let device = "Desktop";
  if (uaData?.mobile || /Mobi|iPhone|Android.+Mobile/i.test(ua)) device = "HP";
  else if (/iPad|Tablet|Android/i.test(ua) || (os === "iPadOS")) device = "Tablet";

  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  let tz = "";
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (_) {}

  return {
    device: (device + (standalone ? " · aplikasi" : "")).slice(0, 40),
    os: os.slice(0, 40),
    browser: browser.slice(0, 40),
    tz: tz.slice(0, 60),
    region: regionFromTz(tz).slice(0, 60),
    lang: (navigator.language || "").slice(0, 20),
    screen: `${screen.width}×${screen.height}`.slice(0, 20)
  };
}

// Perkiraan wilayah dari zona waktu, mis. "Asia/Jakarta" → "Jakarta, Asia"
export function regionFromTz(tz = "") {
  if (!tz.includes("/")) return tz || "Tidak diketahui";
  const parts = tz.split("/");
  const city = parts[parts.length - 1].replace(/_/g, " ");
  return `${city}, ${parts[0]}`;
}
