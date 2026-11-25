/* Chi mot viec: cho noi dung nhich len khi cuon toi. Kiem tra truc tiep trong
   ham cuon, kem luoi an toan, nen khong bao gio de trang trong. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var items = [].slice.call(document.querySelectorAll(".r"));

  function hienHet() { items.forEach(function (el) { el.classList.add("in"); }); items = []; }
  function quet() {
    if (!items.length) return;
    var vh = window.innerHeight;
    items = items.filter(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) { el.classList.add("in"); return false; }
      return true;
    });
  }

  if (reduce) { hienHet(); return; }
  setTimeout(hienHet, 6000);          // luoi an toan
  quet();
  var cho = false;
  window.addEventListener("scroll", function () {
    if (cho) return;
    cho = true;
    requestAnimationFrame(function () { cho = false; quet(); });
  }, { passive: true });
  window.addEventListener("resize", quet, { passive: true });
  window.addEventListener("load", quet);
})();
