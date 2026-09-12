const root = document.querySelector(".final-tuning");
const previewVideo = document.querySelector("#previewVideo");
const enhancedVideo = document.querySelector("#enhancedVideo");
const compareRange = document.querySelector("#compareRange");
const aspectButtons = [...document.querySelectorAll(".tuning-aspect")];
const jogControl = document.querySelector("#jogControl");
const jogArea = document.querySelector("#jogArea");
const jogValue = document.querySelector("#jogValue");
const playButton = document.querySelector("#playButton");
const volumeButton = document.querySelector("#volumeButton");
const fullscreenButton = document.querySelector("#fullscreenButton");
const compareMedia = document.querySelector("#compareMedia");
const currentTimeLabel = document.querySelector("#currentTime");
const durationLabel = document.querySelector("#duration");
const timelinePanel = document.querySelector("#timelinePanel");
const timelineRuler = document.querySelector("#timelineRuler");
const timelineScale = document.querySelector("#timelineScale");
const timelineTrack = document.querySelector("#timelineTrack");
const timelinePlayhead = document.querySelector("#timelinePlayhead");
const saveProject = document.querySelector("#saveProject");
const toast = document.querySelector("#toast");
const backButton = document.querySelector("#backButton");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

const previewLength = 8;
const strengths = { accent: 64, cut: 54, sound: 58, finish: 64 };
const aspectNames = { accent: "акцента", cut: "склейки", sound: "звука", finish: "финиша" };
let selectedAspect = "finish";
let duration = previewLength;
let draggingJog = false;
let jogPointerStart = 0;
let jogStrengthStart = strengths[selectedAspect];
let scrubbingTimeline = false;
let resumeAfterScrub = false;
let toastTimer;
let syncFrame;
let previewReady = false;
let enhancedReady = false;
let initialFrameScheduled = false;

function formatTime(value) {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  return `00:${String(Math.floor(safeValue)).padStart(2, "0")}`;
}

function currentStrength() {
  return strengths[selectedAspect];
}

function setComparePosition(value) {
  root.style.setProperty("--compare-position", `${value}%`);
}

function updateTuningVisuals(strength) {
  const amount = strength / 100;
  let saturation = 1;
  let contrast = 1;
  let brightness = 1;
  let focusOpacity = 0;
  let cutCueOpacity = 0;
  let soundWaveOpacity = 0;
  let grainOpacity = 0;
  let glowOpacity = 0;

  if (selectedAspect === "accent") {
    saturation = 1 + amount * 1.18;
    contrast = 1 + amount * 0.68;
    brightness = 1 + amount * 0.18;
    focusOpacity = amount * 0.86;
  }

  if (selectedAspect === "cut") {
    saturation = 1 - amount * 0.28;
    contrast = 1 + amount * 0.26;
    brightness = 1 + amount * 0.06;
    cutCueOpacity = 0.2 + amount * 0.8;
  }

  if (selectedAspect === "sound") {
    saturation = 1 + amount * 0.18;
    contrast = 1 + amount * 0.1;
    soundWaveOpacity = 0.25 + amount * 0.75;
  }

  if (selectedAspect === "finish") {
    saturation = 1 + amount * 0.38;
    contrast = 1 + amount * 0.24;
    brightness = 1 + amount * 0.08;
    grainOpacity = amount * 0.32;
    glowOpacity = amount;
  }

  root.style.setProperty("--after-saturation", saturation.toFixed(3));
  root.style.setProperty("--after-contrast", contrast.toFixed(3));
  root.style.setProperty("--after-brightness", brightness.toFixed(3));
  root.style.setProperty("--accent-focus-opacity", focusOpacity.toFixed(3));
  root.style.setProperty("--cut-cue-opacity", cutCueOpacity.toFixed(3));
  root.style.setProperty("--sound-wave-opacity", soundWaveOpacity.toFixed(3));
  root.style.setProperty("--finish-grain-opacity", grainOpacity.toFixed(3));
  root.style.setProperty("--finish-glow-opacity", glowOpacity.toFixed(3));
  root.style.setProperty("--sound-wave-scale-one", (0.6 + amount * 1.2).toFixed(3));
  root.style.setProperty("--sound-wave-scale-two", (0.8 + amount * 1.5).toFixed(3));
  root.style.setProperty("--sound-wave-scale-three", (0.55 + amount * 2.15).toFixed(3));
  root.style.setProperty("--sound-wave-scale-four", (0.75 + amount * 1.65).toFixed(3));
  root.style.setProperty("--sound-wave-scale-five", (0.5 + amount * 1.1).toFixed(3));
}

function setStrength(nextStrength) {
  const clampedStrength = Math.max(0, Math.min(100, Math.round(nextStrength)));
  strengths[selectedAspect] = clampedStrength;
  root.style.setProperty("--tuning-strength", String(clampedStrength / 100));
  updateTuningVisuals(clampedStrength);
  jogValue.textContent = `${clampedStrength}%`;
  jogControl.setAttribute("aria-valuenow", String(clampedStrength));
  jogControl.setAttribute("aria-label", `Интенсивность ${aspectNames[selectedAspect]}: ${clampedStrength} процентов`);

  if (!previewVideo.muted && selectedAspect === "sound") {
    previewVideo.volume = 0.2 + (clampedStrength / 100) * 0.8;
  }
}

