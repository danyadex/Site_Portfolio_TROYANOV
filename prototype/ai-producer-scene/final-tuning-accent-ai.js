const root = document.querySelector(".final-tuning");
const video = document.querySelector("#enhancedVideo");
const canvas = document.querySelector("#accentAiCanvas");

const displayContext = canvas.getContext("2d", { alpha: true });
const foregroundCanvas = document.createElement("canvas");
const foregroundContext = foregroundCanvas.getContext("2d", { alpha: true });
const maskCanvas = document.createElement("canvas");
const maskContext = maskCanvas.getContext("2d", { alpha: true });

let workerReady = false;
let workerFailed = false;
let inferenceInFlight = false;
let lastInferenceTime = 0;
let lastFrameTime = -1;
let hasMask = false;

const worker = new Worker("./final-tuning-segmentation-worker.js?v=11");

function isAccentActive() {
  return root.dataset.aspect === "accent";
}

function tuningStrength() {
  return Number.parseFloat(getComputedStyle(root).getPropertyValue("--tuning-strength")) || 0;
}

function sizeCanvases() {
  const bounds = canvas.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
  const width = Math.max(1, Math.round(bounds.width * pixelRatio));
  const height = Math.max(1, Math.round(bounds.height * pixelRatio));

  if (canvas.width === width && canvas.height === height) return;
  canvas.width = width;
  canvas.height = height;
  foregroundCanvas.width = width;
  foregroundCanvas.height = height;
}

function drawCover(context, source, width, height) {
  const sourceWidth = source.videoWidth || source.width;
  const sourceHeight = source.videoHeight || source.height;
  if (!sourceWidth || !sourceHeight) return;

  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  context.drawImage(source, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawAccentFrame() {
  if (!hasMask || !isAccentActive() || !video.videoWidth || !video.videoHeight) return;
  sizeCanvases();

  const { width, height } = canvas;
  const strength = tuningStrength();
  // At zero the result must be visually identical to the original. The full
  // range then creates a clear, controllable subject separation.
  const backgroundBlur = strength * 34;
  const subjectContrast = 1 + strength * 0.48;
  const subjectSaturation = 1 + strength * 0.7;
  const subjectBrightness = 1 + strength * 0.12;
  const backgroundSaturation = 1 - strength * 0.76;
  const backgroundBrightness = 1 - strength * 0.52;

  displayContext.clearRect(0, 0, width, height);
  displayContext.save();
  displayContext.filter = `blur(${backgroundBlur}px) saturate(${backgroundSaturation}) brightness(${backgroundBrightness}) contrast(${1 - strength * 0.08})`;
  drawCover(displayContext, video, width, height);
  displayContext.restore();

  foregroundContext.clearRect(0, 0, width, height);
  foregroundContext.save();
  foregroundContext.filter = `saturate(${subjectSaturation}) contrast(${subjectContrast}) brightness(${subjectBrightness})`;
  drawCover(foregroundContext, video, width, height);
  foregroundContext.restore();

  foregroundContext.save();
  foregroundContext.globalCompositeOperation = "destination-in";
  foregroundContext.filter = "blur(2px)";
  foregroundContext.drawImage(maskCanvas, 0, 0, width, height);
  foregroundContext.restore();

  displayContext.drawImage(foregroundCanvas, 0, 0);
}

function requestSegmentation() {
  if (!workerReady || workerFailed || inferenceInFlight || !isAccentActive()) return;
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

  const now = performance.now();
  if (now - lastInferenceTime < 83) return;
  if (Math.abs(video.currentTime - lastFrameTime) < 0.008 && !video.paused) return;

  inferenceInFlight = true;
  lastInferenceTime = now;
  lastFrameTime = video.currentTime;

  createImageBitmap(video)
    .then((bitmap) => worker.postMessage({ type: "SEGMENT", bitmap, timestampMs: now }, [bitmap]))
    .catch(() => {
      inferenceInFlight = false;
    });
}

function frameLoop() {
  if (isAccentActive()) {
    requestSegmentation();
    drawAccentFrame();
  }
  requestAnimationFrame(frameLoop);
}

function updateMask({ width, height, alpha }) {
  const opacity = new Uint8ClampedArray(alpha);
  maskCanvas.width = width;
  maskCanvas.height = height;
  const image = maskContext.createImageData(width, height);
  for (let index = 0; index < opacity.length; index += 1) {
    image.data[index * 4 + 3] = opacity[index];
  }
  maskContext.putImageData(image, 0, 0);
  hasMask = true;
  root.classList.add("ai-mask-ready");
}

worker.addEventListener("message", (event) => {
  const { type } = event.data;
  if (type === "READY") {
    workerReady = true;
    root.dataset.aiStatus = "ready";
    return;
  }

  if (type === "MASK") {
    inferenceInFlight = false;
    updateMask(event.data);
    return;
  }

  if (type === "ERROR") {
    inferenceInFlight = false;
    workerFailed = true;
    root.dataset.aiStatus = "fallback";
    root.dataset.aiError = event.data.message || "Неизвестная ошибка AI-модуля";
    root.classList.remove("ai-mask-ready");
    console.warn("AI Accent fallback:", event.data.message);
  }
});

worker.addEventListener("error", () => {
  workerFailed = true;
  root.dataset.aiStatus = "fallback";
  root.dataset.aiError = "Не удалось запустить AI-worker";
  root.classList.remove("ai-mask-ready");
});

worker.postMessage({ type: "INIT" });
requestAnimationFrame(frameLoop);
