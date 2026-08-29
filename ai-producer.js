document.querySelectorAll("video[data-loop-start]").forEach((video) => {
  const loopStart = Number.parseFloat(video.dataset.loopStart);

  if (!Number.isFinite(loopStart) || loopStart < 0) return;

  const restartFromLoopStart = () => {
    if (!Number.isFinite(video.duration) || loopStart >= video.duration) return;

    video.currentTime = loopStart;
    video.play().catch(() => {});
  };

  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
    restartFromLoopStart();
  } else {
    video.addEventListener("loadedmetadata", restartFromLoopStart, { once: true });
  }

  video.addEventListener("ended", restartFromLoopStart);
});