function setAspect(aspect, userInitiated = true) {
  selectedAspect = aspect;
  root.dataset.aspect = aspect;
  aspectButtons.forEach((button) => {
    const active = userInitiated && button.dataset.aspect === aspect;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  setStrength(currentStrength());
}

function buildRuler() {
  timelineRuler.replaceChildren();
  timelineScale.replaceChildren();

  for (let time = 1; time <= duration; time += 1) {
    const position = ((time - 1) / (duration - 1)) * 100;
    const tick = document.createElement("i");
    tick.className = time % 2 === 0 ? "timeline-tick is-major" : "timeline-tick";
    tick.style.setProperty("--time-position", `${position}%`);
    timelineScale.append(tick);

    const label = document.createElement("span");
    label.textContent = `${time}с`;
    label.style.setProperty("--time-position", `${position}%`);
    timelineRuler.append(label);
  }
}

function updateTimeline() {
  const progress = duration ? Math.min(1, Math.max(0, previewVideo.currentTime / duration)) : 0;
  const x = timelineTrack.offsetLeft + progress * Math.max(0, timelineTrack.clientWidth - timelinePlayhead.offsetWidth);
  timelinePlayhead.style.setProperty("--playhead-x", `${x}px`);
  currentTimeLabel.textContent = formatTime(previewVideo.currentTime);
  durationLabel.textContent = formatTime(duration);
  timelineTrack.setAttribute("aria-valuenow", String(Number(previewVideo.currentTime.toFixed(1))));
  timelineTrack.setAttribute("aria-valuetext", `${formatTime(previewVideo.currentTime)} из ${formatTime(duration)}`);
}

function syncEnhancedVideo() {
  if (Math.abs(enhancedVideo.currentTime - previewVideo.currentTime) > 0.06) {
    enhancedVideo.currentTime = previewVideo.currentTime;
  }
}

function updatePlaybackState() {
  const isPlaying = !previewVideo.paused && !previewVideo.ended;
  root.classList.toggle("is-playing", isPlaying);
  playButton.setAttribute("aria-label", isPlaying ? "Пауза" : "Воспроизвести");
}

function stopSyncLoop() {
  if (syncFrame) window.cancelAnimationFrame(syncFrame);
  syncFrame = undefined;
  updateTimeline();
}

function startSyncLoop() {
  if (syncFrame) window.cancelAnimationFrame(syncFrame);
  const tick = () => {
    syncEnhancedVideo();
    updateTimeline();
    if (!previewVideo.paused && !previewVideo.ended) syncFrame = window.requestAnimationFrame(tick);
  };
  syncFrame = window.requestAnimationFrame(tick);
}

function setVideoTime(time) {
  const nextTime = Math.max(0, Math.min(duration, time));
  previewVideo.currentTime = nextTime;
  enhancedVideo.currentTime = nextTime;
  updateTimeline();
}

function playPreview() {
  if (previewVideo.currentTime >= duration) setVideoTime(0);
  enhancedVideo.currentTime = previewVideo.currentTime;
  const attempts = [previewVideo.play(), enhancedVideo.play()];
  Promise.allSettled(attempts).then(updatePlaybackState);
}

function seekFromPointer(event) {
  const bounds = timelineTrack.getBoundingClientRect();
  setVideoTime(((event.clientX - bounds.left) / bounds.width) * duration);
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function finishTimelineScrub(event) {
  if (!scrubbingTimeline) return;
  scrubbingTimeline = false;
  timelinePanel.classList.remove("is-scrubbing");
  if (event?.pointerId !== undefined && timelinePanel.hasPointerCapture?.(event.pointerId)) {
    timelinePanel.releasePointerCapture(event.pointerId);
  }
  if (resumeAfterScrub) playPreview();
  resumeAfterScrub = false;
}

function initializePreviewFrame() {
  if (!previewReady || !enhancedReady || initialFrameScheduled) return;
  initialFrameScheduled = true;
  duration = Math.min(previewLength, previewVideo.duration || previewLength);
  buildRuler();
  const initialTime = Math.min(4.2, duration);
  let settledFrames = 0;
  const revealWhenSynced = () => {
    settledFrames += 1;
    if (settledFrames === 2) {
      compareMedia.classList.add("is-ready");
      updateTimeline();
    }
  };

  previewVideo.addEventListener("seeked", revealWhenSynced, { once: true });
  enhancedVideo.addEventListener("seeked", revealWhenSynced, { once: true });
  previewVideo.currentTime = initialTime;
  enhancedVideo.currentTime = initialTime;
}

previewVideo.addEventListener("loadeddata", () => {
  previewReady = true;
  initializePreviewFrame();
});

previewVideo.addEventListener("timeupdate", () => {
  if (previewVideo.currentTime >= duration) {
    previewVideo.pause();
    enhancedVideo.pause();
  }
  syncEnhancedVideo();
  updateTimeline();
});

previewVideo.addEventListener("play", () => {
  updatePlaybackState();
  startSyncLoop();
});

previewVideo.addEventListener("pause", () => {
  enhancedVideo.pause();
  updatePlaybackState();
  stopSyncLoop();
});

previewVideo.addEventListener("ended", () => {
  enhancedVideo.pause();
  updatePlaybackState();
  stopSyncLoop();
});

enhancedVideo.addEventListener("loadeddata", () => {
  enhancedReady = true;
  initializePreviewFrame();
});

compareRange.addEventListener("input", () => setComparePosition(compareRange.value));

aspectButtons.forEach((button) => {
  button.addEventListener("click", () => setAspect(button.dataset.aspect));
});

playButton.addEventListener("click", () => {
  if (previewVideo.paused) playPreview();
  else previewVideo.pause();
});

volumeButton.addEventListener("click", () => {
  previewVideo.muted = !previewVideo.muted;
  volumeButton.classList.toggle("is-active", !previewVideo.muted);
  volumeButton.setAttribute("aria-label", previewVideo.muted ? "Включить звук" : "Выключить звук");
  if (!previewVideo.muted) previewVideo.volume = selectedAspect === "sound" ? 0.2 + (currentStrength() / 100) * 0.8 : 1;
});

fullscreenButton.addEventListener("click", async () => {
  if (document.fullscreenElement) await document.exitFullscreen();
  else await compareMedia.requestFullscreen();
});

timelinePanel.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  event.preventDefault();
  scrubbingTimeline = true;
  resumeAfterScrub = !previewVideo.paused;
  previewVideo.pause();
  timelinePanel.classList.add("is-scrubbing");
  timelinePanel.setPointerCapture?.(event.pointerId);
  seekFromPointer(event);
});

timelinePanel.addEventListener("pointermove", (event) => {
  if (scrubbingTimeline && (event.buttons & 1) === 1) seekFromPointer(event);
});

timelinePanel.addEventListener("pointerup", finishTimelineScrub);
timelinePanel.addEventListener("pointercancel", finishTimelineScrub);
timelinePanel.addEventListener("lostpointercapture", finishTimelineScrub);

timelineTrack.addEventListener("keydown", (event) => {
  const steps = { ArrowLeft: -1 / 24, ArrowRight: 1 / 24, ArrowDown: -0.5, ArrowUp: 0.5, PageDown: -2, PageUp: 2 };
  if (event.key === "Home") setVideoTime(0);
  else if (event.key === "End") setVideoTime(duration);
  else if (steps[event.key]) setVideoTime(previewVideo.currentTime + steps[event.key]);
  else return;
  event.preventDefault();
});

jogControl.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  draggingJog = true;
  root.classList.add("is-adjusting");
  jogArea.classList.add("is-adjusting");
  jogPointerStart = event.clientY;
  jogStrengthStart = currentStrength();
  jogControl.setPointerCapture(event.pointerId);
});

