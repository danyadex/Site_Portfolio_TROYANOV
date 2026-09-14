/* Увеличение шота из ленты.
   Шот не открывается «где-то в модалке», а вылетает из своего места в ленте:
   картинка ставится в финальный прямоугольник по центру экрана, а анимация
   стартует с её текущего положения в ленте (FLIP). Обрезка карточки в ленте
   повторяется через clip-path и раскрывается по ходу движения, поэтому
   на первом кадре картинка совпадает с лентой пиксель в пиксель.
   При закрытии всё проигрывается обратно — шот возвращается на своё место. */

// Кривые и тайминги — по emilkowalski/skills (animate): крупный объект
// открывается чуть дольше и мягче, закрытие короче и отзывчивее.
const OPEN_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const CLOSE_EASE = "cubic-bezier(0.23, 1, 0.32, 1)";
const OPEN_MS = 440;
const CLOSE_MS = 320;
const CARD_RADIUS = 12;
const OPEN_RADIUS = 16;

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let active = null;

function targetRect(aspect) {
  const mobile = window.innerWidth < 900;
  const padX = mobile ? 16 : 64;
  const padY = mobile ? 72 : 56;
  let width = window.innerWidth - padX * 2;
  let height = width / aspect;
  const maxHeight = window.innerHeight - padY * 2;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspect;
  }
  return {
    left: (window.innerWidth - width) / 2,
    top: (window.innerHeight - height) / 2,
    width,
    height,
  };
}

// Какая доля картинки срезана карточкой в ленте с каждой стороны. В ленте
// картинки чуть больше карточек: так прячутся тени мокапов и розовая полоса
// внизу скриншота GALYA. Увеличенный шот показывает ту же область, что лента.
// Считаем по вычисленным стилям, а не по getBoundingClientRect: у картинки
// бывает временный сдвиг параллакса. И не по offset*: они округлены до
// целых, и розовая полоса в 4px пролезала бы на крупном размере.
function cardCrop(card, image) {
  const style = getComputedStyle(image);
  const left = parseFloat(style.left);
  const top = parseFloat(style.top);
  const width = parseFloat(style.width);
  const height = parseFloat(style.height);
  // Карточка сама не трансформируется, её прямоугольник точный.
  const { width: cardWidth, height: cardHeight } = card.getBoundingClientRect();
  return {
    left: Math.max(0, -left / width),
    top: Math.max(0, -top / height),
    right: Math.max(0, (left + width - cardWidth) / width),
    bottom: Math.max(0, (top + height - cardHeight) / height),
  };
}

// Положение картинки в ленте, выраженное через её прямоугольник в просмотре:
// сдвиг и масштаб для transform и обрезка карточки для clip-path.
function collapsedFrame(source, card, picture) {
  const scale = source.width / picture.width;
  const inset = (value) => `${Math.max(0, value / scale).toFixed(2)}px`;
  return {
    transform: `translate(${source.left - picture.left}px, ${source.top - picture.top}px) scale(${scale})`,
    clipPath: `inset(${inset(card.top - source.top)} ${inset(source.right - card.right)} ${inset(source.bottom - card.bottom)} ${inset(card.left - source.left)} round ${(CARD_RADIUS / scale).toFixed(2)}px)`,
  };
}

