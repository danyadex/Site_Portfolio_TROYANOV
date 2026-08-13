const video = document.querySelector("#sceneVideo");
const stage = document.querySelector(".stage");
const videoFrame = document.querySelector("#videoFrame");
const playButton = document.querySelector("#playButton");
const volumeButton = document.querySelector("#volumeButton");
const fullscreenButton = document.querySelector("#fullscreenButton");
const currentTimeLabel = document.querySelector("#currentTime");
const durationLabel = document.querySelector("#duration");
const shots = [...document.querySelectorAll(".shot")];
const timelinePanel = document.querySelector(".timeline-panel");
const timelineRuler = document.querySelector("#timelineRuler");
const timelineScale = document.querySelector("#timelineScale");
const timelineTrack = document.querySelector("#timelineTrack");
const timelineProgress = document.querySelector("#timelineProgress");
const playhead = document.querySelector("#playhead");
const prompt = document.querySelector("#prompt");
const promptPanel = document.querySelector("#promptPanel");
const applyButton = document.querySelector("#applyButton");
const saveButton = document.querySelector("#saveButton");
const toast = document.querySelector("#toast");
const toastClose = document.querySelector("#toastClose");
const videoState = document.querySelector("#videoState");
const backButton = document.querySelector(".back-button");
const chips = [...document.querySelectorAll(".chip[aria-pressed]")];
const directorChip = document.querySelector("#directorChip");
const directorToolbar = document.querySelector("#directorToolbar");
const cameraChip = document.querySelector("#cameraChip");
const cameraToolbar = document.querySelector("#cameraToolbar");
const cameraSettingCards = [...document.querySelectorAll(".camera-setting-card")];
const localEditChip = document.querySelector("#localEditChip");
const localEditLayer = document.querySelector("#localEditLayer");
const localEditCanvas = document.querySelector("#localEditCanvas");
const localEditResult = document.querySelector("#localEditResult");
const localEditSelectionBlur = document.querySelector("#localEditSelectionBlur");
const localEditBrushCursor = document.querySelector("#localEditBrushCursor");
const cameraPrev = document.querySelector("#cameraPrev");
const cameraNext = document.querySelector("#cameraNext");
const cameraMode = document.querySelector("#cameraMode");
const cameraMotionVisual = document.querySelector("#cameraMotionVisual");
const cameraMotionPath = document.querySelector("#cameraMotionPath");
const cameraMotionNodes = [...document.querySelectorAll("#cameraMotionNodes circle")];
const moodPrev = document.querySelector("#moodPrev");
const moodNext = document.querySelector("#moodNext");
const moodArt = document.querySelector("#moodArt");
const moodImage = document.querySelector("#moodImage");
const moodValue = document.querySelector("#moodValue");
const directorSliders = [...document.querySelectorAll(".director-slider")];
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

let duration = 14.324667;
let selectedShot = 0;
let toastTimer;
let stateTimer;
let progressFrameId;
let cameraModeIndex = 0;
let moodIndex = 0;
let cameraMorphFrameId;
let cameraPreviewFrameId;
let cameraLabelTimer;
let moodSwapTimer;
let localEditOpen = false;
let localEditPainting = false;
let localEditHasMask = false;
let localEditApplied = false;
let localEditProcessing = false;
let applyProcessing = false;
let localEditPreviousPoint;
let localEditMaskCanvas;
let localEditMaskContext;
let localEditDisplayContext;
let localEditSelectionPoints = [];
let localEditSelectionClosed = false;
const cameraAnimationEpoch = performance.now();

