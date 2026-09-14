import { createContext, lazy, Suspense, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import "../bottom-nav.css";
import { homeAssets, aboutVideos, aboutPosters, mobileVideoSources } from "./home-assets.js";
import { scrollToSection } from "../smooth-scroll.js";
import { manageVideoPlayback, observeVisibility } from "../media-playback.js";
import closeDiagonalA from "../assets/contacts-close-diagonal-a.svg";
import closeDiagonalB from "../assets/contacts-close-diagonal-b.svg";
import { openShotZoom } from "./shot-zoom.js";
import shotWideFull from "../assets/home/shots-full/shot-wide.webp";
import shotPortraitAFull from "../assets/home/shots-full/shot-portrait-a.webp";
import shotPortraitBFull from "../assets/home/shots-full/shot-portrait-b.webp";
import shotUIFull from "../assets/home/shots-full/shot-ui.webp";

import CV_FILE from "../assets/cv/troyanov-cv.pdf?url";
const ShotsGL = lazy(() => import("./ShotsGL.jsx"));
const AvatarWebGL = lazy(() => import("./avatar-webgl.jsx"));
const AVATAR_VIDEO = homeAssets.avatar;
const ABOUT_CANVAS = { width: 588, height: 509.60113525390625 };

const ABOUT_MEDIA = [
  { id: "painting", src: "painting.mp4", x: 0, y: 0, width: 138, height: 245, fit: "cover" },
  { id: "plein-sea", src: "plein-sea.mp4", x: 448, y: 257, width: 138, height: 252, fit: "cover" },
  { id: "camera", src: "camera.mp4", x: 250, y: 0, width: 88, height: 85, crop: [1, 0.5294811726, 0, 0.3125] },
  { id: "guitar", src: "guitar.mp4", x: 350, y: 0, width: 88, height: 103, crop: [1, 0.6440383196, 0, 0.0011987907] },
  { id: "couple", src: "couple.mp4", x: 450, y: 0, width: 138, height: 245, crop: [1, 0.973, 0, 0.0135] },
  { id: "bridge", src: "bridge.mp4", x: 350, y: 115, width: 88, height: 130, crop: [0.999895215, 0.8115502, 0.0000524, 0] },
  { id: "sea", src: "sea.mp4", x: 150, y: 167, width: 88, height: 78, crop: [1, 0.5, 0, 0] },
  { id: "waves", src: "waves.mp4", x: 0, y: 257, width: 138, height: 127, crop: [1, 0.5025424957, 0, 0.2487287521] },
  { id: "plein-river", src: "plein-river.mp4", x: 150, y: 257, width: 88, height: 135, crop: [1, 0.841, 0, 0.0795] },
  {
    id: "bones",
    src: "bones.mp4",
    x: 250,
    y: 257,
    width: 186.514,
    height: 102,
    fit: "cover",
    rotate: -90,
    mediaWidth: 102,
    mediaHeight: 186.514,
  },
  { id: "river", src: "river.mp4", x: 348, y: 371, width: 88, height: 138, fit: "cover" },
  { id: "daw", src: "daw.mp4", x: 150, y: 404, width: 88, height: 103, fit: "cover" },
  { id: "faces", src: "faces.mp4", x: 0, y: 396, width: 138, height: 111, fit: "cover", priority: true },
  { id: "museum", src: "museum.mp4", x: 250, y: 371, width: 86, height: 138, crop: [0.9695084095, 0.8507232666, 0.0018566962, 0.0013247912] },
  { id: "forest", src: "forest.mp4", x: 150, y: 0, width: 88, height: 155, fit: "cover" },
];

function AutoVideo({
  src,
  className = "",
  label,
  poster,
  style,
  onLoadedData,
  preload = "none",
  autoPlay = false,
  rootMargin = "120px 0px",
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    return manageVideoPlayback(video, video, { rootMargin });
  }, [src, rootMargin]);

  return (
    <video
      ref={videoRef}
      className={className}
      autoPlay={autoPlay}
      muted
      loop
      playsInline
      preload={preload}
      poster={poster}
      aria-label={label}
      style={style}
      onLoadedData={onLoadedData}
    >
      {mobileVideoSources.get(src) && (
        <source src={mobileVideoSources.get(src)} media="(max-width: 899px)" type="video/mp4" />
      )}
      <source src={src} type="video/mp4" />
    </video>
  );
}

function Avatar() {
  const frameRef = useRef(null);
  const [active, setActive] = useState(false);
  const [enhanced, setEnhanced] = useState(false);

  useEffect(() => observeVisibility(frameRef.current, setActive), []);

  useEffect(() => {
    const desktopMotion = window.matchMedia("(min-width: 900px) and (prefers-reduced-motion: no-preference)");
    if (!desktopMotion.matches) return undefined;

    let idleId;
    const enable = () => setEnhanced(true);
    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(enable, { timeout: 1200 });
    } else {
      idleId = window.setTimeout(enable, 350);
    }

    return () => {
      if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
    };
  }, []);

  return (
    <div ref={frameRef} className="avatar-frame" data-animation-active={active} role="img" aria-label="Портрет Даниила Троянова">
      <img className="avatar-still" src={homeAssets.avatarPoster} alt="" fetchPriority="high" />
      <AutoVideo
        className="avatar-fallback"
        src={AVATAR_VIDEO}
        poster={homeAssets.avatarPoster}
        label="Портрет Даниила Троянова"
        preload="auto"
        autoPlay
        rootMargin="0px"
      />
      {enhanced && (
        <Suspense fallback={null}>
          <AvatarWebGL src={AVATAR_VIDEO} frameRef={frameRef} active={active} />
        </Suspense>
      )}
    </div>
  );
}

function ProjectArrow() {
  return (
    <span className="project-arrow" aria-hidden="true">
      <img src={homeAssets.arrow} alt="" />
    </span>
  );
}