jogControl.addEventListener("pointermove", (event) => {
  if (!draggingJog) return;
  setStrength(jogStrengthStart + (jogPointerStart - event.clientY) / 1.28);
});

function finishJogDrag(event) {
  if (!draggingJog) return;
  draggingJog = false;
  root.classList.remove("is-adjusting");
  jogArea.classList.remove("is-adjusting");
  if (event.pointerId !== undefined && jogControl.hasPointerCapture?.(event.pointerId)) {
    jogControl.releasePointerCapture(event.pointerId);
  }
}

jogControl.addEventListener("pointerup", finishJogDrag);
jogControl.addEventListener("pointercancel", finishJogDrag);
jogControl.addEventListener("lostpointercapture", finishJogDrag);

jogControl.addEventListener("keydown", (event) => {
  const steps = { ArrowUp: 4, ArrowRight: 4, ArrowDown: -4, ArrowLeft: -4, PageUp: 10, PageDown: -10 };
  if (event.key === "Home") setStrength(0);
  else if (event.key === "End") setStrength(100);
  else if (steps[event.key]) setStrength(currentStrength() + steps[event.key]);
  else return;
  event.preventDefault();
});

saveProject.addEventListener("click", () => {
  saveProject.disabled = true;
  saveProject.textContent = "СОХРАНЯЮ";
  window.setTimeout(() => {
    saveProject.disabled = false;
    saveProject.innerHTML = "СОХРАНИТЬ<br />ПРОЕКТ";
    showToast("Проект сохранён");
  }, reducedMotionQuery.matches ? 0 : 480);
});

backButton.addEventListener("click", () => {
  if (window.history.length > 1) window.history.back();
  else window.location.href = "./";
});

setComparePosition(compareRange.value);
setAspect(selectedAspect, false);
buildRuler();
updateTimeline();
