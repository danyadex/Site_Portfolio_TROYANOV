document.querySelectorAll("video[data-loop-start], video[data-loop-end]").forEach((video) => {
  const configuredStart = Number.parseFloat(video.dataset.loopStart ?? "0");
  const configuredEnd = Number.parseFloat(video.dataset.loopEnd ?? "");
  const loopStart = Number.isFinite(configuredStart) && configuredStart >= 0 ? configuredStart : 0;
  let loopEnd = Number.POSITIVE_INFINITY;
  let frameCallbackId = null;

  const syncLoopRange = () => {
    if (!Number.isFinite(video.duration) || loopStart >= video.duration) return false;

    loopEnd = Number.isFinite(configuredEnd)
      ? Math.min(Math.max(configuredEnd, loopStart), video.duration)
      : video.duration;

    if (video.currentTime < loopStart || video.currentTime >= loopEnd) {
      video.currentTime = loopStart;
    }

    return loopEnd > loopStart;
  };

  const restartLoop = () => {
    if (!syncLoopRange()) return;

    const shouldResume = !video.paused || video.ended;
    video.currentTime = loopStart;
    if (shouldResume) video.play().catch(() => {});
  };

  const scheduleFrameCheck = () => {
    if (frameCallbackId !== null || video.paused || !("requestVideoFrameCallback" in video)) return;
    frameCallbackId = video.requestVideoFrameCallback(checkFrame);
  };

  const checkFrame = () => {
    frameCallbackId = null;
    if (video.currentTime >= loopEnd) restartLoop();
    scheduleFrameCheck();
  };

  const initializeLoop = () => {
    if (!syncLoopRange()) return;
    scheduleFrameCheck();
  };

  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) initializeLoop();
  else video.addEventListener("loadedmetadata", initializeLoop, { once: true });

  video.addEventListener("play", scheduleFrameCheck);
  video.addEventListener("timeupdate", () => {
    if (video.currentTime >= loopEnd) restartLoop();
  });
  video.addEventListener("ended", restartLoop);
});
