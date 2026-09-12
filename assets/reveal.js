/* Появление блоков при прокрутке.
   Класс .rv навешивается автоматически по списку селекторов, чтобы не
   засорять разметку, а .in добавляется при въезде элемента в экран. */
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduce.matches) return;

  var SELECTORS = [
    ".case-section > *",
    ".artifact-devices",
    ".metric-card",
    ".respondent-card",
    ".architecture-column",
    ".testing-images",
    ".ai-case-section > *",
    ".ai-case-browser",
    ".ai-insight-card",
    ".ai-trouble-card",
    ".ai-figma-cta-wrap",
    ".artifact-next",
  ];

  // Элемент без собственного бокса (display: contents) наблюдателем не
  // отслеживается: площадь нулевая, порог не срабатывает никогда.
  function hasBox(el) {
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  // Внутри горизонтальной ленты элемент выезжает вбок, а не снизу. Наблюдатель
  // увидит его только когда ленту прокрутят вправо — до этого он висит
  // прозрачным. Такие анимируем целиком лентой, а не по колонкам.
  function inHorizontalRail(el) {
    for (var p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      var ox = getComputedStyle(p).overflowX;
      if (ox === "auto" || ox === "scroll") return true;
    }
    return false;
  }

  var nodes = [];
  SELECTORS.forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el) {
      // стрелки и служебные слои не анимируем — они часть композиции
      if (el.closest("[aria-hidden='true']")) return;
      if (el.classList.contains("rv")) return;
      if (nodes.indexOf(el) !== -1) return;
      if (!hasBox(el)) return;
      if (inHorizontalRail(el)) return;
      nodes.push(el);
    });
  });

  if (!nodes.length) return;
  nodes.forEach(function (el) { el.classList.add("rv"); });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("in");
      io.unobserve(entry.target);   // показали один раз — больше не следим
    });
  }, { rootMargin: "0px 0px -12% 0px", threshold: 0.05 });

  nodes.forEach(function (el) { io.observe(el); });

  // Страховка: то, что уже в экране на момент загрузки, показываем сразу
  requestAnimationFrame(function () {
    nodes.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("in");
    });
  });
})();
