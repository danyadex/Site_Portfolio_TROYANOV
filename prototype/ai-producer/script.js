const selectionArea = document.querySelector("#selectionArea");
const emptyState = document.querySelector("#emptyState");
const saveButton = document.querySelector("#saveButton");
const toast = document.querySelector("#toast");
const toastClose = document.querySelector("#toastClose");
const toastLabel = toast.querySelector("span");
const options = [...document.querySelectorAll(".genre-option")];
const tabs = [...document.querySelectorAll(".tabs button")];
const promptInput = document.querySelector("#promptInput");
const applyButton = document.querySelector("#applyButton");
const applyLabel = applyButton.querySelector(".apply-label");

const genres = {
  horror: { label: "Хоррор", image: "assets/raw-3.png" },
  "sci-fi": { label: "Sci-Fi", image: "assets/raw-1.png" },
  action: { label: "Экшн", image: "assets/raw-2.png" },
  surreal: { label: "Сюрреализм", image: "assets/raw-12.png" },
  anime: { label: "Аниме", image: "assets/raw-5.png" },
};

const selected = [];
let toastTimer;
let applyTimer;
const defaultToastText = toastLabel.textContent;

function cardOffset(index, count) {
  return (index - (count - 1) / 2) * 191;
}

function positionCards() {
  selected.forEach((item, index) => {
    item.element.style.setProperty("--card-x", `${cardOffset(index, selected.length)}px`);
  });
}

function paintProgress(item) {
  const rounded = Math.max(0, Math.min(100, Math.round(item.progress)));
  item.element.style.setProperty("--progress", String(rounded));
  item.element.style.setProperty("--progress-angle", `${rounded * 3.6}deg`);
  item.value.textContent = `${rounded}%`;
  item.element.setAttribute("aria-valuenow", String(rounded));
  item.element.setAttribute("aria-valuetext", `${rounded} процентов`);
}

function stopProgress(item) {
  item.pressing = false;
  item.element.classList.remove("is-pressing");
  item.element.classList.remove("is-detent");
  item.element.classList.remove("is-scrubbing");
  if (item.animationFrame) cancelAnimationFrame(item.animationFrame);
  if (item.initialAnimationFrame) cancelAnimationFrame(item.initialAnimationFrame);
  item.animationFrame = null;
  item.initialAnimationFrame = null;
  item.lastTime = null;
  item.detentUntil = null;
  item.lastPointerX = null;
  item.lastPointerY = null;
  item.pointerTravel = 0;
  item.mode = null;
}

function progressFrame(item, now) {
  if (!item.pressing) return;
  if (item.lastTime === null) item.lastTime = now;

  if (item.detentUntil && now < item.detentUntil) {
    item.lastTime = now;
    item.animationFrame = requestAnimationFrame((time) => progressFrame(item, time));
    return;
  }

  if (item.detentUntil) {
    item.detentUntil = null;
    item.element.classList.remove("is-detent");
  }

  const elapsed = now - item.lastTime;
  item.lastTime = now;
  const nextProgress = Math.min(100, item.progress + elapsed * 0.028);
  const nextDetent = Math.floor(item.progress / 10) * 10 + 10;
  const reachedDetent = nextDetent <= 100 && nextProgress >= nextDetent;

  if (reachedDetent) {
    item.progress = nextDetent;
    item.detentUntil = now + 120;
    item.element.classList.add("is-detent");
  } else {
    item.progress = nextProgress;
  }

  paintProgress(item);
  item.animationFrame = requestAnimationFrame((time) => progressFrame(item, time));
}

function startProgress(item, event) {
  if (item.initialAnimationFrame) cancelAnimationFrame(item.initialAnimationFrame);
  item.initialAnimationFrame = null;
  event.currentTarget.setPointerCapture?.(event.pointerId);
  item.pressing = true;
  item.mode = "fill";
  item.lastPointerX = event.clientX;
  item.lastPointerY = event.clientY;
  item.pointerStartY = event.clientY;
  item.pointerStartProgress = item.progress;
  item.lastTime = null;
  item.element.classList.add("is-pressing");
  item.animationFrame = requestAnimationFrame((time) => progressFrame(item, time));
}

function snapDragValue(value) {
  const clamped = Math.max(0, Math.min(100, value));
  const detent = Math.round(clamped / 10) * 10;
  return Math.abs(clamped - detent) <= 1.5 ? detent : clamped;
}

function updatePointer(item, event) {
  if (!item.pressing || item.lastPointerY === null) return;
  item.lastPointerX = event.clientX;
  item.lastPointerY = event.clientY;
  if (item.mode === "fill" && Math.abs(event.clientY - item.pointerStartY) >= 8) {
    item.mode = "scrub";
    item.scrubOriginY = event.clientY;
    item.scrubOriginProgress = item.progress;
    item.element.classList.add("is-scrubbing");
    item.element.classList.remove("is-detent");
    item.detentUntil = null;
    if (item.animationFrame) cancelAnimationFrame(item.animationFrame);
    item.animationFrame = null;
    return;
  }
  if (item.mode !== "scrub") return;

  item.progress = snapDragValue(item.scrubOriginProgress + (event.clientY - item.scrubOriginY) * 0.6);
  const rounded = Math.round(item.progress);
  item.element.classList.toggle("is-detent", rounded % 10 === 0);
  paintProgress(item);
}