function ProjectHeader({ href, title, tags, disabled = false }) {
  const content = (
    <>
      {/* Figma 2264:529 / 2264:564 / 2264:578: кликабельный кейс — акцентное
          название со стрелкой; теги разделены пайпами. */}
      <span className="project-title">
        {disabled ? <span className="project-status">Soon</span> : <ProjectArrow />}
        <span className={disabled ? "project-link-label is-disabled" : "project-link-label"}>{title}</span>
      </span>
      <span className="project-tags">
        {tags.map((tag) => (
          <span key={tag} className="project-tag">
            <span className="project-tag-divider" aria-hidden="true">|</span>
            {tag}
          </span>
        ))}
      </span>
    </>
  );

  return disabled ? (
    <div className="project-headerline is-disabled" aria-disabled="true">
      {content}
    </div>
  ) : (
    <div className="project-headerline">
      <a className="project-link" href={href} aria-label={`Открыть кейс ${title}`}>
        {content}
      </a>
    </div>
  );
}

function ProjectDescription({ children }) {
  return <p className="project-description">{children}</p>;
}

function RhythmDot({ className = "" }) {
  return <span className={`rhythm-dot ${className}`.trim()} aria-hidden="true">•</span>;
}

function PhoneMockup({ src, label, variant = "default", staticSrc, preload = "none", rootMargin = "160px 0px" }) {
  return (
    <div className={`phone-stage phone-stage--${variant}`}>
      <div className="phone-screen">
        {staticSrc && <img className="phone-still" src={staticSrc} alt="" />}
        <AutoVideo
          className={staticSrc ? "phone-motion" : ""}
          src={src}
          label={label}
          preload={preload}
          autoPlay={preload === "auto"}
          rootMargin={rootMargin}
        />
      </div>
      <img className="phone-bezel" src={homeAssets.phone} alt="" />
    </div>
  );
}

function ArtifactProject() {
  return (
    <article className="home-project home-project--artifact" id="projects">
      <div className="home-project-media home-project-media--phone">
        <PhoneMockup
          src={homeAssets.artifact}
          staticSrc={homeAssets.artifactStill}
          preload="none"
          label="Аниматик приложения ARTIFACT"
        />
      </div>
      <div className="home-project-info">
        <ProjectHeader href="/artifact.html" title="Artifact" tags={["Startup", "Lead Designer"]} />
        <RhythmDot />
        <ProjectDescription>
          Мобильное приложение
          <br />
          для создания визуального <span className="nowrap">AI-контента</span>
        </ProjectDescription>
      </div>
    </article>
  );
}

function BrowserMockup() {
  return (
    <div className="browser-stage">
      <div className="browser-titlebar" aria-hidden="true">
        <img src={homeAssets.browserTitle} alt="" />
      </div>
      <div className="browser-content">
        <AutoVideo
          src={homeAssets.aiProducer}
          poster={homeAssets.aiProducerPoster}
          label="Аниматик рабочего пространства AI Producer"
          preload="none"
          rootMargin="180px 0px"
        />
      </div>
    </div>
  );
}

function AIProducerProject() {
  return (
    <article className="home-project home-project--ai-producer">
      <div className="home-project-media home-project-media--browser">
        <BrowserMockup />
      </div>
      <div className="home-project-info">
        <ProjectHeader href="/ai-producer.html" title="AI Producer" tags={["Diploma", "Solo Designer"]} />
        <RhythmDot />
        <ProjectDescription>
          Веб-платформа
          <br />
          для создания AI-сцен с режиссёрским контролем
        </ProjectDescription>
      </div>
    </article>
  );
}

function TayaProject() {
  return (
    <article className="home-project home-project--taya">
      <div className="home-project-media home-project-media--phone">
        <PhoneMockup src={homeAssets.taya} staticSrc={homeAssets.tayaPoster} rootMargin="800px 0px" label="Аниматик экрана TAYA AI" variant="taya" />
      </div>
      <div className="home-project-info">
        <ProjectHeader disabled title="Taya AI" tags={["Concept", "Design & Research"]} />
        <RhythmDot />
        <ProjectDescription>
          Мобильный ассистент
          <br />
          для независимых художников
        </ProjectDescription>
      </div>
    </article>
  );
}

