import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import "../assets/vendor/liquid-glass.js";

const HOME = "/assets/home";
const FIGMA_HOME = `${HOME}/figma`;
const AVATAR_VIDEO = `${HOME}/hero-portrait.mp4?v=2046-558`;
const ABOUT_CANVAS = { width: 588, height: 509.60113525390625 };

const ABOUT_MEDIA = [
  { id: "painting", src: "painting.mp4", x: 0, y: 0, width: 138, height: 245, fit: "cover" },
  { id: "grill", src: "grill.mp4", x: 150, y: 0, width: 88, height: 155, crop: [0.9551309347, 0.9461766481, 0.0094919363, 0.0252536461] },
  { id: "camera", src: "camera.mp4", x: 250, y: 0, width: 88, height: 85, crop: [1, 0.5294811726, 0, 0.3125] },
  { id: "guitar", src: "guitar.mp4", x: 350, y: 0, width: 88, height: 103, crop: [1, 0.6440383196, 0, 0.0011987907] },
  { id: "statue", src: "statue.mp4", x: 450, y: 0, width: 138, height: 245, crop: [1, 0.9714246988, 0, 0.0004101723] },
  { id: "bridge", src: "bridge.mp4", x: 350, y: 115, width: 88, height: 130, crop: [0.999895215, 0.8115502, 0.0000524, 0] },
  { id: "sea", src: "sea.mp4", x: 150, y: 167, width: 88, height: 78, crop: [1, 0.5, 0, 0] },
  { id: "waves", src: "waves.mp4", x: 0, y: 257, width: 138, height: 127, crop: [1, 0.5025424957, 0, 0.2487287521] },
  { id: "laptop", src: "laptop.mp4", x: 150, y: 257, width: 88, height: 135, crop: [0.9976278543, 0.8374170661, 0.0007332705, -0.0015507723] },
  { id: "bones", src: "bones.mp4", x: 250, y: 257, width: 186.514, height: 102, crop: [0.9994611144, 1, 0.0002693602, 0] },
  { id: "river", src: "river.mp4", x: 448, y: 257, width: 138, height: 252, fit: "cover" },
  { id: "daw", src: "daw.mp4", x: 0, y: 396, width: 138, height: 111, crop: [1, 0.4380548, 0, 0.1463169456] },
  { id: "museum", src: "museum.mp4", x: 250, y: 371, width: 86, height: 138, crop: [0.9695084095, 0.8507232666, 0.0018566962, 0.0013247912], blendMode: "hard-light" },
  { id: "forest", src: "forest.mp4", x: 348, y: 371, width: 88, height: 138, crop: [1, 0.8605854511, 0, 0.0014675052] },
];

function AutoVideo({ src, className = "", label, poster, style, onLoadedData }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const play = () => video.play().catch(() => {});
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) play();
        else video.pause();
      },
      { threshold: 0.01 },
    );

    observer.observe(video);
    video.addEventListener("loadeddata", play, { once: true });

    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      className={className}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      poster={poster}
      aria-label={label}
      style={style}
      onLoadedData={onLoadedData}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}

function useVideoTexture(src) {
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    const video = document.createElement("video");
    let nextTexture = null;
    video.src = src;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto";

    const onReady = () => {
      nextTexture = new THREE.VideoTexture(video);
      nextTexture.colorSpace = THREE.SRGBColorSpace;
      nextTexture.minFilter = THREE.LinearFilter;
      nextTexture.magFilter = THREE.LinearFilter;
      setTexture(nextTexture);
      video.play().catch(() => {});
    };

    video.addEventListener("loadeddata", onReady, { once: true });
    video.load();

    return () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
      nextTexture?.dispose();
    };
  }, [src]);

  return texture;
}

