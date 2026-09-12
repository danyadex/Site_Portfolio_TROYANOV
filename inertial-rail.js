// Touch and trackpad keep their native momentum. Mouse dragging adds a
// time-based release decay; a new gesture always takes control immediately.
export function initInertialRail(rail) {
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let pointer = null;
  let frame = 0;
  let suppressClick = false;
  let restoreSnap;
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    if (restoreSnap !== undefined) {
      rail.style.scrollSnapType = restoreSnap;
      restoreSnap = undefined;
    }
  };
  const coast = (velocity) => {
    if (reduced.matches || Math.abs(velocity) < .05) { stop(); return; }
    let previous = performance.now();
    const tick = (now) => {
      const dt = Math.min(now - previous, 48);
      previous = now;
      const decay = Math.exp(-dt / 240);
      const before = rail.scrollLeft;
      rail.scrollLeft += velocity * 240 * (1 - decay);
      velocity *= decay;
      if (Math.abs(velocity) < .025 || Math.abs(rail.scrollLeft - before) < .1) stop();
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  };
  rail.addEventListener('pointerdown', (event) => {
    stop();
    if (event.pointerType !== 'mouse' || event.button !== 0 || !event.isPrimary || rail.scrollWidth <= rail.clientWidth + 1) return;
    suppressClick = false;
    pointer = { id: event.pointerId, x: event.clientX, scroll: rail.scrollLeft, last: rail.scrollLeft, time: performance.now(), velocity: 0, moved: false };
    restoreSnap = rail.style.scrollSnapType;
    rail.style.scrollSnapType = 'none';
    rail.setPointerCapture(event.pointerId);
  }, options);
  rail.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointer?.id) return;
    const distance = event.clientX - pointer.x;
    if (!pointer.moved && Math.abs(distance) < 4) return;
    pointer.moved = true;
    suppressClick = true;
    rail.classList.add('is-dragging');
    event.preventDefault();
    rail.scrollLeft = pointer.scroll - distance;
    const now = performance.now();
    const dt = now - pointer.time;
    if (dt > 0) {
      const sample = (rail.scrollLeft - pointer.last) / dt;
      pointer.velocity = Math.max(-3, Math.min(3, sample * .7 + pointer.velocity * .3));
      pointer.last = rail.scrollLeft;
      pointer.time = now;
    }
  }, options);
  const finish = (event) => {
    if (event.pointerId !== pointer?.id) return;
    const velocity = event.type === 'pointerup' && performance.now() - pointer.time < 100 ? pointer.velocity : 0;
    pointer = null;
    rail.classList.remove('is-dragging');
    if (rail.hasPointerCapture(event.pointerId)) rail.releasePointerCapture(event.pointerId);
    coast(velocity);
  };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => rail.addEventListener(type, finish, options));
  rail.addEventListener('wheel', stop, { ...options, passive: true });
  rail.addEventListener('keydown', stop, options);
  rail.addEventListener('dragstart', event => event.preventDefault(), options);
  rail.addEventListener('click', (event) => {
    if (!suppressClick) return;
    event.preventDefault(); event.stopPropagation(); suppressClick = false;
  }, { ...options, capture: true });
  reduced.addEventListener('change', stop, options);
  document.addEventListener('visibilitychange', stop, options);
  return () => { stop(); controller.abort(); };
}