function DragScroll({ children, className = "" }) {
  const scrollerRef = useRef(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return undefined;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const touchScroll = window.matchMedia("(pointer: coarse)");
    const media = [...scroller.querySelectorAll(".shot img")];
    const clampScroll = (value) => Math.max(0, Math.min(value, scroller.scrollWidth - scroller.clientWidth));

    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;
    let dragged = false;
    let suppressClick = false;
    let pointerVelocity = 0;
    let lastPointerScroll = 0;
    let lastPointerTime = 0;
    let lastScrollLeft = scroller.scrollLeft;
    let lastScrollTime = performance.now();
    let wheelTarget = scroller.scrollLeft;
    let wheelPosition = scroller.scrollLeft;
    let wheelTime = 0;
    let inertiaFrame = 0;
    let wheelFrame = 0;
    let parallaxFrame = 0;
    let parallaxShift = 0;
    let parallaxTarget = 0;
    let parallaxTime = 0;
    let instantScroll = false;

    const cancelInertia = () => {
      if (!inertiaFrame) return;
      cancelAnimationFrame(inertiaFrame);
      inertiaFrame = 0;
    };

    const cancelWheel = () => {
      if (wheelFrame) cancelAnimationFrame(wheelFrame);
      wheelFrame = 0;
      wheelTarget = scroller.scrollLeft;
      wheelPosition = wheelTarget;
    };

    const renderParallax = () => {
      if (reducedMotionQuery.matches) return;

      if (Math.abs(parallaxShift) < 0.08 && Math.abs(parallaxTarget) < 0.08) {
        parallaxShift = 0;
        media.forEach((element) => element.style.removeProperty("transform"));
        scroller.classList.remove("is-parallaxing");
        parallaxFrame = 0;
        return;
      }

      scroller.classList.add("is-parallaxing");
      media.forEach((element, index) => {
        const depth = 0.68 + index * 0.1;
        element.style.transform = `translate3d(${(parallaxShift * depth).toFixed(2)}px, 0, 0)`;
      });
    };

    const decayParallax = (now) => {
      const dt = Math.min(40, now - parallaxTime);
      parallaxTime = now;
      parallaxShift += (parallaxTarget - parallaxShift) * (1 - Math.exp(-dt / 75));
      parallaxTarget *= Math.exp(-dt / 110);
      renderParallax();
      if (parallaxShift || Math.abs(parallaxTarget) >= 0.08) parallaxFrame = requestAnimationFrame(decayParallax);
    };

    const pulseParallax = (velocity) => {
      if (touchScroll.matches || reducedMotionQuery.matches || Math.abs(velocity) < 0.01) return;
      parallaxTarget = Math.max(-8, Math.min(8, velocity * 14));
      if (!parallaxFrame) {
        parallaxTime = performance.now();
        parallaxFrame = requestAnimationFrame(decayParallax);
      }
    };

    const startInertia = (initialVelocity) => {
      if (reducedMotionQuery.matches || Math.abs(initialVelocity) < 0.02) return;

      // Project the landing point first so even a flick near an edge settles softly.
      const origin = scroller.scrollLeft;
      const target = clampScroll(origin + initialVelocity * 260);
      const distance = target - origin;
      if (Math.abs(distance) < 0.5) return;
      const decay = Math.max(70, Math.min(260, Math.abs(distance / initialVelocity)));
      let position = origin;
      let previousTime = performance.now();
      const step = (now) => {
        const deltaTime = Math.min(32, now - previousTime);
        previousTime = now;
        position += (target - position) * (1 - Math.exp(-deltaTime / decay));
        scroller.scrollLeft = position;
        if (Math.abs(target - position) < 0.5) {
          scroller.scrollLeft = target;
          inertiaFrame = 0;
          return;
        }
        inertiaFrame = requestAnimationFrame(step);
      };

      inertiaFrame = requestAnimationFrame(step);
    };

    const stepWheel = (now) => {
      const dt = Math.min(40, now - wheelTime);
      wheelTime = now;
      wheelTarget = clampScroll(wheelTarget);
      const difference = wheelTarget - wheelPosition;
      if (Math.abs(difference) < 0.5) {
        scroller.scrollLeft = wheelTarget;
        wheelFrame = 0;
        return;
      }

      // Time-based damping feels the same at 60 and 120 Hz. Keep subpixels
      // outside scrollLeft so browser rounding cannot stall the last pixels.
      wheelPosition += difference * (1 - Math.exp(-dt / 115));
      scroller.scrollLeft = wheelPosition;
      wheelFrame = requestAnimationFrame(stepWheel);
    };

    const updateEdges = () => {
      const max = scroller.scrollWidth - scroller.clientWidth;
      if (max <= 1) {
        scroller.removeAttribute("data-edge");
        return;
      }
      const atStart = scroller.scrollLeft <= 2;
      const atEnd = scroller.scrollLeft >= max - 2;
      scroller.dataset.edge = atStart ? "start" : atEnd ? "end" : "middle";
    };

    const onScroll = () => {
      updateEdges();
      const now = performance.now();
      const current = scroller.scrollLeft;
      const deltaTime = Math.max(8, now - lastScrollTime);
      const velocity = (current - lastScrollLeft) / deltaTime;
      lastScrollLeft = current;
      lastScrollTime = now;

      if (!wheelFrame) wheelTarget = current;
      if (!instantScroll) pulseParallax(velocity);
      instantScroll = false;
    };

    const endDrag = (withMomentum = false) => {
      if (pointerId === null) return;
      const releaseId = pointerId;
      const shouldContinue = withMomentum && dragged;
      scroller.classList.remove("is-dragging");
      pointerId = null;
      if (scroller.hasPointerCapture(releaseId)) scroller.releasePointerCapture(releaseId);
      if (shouldContinue && performance.now() - lastPointerTime < 90) startInertia(pointerVelocity);
    };

    const onPointerDown = (event) => {
      if (event.pointerType !== "mouse") {
        suppressClick = false;
        cancelInertia();
        cancelWheel();
        return;
      }
      if (pointerId !== null || !event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
      suppressClick = false;
      cancelInertia();
      cancelWheel();
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startScrollLeft = scroller.scrollLeft;
      lastPointerScroll = startScrollLeft;
      lastPointerTime = performance.now();
      pointerVelocity = 0;
      dragged = false;
    };

    const onPointerMove = (event) => {
      if (event.pointerId !== pointerId) return;
      const distance = event.clientX - startX;
      const verticalDistance = event.clientY - startY;

      if (
        !dragged &&
        event.pointerType !== "mouse" &&
        Math.abs(verticalDistance) > 8 &&
        Math.abs(verticalDistance) > Math.abs(distance)
      ) {
        endDrag();
        return;
      }

      // 6px: дрогнувшая рука при клике не превращает клик в перетаскивание,
      // и шот всё равно откроется.
      if (Math.abs(distance) <= 6) return;
      // Захватываем указатель, только когда ленту действительно потянули:
      // захват с первого нажатия уводил бы клик с шота на саму ленту,
      // и шот не открывался бы.
      if (!dragged) {
        scroller.setPointerCapture(pointerId);
        scroller.classList.add("is-dragging");
      }
      dragged = true;
      suppressClick = true;
      event.preventDefault();

      const nextScrollLeft = clampScroll(startScrollLeft - distance);
      const now = performance.now();
      const deltaTime = Math.max(8, now - lastPointerTime);
      const sample = (nextScrollLeft - lastPointerScroll) / deltaTime;
      pointerVelocity = Math.sign(sample) !== Math.sign(pointerVelocity)
        ? sample : pointerVelocity * 0.35 + sample * 0.65;
      pointerVelocity = Math.max(-3, Math.min(3, pointerVelocity));
      lastPointerScroll = nextScrollLeft;
      lastPointerTime = now;
      scroller.scrollLeft = nextScrollLeft;
    };

    const onClick = (event) => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    };

    const onPointerUp = (event) => { if (event.pointerId === pointerId) endDrag(true); };
    const onPointerCancel = (event) => { if (event.pointerId === pointerId) endDrag(); };

    const onWheel = (event) => {
      if (event.ctrlKey) return;
      if (pointerId !== null) return;

      const rawDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (!rawDelta) return;

      const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? scroller.clientWidth : 1;
      const currentTarget = wheelFrame ? wheelTarget : scroller.scrollLeft;
      const nextTarget = clampScroll(currentTarget + rawDelta * multiplier);
      if (Math.abs(nextTarget - currentTarget) < 0.5) return;

      event.preventDefault();
      cancelInertia();
      wheelTarget = nextTarget;
      if (reducedMotionQuery.matches) {
        scroller.scrollLeft = nextTarget;
        wheelTarget = nextTarget;
        return;
      }
      if (!wheelFrame) {
        wheelPosition = scroller.scrollLeft;
        wheelTime = performance.now();
        wheelFrame = requestAnimationFrame(stepWheel);
      }
    };

    const onKeyDown = (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      const step = Math.max(160, scroller.clientWidth * 0.72);
      const current = scroller.scrollLeft;
      const next = event.key === "Home"
        ? 0
        : event.key === "End"
          ? scroller.scrollWidth
          : current + (event.key === "ArrowRight" ? step : -step);
      event.preventDefault();
      cancelInertia();
      cancelWheel();
      if (parallaxFrame) cancelAnimationFrame(parallaxFrame);
      parallaxFrame = 0;
      parallaxShift = parallaxTarget = 0;
      media.forEach((element) => element.style.removeProperty("transform"));
      scroller.classList.remove("is-parallaxing");
      instantScroll = true;
      scroller.scrollLeft = clampScroll(next);
    };

    const onMotionPreference = () => {
      if (!reducedMotionQuery.matches) return;
      cancelInertia();
      cancelWheel();
      if (parallaxFrame) cancelAnimationFrame(parallaxFrame);
      parallaxFrame = 0;
      parallaxShift = parallaxTarget = 0;
      media.forEach((element) => element.style.removeProperty("transform"));
      scroller.classList.remove("is-parallaxing");
    };

    reducedMotionQuery.addEventListener("change", onMotionPreference);
    scroller.addEventListener("pointerdown", onPointerDown);
    scroller.addEventListener("pointermove", onPointerMove);
    scroller.addEventListener("pointerup", onPointerUp);
    scroller.addEventListener("pointercancel", onPointerCancel);
    scroller.addEventListener("lostpointercapture", onPointerCancel);
    scroller.addEventListener("click", onClick, true);
    scroller.addEventListener("wheel", onWheel, { passive: false });
    scroller.addEventListener("scroll", onScroll, { passive: true });
    const edgeObserver = new ResizeObserver(updateEdges);
    edgeObserver.observe(scroller);
    updateEdges();
    scroller.addEventListener("keydown", onKeyDown);

    return () => {
      reducedMotionQuery.removeEventListener("change", onMotionPreference);
      cancelInertia();
      cancelWheel();
      if (parallaxFrame) cancelAnimationFrame(parallaxFrame);
      scroller.removeEventListener("pointerdown", onPointerDown);
      scroller.removeEventListener("pointermove", onPointerMove);
      scroller.removeEventListener("pointerup", onPointerUp);
      scroller.removeEventListener("pointercancel", onPointerCancel);
      scroller.removeEventListener("lostpointercapture", onPointerCancel);
      scroller.removeEventListener("click", onClick, true);
      scroller.removeEventListener("wheel", onWheel);
      scroller.removeEventListener("scroll", onScroll);
      edgeObserver.disconnect();
      scroller.removeEventListener("keydown", onKeyDown);
      media.forEach((element) => element.style.removeProperty("transform"));
    };
  }, []);

  return (
    <div
      ref={scrollerRef}
      className={`drag-scroll ${className}`}
      data-edge="start"
      role="region"
      aria-label="Горизонтальная лента шотов"
      tabIndex={0}
    >
      {children}
    </div>
  );
}