function AvatarPlane({ src }) {
  const texture = useVideoTexture(src);
  const { viewport } = useThree();

  useEffect(() => {
    if (!texture) return;

    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(0.9350454807, 1);
    texture.offset.set(0.031304311, 0.0007102044);
    texture.needsUpdate = true;
  }, [texture]);

  useFrame(() => {
    if (texture) texture.needsUpdate = true;
  });

  if (!texture) return null;

  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function Avatar() {
  return (
    <div className="avatar-frame" role="img" aria-label="Портрет Даниила Троянова">
      <AutoVideo
        className="avatar-fallback"
        src={AVATAR_VIDEO}
        label="Портрет Даниила Троянова"
      />
      <Canvas
        className="avatar-canvas"
        dpr={[1, 2]}
        orthographic
        camera={{ position: [0, 0, 5], zoom: 1 }}
        gl={{ antialias: true, alpha: true }}
      >
        <AvatarPlane src={AVATAR_VIDEO} />
      </Canvas>
    </div>
  );
}

function ProjectArrow() {
  return (
    <span className="project-arrow" aria-hidden="true">
      <img src={`${FIGMA_HOME}/figma-home-arrow-24.svg`} alt="" />
    </span>
  );
}

function ProjectHeader({ href, title, tags, disabled = false }) {
  const content = (
    <>
      {disabled ? <span className="project-status">Soon</span> : <ProjectArrow />}
      <span className={disabled ? "project-link-label is-disabled" : "project-link-label"}>{title}</span>
      <span className="project-tags">
        {tags.map((tag) => (
          <span key={tag}>{tag}</span>
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

function PhoneMockup({ src, label, variant = "default" }) {
  return (
    <div className={`phone-stage phone-stage--${variant}`}>
      <div className="phone-screen">
        <AutoVideo src={src} label={label} />
      </div>
      <img className="phone-bezel" src={`${FIGMA_HOME}/figma-home-iphone.png`} alt="" />
    </div>
  );
}

function ArtifactProject() {
  return (
    <article className="home-project home-project--artifact" id="projects">
      <div className="home-project-media home-project-media--phone">
        <PhoneMockup src={`${HOME}/artifact-screen.mp4`} label="Аниматик приложения ARTIFACT" />
      </div>
      <div className="home-project-info">
        <ProjectHeader href="/artifact.html" title="Artifact" tags={["App", "Lead Designer"]} />
        <span className="project-dot" aria-hidden="true">•</span>
        <ProjectDescription>
          Мобильный инструмент
          <br />
          для создания визуального AI-контента
        </ProjectDescription>
      </div>
    </article>
  );
}

function BrowserMockup() {
  return (
    <div className="browser-stage">
      <div className="browser-titlebar" aria-hidden="true">
        <img src={`${FIGMA_HOME}/figma-home-browser-titlebar-cropped.png`} alt="" />
      </div>
      <div className="browser-content">
        <AutoVideo
          src={`${HOME}/ai-producer-screen.mp4`}
          poster={`${FIGMA_HOME}/figma-home-browser-bg.png`}
          label="Аниматик рабочего пространства AI Producer"
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
        <ProjectHeader href="/ai-producer.html" title="AI Producer" tags={["Web", "Builder"]} />
        <span className="project-dot" aria-hidden="true">•</span>
        <ProjectDescription>
          Веб-платформа
          <br />
          для создания AI-сцен с режиссёрским контролем
        </ProjectDescription>
      </div>
    </article>
  );
}

function TayaProject() {
  return (
    <article className="home-project home-project--taya">
      <div className="home-project-media home-project-media--phone">
        <PhoneMockup src={`${HOME}/taya-screen.mp4`} label="Аниматик экрана TAYA AI" variant="taya" />
      </div>
      <div className="home-project-info">
        <ProjectHeader disabled title="Taya AI" tags={["App", "Design & Research"]} />
        <span className="project-dot" aria-hidden="true">•</span>
        <ProjectDescription>
          Мобильный ассистент
          <br />
          для независимых художников
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

    let pointerId = null;
    let startX = 0;
    let startScrollLeft = 0;
    let dragged = false;

    const endDrag = () => {
      if (pointerId === null) return;
      scroller.classList.remove("is-dragging");
      pointerId = null;
    };

    const onPointerDown = (event) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startScrollLeft = scroller.scrollLeft;
      dragged = false;
      scroller.setPointerCapture(pointerId);
      scroller.classList.add("is-dragging");
    };

    const onPointerMove = (event) => {
      if (event.pointerId !== pointerId) return;
      const distance = event.clientX - startX;
      if (Math.abs(distance) > 3) dragged = true;
      if (dragged) event.preventDefault();
      scroller.scrollLeft = startScrollLeft - distance;
    };

    const onClick = (event) => {
      if (!dragged) return;
      event.preventDefault();
      event.stopPropagation();
      dragged = false;
    };

    scroller.addEventListener("pointerdown", onPointerDown);
    scroller.addEventListener("pointermove", onPointerMove);
    scroller.addEventListener("pointerup", endDrag);
    scroller.addEventListener("pointercancel", endDrag);
    scroller.addEventListener("lostpointercapture", endDrag);
    scroller.addEventListener("click", onClick, true);

    return () => {
      scroller.removeEventListener("pointerdown", onPointerDown);
      scroller.removeEventListener("pointermove", onPointerMove);
      scroller.removeEventListener("pointerup", endDrag);
      scroller.removeEventListener("pointercancel", endDrag);
      scroller.removeEventListener("lostpointercapture", endDrag);
      scroller.removeEventListener("click", onClick, true);
    };
  }, []);

  return (
    <div ref={scrollerRef} className={`drag-scroll ${className}`}>
      {children}
    </div>
  );
}

function Shots() {
  return (
    <section className="shots-section" id="shots" aria-labelledby="shots-title">
      <p className="section-label" id="shots-title">Shots</p>
      <DragScroll className="shots-rail">
        <figure className="shot shot--wide">
          <img src={`${FIGMA_HOME}/figma-home-shot-wide.png`} alt="Интерфейс музыкальной платформы" />
        </figure>
        <figure className="shot shot--portrait">
          <img src={`${FIGMA_HOME}/figma-home-shot-portrait-a.png`} alt="Мобильный экран музыкального события" />
        </figure>
        <figure className="shot shot--portrait">
          <img src={`${FIGMA_HOME}/figma-home-shot-portrait-b.png`} alt="Мобильный экран профиля артиста" />
        </figure>
        <figure className="shot shot--browser">
          <img src={`${FIGMA_HOME}/figma-home-shot-ui.png`} alt="Интерфейс визуального редактора" />
        </figure>
      </DragScroll>
    </section>
  );
}

function AboutMediaTile({ item }) {
  const [ready, setReady] = useState(false);
  const tileStyle = {
    left: `${(item.x / ABOUT_CANVAS.width) * 100}%`,
    top: `${(item.y / ABOUT_CANVAS.height) * 100}%`,
    width: `${(item.width / ABOUT_CANVAS.width) * 100}%`,
    height: `${(item.height / ABOUT_CANVAS.height) * 100}%`,
  };

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

  return (
    <div className="about-media-tile" style={tileStyle}>
      <AutoVideo
        className={ready ? "is-ready" : ""}
        src={`${HOME}/about/${item.src}`}
        label={`Видео из личного архива: ${item.id}`}
        style={mediaStyle}
        onLoadedData={() => setReady(true)}
      />
    </div>
  );
}

function About() {
  return (
    <section className="about-section" id="about" aria-labelledby="about-title">
      <p className="section-label" id="about-title">О Себе</p>
      <div className="about-collage" aria-label="Живой визуальный архив Даниила Троянова">
        <img
          className="about-collage-placeholder"
          src={`${FIGMA_HOME}/figma-home-about-collage.png`}
          alt=""
        />
        {ABOUT_MEDIA.map((item) => (
          <AboutMediaTile key={item.id} item={item} />
        ))}
        <div
          className="about-media-tile about-media-tile--portrait"
          style={{
            left: `${(250 / ABOUT_CANVAS.width) * 100}%`,
            top: `${(97 / ABOUT_CANVAS.height) * 100}%`,
            width: `${(88 / ABOUT_CANVAS.width) * 100}%`,
            height: `${(148 / ABOUT_CANVAS.height) * 100}%`,
          }}
        >
          <img src={`${HOME}/about/portrait.jpg`} alt="Даниил Троянов" />
        </div>
      </div>
    </section>
  );
}

function ContactDialog({ onClose }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="contact-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="contact-dialog" role="dialog" aria-modal="true" aria-labelledby="contact-dialog-title">
        <div className="contact-dialog-header">
          <h2 id="contact-dialog-title">Контакты</h2>
          <button ref={closeButtonRef} className="dialog-close" type="button" onClick={onClose} aria-label="Закрыть контакты">
            ×
          </button>
        </div>
        <a href="mailto:danyadex@gmail.com">danyadex@gmail.com</a>
        <a href="https://t.me/danyatroyanov" target="_blank" rel="noreferrer">telegram</a>
      </section>
    </div>
  );
}

function BottomNavigation({ onContacts }) {
  const glassRef = useRef(null);

  useEffect(() => {
    const element = glassRef.current;
    const reduceTransparency = window.matchMedia("(prefers-reduced-transparency: reduce)");
    if (!element || reduceTransparency.matches || typeof window.liquidGlass !== "function") {
      return undefined;
    }

    const glass = window.liquidGlass(element, {
      scale: -64,
      chroma: 4,
      border: 0.08,
      mapBlur: 10,
      blur: 3,
      saturate: 1.45,
      radius: 24,
      fallbackBlur: 22,
    });

    return () => glass.destroy();
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <nav ref={glassRef} className="bottom-navigation" aria-label="Навигация по портфолио">
      <div className="bottom-navigation-inner">
        <button type="button" className="nav-button" onClick={() => scrollTo("about")}>О себе</button>
        <button type="button" className="nav-button" onClick={() => scrollTo("projects")}>CV</button>
        <button type="button" className="nav-button" onClick={onContacts}>Контакты</button>
      </div>
    </nav>
  );
}

function App() {
  const [contactsOpen, setContactsOpen] = useState(false);

  return (
    <div className="home-page">
      <main className="home-main">
        <section className="intro-section" aria-labelledby="intro-title">
          <div className="personal-meta">
            <p className="personal-name">Даниил Троянов</p>
            <dl>
              <div>
                <dt>Локация</dt>
                <dd>Санкт-Петербург</dd>
              </div>
              <div>
                <dt>Опыт</dt>
                <dd>2 года</dd>
              </div>
            </dl>
          </div>
          <div className="intro-content">
            <Avatar />
            <p className="intro-copy" id="intro-title">
              <span>
                Продуктовый AI-дизайнер
                <br />
                с художественным бэкграундом
                <br />
                <br />
              </span>
              <span className="intro-copy-muted">
                Проектирую B2C AI-продукты с нуля —
                <br />
                от первого сценария
                <br />
                до интерактивного прототипа
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
        <div className="home-divider" aria-hidden="true" />
      </main>

      <BottomNavigation onContacts={() => setContactsOpen(true)} />
      {contactsOpen && <ContactDialog onClose={() => setContactsOpen(false)} />}
    </div>
  );
}

export default App;