export function openShotZoom({ card, image, fullSrc, alt, crop: cropOverride, fromKeyboard = false, closeIcons }) {
  if (active || !card || !image) return;

  // Видимая область шота вписывается в экран, а сама картинка выходит за неё
  // на ширину обрезки и подрезается clip-path — как в ленте, только крупно.
  // Своя обрезка задаётся, когда лента режет неточно для крупного размера:
  // в мелкой карточке лишний пиксель тени не виден, на весь экран — виден.
  const crop = cropOverride ?? cardCrop(card, image);
  const imageStyle = getComputedStyle(image);
  const imageAspect = parseFloat(imageStyle.width) / parseFloat(imageStyle.height);
  const visible = targetRect(imageAspect * (1 - crop.left - crop.right) / (1 - crop.top - crop.bottom));
  const pictureWidth = visible.width / (1 - crop.left - crop.right);
  const pictureHeight = visible.height / (1 - crop.top - crop.bottom);
  const pictureRect = {
    left: visible.left - crop.left * pictureWidth,
    top: visible.top - crop.top * pictureHeight,
    width: pictureWidth,
    height: pictureHeight,
  };
  const px = (value) => `${value.toFixed(2)}px`;
  const openFrame = {
    transform: "translate(0px, 0px) scale(1)",
    clipPath: `inset(${px(crop.top * pictureHeight)} ${px(crop.right * pictureWidth)} ${px(crop.bottom * pictureHeight)} ${px(crop.left * pictureWidth)} round ${OPEN_RADIUS}px)`,
  };
  const page = document.querySelector(".home-page");
  const opener = document.activeElement;
  const still = reducedMotion.matches;

  const root = document.createElement("div");
  root.className = "shot-zoom";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", alt);
  // Кольцо фокуса на крестике нужно тем, кто пришёл с клавиатуры, а не мышью.
  if (!fromKeyboard) root.dataset.input = "pointer";

  const backdrop = document.createElement("div");
  backdrop.className = "shot-zoom-backdrop";

  const picture = document.createElement("img");
  picture.className = "shot-zoom-image";
  picture.alt = alt;
  picture.src = image.currentSrc || image.src;
  picture.draggable = false;
  Object.assign(picture.style, {
    left: px(pictureRect.left),
    top: px(pictureRect.top),
    width: px(pictureRect.width),
    height: px(pictureRect.height),
    clipPath: openFrame.clipPath,
  });

  const close = document.createElement("button");
  close.type = "button";
  close.className = "shot-zoom-close";
  close.setAttribute("aria-label", "Закрыть");
  close.innerHTML = `<span class="dialog-close-icon" aria-hidden="true">${closeIcons
    .map((src) => `<img src="${src}" alt="" />`)
    .join("")}</span>`;

  root.append(backdrop, picture, close);
  document.body.append(root);

  const state = { root, animations: [], closing: false };
  active = state;

  image.style.visibility = "hidden";
  if (page) page.inert = true;
  close.focus({ preventScroll: true });

  // Лёгкая картинка из ленты уже в кеше и рисуется сразу; полноразмерная
  // подменяет её, когда декодирована, — без вспышки и пустого кадра.
  const full = new Image();
  full.src = fullSrc;
  full.decode().then(() => {
    if (active === state && !state.closing) picture.src = fullSrc;
  }).catch(() => {});

  const run = (element, keyframes, options) => {
    const animation = element.animate(keyframes, { fill: "both", ...options });
    state.animations.push(animation);
    return animation;
  };

  if (still) {
    run(root, [{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: "ease-out" });
  } else {
    const from = collapsedFrame(image.getBoundingClientRect(), card.getBoundingClientRect(), pictureRect);
    run(picture, [from, openFrame], { duration: OPEN_MS, easing: OPEN_EASE });
    run(backdrop, [{ opacity: 0 }, { opacity: 1 }], { duration: OPEN_MS, easing: CLOSE_EASE });
    // Крестик — второстепенный: появляется, когда шот уже почти на месте.
    run(close, [{ opacity: 0, transform: "scale(0.9)" }, { opacity: 1, transform: "scale(1)" }], {
      duration: 220,
      delay: 180,
      easing: CLOSE_EASE,
    });
  }

  const finish = () => {
    if (active !== state) return;
    active = null;
    document.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("resize", closeZoom);
    window.removeEventListener("wheel", closeZoom);
    root.remove();
    image.style.removeProperty("visibility");
    if (page) page.inert = false;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  };

  function closeZoom() {
    if (state.closing) return;
    state.closing = true;
    // Закрыть могут посреди открытия: стартуем обратный ход с того кадра,
    // где картинка сейчас, а не с конечной точки.
    const computed = getComputedStyle(picture);
    const from = { transform: computed.transform, clipPath: computed.clipPath };
    const backdropOpacity = getComputedStyle(backdrop).opacity;
    state.animations.forEach((animation) => animation.cancel());
    state.animations = [];
    root.style.pointerEvents = "none";

    if (still) {
      run(root, [{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: "ease-in" }).finished.then(finish, finish);
      return;
    }

    const back = collapsedFrame(image.getBoundingClientRect(), card.getBoundingClientRect(), pictureRect);
    run(picture, [from, back], { duration: CLOSE_MS, easing: CLOSE_EASE }).finished.then(finish, finish);
    run(backdrop, [{ opacity: backdropOpacity }, { opacity: 0 }], { duration: CLOSE_MS, easing: CLOSE_EASE });
    run(close, [{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: "ease-out" });
  }

  function onKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeZoom();
    }
    // Единственный фокусируемый элемент — крестик: Tab не уводит за оверлей.
    if (event.key === "Tab") {
      event.preventDefault();
      close.focus({ preventScroll: true });
    }
  }

  root.addEventListener("click", closeZoom);
  root.addEventListener("touchmove", (event) => {
    event.preventDefault();
    closeZoom();
  }, { passive: false });
  document.addEventListener("keydown", onKeyDown);
  // Колесо или ресайз закрывают просмотр — страница под ним не должна уезжать.
  window.addEventListener("wheel", closeZoom, { passive: true });
  window.addEventListener("resize", closeZoom);
}