const cameraModes = [
  {
    key: "smooth",
    label: "Плавное",
    path: "M10.5 17 C38.5 29 61.5 44 89.5 47 C121.5 51 145.5 44 168.5 34 C194.5 23 215.5 9 238.5 7 C256.5 7 270.5 14 280.5 17",
    nodes: [[10.5, 17], [89.5, 47], [168.5, 34], [238.5, 7], [280.5, 17]],
    speed: 0.00115,
    phaseSpan: 4.2,
    xAmplitude: 0.9,
    yAmplitude: 2.8,
  },
  {
    key: "static",
    label: "Статичное",
    path: "M10.5 31 C38.5 31 61.5 31 89.5 31 C121.5 31 145.5 31 168.5 31 C194.5 31 215.5 31 238.5 31 C256.5 31 270.5 31 280.5 31",
    nodes: [[10.5, 31], [89.5, 31], [168.5, 31], [238.5, 31], [280.5, 31]],
    speed: 0.0007,
    phaseSpan: 1.4,
    xAmplitude: 0.2,
    yAmplitude: 0.8,
  },
  {
    key: "dynamic",
    label: "Динамичное",
    path: "M10.5 48 C34 8 62 5 89.5 18 C119 31 143 56 168.5 43 C194 30 215 4 238.5 13 C258 20 270 40 280.5 19",
    nodes: [[10.5, 48], [89.5, 18], [168.5, 43], [238.5, 13], [280.5, 19]],
    speed: 0.0028,
    phaseSpan: 7.4,
    xAmplitude: 2.1,
    yAmplitude: 5.4,
  },
];
const cameraNodePairIndices = [0, 3, 6, 9, 12];
const moods = [
  { key: "calm", label: "Спокойное", image: "assets/mood-calm.png" },
  { key: "anxious", label: "Тревожное", image: "assets/mood-anxious.png" },
  { key: "melancholic", label: "Меланхоличное", image: "assets/mood-melancholic.png" },
  { key: "tense", label: "Напряжённое", image: "assets/mood-tense.png" },
  { key: "chaotic", label: "Хаотичное", image: "assets/mood-chaotic.png" },
];
const cameraSettings = {
  camera: {
    index: 1,
    options: [
      { label: "Modular 8K Digital", image: "assets/camera-modular-8k.png", crop: { width: "152.53%", height: "120.21%", left: "-29.33%", top: "-12.64%" } },
      { label: "Premium Large Format Digital", image: "assets/camera-premium-large-format.png", crop: { width: "143%", height: "95.37%", left: "-21.55%", top: "3.57%" } },
      { label: "Classic 16mm Film", image: "assets/camera-classic-16mm.png", crop: { width: "170%", height: "113.38%", left: "-35%", top: "-6.69%" } },
      { label: "Action Micro Cam", image: "assets/camera-action-micro.png", crop: { width: "163%", height: "108.71%", left: "-31.5%", top: "-4.35%" } },
      { label: "Aerial Drone Camera", image: "assets/camera-aerial-drone.png", crop: { width: "100%", height: "100%", left: "0", top: "0", objectFit: "contain", objectPosition: "bottom" } },
      { label: "Grand Format 70mm Film", image: "assets/camera-grand-format.png", crop: { width: "199%", height: "132.72%", left: "-53.12%", top: "-1.28%" } },
    ],
  },
  lens: {
    index: 4,
    options: [
      { label: "Clinical Sharp Prime", image: "assets/lens-clinical-sharp.png", crop: { width: "105.78%", height: "104.15%", left: "-2.74%", top: "-2.09%" } },
      { label: "Anamorphic Dream Lens", image: "assets/lens-anamorphic-dream.png", crop: { width: "100%", height: "100%", left: "0", top: "0", objectFit: "contain" } },
      { label: "Vintage Soft Prime", image: "assets/lens-vintage-soft.png", crop: { width: "114.27%", height: "104.19%", left: "-7.81%", top: "-2.85%" } },
      { label: "Halation Diffusion Lens", image: "assets/lens-halation-diffusion.png", crop: { width: "100%", height: "100%", left: "0", top: "0", objectFit: "contain" } },
      { label: "Swirl Bokeh Portrait", image: "assets/lens-swirl-bokeh.png", crop: { width: "140.59%", height: "140.59%", left: "-25.84%", top: "7.77%" } },
      { label: "Macro Detail Lens", image: "assets/lens-macro-detail.png", crop: { width: "97%", height: "84.35%", left: "1.31%", top: "7.93%" } },
    ],
  },
  focus: {
    index: 2,
    options: [
      { label: "mm", display: "8" },
      { label: "mm", display: "14" },
      { label: "mm", display: "35" },
      { label: "mm", display: "50" },
    ],
  },
  aperture: {
    index: 0,
    options: [
      { label: "f/1.4", image: "assets/aperture-f14.png", crop: { width: "133.54%", height: "110.97%", left: "-13.03%", top: "-10.2%" } },
      { label: "f/4", image: "assets/aperture-f4.png", crop: { width: "159.28%", height: "95.95%", left: "-11.87%", top: "0.98%" } },
      { label: "f/11", image: "assets/aperture-f11.png", crop: { width: "148.37%", height: "104.05%", left: "-27.53%", top: "-2.26%" } },
    ],
  },
  light: {
    index: 0,
    options: [
      { label: "Холодное", image: "assets/light-cold.png", crop: { width: "176.19%", height: "124.76%", left: "-34.52%", top: "0.06%" } },
      { label: "Тёплое", image: "assets/light-warm.png", crop: { width: "148.45%", height: "92.55%", left: "-18.82%", top: "8.33%" } },
      { label: "Нейтральное", image: "assets/light-neutral.png", crop: { width: "134.69%", height: "99.85%", left: "-24.05%", top: "0.1%" } },
    ],
  },
};

