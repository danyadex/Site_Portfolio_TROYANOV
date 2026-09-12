import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";

/*
  Лента шотов на WebGL — эксперимент по образцу segerman.dev/work/estrela.
  Смысл: размытие считается шейдером за один проход на GPU, а не стопкой
  backdrop-filter, каждый слой которой заставляет браузер заново
  растеризовать подложку на каждом кадре прокрутки.
*/

const HEIGHT_DESKTOP = 400;
const HEIGHT_MOBILE = 230;
const GAP_DESKTOP = 24;
const GAP_MOBILE = 19.233;
const RADIUS = 12;
const EDGE = 140; // ширина зоны расфокуса у краёв, px
const MAX_BLUR = 26; // сила размытия на самом краю, px

const SHOTS = [
  { src: "/assets/home/figma/figma-home-shot-wide@2x.webp", alt: "Интерфейс музыкальной платформы" },
  { src: "/assets/home/figma/figma-home-shot-portrait-a@2x.webp", alt: "Мобильный экран музыкального события" },
  { src: "/assets/home/figma/figma-home-shot-portrait-b@2x.webp", alt: "Мобильный экран профиля артиста" },
  { src: "/assets/home/figma/figma-home-shot-ui@2x.webp", alt: "Интерфейс визуального редактора" },
];

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Размытие усиливается к краям холста. Радиус скругления считается
// расстоянием до прямоугольника со скруглёнными углами.
const fragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uTex;
  uniform vec2 uSize;      // размер карточки, px
  uniform float uCardX;    // левый край карточки в координатах холста, px
  uniform float uViewport; // ширина холста, px
  uniform float uEdge;
  uniform float uMaxBlur;
  uniform float uRadius;
  varying vec2 vUv;

  float roundedMask(vec2 uv, vec2 size, float radius) {
    vec2 p = abs(uv * size - size * 0.5) - (size * 0.5 - radius);
    float d = length(max(p, 0.0)) + min(max(p.x, p.y), 0.0) - radius;
    return 1.0 - smoothstep(-1.0, 1.0, d);
  }

  void main() {
    float sx = uCardX + vUv.x * uSize.x;
    float toEdge = min(sx, uViewport - sx);
    float edgeFactor = 1.0 - smoothstep(0.0, uEdge, max(toEdge, 0.0));
    float blur = edgeFactor * uMaxBlur;

    vec2 texel = vec2(blur) / uSize;
    vec4 color = texture2D(uTex, vUv) * 0.25;
    float weight = 0.25;

    // 12 отсчётов двумя кольцами — дешевле полноценной гауссианы,
    // на градиенте расфокуса разница не видна.
    for (int i = 0; i < 12; i++) {
      float a = float(i) * 0.5235988; // 30 градусов
      float ring = i < 6 ? 0.55 : 1.0;
      vec2 offset = vec2(cos(a), sin(a)) * texel * ring;
      float w = i < 6 ? 0.085 : 0.04;
      color += texture2D(uTex, clamp(vUv + offset, 0.001, 0.999)) * w;
      weight += w;
    }

    color /= weight;
    gl_FragColor = vec4(color.rgb, color.a * roundedMask(vUv, uSize, uRadius));

    // Обязательно для сырого ShaderMaterial: текстура сэмплируется в линейном
    // пространстве, а на экран нужно отдать sRGB. Без этого картинка уходит
    // в задранный контраст.
    #include <colorspace_fragment>
  }
