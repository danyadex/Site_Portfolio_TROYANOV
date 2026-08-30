import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const HOME = "/assets/home";
const FIGMA_HOME = `${HOME}/figma`;

function AutoVideo({ src, className = "", label, poster }) {
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
  const meshRef = useRef(null);
  const texture = useVideoTexture(src);
  const { viewport } = useThree();

  useEffect(() => {
    const video = texture?.image;
    if (!texture || !video?.videoWidth || !video?.videoHeight) return;

    const imageAspect = video.videoWidth / video.videoHeight;
    const frameAspect = viewport.width / viewport.height;
    const cover = imageAspect > frameAspect
      ? [frameAspect / imageAspect, 1]
      : [1, imageAspect / frameAspect];

    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(cover[0], cover[1]);
    texture.offset.set((1 - cover[0]) / 2, (1 - cover[1]) / 2);
    texture.needsUpdate = true;
  }, [texture, viewport.width, viewport.height]);

  useFrame(({ pointer }) => {
    if (!meshRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    if (texture) texture.needsUpdate = true;

    meshRef.current.rotation.y = THREE.MathUtils.lerp(
      meshRef.current.rotation.y,
      pointer.x * 0.035,
      0.08,
    );
    meshRef.current.rotation.x = THREE.MathUtils.lerp(
      meshRef.current.rotation.x,
      -pointer.y * 0.025,
      0.08,
    );
  });

  if (!texture) return null;

  return (
    <mesh ref={meshRef} scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[2, 2]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

function Avatar() {
  return (
    <div className="avatar-frame" role="img" aria-label="Портрет Даниила Троянова">
      <AutoVideo
        className="avatar-fallback"
        src={`${HOME}/hero-portrait.mp4`}
        label="Портрет Даниила Троянова"
      />
      <Canvas
        className="avatar-canvas"
        dpr={[1, 2]}
        orthographic
        camera={{ position: [0, 0, 5], zoom: 1 }}
        gl={{ antialias: true, alpha: true }}
      >
        <AvatarPlane src={`${HOME}/hero-portrait.mp4`} />
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

function PhoneMockup({ src, label }) {
  return (
    <div className="phone-stage">
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
        <img src={`${FIGMA_HOME}/figma-home-browser-titlebar.png`} alt="" />
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
        <PhoneMockup src={`${HOME}/taya-screen.mp4`} label="Аниматик экрана TAYA AI" />
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

function About() {
  return (
    <section className="about-section" id="about" aria-labelledby="about-title">
      <p className="section-label" id="about-title">О Себе</p>
      <div className="about-collage">
        <img
          className="about-collage-image"
          src={`${FIGMA_HOME}/figma-home-about-collage.png`}
          alt="Фрагменты визуального архива Даниила Троянова"
        />
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
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <nav className="bottom-navigation" aria-label="Навигация по портфолио">
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