// Прогрессивный блюр по канонической схеме (AndrewPrifer/progressive-blur):
// радиус растёт геометрически с удвоением, а маска каждого слоя — полоса
// «прозрачно → непрозрачно → прозрачно», сдвинутая на шаг вдоль края.
// Пандусы от одного края дают видимые ступени, полосы — нет.
const EDGE_OPPOSITE = { left: "right", right: "left", top: "bottom", bottom: "top" };

function buildBlurLayers({ side, strength, steps }) {
  const step = 100 / steps;
  const factor = 0.5;
  const base = Math.pow(strength / factor, 1 / (steps - 1));
  const to = EDGE_OPPOSITE[side];
  const blurAt = (i) => `blur(${(factor * base ** (steps - i - 1)).toFixed(2)}px)`;
  const layer = (stops, i) => {
    const mask = `linear-gradient(to ${to}, ${stops})`;
    return {
      position: "absolute",
      inset: 0,
      zIndex: i + 1,
      mask,
      WebkitMask: mask,
      backdropFilter: blurAt(i),
      WebkitBackdropFilter: blurAt(i),
    };
  };

  const layers = [
    layer(`rgba(0,0,0,1) 0%, rgba(0,0,0,0) ${step}%`, 0),
    layer(`rgba(0,0,0,1) 0%, rgba(0,0,0,1) ${step}%, rgba(0,0,0,0) ${step * 2}%`, 1),
  ];

  for (let i = 0; i < steps - 2; i += 1) {
    layers.push(
      layer(
        `rgba(0,0,0,0) ${i * step}%, rgba(0,0,0,1) ${(i + 1) * step}%, ` +
          `rgba(0,0,0,1) ${(i + 2) * step}%, rgba(0,0,0,0) ${(i + 3) * step}%`,
        i + 2,
      ),
    );
  }

  return layers;
}

