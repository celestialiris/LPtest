// Dijalankan paling awal (di <head>) agar tema & logo tersimpan langsung terpasang
// tanpa "kedip" warna. Nilai sebenarnya diambil dari Firestore oleh js/site.js.
(function () {
  try {
    var theme = localStorage.getItem("bohye.theme") || "nebula";
    document.documentElement.setAttribute("data-theme", theme);
    var logo = localStorage.getItem("bohye.logo");
    if (logo) document.documentElement.classList.add("has-logo");
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "nebula");
  }
})();