function formatTime(value) {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  const minutes = Math.floor(safeValue / 60);
  const seconds = Math.floor(safeValue % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function buildRuler() {
  timelineRuler.replaceChildren();
  timelineScale.replaceChildren();

  const labelStep = 2;
  const lastWholeSecond = Math.floor(duration);

  for (let time = 0; time <= lastWholeSecond; time += 1) {
    const tick = document.createElement("i");
    tick.className = time % labelStep === 0 ? "timeline-tick is-major" : "timeline-tick";
    tick.style.setProperty("--time-position", `${(time / duration) * 100}%`);
    timelineScale.append(tick);
  }

  const endTick = document.createElement("i");
  endTick.className = "timeline-tick is-major is-end";
  endTick.style.setProperty("--time-position", "100%");
  timelineScale.append(endTick);

  for (let time = labelStep; time <= lastWholeSecond; time += labelStep) {
    const label = document.createElement("span");
    label.textContent = `${time}с`;
    label.style.setProperty("--time-position", `${(time / duration) * 100}%`);
    timelineRuler.append(label);
  }
}

function updateSelectedShot(index) {
  selectedShot = index;
  shots.forEach((shot, shotIndex) => {
    const active = shotIndex === index;
    shot.classList.toggle("is-active", active);
    shot.setAttribute("aria-current", active ? "true" : "false");
  });
}

function updateTimeline() {
  const progress = duration ? Math.min(1, Math.max(0, video.currentTime / duration)) : 0;
  const maxX = Math.max(0, timelineTrack.clientWidth - playhead.offsetWidth);
  const x = timelineTrack.offsetLeft + progress * maxX;
  playhead.style.setProperty("--playhead-x", `${x}px`);
  timelineProgress.style.setProperty("--timeline-progress", `${progress * 100}%`);
  currentTimeLabel.textContent = formatTime(video.currentTime);
  timelineTrack.setAttribute("aria-valuemax", String(Math.round(duration)));
  timelineTrack.setAttribute("aria-valuenow", String(Number(video.currentTime.toFixed(1))));
  timelineTrack.setAttribute("aria-valuetext", `${formatTime(video.currentTime)} из ${formatTime(duration)}`);

  const nextShot = Math.min(shots.length - 1, Math.floor(progress * shots.length));
  updateSelectedShot(nextShot);
}

function updatePlaybackState() {
  const playing = !video.paused && !video.ended;
  playButton.classList.toggle("is-playing", playing);
  playButton.setAttribute("aria-label", playing ? "Пауза" : "Воспроизвести");
}

function playVideo() {
  const playAttempt = video.play();
  if (playAttempt) playAttempt.catch(() => {});
}

function stopProgressLoop() {
  if (progressFrameId) window.cancelAnimationFrame(progressFrameId);
  progressFrameId = undefined;
  updateTimeline();
}

function startProgressLoop() {
  if (progressFrameId) window.cancelAnimationFrame(progressFrameId);

  const tick = () => {
    updateTimeline();
    if (!video.paused && !video.ended) {
      progressFrameId = window.requestAnimationFrame(tick);
    } else {
      progressFrameId = undefined;
    }
  };

  progressFrameId = window.requestAnimationFrame(tick);
}

function seekToRatio(ratio) {
  const clamped = Math.min(1, Math.max(0, ratio));
  video.currentTime = clamped * duration;
  updateTimeline();
}

function seekFromPointer(event) {
  const bounds = timelineTrack.getBoundingClientRect();
  seekToRatio((event.clientX - bounds.left) / bounds.width);
}

function showVideoState(message, hold = 900) {
  clearTimeout(stateTimer);
  videoState.textContent = message;
  videoState.classList.add("is-visible");
  stateTimer = window.setTimeout(() => videoState.classList.remove("is-visible"), hold);
}

function hideToast() {
  clearTimeout(toastTimer);
  toast.classList.remove("is-visible");
}

video.addEventListener("loadedmetadata", () => {
  duration = Number.isFinite(video.duration) ? video.duration : duration;
  durationLabel.textContent = formatTime(duration);
  buildRuler();
  updateTimeline();
});

video.addEventListener("timeupdate", updateTimeline);
video.addEventListener("play", () => {
  updatePlaybackState();
  startProgressLoop();
});
video.addEventListener("pause", () => {
  updatePlaybackState();
  stopProgressLoop();
});
video.addEventListener("ended", () => {
  updatePlaybackState();
  stopProgressLoop();
});

playButton.addEventListener("click", () => {
  if (video.paused) playVideo();
  else video.pause();
});

video.addEventListener("click", () => {
  if (video.paused) playVideo();
  else video.pause();
});

volumeButton.addEventListener("click", () => {
  video.muted = !video.muted;
  volumeButton.classList.toggle("is-active", !video.muted);
  volumeButton.setAttribute("aria-label", video.muted ? "Включить звук" : "Выключить звук");
  showVideoState(video.muted ? "Звук выключен" : "Звук включён", 700);
});

fullscreenButton.addEventListener("click", async () => {
  if (document.fullscreenElement) await document.exitFullscreen();
  else await videoFrame.requestFullscreen();
});

shots.forEach((shot, index) => {
  shot.addEventListener("click", () => {
    const segmentStart = (duration / shots.length) * index;
    video.currentTime = segmentStart + 0.02;
    updateSelectedShot(index);
    updateTimeline();
    if (video.paused) playVideo();
  });
});

let scrubbing = false;
let resumeAfterScrub = false;

function finishScrubbing(event) {
  if (!scrubbing) return;

  const shouldResume = resumeAfterScrub;
  scrubbing = false;
  resumeAfterScrub = false;
  timelinePanel.classList.remove("is-scrubbing");

  if (event?.pointerId !== undefined && timelinePanel.hasPointerCapture?.(event.pointerId)) {
    timelinePanel.releasePointerCapture(event.pointerId);
  }

  if (shouldResume) playVideo();
}

timelinePanel.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  event.preventDefault();
  scrubbing = true;
  resumeAfterScrub = !video.paused;
  video.pause();
  timelinePanel.classList.add("is-scrubbing");
  timelinePanel.setPointerCapture?.(event.pointerId);
  seekFromPointer(event);
});