function handleSliderKey(item, event) {
  const keySteps = {
    ArrowLeft: -1,
    ArrowDown: -1,
    ArrowRight: 1,
    ArrowUp: 1,
    PageDown: -10,
    PageUp: 10,
  };
  if (event.key === "Home") item.progress = 0;
  else if (event.key === "End") item.progress = 100;
  else if (keySteps[event.key]) item.progress = Math.max(0, Math.min(100, item.progress + keySteps[event.key]));
  else return;
  event.preventDefault();
  paintProgress(item);
}

function animateInitialTen(item) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    item.progress = 10;
    paintProgress(item);
    return;
  }
  const started = performance.now();
  const duration = 360;
  function frame(now) {
    const ratio = Math.min(1, (now - started) / duration);
    item.progress = 10 * (1 - Math.pow(1 - ratio, 3));
    paintProgress(item);
    if (ratio < 1) {
      item.initialAnimationFrame = requestAnimationFrame(frame);
    } else {
      item.initialAnimationFrame = null;
    }
  }
  item.initialAnimationFrame = requestAnimationFrame(frame);
}

function createCard(key) {
  const data = genres[key];
  const element = document.createElement("div");
  element.tabIndex = 0;
  element.setAttribute("role", "slider");
  element.setAttribute("aria-valuemin", "0");
  element.setAttribute("aria-valuemax", "100");
  element.className = "mix-card is-entering";
  element.setAttribute("aria-label", `${data.label}: удерживайте для изменения процента`);
  element.style.setProperty("--genre-image", `url("${data.image}")`);
  element.innerHTML = `
    <span class="mix-visual">
      <img class="mix-base" src="${data.image}" alt="" />
      <span class="mix-overlay" aria-hidden="true"></span>
    </span>
    <span class="mix-value">0%</span>
  `;

  const item = {
    key,
    element,
    value: element.querySelector(".mix-value"),
    progress: 0,
    pressing: false,
    animationFrame: null,
    initialAnimationFrame: null,
    lastTime: null,
    detentUntil: null,
    lastPointerX: null,
    lastPointerY: null,
    pointerStartY: null,
    pointerStartProgress: 0,
    scrubOriginY: null,
    scrubOriginProgress: 0,
    mode: null,
  };

  element.addEventListener("pointerdown", (event) => startProgress(item, event));
  element.addEventListener("pointermove", (event) => updatePointer(item, event));
  element.addEventListener("pointerup", () => stopProgress(item));
  element.addEventListener("pointercancel", () => stopProgress(item));
  element.addEventListener("lostpointercapture", () => stopProgress(item));
  element.addEventListener("keydown", (event) => handleSliderKey(item, event));
  selectionArea.append(element);
  requestAnimationFrame(() => {
    positionCards();
    requestAnimationFrame(() => element.classList.remove("is-entering"));
  });
  animateInitialTen(item);
  return item;
}

function selectGenre(key) {
  const selectedIndex = selected.findIndex((item) => item.key === key);
  if (selectedIndex >= 0) {
    deselectGenre(selectedIndex);
    return;
  }
  if (selected.length >= 3) return;
  emptyState.classList.add("is-hidden");
  options.find((option) => option.dataset.genre === key)?.classList.add("is-selected");
  selected.push(createCard(key));
  positionCards();
}

function deselectGenre(index) {
  const [item] = selected.splice(index, 1);
  stopProgress(item);
  options.find((option) => option.dataset.genre === item.key)?.classList.remove("is-selected");
  item.element.classList.add("is-leaving");
  positionCards();
  window.setTimeout(() => item.element.remove(), 190);
  if (selected.length === 0) emptyState.classList.remove("is-hidden");
}

options.forEach((option) => {
  option.addEventListener("click", () => selectGenre(option.dataset.genre));
});

function hideToast() {
  toast.classList.remove("is-visible");
  clearTimeout(toastTimer);
  toastLabel.textContent = defaultToastText;
}

function showToast(message) {
  clearTimeout(toastTimer);
  toastLabel.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = setTimeout(hideToast, 3200);
}

saveButton.addEventListener("click", () => showToast("Стиль сохранён"));

applyButton.addEventListener("click", () => {
  const prompt = promptInput.value.trim();
  if (!prompt && selected.length === 0) {
    showToast("Выбери жанр или уточни запрос");
    promptInput.focus();
    return;
  }

  clearTimeout(applyTimer);
  applyButton.disabled = true;
  applyButton.classList.add("is-processing");

  applyTimer = setTimeout(() => {
    applyButton.disabled = false;
    applyButton.classList.remove("is-processing");
    promptInput.dataset.appliedValue = prompt;
    showToast("Стиль применён");
  }, 480);
});

toastClose.addEventListener("click", hideToast);
window.addEventListener("blur", () => selected.forEach(stopProgress));

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((item) => item.classList.toggle("active", item === tab));
  });
});
