import { manageVideoPlayback } from "./media-playback.js";
import "./smooth-scroll.js";
import "./typography.css";
import { initInertialRail } from './inertial-rail.js';

// Контакты — попап домашней страницы, если он присутствует в разметке.

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

document.querySelectorAll("video[data-autoplay]").forEach((video) => {
  video.muted = true;
  manageVideoPlayback(video);
});

const disposeRails = [...document.querySelectorAll('[data-drag-scroll]')].map(initInertialRail);
if (import.meta.hot) import.meta.hot.dispose(() => disposeRails.forEach(dispose => dispose()));

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
