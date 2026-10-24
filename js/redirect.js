// Dipakai oleh 404.html: domain/username → domain/profile.html?u=username
// Bekerja di GitHub Pages (termasuk repo subfolder: user.github.io/repo/username) dan Firebase Hosting.
(function () {
  var seg = location.pathname.split("/").filter(Boolean);
  var isProjectPage = /\.github\.io$/i.test(location.hostname) && seg.length >= 2;
  var base = isProjectPage ? "/" + seg[0] + "/" : "/";
  var name = seg.length ? decodeURIComponent(seg[seg.length - 1]).toLowerCase() : "";
  location.replace(base + (name ? "profile.html?u=" + encodeURIComponent(name) : "index.html"));
})();
