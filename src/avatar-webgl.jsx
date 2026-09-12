import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useEffect, useState } from "react";
import { manageVideoPlayback } from "../media-playback.js";

function useVideoTexture(src, frameRef) {
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    const video = document.createElement("video");
    let nextTexture = null;
    let disposed = false;
    video.src = src;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto";
    const stopPlayback = manageVideoPlayback(video, frameRef.current, { rootMargin: "0px" });

    const onReady = () => {
      if (disposed) return;
      nextTexture = new THREE.VideoTexture(video);
      nextTexture.colorSpace = THREE.SRGBColorSpace;
      nextTexture.minFilter = THREE.LinearFilter;
      nextTexture.magFilter = THREE.LinearFilter;
      setTexture(nextTexture);
    };

    video.addEventListener("loadeddata", onReady, { once: true });
    video.load();

    return () => {
      disposed = true;
      stopPlayback();
      video.removeEventListener("loadeddata", onReady);
      video.removeAttribute("src");
      video.load();
      nextTexture?.dispose();
    };
  }, [src, frameRef]);

  return texture;
}

function AvatarPlane({ src, frameRef }) {
  const texture = useVideoTexture(src, frameRef);
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

export default function AvatarWebGL({ src, frameRef, active }) {
  return (
    <Canvas
      className="avatar-canvas"
      frameloop={active ? "always" : "demand"}
      dpr={[1, 1.5]}
      orthographic
      camera={{ position: [0, 0, 5], zoom: 1 }}
      gl={{ antialias: true, alpha: true }}
    >
      <AvatarPlane src={src} frameRef={frameRef} />
    </Canvas>
  );
}