timelinePanel.addEventListener("pointermove", (event) => {
  if (scrubbing && (event.buttons & 1) === 1) seekFromPointer(event);
});

timelinePanel.addEventListener("pointerup", finishScrubbing);
timelinePanel.addEventListener("pointercancel", finishScrubbing);
timelinePanel.addEventListener("lostpointercapture", finishScrubbing);

timelineTrack.addEventListener("keydown", (event) => {
  const steps = {
    ArrowLeft: -1 / 24,
    ArrowRight: 1 / 24,
    ArrowDown: -0.5,
    ArrowUp: 0.5,
    PageDown: -2,
    PageUp: 2,
  };

  if (event.key === "Home") video.currentTime = 0;
  else if (event.key === "End") video.currentTime = duration;
  else if (steps[event.key]) video.currentTime = Math.min(duration, Math.max(0, video.currentTime + steps[event.key]));
  else return;

  event.preventDefault();
  updateTimeline();
});

function setDirectorOpen(open) {
  if (open && localEditOpen) setLocalEditOpen(false);
  if (open && cameraChip.getAttribute("aria-expanded") === "true") setCameraToolbarOpen(false);
  directorChip.setAttribute("aria-pressed", String(open));
  directorChip.setAttribute("aria-expanded", String(open));
  directorChip.classList.toggle("is-active", open);
  directorToolbar.setAttribute("aria-hidden", String(!open));
  directorToolbar.classList.toggle("is-open", open);
  updateApplyAvailability();

  if (open) window.requestAnimationFrame(startCameraPreview);
  else stopCameraPreview();
}

function setCameraToolbarOpen(open) {
  if (open && localEditOpen) setLocalEditOpen(false);
  if (open && directorChip.getAttribute("aria-expanded") === "true") setDirectorOpen(false);
  cameraChip.setAttribute("aria-pressed", String(open));
  cameraChip.setAttribute("aria-expanded", String(open));
  cameraChip.classList.toggle("is-active", open);
  cameraToolbar.setAttribute("aria-hidden", String(!open));
  cameraToolbar.classList.toggle("is-open", open);
  updateApplyAvailability();
}

function updateApplyAvailability() {
  if (localEditOpen) {
    applyButton.disabled = applyProcessing || localEditProcessing || !localEditHasMask || !prompt.value.trim();
    return;
  }

  applyButton.disabled =
    applyProcessing ||
    directorChip.getAttribute("aria-expanded") === "true" ||
    cameraChip.getAttribute("aria-expanded") === "true";
}

function setApplyButtonProcessing(processing) {
  applyProcessing = processing;
  applyButton.classList.toggle("is-processing", processing);
  applyButton.classList.toggle("is-pressed", processing);
  applyButton.dataset.state = processing ? "pressed" : "default";
  applyButton.setAttribute("aria-busy", String(processing));
  applyButton.setAttribute("aria-label", processing ? "Применяю…" : "ПРИМЕНИТЬ");
  updateApplyAvailability();
}

function sizeLocalEditCanvas() {
  const bounds = localEditLayer.getBoundingClientRect();
  const pixelRatio = Math.min(2, window.devicePixelRatio || 1);

  localEditCanvas.width = Math.max(1, Math.round(bounds.width * pixelRatio));
  localEditCanvas.height = Math.max(1, Math.round(bounds.height * pixelRatio));
  localEditDisplayContext = localEditCanvas.getContext("2d");
  localEditDisplayContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  localEditMaskCanvas = document.createElement("canvas");
  localEditMaskCanvas.width = localEditCanvas.width;
  localEditMaskCanvas.height = localEditCanvas.height;
  localEditMaskContext = localEditMaskCanvas.getContext("2d");
  localEditMaskContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

}

function clearLocalEditMask() {
  if (localEditDisplayContext) {
    localEditDisplayContext.clearRect(0, 0, localEditCanvas.width, localEditCanvas.height);
  }
  if (localEditMaskContext) {
    localEditMaskContext.clearRect(0, 0, localEditMaskCanvas.width, localEditMaskCanvas.height);
  }
  localEditHasMask = false;
  localEditApplied = false;
  localEditPreviousPoint = undefined;
  localEditSelectionPoints = [];
  localEditSelectionClosed = false;
  localEditResult.classList.remove("is-visible");
  localEditResult.style.removeProperty("-webkit-mask-image");
  localEditResult.style.removeProperty("mask-image");
  localEditSelectionBlur.classList.remove("is-visible");
  localEditSelectionBlur.style.removeProperty("-webkit-mask-image");
  localEditSelectionBlur.style.removeProperty("mask-image");
  updateApplyAvailability();
}

function localEditPointFromEvent(event) {
  const bounds = localEditCanvas.getBoundingClientRect();
  return {
    x: Math.min(bounds.width, Math.max(0, event.clientX - bounds.left)),
    y: Math.min(bounds.height, Math.max(0, event.clientY - bounds.top)),
  };
}

