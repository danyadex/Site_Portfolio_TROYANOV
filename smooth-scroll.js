import Lenis from "lenis";
import "lenis/dist/lenis.css";
import "./smooth-scroll.css";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const touchDevice = window.matchMedia("(hover: none) and (pointer: coarse)");
let lenis;

function configureScroll() {
  lenis?.destroy();
  lenis = undefined;
  if (reducedMotion.matches || touchDevice.matches) return;
  lenis = new Lenis({
    autoRaf: true,
    lerp: 0.12,
    smoothWheel: true,
    syncTouch: false,
    anchors: true,
    virtualScroll: ({ event, deltaX, deltaY }) => !event.ctrlKey && !event.shiftKey && Math.abs(deltaY) >= Math.abs(deltaX),
    prevent: (node) => node.classList?.contains("drag-scroll") || node.classList?.contains("contact-dialog"),
  });
}

export function scrollToSection(id, { toEnd = false } = {}) {
  const target = document.getElementById(id);
  if (!target) return;
  if (lenis && toEnd) {
    // Последний раздел: доводим до самого конца страницы, к тулбару, чтобы
    // после клика не оставалось хвоста, который ещё можно докрутить.
    lenis.scrollTo(document.documentElement.scrollHeight - window.innerHeight);
    return;
  }
  if (lenis) lenis.scrollTo(target, { offset: -24 });
  else target.scrollIntoView({ behavior: reducedMotion.matches ? "instant" : "smooth", block: "start" });
}

configureScroll();
reducedMotion.addEventListener("change", configureScroll);
touchDevice.addEventListener("change", configureScroll);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    lenis?.destroy();
    reducedMotion.removeEventListener("change", configureScroll);
    touchDevice.removeEventListener("change", configureScroll);
  });
}
