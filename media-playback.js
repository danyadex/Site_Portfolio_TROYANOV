export function observeVisibility(target, onChange, options = {}) {
  let intersects = false;
  let suspended = false;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const update = () => onChange(intersects && !document.hidden && !suspended && !reducedMotion.matches);
  const observer = new IntersectionObserver(([entry]) => {
    intersects = entry.isIntersecting;
    update();
  }, { threshold: 0.01, rootMargin: "120px 0px", ...options });
  const hide = () => { suspended = true; update(); };
  const show = () => { suspended = false; update(); };

  update();
  observer.observe(target);
  document.addEventListener("visibilitychange", update);
  reducedMotion.addEventListener("change", update);
  window.addEventListener("pagehide", hide);
  window.addEventListener("pageshow", show);

  return () => {
    observer.disconnect();
    document.removeEventListener("visibilitychange", update);
    reducedMotion.removeEventListener("change", update);
    window.removeEventListener("pagehide", hide);
    window.removeEventListener("pageshow", show);
  };
}

export function manageVideoPlayback(video, target = video, options = {}) {
  let active = false;
  let disposed = false;
  let loadRequested = video.preload !== "none";
  const rootMargin = options.rootMargin ?? "120px 0px";

  // Keep the attributes that make muted inline autoplay legal on iOS and
  // Android. The observer below still pauses media outside the viewport.
  video.defaultMuted = true;
  video.muted = true;
  video.playsInline = true;

  const showPlaying = () => { video.dataset.videoPlaying = "true"; };
  const showStill = () => { video.dataset.videoPlaying = "false"; };
  showStill();
  video.addEventListener("playing", showPlaying);
  video.addEventListener("pause", showStill);
  video.addEventListener("error", showStill);

  const requestLoad = () => {
    if (loadRequested || typeof video.load !== "function") return;
    loadRequested = true;
    video.preload = "auto";
    video.load();
  };

  const pauseIfInactive = () => {
    if (!active || disposed) video.pause();
  };

  const playWhenReady = () => {
    if (!active || disposed) return;
    requestLoad();
    // play() initiates loading even when Safari ignores preload. Waiting for
    // readyState here can leave a visible video waiting indefinitely.
    const pending = video.play();
    pending?.then(() => {
      video.dataset.autoplayBlocked = "false";
      pauseIfInactive();
    }).catch(() => { video.dataset.autoplayBlocked = "true"; });
  };

  // Call play synchronously inside the gesture; awaiting readiness loses
  // the user activation Safari requires when autoplay was rejected.
  const retryFromGesture = () => {
    if (!active || disposed || !video.paused) return;
    requestLoad();
    const pending = video.play();
    pending?.then(() => {
      video.dataset.autoplayBlocked = "false";
      pauseIfInactive();
    }).catch(() => { video.dataset.autoplayBlocked = "true"; });
  };

  const sync = () => {
    if (!active || disposed) video.pause();
    else if (video.paused) playWhenReady();
  };
  // Warm up nearby media, but only decode/play while actually visible.
  const stopPreloading = observeVisibility(target, (nearby) => {
    if (nearby) requestLoad();
  }, { rootMargin });
  const stopObserving = observeVisibility(target, (visible) => {
    active = visible;
    video.dataset.playbackActive = String(active);
    sync();
  }, { rootMargin: "0px" });

  // A visible video should get another chance after WebKit has a decodable
  // frame. This prevents a poster from staying forever on iOS.
  const readinessEvents = ["loadedmetadata", "loadeddata", "canplay", "canplaythrough"];
  readinessEvents.forEach((event) => video.addEventListener(event, sync));
  video.addEventListener("play", pauseIfInactive);
  document.addEventListener("touchend", retryFromGesture, { passive: true });
  document.addEventListener("click", retryFromGesture);
  return () => {
    disposed = true;
    video.removeEventListener("playing", showPlaying);
    video.removeEventListener("pause", showStill);
    video.removeEventListener("error", showStill);
    showStill();
    stopObserving();
    stopPreloading();
    readinessEvents.forEach((event) => video.removeEventListener(event, sync));
    video.removeEventListener("play", pauseIfInactive);
    document.removeEventListener("touchend", retryFromGesture);
    document.removeEventListener("click", retryFromGesture);
    video.dataset.playbackActive = "false";
    video.pause();
  };
}