function moveLocalEditCursor(point) {
  localEditBrushCursor.style.setProperty("--brush-x", `${point.x - 12}px`);
  localEditBrushCursor.style.setProperty("--brush-y", `${point.y - 12}px`);
  localEditLayer.classList.add("is-hovered");
}

function drawLocalEditDot(context, point, radius, color) {
  context.save();
  context.fillStyle = color;
  context.beginPath();
  context.arc(point.x, point.y, radius, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawLocalEditSegment(context, from, to, width, color, feather = false) {
  context.save();
  context.strokeStyle = color;
  context.lineWidth = width;
  context.lineCap = "round";
  context.lineJoin = "round";
  if (feather) {
    context.shadowColor = color;
    context.shadowBlur = 6;
  }
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.stroke();
  context.restore();
}

function renderLocalEditMask(closed = localEditSelectionClosed) {
  const bounds = localEditCanvas.getBoundingClientRect();
  localEditDisplayContext.clearRect(0, 0, bounds.width, bounds.height);
  localEditMaskContext.clearRect(0, 0, bounds.width, bounds.height);

  if (localEditSelectionPoints.length < 2) {
    localEditSelectionBlur.classList.remove("is-visible");
    return;
  }

  if (closed) {
    localEditMaskContext.save();
    localEditMaskContext.fillStyle = "#fff";
    localEditMaskContext.beginPath();
    localEditMaskContext.moveTo(localEditSelectionPoints[0].x, localEditSelectionPoints[0].y);
    localEditSelectionPoints.slice(1).forEach((point) => localEditMaskContext.lineTo(point.x, point.y));
    localEditMaskContext.closePath();
    localEditMaskContext.fill();
    localEditMaskContext.restore();

    localEditDisplayContext.save();
    localEditDisplayContext.globalAlpha = 0.1;
    localEditDisplayContext.drawImage(
      localEditMaskCanvas,
      0,
      0,
      localEditMaskCanvas.width,
      localEditMaskCanvas.height,
      0,
      0,
      bounds.width,
      bounds.height,
    );
    localEditDisplayContext.globalCompositeOperation = "source-in";
    localEditDisplayContext.fillStyle = "#d8ff9d";
    localEditDisplayContext.fillRect(0, 0, bounds.width, bounds.height);
    localEditDisplayContext.restore();
  }

  localEditDisplayContext.save();
  localEditDisplayContext.strokeStyle = "rgba(216, 255, 157, 0.96)";
  localEditDisplayContext.lineWidth = 0.75;
  localEditDisplayContext.lineCap = "round";
  localEditDisplayContext.lineJoin = "round";
  localEditDisplayContext.setLineDash([6, 6]);
  localEditDisplayContext.shadowColor = "rgba(216, 255, 157, 0.12)";
  localEditDisplayContext.shadowBlur = 9;
  localEditDisplayContext.shadowOffsetY = 4;
  localEditDisplayContext.beginPath();
  localEditDisplayContext.moveTo(localEditSelectionPoints[0].x, localEditSelectionPoints[0].y);
  localEditSelectionPoints.slice(1).forEach((point) => localEditDisplayContext.lineTo(point.x, point.y));
  if (closed) localEditDisplayContext.closePath();
  localEditDisplayContext.stroke();
  localEditDisplayContext.restore();

  if (closed) {
    const maskUrl = localEditMaskCanvas.toDataURL("image/png");
    localEditSelectionBlur.style.webkitMaskImage = `url(${maskUrl})`;
    localEditSelectionBlur.style.maskImage = `url(${maskUrl})`;
    localEditSelectionBlur.classList.add("is-visible");
  } else {
    localEditSelectionBlur.classList.remove("is-visible");
  }
}

function paintLocalEditPoint(point) {
  if (localEditSelectionClosed) return;
  if (localEditPreviousPoint && Math.hypot(point.x - localEditPreviousPoint.x, point.y - localEditPreviousPoint.y) < 2) return;

  localEditSelectionPoints.push(point);
  const start = localEditSelectionPoints[0];
  const travelledFarEnough = localEditSelectionPoints.some(
    (selectionPoint) => Math.hypot(selectionPoint.x - start.x, selectionPoint.y - start.y) >= 36,
  );
  const returnedToStart =
    localEditSelectionPoints.length >= 8 &&
    travelledFarEnough &&
    Math.hypot(point.x - start.x, point.y - start.y) <= 18;

  if (returnedToStart) {
    localEditSelectionPoints[localEditSelectionPoints.length - 1] = { ...start };
    localEditSelectionClosed = true;
  }

  renderLocalEditMask(localEditSelectionClosed);
  localEditPreviousPoint = point;
}

function setLocalEditOpen(open) {
  if (open) {
    if (directorChip.getAttribute("aria-expanded") === "true") setDirectorOpen(false);
    if (cameraChip.getAttribute("aria-expanded") === "true") setCameraToolbarOpen(false);
    video.pause();
  }

  localEditOpen = open;
  localEditChip.setAttribute("aria-pressed", String(open));
  localEditChip.setAttribute("aria-expanded", String(open));
  localEditChip.classList.toggle("is-active", open);
  localEditLayer.setAttribute("aria-hidden", String(!open));
  localEditLayer.classList.toggle("is-open", open);
  promptPanel.classList.toggle("is-local-edit-focused", open);
  stage.classList.toggle("is-local-edit", open);

  if (open) {
    window.requestAnimationFrame(() => {
      sizeLocalEditCanvas();
      const bounds = localEditCanvas.getBoundingClientRect();
      moveLocalEditCursor({ x: bounds.width / 2, y: bounds.height / 2 });
      clearLocalEditMask();
    });
  } else {
    localEditPainting = false;
    localEditProcessing = false;
    localEditLayer.classList.remove("is-hovered", "is-painting", "is-processing");
    clearLocalEditMask();
  }

  updateApplyAvailability();
}

function directorAnimationIsActive() {
  return directorToolbar.classList.contains("is-open") && !document.hidden && !reducedMotionQuery.matches;
}

function stopCameraPreview() {
  if (cameraPreviewFrameId) window.cancelAnimationFrame(cameraPreviewFrameId);
  cameraPreviewFrameId = undefined;
}

function buildPathFromValues(template, values) {
  let valueIndex = 0;
  return template.replace(/-?\d*\.?\d+/g, () => {
    const value = values[valueIndex];
    valueIndex += 1;
    return value.toFixed(2);
  });
}

function deformCameraPath(profile, elapsed) {
  const baseValues = extractPathNumbers(profile.path);
  const values = baseValues.slice();
  const timePhase = elapsed * profile.speed;

  for (let pairIndex = 0; pairIndex < baseValues.length / 2; pairIndex += 1) {
    const valueIndex = pairIndex * 2;
    const x = baseValues[valueIndex];
    const y = baseValues[valueIndex + 1];
    const normalizedX = x / 291;
    const spatialPhase = normalizedX * profile.phaseSpan;
    const primaryWave = Math.sin(timePhase + spatialPhase);
    const secondaryWave = Math.sin(timePhase * 0.62 - spatialPhase * 0.73 + 0.8);
    const xWave = Math.sin(timePhase * 0.74 + spatialPhase * 0.48 + 1.2);

    values[valueIndex] = Math.max(3, Math.min(288, x + xWave * profile.xAmplitude));
    values[valueIndex + 1] = Math.max(3, Math.min(59, y + (primaryWave * 0.72 + secondaryWave * 0.28) * profile.yAmplitude));
  }

  return values;
}

function renderCameraFrame(profile, elapsed) {
  const values = deformCameraPath(profile, elapsed);
  const nodes = cameraNodePairIndices.map((pairIndex) => [values[pairIndex * 2], values[pairIndex * 2 + 1]]);

  cameraMotionPath.setAttribute("d", buildPathFromValues(profile.path, values));
  renderCameraNodes(nodes);
}

function startCameraPreview() {
  stopCameraPreview();

  const profile = cameraModes[cameraModeIndex];
  if (!directorAnimationIsActive()) {
    cameraMotionPath.setAttribute("d", profile.path);
    renderCameraNodes(profile.nodes);
    return;
  }

  const render = (now) => {
    if (!directorAnimationIsActive() || cameraModes[cameraModeIndex] !== profile) {
      stopCameraPreview();
      return;
    }

    renderCameraFrame(profile, now - cameraAnimationEpoch);
    cameraPreviewFrameId = window.requestAnimationFrame(render);
  };

  cameraPreviewFrameId = window.requestAnimationFrame(render);
}

function extractPathNumbers(pathData) {
  return (pathData.match(/-?\d*\.?\d+/g) || []).map(Number);
}

function renderCameraNodes(nodes) {
  cameraMotionNodes.forEach((node, index) => {
    node.setAttribute("cx", String(nodes[index][0]));
    node.setAttribute("cy", String(nodes[index][1]));
  });
}

function setCameraLabel(label) {
  clearTimeout(cameraLabelTimer);
  cameraMode.classList.add("is-switching");
  cameraLabelTimer = window.setTimeout(() => {
    cameraMode.textContent = label;
    window.requestAnimationFrame(() => cameraMode.classList.remove("is-switching"));
  }, reducedMotionQuery.matches ? 0 : 80);
}

function setCameraMode(index, animate = true) {
  cameraModeIndex = index;
  const profile = cameraModes[index];
  const fromPath = extractPathNumbers(cameraMotionPath.getAttribute("d"));
  const toPath = extractPathNumbers(profile.path);

  stopCameraPreview();
  if (cameraMorphFrameId) window.cancelAnimationFrame(cameraMorphFrameId);
  cameraMotionVisual.dataset.cameraMode = profile.key;
  setCameraLabel(profile.label);

  if (!animate || reducedMotionQuery.matches || fromPath.length !== toPath.length) {
    cameraMotionPath.setAttribute("d", profile.path);
    renderCameraNodes(profile.nodes);
    startCameraPreview();
    return;
  }

  const startedAt = performance.now();
  const durationMs = 360;
  const render = (now) => {
    const rawProgress = Math.min(1, (now - startedAt) / durationMs);
    const progress = rawProgress ** 3 * (rawProgress * (rawProgress * 6 - 15) + 10);
    const liveTarget = deformCameraPath(profile, now - cameraAnimationEpoch);
    const values = fromPath.map((value, valueIndex) => value + (liveTarget[valueIndex] - value) * progress);
    const nodes = cameraNodePairIndices.map((pairIndex) => [values[pairIndex * 2], values[pairIndex * 2 + 1]]);

    cameraMotionPath.setAttribute("d", buildPathFromValues(profile.path, values));
    renderCameraNodes(nodes);

    if (rawProgress < 1) cameraMorphFrameId = window.requestAnimationFrame(render);
    else {
      cameraMorphFrameId = undefined;
      startCameraPreview();
    }
  };

  cameraMorphFrameId = window.requestAnimationFrame(render);
}

function updateSlider(slider) {
  const min = Number(slider.min) || 0;
  const max = Number(slider.max) || 100;
  const value = Number(slider.value);
  const percentage = ((value - min) / (max - min)) * 100;
  slider.style.setProperty("--slider-value", `${percentage}%`);
  slider.setAttribute("aria-valuetext", `${value}%`);
}

function renderCameraSetting(card, animate = false) {
  const controlKey = card.dataset.cameraControl;
  const setting = cameraSettings[controlKey];
  const option = setting.options[setting.index];
  const image = card.querySelector(".camera-setting-image");
  const number = card.querySelector(".camera-setting-number");
  const value = card.querySelector(".camera-setting-value");

  const commit = () => {
    if (image) {
      const crop = option.crop || {};
      image.src = option.image;
      image.style.width = crop.width || "100%";
      image.style.height = crop.height || "100%";
      image.style.left = crop.left || "0";
      image.style.top = crop.top || "0";
      image.style.objectFit = crop.objectFit || "fill";
      image.style.objectPosition = crop.objectPosition || "center";
    }
    if (number) number.textContent = option.display;
    value.textContent = option.label;
    card.dataset.value = option.label;
    card.setAttribute("aria-label", `${card.querySelector("h2").textContent}: ${option.label}`);
  };

  if (!animate || reducedMotionQuery.matches) {
    commit();
    return;
  }

  card.classList.add("is-switching");
  window.setTimeout(() => {
    commit();
    window.requestAnimationFrame(() => card.classList.remove("is-switching"));
  }, 90);
}

function changeCameraSetting(card, direction) {
  const setting = cameraSettings[card.dataset.cameraControl];
  setting.index = (setting.index + direction + setting.options.length) % setting.options.length;
  renderCameraSetting(card, true);
}

chips.filter((chip) => chip !== directorChip && chip !== cameraChip && chip !== localEditChip).forEach((chip) => {
  chip.addEventListener("click", () => {
    const active = chip.getAttribute("aria-pressed") === "true";
    chip.setAttribute("aria-pressed", String(!active));
    chip.classList.toggle("is-active", !active);
  });
});

directorChip.addEventListener("click", () => {
  setDirectorOpen(directorChip.getAttribute("aria-expanded") !== "true");
});

cameraChip.addEventListener("click", () => {
  setCameraToolbarOpen(cameraChip.getAttribute("aria-expanded") !== "true");
});

localEditChip.addEventListener("click", () => {
  setLocalEditOpen(!localEditOpen);
});

localEditCanvas.addEventListener("pointerenter", (event) => {
  if (!localEditOpen || localEditProcessing) return;
  const point = localEditPointFromEvent(event);
  moveLocalEditCursor(point);
  localEditLayer.classList.add("is-hovered");
});

localEditCanvas.addEventListener("pointerleave", () => {
  if (!localEditPainting) localEditLayer.classList.remove("is-hovered");
});

localEditCanvas.addEventListener("pointerdown", (event) => {
  if (!localEditOpen || localEditProcessing || event.button !== 0) return;
  event.preventDefault();

  if (localEditApplied) {
    clearLocalEditMask();
    promptPanel.classList.add("is-local-edit-focused");
  }

  const point = localEditPointFromEvent(event);
  localEditPainting = true;
  localEditPreviousPoint = undefined;
  localEditSelectionPoints = [];
  localEditSelectionClosed = false;
  localEditLayer.classList.add("is-hovered", "is-painting");
  localEditCanvas.setPointerCapture?.(event.pointerId);
  moveLocalEditCursor(point);
  paintLocalEditPoint(point);
});

localEditCanvas.addEventListener("pointermove", (event) => {
  if (!localEditOpen || localEditProcessing) return;
  const point = localEditPointFromEvent(event);
  moveLocalEditCursor(point);

  if (localEditPainting && (event.buttons & 1) === 1) paintLocalEditPoint(point);
});

function finishLocalEditPainting(event) {
  if (!localEditPainting) return;

  localEditPainting = false;
  localEditPreviousPoint = undefined;
  localEditHasMask = localEditSelectionClosed;
  renderLocalEditMask(localEditSelectionClosed);
  localEditLayer.classList.remove("is-painting");

  if (event?.pointerId !== undefined && localEditCanvas.hasPointerCapture?.(event.pointerId)) {
    localEditCanvas.releasePointerCapture(event.pointerId);
  }

  updateApplyAvailability();
}

localEditCanvas.addEventListener("pointerup", finishLocalEditPainting);
localEditCanvas.addEventListener("pointercancel", finishLocalEditPainting);
localEditCanvas.addEventListener("lostpointercapture", finishLocalEditPainting);

cameraSettingCards.forEach((card) => {
  card.querySelectorAll(".camera-setting-nav").forEach((button) => {
    button.addEventListener("click", () => changeCameraSetting(card, Number(button.dataset.direction)));
  });
});

cameraPrev.addEventListener("click", () => {
  setCameraMode((cameraModeIndex - 1 + cameraModes.length) % cameraModes.length);
});

cameraNext.addEventListener("click", () => {
  setCameraMode((cameraModeIndex + 1) % cameraModes.length);
});

function changeMood(direction) {
  clearTimeout(moodSwapTimer);
  moodIndex = (moodIndex + direction + moods.length) % moods.length;
  const mood = moods[moodIndex];

  moodArt.classList.add("is-switching");
  moodValue.classList.add("is-switching");
  moodSwapTimer = window.setTimeout(() => {
    moodImage.src = mood.image;
    moodArt.dataset.mood = mood.key;
    moodValue.textContent = mood.label;
    window.requestAnimationFrame(() => {
      moodArt.classList.remove("is-switching");
      moodValue.classList.remove("is-switching");
    });
  }, reducedMotionQuery.matches ? 0 : 100);
}

moodPrev.addEventListener("click", () => changeMood(-1));
moodNext.addEventListener("click", () => changeMood(1));

directorSliders.forEach((slider) => {
  updateSlider(slider);
  slider.addEventListener("input", () => updateSlider(slider));
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  if (directorChip.getAttribute("aria-expanded") === "true") {
    setDirectorOpen(false);
    directorChip.focus();
  } else if (cameraChip.getAttribute("aria-expanded") === "true") {
    setCameraToolbarOpen(false);
    cameraChip.focus();
  } else if (localEditOpen) {
    setLocalEditOpen(false);
    localEditChip.focus();
  }
});

prompt.addEventListener("input", updateApplyAvailability);

applyButton.addEventListener("click", () => {
  const description = prompt.value.trim();

  if (localEditOpen) {
    if (!localEditHasMask || !description || localEditProcessing) return;

    localEditProcessing = true;
    setApplyButtonProcessing(true);
    localEditLayer.classList.add("is-processing");
    localEditLayer.classList.remove("is-hovered");
    showVideoState("Изменяю выделенную область…", 1500);

    const maskUrl = localEditMaskCanvas.toDataURL("image/png");
    localEditResult.style.webkitMaskImage = `url(${maskUrl})`;
    localEditResult.style.maskImage = `url(${maskUrl})`;

    window.setTimeout(() => {
      localEditResult.classList.add("is-visible");
      localEditSelectionBlur.classList.remove("is-visible");
      localEditDisplayContext.clearRect(0, 0, localEditCanvas.width, localEditCanvas.height);
      localEditLayer.classList.remove("is-processing");
      promptPanel.classList.remove("is-local-edit-focused");
      localEditApplied = true;
      localEditProcessing = false;
      setApplyButtonProcessing(false);
      showVideoState("Локальная правка применена", 1100);
    }, 920);
    return;
  }

  if (!description) {
    prompt.focus();
    showVideoState("Опиши правку для шота", 1100);
    return;
  }

  video.pause();
  setApplyButtonProcessing(true);
  showVideoState(`Правка шота ${String(selectedShot + 1).padStart(2, "0")}…`, 1500);

  window.setTimeout(() => {
    setApplyButtonProcessing(false);
    showVideoState("Правка применена", 1100);
    playVideo();
  }, 1450);
});

saveButton.addEventListener("click", () => {
  clearTimeout(toastTimer);
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(hideToast, 3200);
});

toastClose.addEventListener("click", hideToast);

backButton.addEventListener("click", () => {
  if (window.history.length > 1) window.history.back();
});

window.addEventListener("resize", () => {
  updateTimeline();
  if (localEditOpen && !localEditPainting && !localEditProcessing) {
    window.requestAnimationFrame(() => {
      sizeLocalEditCanvas();
      clearLocalEditMask();
    });
  }
});
window.addEventListener("blur", () => video.pause());
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopCameraPreview();
  else if (directorToolbar.classList.contains("is-open")) startCameraPreview();
});
reducedMotionQuery.addEventListener("change", () => {
  setCameraMode(cameraModeIndex, false);
});

moods.forEach((mood) => {
  const image = new Image();
  image.src = mood.image;
});

Object.values(cameraSettings).forEach((setting) => {
  setting.options.forEach((option) => {
    if (!option.image) return;
    const image = new Image();
    image.src = option.image;
  });
});

buildRuler();
updateSelectedShot(0);
updatePlaybackState();
updateTimeline();
setCameraMode(0, false);
cameraSettingCards.forEach((card) => renderCameraSetting(card));
