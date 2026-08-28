// Контакты — единственный попап с реальным содержимым на сейчас.
// О себе / CV: контента ещё нет (страница "О себе" не перенесена, PDF резюме не добавлен) —
// кнопки в разметке есть по дизайну, но обработчик на них намеренно не вешаю,
// чтобы не изображать рабочую ссылку там, где её нет.

const contactsPopover = document.getElementById("popover-contacts");
let contactsOpener = null;

const closeContactsPopover = () => {
  if (!contactsPopover) return;
  contactsPopover.classList.remove("is-open");
  contactsPopover.setAttribute("aria-hidden", "true");
  contactsOpener?.focus();
};

document.addEventListener("click", (e) => {
  const opener = e.target.closest("[data-open-popover]");
  if (opener) {
    const key = opener.dataset.openPopover;
    if (key === "contacts" && contactsPopover) {
      contactsOpener = opener;
      contactsPopover.classList.add("is-open");
      contactsPopover.setAttribute("aria-hidden", "false");
      contactsPopover.querySelector("[data-close-popover]")?.focus();
    }
    return;
  }

  const closer = e.target.closest("[data-close-popover]");
  if (closer) {
    closeContactsPopover();
    return;
  }

  // клик по подложке закрывает попап
  if (e.target.classList.contains("popover")) {
    closeContactsPopover();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeContactsPopover();
  }
});

// Запрашиваем воспроизведение, когда луп попадает в область просмотра.
const loopObserver = new IntersectionObserver((entries) => {
  entries.forEach(({ isIntersecting, target }) => {
    if (isIntersecting) target.play().catch(() => {});
  });
}, { threshold: 0.01 });

document.querySelectorAll("video[autoplay]").forEach((video) => {
  video.muted = true;
  loopObserver.observe(video);
  video.addEventListener("loadeddata", () => video.play().catch(() => {}), { once: true });
});

// Horizontal galleries follow the pointer while the primary mouse button is held.
document.querySelectorAll("[data-drag-scroll]").forEach((scroller) => {
  let pointerId = null;
  let startX = 0;
  let startScrollLeft = 0;
  let dragged = false;

  const endDrag = () => {
    if (pointerId === null) return;
    scroller.classList.remove("is-dragging");
    pointerId = null;
  };

  scroller.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;

    pointerId = event.pointerId;
    startX = event.clientX;
    startScrollLeft = scroller.scrollLeft;
    dragged = false;
    scroller.setPointerCapture(pointerId);
    scroller.classList.add("is-dragging");
  });

  scroller.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointerId) return;

    const distance = event.clientX - startX;
    if (Math.abs(distance) > 3) dragged = true;
    if (dragged) event.preventDefault();
    scroller.scrollLeft = startScrollLeft - distance;
  });

  scroller.addEventListener("pointerup", endDrag);
  scroller.addEventListener("pointercancel", endDrag);
  scroller.addEventListener("lostpointercapture", endDrag);

  scroller.addEventListener("click", (event) => {
    if (dragged) {
      event.preventDefault();
      event.stopPropagation();
      dragged = false;
    }
  }, true);
});

document.querySelectorAll(".ui-shots-controls").forEach((controls) => {
  const previousButton = controls.querySelector("[data-scroll-prev]");
  const nextButton = controls.querySelector("[data-scroll-next]");
  const scroller = document.getElementById(nextButton?.getAttribute("aria-controls"));
  if (!scroller) return;

  const updateButtons = () => {
    const maxScroll = scroller.scrollWidth - scroller.clientWidth;
    previousButton.hidden = maxScroll <= 0 || scroller.scrollLeft <= 2;
    nextButton.hidden = maxScroll <= 0 || scroller.scrollLeft >= maxScroll - 2;
  };

  const scrollByStep = (direction) => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scroller.scrollBy({
      left: Math.round(scroller.clientWidth * 0.76) * direction,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  };

  previousButton.addEventListener("click", () => scrollByStep(-1));
  nextButton.addEventListener("click", () => scrollByStep(1));
  scroller.addEventListener("scroll", updateButtons, { passive: true });
  new ResizeObserver(updateButtons).observe(scroller);
  updateButtons();
});

// Figma node 1529:296 uses a native GLASS effect that design-context export omits.
// These optics map its raw Plugin API values into the web refraction model.
const siteHeader = document.querySelector(".site-header");

if (siteHeader && window.liquidGlass) {
  const figmaGlass = window.liquidGlass(siteHeader, {
    scale: -115,       // refraction 1 × depth 23
    chroma: 4.1,       // dispersion 0.18 × depth 23
    border: 0.072,     // splay 0.79
    mapBlur: 10,       // glass radius 10
    blur: 10,
    saturate: 1,
    radius: 0,
    fallbackBlur: 10,
  });

  siteHeader.dataset.glassRenderer = figmaGlass.supported ? "refraction" : "frosted";
}