function RailEdge({ side, strength = 32, steps = 4 }) {
  const layers = buildBlurLayers({ side, strength, steps });
  return (
    <span className={`rail-edge rail-edge--${side}`} aria-hidden="true">
      {layers.map((style, i) => (
        <span key={i} className="rail-edge-layer" style={style} />
      ))}
    </span>
  );
}

// Переключатель эксперимента: true — лента на WebGL (шейдерное размытие),
// false — обычная DOM-лента. Оба варианта живут рядом, чтобы сравнивать.
const USE_GL_SHOTS = false;

const SHOTS = [
  { className: "shot--wide", src: homeAssets.shotWide, full: shotWideFull, alt: "Интерфейс музыкальной платформы" },
  { className: "shot--portrait", src: homeAssets.shotPortraitA, full: shotPortraitAFull, alt: "Мобильный экран музыкального события" },
  { className: "shot--portrait shot--portrait-b", src: homeAssets.shotPortraitB, full: shotPortraitBFull, alt: "Мобильный экран профиля артиста" },
  {
    className: "shot--browser",
    src: homeAssets.shotUI,
    full: shotUIFull,
    alt: "Интерфейс визуального редактора",
    // Окно браузера без тени вокруг и без розовой полосы по нижнему краю
    // скриншота: доли измерены по исходнику 2908×1613.
    zoomCrop: { top: 0.0415, right: 0.0262, bottom: 0.004, left: 0.0262 },
  },
];

// Шот увеличивается по клику. Перетаскивание ленты клик не вызывает:
// DragScroll гасит его, если указатель сдвинулся.
function Shot({ className, src, full, alt, zoomCrop }) {
  const cardRef = useRef(null);
  const imageRef = useRef(null);
  const open = (fromKeyboard) => openShotZoom({
    card: cardRef.current,
    image: imageRef.current,
    fullSrc: full,
    alt,
    crop: zoomCrop,
    fromKeyboard,
    closeIcons: [closeDiagonalA, closeDiagonalB],
  });

  return (
    <figure
      ref={cardRef}
      className={`shot ${className}`}
      role="button"
      tabIndex={0}
      aria-label={`Увеличить: ${alt}`}
      onClick={() => open(false)}
      // Фокус от нажатия мышью прокручивал ленту к шоту ещё до клика.
      // С клавиатуры фокус ставится как обычно.
      onMouseDown={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        open(true);
      }}
    >
      <img ref={imageRef} loading="lazy" decoding="async" draggable={false} src={src} alt="" />
    </figure>
  );
}

function Shots() {
  return (
    <section className="shots-section" id="shots" aria-labelledby="shots-title">
      <p className="section-label" id="shots-title">Shots</p>
      {USE_GL_SHOTS ? (
        <Suspense fallback={<div className="shots-gl" aria-hidden="true" />}>
          <ShotsGL />
        </Suspense>
      ) : (
        <div className="shots-rail-wrap">
          <RailEdge side="left" />
          <RailEdge side="right" />
          <DragScroll className="shots-rail">
            {SHOTS.map((shot) => <Shot key={shot.full} {...shot} />)}
          </DragScroll>
        </div>
      )}
    </section>
  );
}

const AboutSlotsContext = createContext(null);
const ABOUT_SLOTS = [...ABOUT_MEDIA, { id: "портрет", x: 250, y: 97, width: 88, height: 148 }];

/* Короткое удержание отличает перенос от прокрутки: движение раньше
   порога отменяет захват и остаётся нативным скроллом страницы. */
const ABOUT_HOLD_MS = 120;

