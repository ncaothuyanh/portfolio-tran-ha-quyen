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

  /* ---------- den roi theo con tro trong the nang luc ---------- */
  if (!reduce && window.matchMedia("(hover:hover)").matches) {
    [].forEach.call(document.querySelectorAll(".cap__col"), function (el) {
      el.addEventListener("pointermove", function (ev) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--mx", (ev.clientX - r.left) + "px");
        el.style.setProperty("--my", (ev.clientY - r.top) + "px");
      });
    });
  }

  /* ---------- duong uon luon + xe container ---------- */
  var stage = document.getElementById("stage");
  var svg = document.getElementById("roadSvg");
  var base = document.getElementById("roadBase");
  var fill = document.getElementById("roadFill");
  var truck = document.getElementById("truck");
  var depot = document.getElementById("depot");
  var stops = [].slice.call(document.querySelectorAll("[data-stop]"));
  if (!stage || !svg || !base || !fill) return;

  var W = 1, H = 1, len = 0;
  var cur = 0, target = 0, raf = null;
  var samples = [];   // bang tra toa do doc theo duong, dung lai moi khung hinh

  // Noi suy Catmull-Rom: huong tiep tuyen lien tuc tai moi diem, khong gay khuc.
  // pts[0] va pts[cuoi] la hai diem ao chi dung de dinh huong tiep tuyen o hai
  // dau, khong ve ra man hinh.
  function crPath(pts) {
    var f = function (q) { return q.x.toFixed(1) + " " + q.y.toFixed(1); };
    var d = "M " + f(pts[1]);
    for (var i = 1; i < pts.length - 2; i++) {
      var p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      var c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
      var c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
      d += " C " + f(c1) + ", " + f(c2) + ", " + f(p2);
    }
    return d;
  }

  function buildPath() {
    var r = stage.getBoundingClientRect();
    W = r.width; H = r.height;
    if (!W || !H) return;

    // He toa do 1:1 theo pixel. Truoc day viewBox 100x1000 voi
    // preserveAspectRatio=none lam X gian 11 lan con Y gian 3 lan, khien do dai
    // duong bi meo: xe chay khong deu toc do va cho cua bi gay.
    svg.setAttribute("viewBox", "0 0 " + W.toFixed(0) + " " + H.toFixed(0));
    svg.setAttribute("preserveAspectRatio", "none");

    var desktop = W >= 1024;
    var padL = parseFloat(getComputedStyle(stage).paddingLeft) || 0;
    var padB = parseFloat(getComputedStyle(stage).paddingBottom) || 0;
    var cx = desktop ? W / 2 : padL + 18;
    var endY = H - padB * 0.46;

    var info = stops.map(function (s) {
      var c = s.querySelector(".card") || s;
      var cr = c.getBoundingClientRect();
      return {
        top: cr.top - r.top, bottom: cr.bottom - r.top,
        left: cr.left - r.left, right: cr.right - r.left,
        y: (cr.top - r.top) + Math.min(cr.height * 0.5, 170),
        phai: (cr.left + cr.right) / 2 > cx
      };
    });
    var ys = info.map(function (v) { return v.y; });

    // Bien do toi da lay tu me the that, tru them nua be ngang xe.
    var bien = 22;

    // Duong di QUA SAT MEP TRONG cua tung the, thay vi qua tam. Nho vay song
    // rong tu nhien, cham moc dinh lien the, ma van khong de len noi dung.
    var gap = 34;   // nua be ngang xe la 20px, chua them khoang ho khi xe xoay
    function dungDiem(keo) {
      var ns = info.map(function (c) {
        var x = c.phai ? (c.left - gap) : (c.right + gap);
        return { x: cx + (x - cx) * keo, y: c.y };
      });
      return [{ x: cx, y: -520 }, { x: cx, y: 0 }]
        .concat(ns)
        .concat([{ x: cx, y: endY }, { x: cx, y: endY + 520 }]);
    }

    function demDeCao(dd) {
      base.setAttribute("d", dd);
      var L0 = base.getTotalLength(), n = 0;
      for (var t = 0; t <= 300; t++) {
        var q = base.getPointAtLength((L0 * t) / 300);
        for (var k = 0; k < info.length; k++) {
          var c = info[k];
          if (q.y > c.top - bien && q.y < c.bottom + bien &&
              q.x > c.left - bien && q.x < c.right + bien) { n++; break; }
        }
      }
      return n;
    }

    // Catmull-Rom co the vong qua diem mut, nen thu keo dan ve tam den khi sach.
    var pts, deCao = 0, keo = 1;
    if (desktop) {
      for (var a = 0; a < 7; a++) {
        pts = dungDiem(keo);
        deCao = demDeCao(crPath(pts));
        if (!deCao) break;
        keo *= 0.88;
      }
    } else {
      var amp = 13;
      pts = [{ x: cx, y: -520 }, { x: cx, y: 0 }];
      var pv = 0;
      for (var i = 0; i < ys.length; i++) {
        pts.push({ x: cx + amp * ((i % 2) ? -1 : 1), y: pv + (ys[i] - pv) * 0.5 });
        pts.push({ x: cx, y: ys[i] });
        pv = ys[i];
      }
      pts.push({ x: cx, y: endY });
      pts.push({ x: cx, y: endY + 520 });
      deCao = 0;
    }

    var d = crPath(pts);
    base.setAttribute("d", d);
    fill.setAttribute("d", d);
    cacheStage();
    len = fill.getTotalLength();
    fill.style.strokeDasharray = len;
    fill.style.strokeDashoffset = len;

    // kiem lai: con diem nao cua duong nam de len the khong
    var deCao = 0;
    for (var t = 0; t <= 300; t++) {
      var q = fill.getPointAtLength((len * t) / 300);
      for (var k = 0; k < info.length; k++) {
        var c2 = info[k];
        if (q.y > c2.top - bien && q.y < c2.bottom + bien &&
            q.x > c2.left - bien && q.x < c2.right + bien) { deCao++; break; }
      }
    }
    stage.dataset.deCao = deCao;
    stage.dataset.keo = keo.toFixed(2);

    var nodeX = pts.slice(2, 2 + info.length).map(function (q) { return q.x; });
    stops.forEach(function (s, i) {
      var dot = s.querySelector(".stop__dot");
      if (!dot) return;
      var sr = s.getBoundingClientRect();
      dot.style.left = (nodeX[i] - (sr.left - r.left)) + "px";
      dot.style.top = (ys[i] - (sr.top - r.top)) + "px";
    });

    if (depot) {
      depot.style.left = cx + "px";
      depot.style.top = endY + "px";
      depot.style.marginLeft = "0px";
      var lane = depot.querySelector(".depot__lane");
      if (lane) {
        var dr = depot.getBoundingClientRect(), lr = lane.getBoundingClientRect();
        depot.style.marginLeft = (-((lr.left + lr.width / 2) - (dr.left + dr.width / 2))) + "px";
      }
    }

    var N = 900;
    samples = [];
    for (var j = 0; j <= N; j++) {
      var q2 = fill.getPointAtLength((len * j) / N);
      samples.push({ l: (len * j) / N, x: q2.x, y: q2.y });
    }
    stops.forEach(function (s, i) {
      var best = Infinity, bl = 0;
      for (var j2 = 0; j2 < samples.length; j2++) {
        var dx = samples[j2].x - nodeX[i], dy = samples[j2].y - ys[i];
        var dist = dx * dx + dy * dy;
        if (dist < best) { best = dist; bl = samples[j2].l; }
      }
      s.dataset.len = bl;
    });
  }

  // Tra toa do bang noi suy tren bang mau. Goi getPointAtLength moi khung hinh
  // la viec nang nhat trong vong lap, nen chi lam mot lan luc dung duong.
  function ptAt(l) {
    if (!samples.length) return { x: 0, y: 0 };
    var last = samples.length - 1;
    var f = Math.max(0, Math.min(1, l / len)) * last;
    var i = f | 0;
    if (i >= last) return { x: samples[last].x, y: samples[last].y };
    var t = f - i, a = samples[i], b = samples[i + 1];
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  var stageTop = 0, stageH = 1;
  function cacheStage() {
    var r = stage.getBoundingClientRect();
    stageTop = r.top + window.scrollY;
    stageH = r.height || 1;
  }
  function measure() {
    var focus = window.scrollY + window.innerHeight * 0.55;
    target = Math.max(0, Math.min(1, (focus - stageTop) / stageH));
  }

  function frame() {
    // di chuyen cham va muot: moi khung chi tien 6% quang duong con lai
    var dangChay = Math.abs(target - cur) > 0.00015;
    if (dangChay) cur += (target - cur) * 0.06;
    else cur = target;

    var l = cur * len;
    var a = ptAt(l);
    // cua so lay mau luon nam tron trong duong, nen o cuoi duong van co huong
    var d = 2;
    var l0 = Math.max(0, Math.min(len - d, l - d * 0.5));
    var p0 = ptAt(l0), p1 = ptAt(l0 + d);
    var ang = Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180 / Math.PI - 90;

    if (truck) {
      truck.style.transform = "translate3d(" + a.x.toFixed(1) + "px," + a.y.toFixed(1) + "px,0) rotate(" + ang.toFixed(1) + "deg)";
    }
    fill.style.strokeDashoffset = (len * (1 - cur)).toFixed(1);

    stops.forEach(function (s) {
      s.classList.toggle("on", l >= parseFloat(s.dataset.len || "0") - 4);
    });
    if (depot) depot.classList.toggle("on", cur > 0.985);

    if (dangChay) raf = requestAnimationFrame(frame);
    else raf = null;
  }

  function kick() { if (!raf && !reduce) raf = requestAnimationFrame(frame); }

  function onScroll() {
    sweepReveal();
    measure();
    kick();
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
    } else {
      kick();
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
    if (!img.complete) img.addEventListener("load", function () { buildPath(); measure(); kick(); }, { once: true });
  });
  boot();
})();
