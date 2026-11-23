/* The container travels the rail as the visitor scrolls. Transform only, one
   rAF per frame, and it stays out of the way entirely for reduced motion. */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var rail = document.querySelector(".tl__rail");
  var car = document.querySelector(".tl__car");
  var fill = document.querySelector(".tl__fill");
  var stops = Array.prototype.slice.call(document.querySelectorAll("[data-stop]"));
  if (!rail || !car || !fill) return;

  var ticking = false;
  var railTop = 0;
  var railH = 1;

  function measure() {
    var r = rail.getBoundingClientRect();
    railTop = r.top + window.scrollY;
    railH = r.height || 1;
  }

  function paint() {
    ticking = false;
    var focus = window.scrollY + window.innerHeight * 0.5;
    var p = (focus - railTop) / railH;
    if (p < 0) p = 0;
    if (p > 1) p = 1;

    var travel = railH - car.offsetHeight;
    if (travel < 0) travel = 0;
    car.style.transform = "translate3d(0," + (p * travel).toFixed(2) + "px,0)";
    fill.style.transform = "scaleY(" + p.toFixed(4) + ")";

    var reached = p * railH;
    for (var i = 0; i < stops.length; i++) {
      var dot = stops[i].querySelector(".stop__dot");
      if (!dot) continue;
      var at = stops[i].offsetTop + dot.offsetTop;
      stops[i].classList.toggle("is-on", reached >= at - 6);
    }
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(paint);
  }

  function start() {
    measure();
    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () { measure(); onScroll(); });
    // images change the rail height once they land
    window.addEventListener("load", function () { measure(); onScroll(); });
    Array.prototype.forEach.call(document.images, function (img) {
      if (!img.complete) img.addEventListener("load", function () { measure(); onScroll(); }, { once: true });
    });
  }

  if (reduce.matches) {
    stops.forEach(function (s) { s.classList.add("is-on"); });
    return;
  }
  start();
})();
