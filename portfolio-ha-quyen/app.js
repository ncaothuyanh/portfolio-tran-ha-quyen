(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- thanh tien do cuon ---------- */
  var barFill = document.querySelector(".scrollbar i");

  /* ---------- hien dan khi cuon toi ----------
     Kiem tra truc tiep trong ham cuon thay vi IntersectionObserver: it thanh
     phan co the hong hon, va neu vi ly do nao do khong chay thi noi dung van
     duoc bat hien o buoc cuoi, khong bao gio de trang trong. */
  var reveals = [].slice.call(document.querySelectorAll(".reveal"));
  function showAll() { reveals.forEach(function (el) { el.classList.add("in"); }); reveals = []; }
  function sweepReveal() {
    if (!reveals.length) return;
    var vh = window.innerHeight;
    reveals = reveals.filter(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) { el.classList.add("in"); return false; }
      return true;
    });
  }
  if (reduce) { showAll(); }
  // luoi an toan: neu sau 6 giay van con gi chua hien thi bat hien het
  setTimeout(showAll, 6000);

  /* ---------- so lieu dem len ---------- */
  var counted = false;
  function runCounters() {
    if (counted) return;
    counted = true;
    [].forEach.call(document.querySelectorAll("[data-count]"), function (el) {
      var end = parseFloat(el.getAttribute("data-count"));
      var dec = (el.getAttribute("data-count").indexOf(".") > -1) ? 1 : 0;
      if (reduce) { el.textContent = end.toFixed(dec); return; }
      var t0 = null, dur = 1100;
      function step(t) {
        if (!t0) t0 = t;
        var k = Math.min(1, (t - t0) / dur);
        k = 1 - Math.pow(1 - k, 3);
        el.textContent = (end * k).toFixed(dec);
        if (k < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }
  var statsEl = document.querySelector(".stats");
  if (statsEl && "IntersectionObserver" in window) {
    new IntersectionObserver(function (es, o) {
      es.forEach(function (e) { if (e.isIntersecting) { runCounters(); o.disconnect(); } });
    }, { threshold: 0.4 }).observe(statsEl);
  } else { runCounters(); }

  /* ---------- nut hut theo con tro ---------- */
  if (!reduce && window.matchMedia("(hover:hover)").matches) {
    [].forEach.call(document.querySelectorAll(".magnet"), function (el) {
      el.addEventListener("pointermove", function (ev) {
        var r = el.getBoundingClientRect();
        var dx = (ev.clientX - (r.left + r.width / 2)) / r.width;
        var dy = (ev.clientY - (r.top + r.height / 2)) / r.height;
        el.style.transform = "translate(" + (dx * 9).toFixed(1) + "px," + (dy * 7).toFixed(1) + "px)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }

  /* ---------- duong uon luon + xe container ---------- */
  var stage = document.getElementById("stage");
  var svg = document.getElementById("roadSvg");
  var base = document.getElementById("roadBase");
  var fill = document.getElementById("roadFill");
  var truck = document.getElementById("truck");
  var stops = [].slice.call(document.querySelectorAll("[data-stop]"));
  if (!stage || !svg || !base || !fill) return;

  var VBW = 100, VBH = 1000;
  var W = 1, H = 1, len = 0;
  var cur = 0, target = 0, raf = null;

  function buildPath() {
    var r = stage.getBoundingClientRect();
    W = r.width; H = r.height;
    if (!W || !H) return;

    var desktop = W >= 1024;
    var padL = parseFloat(getComputedStyle(stage).paddingLeft) || 0;
    var baseX = desktop ? W / 2 : padL + 18;
    var amp = desktop ? Math.min(W * 0.26, 230) : 26;

    // tam doc cua tung the, dung lam diem duong di qua
    var ys = stops.map(function (s) {
      var c = s.querySelector(".card") || s;
      var cr = c.getBoundingClientRect();
      return (cr.top - r.top) + Math.min(cr.height * 0.5, 170);
    });

    var ux = function (px) { return (px / W) * VBW; };
    var uy = function (py) { return (py / H) * VBH; };

    var d = "M " + ux(baseX).toFixed(2) + " 0";
    var prevY = 0;
    for (var i = 0; i < ys.length; i++) {
      var y = ys[i];
      var dir = (i % 2 === 0) ? 1 : -1;
      var k = (y - prevY) * 0.42;
      d += " C " + ux(baseX + amp * dir).toFixed(2) + " " + uy(prevY + k).toFixed(2)
         + ", " + ux(baseX + amp * dir).toFixed(2) + " " + uy(y - k).toFixed(2)
         + ", " + ux(baseX).toFixed(2) + " " + uy(y).toFixed(2);
      prevY = y;
    }
    // doan duoi cung chay het chieu cao
    var endDir = (ys.length % 2 === 0) ? 1 : -1;
    var kk = (H - prevY) * 0.42;
    d += " C " + ux(baseX + amp * endDir * 0.55).toFixed(2) + " " + uy(prevY + kk).toFixed(2)
       + ", " + ux(baseX).toFixed(2) + " " + uy(H - kk).toFixed(2)
       + ", " + ux(baseX).toFixed(2) + " " + uy(H).toFixed(2);

    base.setAttribute("d", d);
    fill.setAttribute("d", d);
    len = fill.getTotalLength();
    fill.style.strokeDasharray = len;
    fill.style.strokeDashoffset = len;

    // Dat cham moc dung vi tri. Cham nam trong .stop nen phai tru di do lech
    // cua .stop so voi stage, neu khong se lech ca ngang lan doc.
    stops.forEach(function (s, i) {
      var dot = s.querySelector(".stop__dot");
      if (!dot) return;
      var sr = s.getBoundingClientRect();
      dot.style.left = (baseX - (sr.left - r.left)) + "px";
      dot.style.top = (ys[i] - (sr.top - r.top)) + "px";
      dot.dataset.y = ys[i];
    });
  }

  // doi toa do tren path (don vi viewBox) sang pixel cua stage
  function ptAt(l) {
    var p = fill.getPointAtLength(Math.max(0, Math.min(len, l)));
    return { x: (p.x / VBW) * W, y: (p.y / VBH) * H };
  }

  function measure() {
    var r = stage.getBoundingClientRect();
    var top = r.top + window.scrollY;
    var h = r.height;
    var focus = window.scrollY + window.innerHeight * 0.55;
    var p = (focus - top) / h;
    target = Math.max(0, Math.min(1, p));
  }

  function frame() {
    // di chuyen cham va muot: moi khung chi tien 6% quang duong con lai
    cur += (target - cur) * 0.06;
    if (Math.abs(target - cur) < 0.0002) cur = target;

    var l = cur * len;
    var a = ptAt(l);
    var b = ptAt(l + 1.2);
    var ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI - 90;

    if (truck) {
      truck.style.transform = "translate3d(" + a.x.toFixed(1) + "px," + a.y.toFixed(1) + "px,0) rotate(" + ang.toFixed(1) + "deg)";
    }
    fill.style.strokeDashoffset = (len * (1 - cur)).toFixed(1);

    stops.forEach(function (s) {
      var dot = s.querySelector(".stop__dot");
      if (!dot) return;
      var dy = parseFloat(dot.dataset.y || "0");
      s.classList.toggle("on", a.y >= dy - 4);
    });

    raf = requestAnimationFrame(frame);
  }

  function onScroll() {
    sweepReveal();
    measure();
    if (barFill) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      barFill.style.transform = "scaleX(" + (max > 0 ? window.scrollY / max : 0).toFixed(4) + ")";
    }
  }

  function boot() {
    buildPath();
    measure();
    onScroll();
    if (reduce) {
      cur = 1;
      fill.style.strokeDashoffset = 0;
      stops.forEach(function (s) { s.classList.add("on"); });
    } else if (!raf) {
      raf = requestAnimationFrame(frame);
    }
  }

  var rt;
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () { buildPath(); measure(); }, 120);
  });
  window.addEventListener("load", boot);
  [].forEach.call(document.images, function (img) {
    if (!img.complete) img.addEventListener("load", function () { buildPath(); measure(); }, { once: true });
  });
  boot();
})();