function MovableAboutTile({ item, children, className = "" }) {
  const { order, swap, target, setTarget, selected, setSelected } = useContext(AboutSlotsContext);
  const slotIndex = order.indexOf(item.id);
  const position = ABOUT_SLOTS[slotIndex];
  const [active, setActive] = useState(false);
  const drag = useRef(null);
  const rootRef = useRef(null);
  const touch = useRef(null);

  // Обработчики тача вешаем один раз, поэтому свежие значения держим в ref:
  // иначе замыкание поймает slotIndex с первого рендера и обмен уедет не туда.
  const latest = useRef(null);
  latest.current = { slotIndex, swap, setTarget, setSelected };

  const settle = (element) => {
    const transform = element.style.transform;
    element.style.transform = "";
    if (transform && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.animate([{ transform }, { transform: "none" }], { duration: 260, easing: "cubic-bezier(.22,1,.36,1)" });
    }
  };
  const hitAt = (clientX, clientY, element) => {
    const bounds = (element || rootRef.current).parentElement.getBoundingClientRect();
    const x = (clientX - bounds.left) / bounds.width * ABOUT_CANVAS.width;
    const y = (clientY - bounds.top) / bounds.height * ABOUT_CANVAS.height;
    return ABOUT_SLOTS.findIndex((cell) => x >= cell.x && x <= cell.x + cell.width && y >= cell.y && y <= cell.y + cell.height);
  };
  const finish = (event) => {
    if (drag.current?.id !== event.pointerId) return;
    const destination = event.type === "pointerup" && drag.current.moved
      ? hitAt(event.clientX, event.clientY, event.currentTarget)
      : -1;
    if (destination >= 0 && destination !== slotIndex) swap(slotIndex, destination, true);
    else settle(event.currentTarget);
    drag.current = null;
    setActive(false);
    setTarget(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return undefined;
    let hold = null;
    let moveFrame = 0;
    let dropTarget = null;
    const clearTarget = () => {
      dropTarget?.classList.remove("is-drop-target");
      dropTarget = null;
    };
    const hitCached = (x, y, current) => {
      const bounds = current.bounds;
      const localX = (x - bounds.left) / bounds.width * ABOUT_CANVAS.width;
      const localY = (y - bounds.top) / bounds.height * ABOUT_CANVAS.height;
      return ABOUT_SLOTS.findIndex((cell) => localX >= cell.x && localX <= cell.x + cell.width && localY >= cell.y && localY <= cell.y + cell.height);
    };
    const paintMove = () => {
      moveFrame = 0;
      const current = touch.current;
      if (!current?.active) return;
      const { clientX, clientY } = current;
      element.style.transform = `translate3d(${clientX - current.x}px, ${clientY - current.y}px, 0) scale(1.04)`;
      const index = hitCached(clientX, clientY, current);
      const next = index >= 0 && index !== latest.current.slotIndex
        ? current.cells.find((cell) => Number(cell.dataset.slotIndex) === index) : null;
      if (next !== dropTarget) {
        clearTarget();
        dropTarget = next;
        dropTarget?.classList.add("is-drop-target");
      }
    };
    const clearHold = () => { if (hold) { clearTimeout(hold); hold = null; } };

    const onStart = (event) => {
      if (event.touches.length !== 1 || touch.current) { clearHold(); return; }
      const point = event.touches[0];
      touch.current = { id: point.identifier, x: point.clientX, y: point.clientY,
        clientX: point.clientX, clientY: point.clientY, active: false,
        bounds: element.parentElement.getBoundingClientRect(),
        cells: [...element.parentElement.children] };
      element.getAnimations().forEach((animation) => animation.cancel());
      hold = setTimeout(() => {
        if (!touch.current) return;
        touch.current.active = true;
        element.style.willChange = "transform";
        setActive(true);
        latest.current.setSelected(null);
        if (navigator.vibrate) navigator.vibrate(8);
      }, ABOUT_HOLD_MS);
    };

    const onMove = (event) => {
      const current = touch.current;
      if (!current) return;
      const point = [...event.touches].find((candidate) => candidate.identifier === current.id);
      if (!point) return;
      const dx = point.clientX - current.x;
      const dy = point.clientY - current.y;
      if (!current.active) {
        // Палец поехал раньше, чем истекло удержание — это прокрутка страницы,
        // отдаём жест браузеру и больше в него не вмешиваемся.
        if (Math.hypot(dx, dy) > 8) { clearHold(); touch.current = null; }
        return;
      }
      // Слушатель неактивный (passive: false) — только так можно удержать
      // жест и не дать документу уехать вместе с пальцем.
      event.preventDefault();
      // Масштаб дублирует CSS-правило для удержания: инлайновый transform
      // перебивает таблицу стилей, и без него плитка схлопывалась бы обратно
      // в момент первого движения пальца.
      current.clientX = point.clientX;
      current.clientY = point.clientY;
      if (!moveFrame) moveFrame = requestAnimationFrame(paintMove);
    };

    const onEnd = (event) => {
      clearHold();
      cancelAnimationFrame(moveFrame);
      moveFrame = 0;
      clearTarget();
      element.style.willChange = "";
      const current = touch.current;
      if (!current) return;
      touch.current = null;
      if (!current.active) return;              // короткий тап — отдаём onClick
      const point = [...event.changedTouches].find((candidate) => candidate.identifier === current.id);
      const destination = event.type === "touchend" && point
        ? hitCached(point.clientX, point.clientY, current)
        : -1;
      const from = latest.current.slotIndex;
      if (destination >= 0 && destination !== from) latest.current.swap(from, destination, true);
      else settle(element);
      setActive(false);
      latest.current.setTarget(null);
    };

    element.addEventListener("touchstart", onStart, { passive: true });
    element.addEventListener("touchmove", onMove, { passive: false });
    element.addEventListener("touchend", onEnd);
    element.addEventListener("touchcancel", onEnd);
    return () => {
      clearHold();
      cancelAnimationFrame(moveFrame);
      clearTarget();
      touch.current = null;
      element.style.willChange = "";
      element.removeEventListener("touchstart", onStart);
      element.removeEventListener("touchmove", onMove);
      element.removeEventListener("touchend", onEnd);
      element.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      data-slot-index={slotIndex}
      className={`about-media-tile about-media-tile--movable ${active || selected === slotIndex ? "is-moving" : ""} ${target === slotIndex ? "is-drop-target" : ""} ${className}`}
      tabIndex={0}
      role="group"
      aria-label={`Блок ${item.id}. Перетащите на другую ячейку. Для обмена с клавиатуры выберите два блока клавишей Enter.`}
      style={{
        left: `${position.x / ABOUT_CANVAS.width * 100}%`,
        top: `${position.y / ABOUT_CANVAS.height * 100}%`,
        width: `${position.width / ABOUT_CANVAS.width * 100}%`,
        height: `${position.height / ABOUT_CANVAS.height * 100}%`,
      }}
      onDragStart={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        if (event.pointerType !== "mouse") return;
        if (!event.isPrimary || event.button !== 0 || drag.current) return;
        event.currentTarget.getAnimations().forEach((animation) => animation.cancel());
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
        setSelected(null);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const current = drag.current;
        if (!current || current.id !== event.pointerId) return;
        const dx = event.clientX - current.x;
        const dy = event.clientY - current.y;
        if (!current.moved && Math.hypot(dx, dy) < 6) return;
        current.moved = true;
        setActive(true);
        event.currentTarget.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
        const index = hitAt(event.clientX, event.clientY, event.currentTarget);
        setTarget(index >= 0 && index !== slotIndex ? index : null);
      }}
      onPointerUp={finish}
      onPointerCancel={finish}
      onLostPointerCapture={finish}
      onKeyDown={(event) => {
        if (event.key === "Escape") setSelected(null);
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (selected === null) setSelected(slotIndex);
          else { swap(selected, slotIndex); setSelected(null); }
        }
      }}
    ><div className="about-tile-content" style={{
      width: `${Math.max(position.width / item.width, position.height / item.height) * item.width / position.width * 100}%`,
      height: `${Math.max(position.width / item.width, position.height / item.height) * item.height / position.height * 100}%`,
      backgroundImage: `url("${homeAssets.collage}")`,
      backgroundSize: `${ABOUT_CANVAS.width / item.width * 100}% ${ABOUT_CANVAS.height / item.height * 100}%`,
      backgroundPosition: `${item.x / (ABOUT_CANVAS.width - item.width) * 100}% ${item.y / (ABOUT_CANVAS.height - item.height) * 100}%`,
    }}>{children}</div></div>
  );
}

