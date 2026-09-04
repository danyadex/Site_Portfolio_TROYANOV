const createLoopLayers = (video) => {
  const loopFrame = document.createElement("div");
  loopFrame.className = "ai-video-loop";
  video.parentNode.insertBefore(loopFrame, video);
  loopFrame.append(video);

  video.classList.add("ai-video-loop-layer", "is-active");

  const alternateVideo = video.cloneNode(true);
  alternateVideo.removeAttribute("autoplay");
  alternateVideo.removeAttribute("loop");
  alternateVideo.setAttribute("aria-hidden", "true");
  alternateVideo.tabIndex = -1;
  alternateVideo.muted = true;
  alternateVideo.playsInline = true;
  alternateVideo.preload = "auto";
  alternateVideo.classList.add("ai-video-loop-layer");
  loopFrame.append(alternateVideo);
  alternateVideo.load();

  return [video, alternateVideo];
};

document.querySelectorAll("video[data-loop-start], video[data-loop-end]").forEach((video) => {
  if (video.dataset.loopInitialized === "true") return;
  video.dataset.loopInitialized = "true";

  const configuredStart = Number.parseFloat(video.dataset.loopStart ?? "0");
  const configuredEnd = Number.parseFloat(video.dataset.loopEnd ?? "");
  const configuredCrossfade = Number.parseFloat(video.dataset.loopCrossfade ?? "0");
  const loopStart = Number.isFinite(configuredStart) && configuredStart >= 0 ? configuredStart : 0;
  const crossfadeDuration = Number.isFinite(configuredCrossfade)
    ? Math.max(0, Math.min(configuredCrossfade, 0.75))
    : 0;
  const layers = crossfadeDuration > 0 ? createLoopLayers(video) : [video];
  let activeVideo = layers[0];
  let standbyVideo = layers[1] ?? null;
  let loopEnd = Number.POSITIVE_INFINITY;
  let frameCallbackId = null;
  let transitionTimeoutId = null;
  let transitioning = false;

  const syncLoopRange = () => {
    if (!Number.isFinite(video.duration) || loopStart >= video.duration) return false;

    loopEnd = Number.isFinite(configuredEnd)
      ? Math.min(Math.max(configuredEnd, loopStart), video.duration)
      : video.duration;

    if (activeVideo.currentTime < loopStart || activeVideo.currentTime >= loopEnd) {
      activeVideo.currentTime = loopStart;
    }

    return loopEnd > loopStart;
  };

  const resetLayer = (layer) => {
    layer.pause();
    layer.currentTime = loopStart;
  };

  const restartLoop = () => {
    if (!syncLoopRange()) return;

    const shouldResume = !activeVideo.paused || activeVideo.ended;
    resetLayer(activeVideo);
    if (shouldResume) activeVideo.play().catch(() => {});
  };

  const finishCrossfade = () => {
    if (!transitioning || !standbyVideo) return;

    const outgoingVideo = activeVideo;
    const incomingVideo = standbyVideo;
    resetLayer(outgoingVideo);
    outgoingVideo.classList.remove("is-active");
    incomingVideo.classList.add("is-active");
    activeVideo = incomingVideo;
    standbyVideo = outgoingVideo;
    transitioning = false;
    transitionTimeoutId = null;
    scheduleFrameCheck();
  };

  const startCrossfade = () => {
    if (!standbyVideo || transitioning || !syncLoopRange()) return;

    const outgoingVideo = activeVideo;
    const incomingVideo = standbyVideo;
    transitioning = true;
    outgoingVideo.pause();
    incomingVideo.currentTime = loopStart;

    const revealIncoming = () => {
      if (!transitioning || activeVideo !== outgoingVideo) return;

      incomingVideo.play().catch(() => {});
      requestAnimationFrame(() => {
        if (!transitioning || activeVideo !== outgoingVideo) return;
        incomingVideo.classList.add("is-active");
        outgoingVideo.classList.remove("is-active");
        transitionTimeoutId = window.setTimeout(finishCrossfade, crossfadeDuration * 1000);
      });
    };

    const waitForIncomingFrame = () => {
      if ("requestVideoFrameCallback" in incomingVideo) {
        incomingVideo.requestVideoFrameCallback(revealIncoming);
      } else {
        requestAnimationFrame(revealIncoming);
      }
    };

    if (incomingVideo.readyState >= 1) {
      incomingVideo.play().then(waitForIncomingFrame).catch(waitForIncomingFrame);
    } else {
      incomingVideo.addEventListener("loadedmetadata", () => {
        incomingVideo.play().then(waitForIncomingFrame).catch(waitForIncomingFrame);
      }, { once: true });
      incomingVideo.load();
    }
  };

  const checkBoundary = () => {
    if (transitioning || !syncLoopRange()) return;

    if (standbyVideo && activeVideo.currentTime >= loopEnd - crossfadeDuration) {
      startCrossfade();
    } else if (activeVideo.currentTime >= loopEnd) {
      restartLoop();
    }
  };

  const scheduleFrameCheck = () => {
    if (frameCallbackId !== null || transitioning || activeVideo.paused || !("requestVideoFrameCallback" in activeVideo)) return;
    frameCallbackId = activeVideo.requestVideoFrameCallback(checkFrame);
  };

  const checkFrame = () => {
    frameCallbackId = null;
    checkBoundary();
    scheduleFrameCheck();
  };

  const initializeLoop = () => {
    if (!syncLoopRange()) return;
    scheduleFrameCheck();
  };

  if (video.readyState >= 1) initializeLoop();
  else video.addEventListener("loadedmetadata", initializeLoop, { once: true });

  layers.forEach((layer) => {
    layer.addEventListener("play", scheduleFrameCheck);
    layer.addEventListener("timeupdate", () => {
      if (layer === activeVideo) checkBoundary();
    });
    layer.addEventListener("ended", () => {
      if (layer !== activeVideo) return;
      if (standbyVideo) startCrossfade();
      else restartLoop();
    });
  });

  window.addEventListener("pagehide", () => {
    if (transitionTimeoutId !== null) window.clearTimeout(transitionTimeoutId);
    if (frameCallbackId !== null && typeof activeVideo.cancelVideoFrameCallback === "function") {
      activeVideo.cancelVideoFrameCallback(frameCallbackId);
    }
  }, { once: true });
});
