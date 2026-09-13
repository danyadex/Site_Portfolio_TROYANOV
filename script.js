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

// Как навбар в iOS: когда под кнопкой возврата проезжает тёмное — чёрный экран
// телефона, тёмная карточка, тёмный кадр видео, — стрелка белеет. Фон кнопки
// не меняется. Идём по слоям под центром кнопки сверху вниз: у видео и картинки
// меряем яркость реального кадра прямо под кнопкой (файлы с того же домена,
// пиксели читать можно), у остальных — яркость первого непрозрачного фона.
const backButton = document.querySelector(".case-body .nav-button--back");
if (backButton) {
  const nav = backButton.closest(".bottom-navigation");
  const mobile = window.matchMedia("(max-width: 899px)");
  const sampler = document.createElement("canvas");
  sampler.width = sampler.height = 6;
  const sample = sampler.getContext("2d", { willReadFrequently: true });
  const DARK = 0.4;
  let toneFrame = 0;

  const luminance = (red, green, blue) => (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;

  // Точка экрана → участок кадра с учётом object-fit (cover / contain / fill).
  const mediaLuminance = (media, x, y) => {
    const naturalWidth = media.videoWidth || media.naturalWidth;
    const naturalHeight = media.videoHeight || media.naturalHeight;
    if (!naturalWidth || !naturalHeight) return null;
    if (media.tagName === "VIDEO" && media.readyState < 2) return null;
    const rect = media.getBoundingClientRect();
    const fit = getComputedStyle(media).objectFit;
    let scaleX = rect.width / naturalWidth;
    let scaleY = rect.height / naturalHeight;
    if (fit === "cover") scaleX = scaleY = Math.max(scaleX, scaleY);
    if (fit === "contain") scaleX = scaleY = Math.min(scaleX, scaleY);
    const offsetX = (rect.width - naturalWidth * scaleX) / 2;
    const offsetY = (rect.height - naturalHeight * scaleY) / 2;
    const sourceX = (x - rect.left - offsetX) / scaleX;
    const sourceY = (y - rect.top - offsetY) / scaleY;
    // Участок примерно с кнопку. Держим его внутри кадра: Safari не рисует
    // drawImage, если исходный прямоугольник вылезает за границы видео, —
    // а кнопка часто стоит у самого края.
    const size = Math.min(22 / scaleX, naturalWidth, naturalHeight);
    const left = Math.min(Math.max(sourceX - size / 2, 0), naturalWidth - size);
    const top = Math.min(Math.max(sourceY - size / 2, 0), naturalHeight - size);
    try {
      sample.drawImage(media, left, top, size, size, 0, 0, 6, 6);
      const pixels = sample.getImageData(0, 0, 6, 6).data;
      let sum = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        sum += luminance(pixels[index], pixels[index + 1], pixels[index + 2]);
      }
      return sum / (pixels.length / 4);
    } catch {
      return null; // кадр не готов или недоступен — не угадываем
    }
  };

  const isDarkAt = (x, y) => {
    for (const element of document.elementsFromPoint(x, y)) {
      if (nav.contains(element)) continue;
      if (element.tagName === "VIDEO" || element.tagName === "IMG") {
        const value = mediaLuminance(element, x, y);
        if (value !== null) return value < DARK;
        continue;
      }
      const channels = getComputedStyle(element).backgroundColor.match(/[\d.]+/g);
      if (!channels) continue;
      const [red, green, blue, alpha = 1] = channels.map(Number);
      if (alpha < 0.5) continue;
      return luminance(red, green, blue) < DARK;
    }
    return false;
  };

  const updateTone = () => {
    toneFrame = 0;
    const rect = backButton.getBoundingClientRect();
    if (mobile.matches && isDarkAt(rect.left + rect.width / 2, rect.top + rect.height / 2)) {
      backButton.dataset.tone = "dark";
    } else {
      delete backButton.dataset.tone;
    }
  };
  const scheduleTone = () => {
    if (!toneFrame) toneFrame = window.requestAnimationFrame(updateTone);
  };

  updateTone();
  window.addEventListener("scroll", scheduleTone, { passive: true });
  window.addEventListener("resize", scheduleTone);
  // Видео под кнопкой грузится, только когда попадает в экран, — в момент
  // скролла кадра ещё нет. Перепроверяем, как только любое видео получило кадр,
  // и раз в полсекунды: кадр меняется и без скролла. Проверка дешёвая —
  // один elementsFromPoint и выборка 6×6 пикселей.
  document.addEventListener("loadeddata", scheduleTone, true);
  window.setInterval(() => {
    if (!document.hidden) scheduleTone();
  }, 500);
}

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