function AboutMediaTile({ item }) {
  const poster = aboutPosters[`../assets/home/about/${item.id}-poster.jpg`];
  const [ready, setReady] = useState(Boolean(poster));


  let mediaStyle = {
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: item.fit || "fill",
    mixBlendMode: item.blendMode,
  };

  if (item.crop) {
    const [scaleX, scaleY, translateX, translateY] = item.crop;
    mediaStyle = {
      left: `${(-100 * translateX) / scaleX}%`,
      top: `${(-100 * translateY) / scaleY}%`,
      width: `${100 / scaleX}%`,
      height: `${100 / scaleY}%`,
      objectFit: "fill",
      mixBlendMode: item.blendMode,
    };
  }

  const video = (
    <AutoVideo
      className={ready ? "is-ready" : ""}
      src={aboutVideos[`../assets/home/about/${item.src}`]}
      label={`Видео из личного архива: ${item.id}`}
      poster={poster}
      style={mediaStyle}
      preload="none"
      rootMargin={item.priority ? "240px 0px" : "120px 0px"}
      onLoadedData={() => setReady(true)}
    />
  );

  if (item.rotate) {
    const rotatedFrameStyle = {
      top: "50%",
      left: "50%",
      width: `${(item.mediaWidth / item.width) * 100}%`,
      height: `${(item.mediaHeight / item.height) * 100}%`,
      transform: `translate(-50%, -50%) rotate(${item.rotate}deg)`,
    };

    return (
      <MovableAboutTile item={item}>
        <div className="about-media-rotated-frame" style={rotatedFrameStyle}>
          {video}
        </div>
      </MovableAboutTile>
    );
  }

  return (
    <MovableAboutTile item={item}>
      {video}
    </MovableAboutTile>
  );
}

/* Футер только для мобильного: там меню уехало наверх, и внизу оставался
   резерв в 112px ни подо что. На десктопе меню стоит внизу — футер не нужен,
   он бы дублировал его по смыслу. Состав по макету (Figma 1724:304):
   линия-разделитель, почта и телеграм. */
function HomeFooter() {
  return (
    <footer className="home-footer">
      <a href="mailto:danyadex@gmail.com">danyadex@gmail.com</a>
      <a href="https://t.me/danyatroyanov" target="_blank" rel="noreferrer">
        t.me/danyatroyanov
      </a>
    </footer>
  );
}