`;

function Card({ texture, x, width, height, scrollRef }) {
  const material = useRef(null);
  const mesh = useRef(null);
  const { size } = useThree();

  const uniforms = useMemo(
    () => ({
      uTex: { value: texture },
      uSize: { value: new THREE.Vector2(width, height) },
      uCardX: { value: 0 },
      uViewport: { value: size.width },
      uEdge: { value: EDGE },
      uMaxBlur: { value: MAX_BLUR },
      uRadius: { value: RADIUS },
    }),
    [texture, width, height, size.width],
  );

  useFrame(() => {
    const left = x - scrollRef.current;
    if (mesh.current) mesh.current.position.x = left + width / 2 - size.width / 2;
    if (material.current) {
      material.current.uniforms.uCardX.value = left;
      material.current.uniforms.uViewport.value = size.width;
    }
  });

  return (
    <mesh ref={mesh}>
      <planeGeometry args={[width, height]} />
      <shaderMaterial
        ref={material}
        transparent
        uniforms={uniforms}
        vertexShader={vertex}
        fragmentShader={fragment}
      />
    </mesh>
  );
}

function Scene({ scrollRef, onLayout }) {
  const textures = useLoader(THREE.TextureLoader, SHOTS.map((s) => s.src));
  const { size } = useThree();
  const isMobile = size.width <= 899;
  const height = isMobile ? HEIGHT_MOBILE : HEIGHT_DESKTOP;
  const gap = isMobile ? GAP_MOBILE : GAP_DESKTOP;

  const cards = useMemo(() => {
    let cursor = 0;
    const list = textures.map((tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.generateMipmaps = true;
      const width = height * (tex.image.width / tex.image.height);
      const card = { tex, x: cursor, width };
      cursor += width + gap;
      return card;
    });
    return { list, total: cursor - gap };
  }, [textures, height, gap]);

  useEffect(() => {
    onLayout({ total: cards.total, viewport: size.width, height });
  }, [cards.total, size.width, height, onLayout]);

  return cards.list.map((c, i) => (
    <Card key={i} texture={c.tex} x={c.x} width={c.width} height={height} scrollRef={scrollRef} />
  ));
}

export default function ShotsGL() {
  const scrollRef = useRef(0);
  const maxRef = useRef(0);
  const hostRef = useRef(null);
  const [height, setHeight] = useState(HEIGHT_DESKTOP);

  // useCallback обязателен: onLayout уходит в зависимости эффекта внутри сцены,
  // новая функция на каждый рендер зациклила бы обновления.
  const onLayout = useCallback(({ total, viewport, height: h }) => {
    maxRef.current = Math.max(0, total - viewport);
    setHeight(h);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let pointerId = null;
    let startX = 0;
    let startScroll = 0;

    const clamp = (v) => Math.min(maxRef.current, Math.max(0, v));

    const onWheel = (e) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(e.deltaX) < 1 && Math.abs(e.deltaY) > Math.abs(e.deltaX)) return;
      e.preventDefault();
      scrollRef.current = clamp(scrollRef.current + delta);
    };

    const down = (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      pointerId = e.pointerId;
      startX = e.clientX;
      startScroll = scrollRef.current;
      host.setPointerCapture(pointerId);
      host.style.cursor = "grabbing";
    };

    const move = (e) => {
      if (e.pointerId !== pointerId) return;
      scrollRef.current = clamp(startScroll - (e.clientX - startX));
    };

    const up = () => {
      pointerId = null;
      host.style.cursor = "grab";
    };

    host.addEventListener("wheel", onWheel, { passive: false });
    host.addEventListener("pointerdown", down);
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerup", up);
    host.addEventListener("pointercancel", up);

    return () => {
      host.removeEventListener("wheel", onWheel);
      host.removeEventListener("pointerdown", down);
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerup", up);
      host.removeEventListener("pointercancel", up);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="shots-gl"
      style={{ height, cursor: "grab", touchAction: "pan-y" }}
      role="img"
      aria-label={`Лента работ: ${SHOTS.map((s) => s.alt).join(", ")}`}
    >
      <Canvas orthographic dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }} camera={{ position: [0, 0, 10], zoom: 1 }}>
        {/* useLoader приостанавливает рендер — без Suspense падает всё дерево. */}
        <Suspense fallback={null}>
          <Scene scrollRef={scrollRef} onLayout={onLayout} />
        </Suspense>
      </Canvas>
    </div>
  );
}