function About() {
  const collageRef = useRef(null);
  const previousRects = useRef(null);
  const [order, setOrder] = useState(() => ABOUT_SLOTS.map((item) => item.id));
  const [target, setTarget] = useState(null);
  const [selected, setSelected] = useState(null);
  const swap = (from, to, animate = false) => {
    if (from < 0 || to < 0 || from === to) return;
    const changed = [...collageRef.current.children].filter((element) =>
      [from, to].includes(Number(element.dataset.slotIndex)));
    if (animate && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      previousRects.current = changed.map((element) => [element, element.getBoundingClientRect()]);
    }
    changed.forEach((element) => {
      element.getAnimations().forEach((animation) => animation.cancel());
      element.style.transform = "";
    });
    setOrder((previous) => {
      const next = [...previous];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  };
  useLayoutEffect(() => {
    if (!previousRects.current) return;
    const measurements = previousRects.current.map(([element, before]) =>
      [element, before, element.getBoundingClientRect()]);
    for (const [element, before, after] of measurements) {
      if (before.x === after.x && before.y === after.y && before.width === after.width && before.height === after.height) continue;
      element.animate([
        { transform: `translate(${before.x - after.x}px, ${before.y - after.y}px) scale(${before.width / after.width}, ${before.height / after.height})` },
        { transform: "none" },
      ], { duration: 280, easing: "cubic-bezier(.22,1,.36,1)" });
    }
    previousRects.current = null;
  }, [order]);
  return (
    <section className="about-section" id="about" aria-labelledby="about-title">
      <p className="section-label" id="about-title">О себе</p>
      <RhythmDot />
      <div className="about-content">
        <p className="about-copy">
          {"Путешествия, живопись, музыка, театры и\u00a0музеи\u00a0—"}
          <br />
          основа моей насмотренности.
          <br />
          Где-то между ними
          <br />
          {"живёт мой\u00a0дизайн"}
        </p>
        <AboutSlotsContext.Provider value={{ order, swap, target, setTarget, selected, setSelected }}>
        <div ref={collageRef} className="about-collage" aria-label="Живой визуальный архив Даниила Троянова">
          {ABOUT_MEDIA.map((item) => (
            <AboutMediaTile key={item.id} item={item} />
          ))}
          <MovableAboutTile
            item={{ id: "портрет", x: 250, y: 97, width: 88, height: 148 }}
            className="about-media-tile--portrait"
          >
            <img src={homeAssets.portrait} alt="Даниил Троянов" draggable={false} />
          </MovableAboutTile>
        </div>
        </AboutSlotsContext.Provider>
      </div>
    </section>
  );
}

function ContactDialog({ onClose }) {
  const closeButtonRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const background = [...dialog.closest(".home-page").children]
      .filter((element) => !element.contains(dialog))
      .map((element) => ({ element, inert: element.inert }));
    closeButtonRef.current?.focus();
    background.forEach(({ element }) => { element.inert = true; });
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key !== "Tab") return;
      const controls = [...dialog.querySelectorAll("button:not([disabled]), a[href]")];
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      background.forEach(({ element, inert }) => { element.inert = inert; });
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [onClose]);

  return (
    <div className="contact-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className="contact-dialog" role="dialog" aria-modal="true" aria-labelledby="contact-dialog-title">
        <div className="contact-dialog-header">
          <h2 id="contact-dialog-title">Контакты</h2>
          <button ref={closeButtonRef} className="dialog-close" type="button" onClick={onClose} aria-label="Закрыть контакты">
            <span className="dialog-close-icon" aria-hidden="true">
              <img src={closeDiagonalA} alt="" />
              <img src={closeDiagonalB} alt="" />
            </span>
          </button>
        </div>
        <dl className="contact-dialog-rows">
          <div className="contact-dialog-row">
            <dt>Почта</dt>
            <dd><a href="mailto:danyadex@gmail.com">danyadex@gmail.com</a></dd>
          </div>
          <div className="contact-dialog-row">
            <dt>Telegram</dt>
            <dd>
              <a className="is-underlined" href="https://t.me/danyatroyanov" target="_blank" rel="noreferrer">
                @danyatroyanov
              </a>
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

// Градиент размытия у нижней кромки: пять слоёв с нарастающим блюром и
// сужающимися масками. Один слой с маской давал бы равномерное размытие,
// которое просто гаснет; здесь размывается всё сильнее к низу.
function ProgressiveBlur() {
  return (
    <div className="bottom-blur" aria-hidden="true">
      {[1, 2, 3, 4].map((step) => (
        <span key={step} className={`bottom-blur-layer bottom-blur-layer-${step}`} />
      ))}
    </div>
  );
}

function BottomNavigation({ onContacts }) {
  const navRef = useRef(null);
  useEffect(() => {
    let anchor = window.scrollY;
    const onScroll = () => {
      const y = Math.max(0, window.scrollY);
      const nav = navRef.current;
      if (!nav) return;
      if (y < 80) nav.dataset.hidden = "false";
      else if (Math.abs(y - anchor) > 12) {
        nav.dataset.hidden = String(y > anchor);
        anchor = y;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Как навбар в iOS: над тёмным экраном телефона текст пилюли белеет,
  // иначе чёрный текст на тонком стекле не читается. Над светлым контентом
  // остаётся чёрным. Смотрим, что лежит под центром каждой кнопки, — сами
  // кнопки и хедер при этом пропускаем.
  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 899px)");
    const nav = navRef.current;
    if (!nav) return undefined;
    const buttons = [...nav.querySelectorAll(".nav-button")];
    let frame = 0;

    const update = () => {
      frame = 0;
      buttons.forEach((button) => {
        if (!mobile.matches) {
          delete button.dataset.tone;
          return;
        }
        const rect = button.getBoundingClientRect();
        const under = document
          .elementsFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
          .find((element) => !nav.contains(element));
        if (under?.closest(".phone-stage")) button.dataset.tone = "dark";
        else delete button.dataset.tone;
      });
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  const scrollTo = (id) => {
    scrollToSection(id);
  };

  return (
    <nav ref={navRef} className="bottom-navigation" aria-label="Навигация по портфолио">
      <div className="bottom-navigation-inner">
        <button type="button" className="nav-button" onClick={() => scrollTo("about")}>О себе</button>
        <a
          className="nav-button"
          href={CV_FILE}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Открыть резюме в PDF"
        >
          CV
        </a>
        <button type="button" className="nav-button" onClick={onContacts}>Контакты</button>
      </div>
    </nav>
  );
}

function App() {
  const [contactsOpen, setContactsOpen] = useState(false);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 899px)");
    if (!mobile.matches) return undefined;

    const root = document.documentElement;
    let frame = 0;
    const updateStatusColor = () => {
      frame = 0;
      const sample = document.elementFromPoint(window.innerWidth / 2, 52);
      const color = sample?.closest(".phone-screen")
        ? "#000000"
        : sample?.closest(".browser-content")
          ? "#a787f4"
          : sample?.closest(".avatar-frame")
            ? "#d9e6f2"
            : "#ffffff";
      root.style.setProperty("--home-status-color", color);
    };
    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateStatusColor);
    };

    updateStatusColor();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.visualViewport?.addEventListener("resize", scheduleUpdate);
    window.visualViewport?.addEventListener("scroll", scheduleUpdate);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.visualViewport?.removeEventListener("resize", scheduleUpdate);
      window.visualViewport?.removeEventListener("scroll", scheduleUpdate);
      root.style.removeProperty("--home-status-color");
    };
  }, []);

  return (
    <div className="home-page">
      <main className="home-main">
        <section className="intro-section" aria-labelledby="intro-title">
          <div className="personal-meta">
            <p className="personal-name">Даниил Троянов</p>
            <div className="personal-details">
              <dl>
                <dt>Локация</dt>
                <dd>Санкт-Петербург</dd>
              </dl>
              <dl>
                <dt>Опыт</dt>
                <dd>2 года</dd>
              </dl>
            </div>
          </div>
          <div className="intro-content">
            <Avatar />
            <p className="intro-copy" id="intro-title">
              <span>
                Продуктовый AI-дизайнер
                <br />
                с художественным бэкграундом
              </span>
            </p>
          </div>
        </section>

        <div className="project-stack">
          <ArtifactProject />
          <AIProducerProject />
          <TayaProject />
        </div>

        <Shots />
        <About />
        <HomeFooter />
      </main>

      <ProgressiveBlur />
      <BottomNavigation onContacts={() => setContactsOpen(true)} />
      {contactsOpen && <ContactDialog onClose={() => setContactsOpen(false)} />}
    </div>
  );
}

export default App;
