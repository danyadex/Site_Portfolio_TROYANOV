import assert from "node:assert/strict";
import test from "node:test";
import { manageVideoPlayback, observeVisibility } from "../media-playback.js";

function setup(t) {
  const document = Object.assign(new EventTarget(), { hidden: false });
  const motion = Object.assign(new EventTarget(), { matches: false });
  const window = Object.assign(new EventTarget(), { matchMedia: () => motion });
  const observers = [];
  class Observer {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
    setVisible(isIntersecting) { this.callback([{ isIntersecting }]); }
  }
  for (const [key, value] of Object.entries({ document, window, IntersectionObserver: Observer })) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
    t.after(() => {
      if (original) Object.defineProperty(globalThis, key, original);
      else delete globalThis[key];
    });
  }
  return { document, motion, window, observers };
}

class Video extends EventTarget {
  paused = true;
  autoplay = false;
  readyState = 4;
  dataset = {};
  playCount = 0;
  playResult = Promise.resolve();
  play() {
    this.playCount++;
    this.paused = false;
    this.dispatchEvent(new Event("play"));
    return this.playResult;
  }
  pause() { this.paused = true; }
}

test("late media loads do not play until the video enters the viewport", (t) => {
  const { observers } = setup(t);
  const video = new Video();
  const dispose = manageVideoPlayback(video);
  assert.equal(video.autoplay, false);
  video.dispatchEvent(new Event("loadeddata"));
  assert.equal(video.playCount, 0);
  observers[1].setVisible(true);
  assert.equal(video.paused, false);
  observers[1].setVisible(false);
  video.dispatchEvent(new Event("loadeddata"));
  assert.equal(video.playCount, 1);
  assert.equal(video.paused, true);
  observers[1].setVisible(true);
  assert.equal(video.playCount, 2);
  dispose();
});

test("a pending play request cannot revive an offscreen or disposed video", async (t) => {
  const { observers } = setup(t);
  const video = new Video();
  let resolvePlay;
  video.playResult = new Promise((resolve) => { resolvePlay = resolve; });
  const dispose = manageVideoPlayback(video);
  observers[1].setVisible(true);
  observers[1].setVisible(false);
  video.paused = false;
  resolvePlay();
  await video.playResult;
  assert.equal(video.paused, true);

  dispose();
  video.dispatchEvent(new Event("loadeddata"));
  assert.equal(video.playCount, 1);
  assert.equal(observers[1].disconnected, true);
});

test("visibility, page lifecycle and reduced motion gate playback", (t) => {
  const { document, window, motion, observers } = setup(t);
  const video = new Video();
  const dispose = manageVideoPlayback(video);
  observers[1].setVisible(true);
  document.hidden = true;
  document.dispatchEvent(new Event("visibilitychange"));
  assert.equal(video.paused, true);
  document.hidden = false;
  document.dispatchEvent(new Event("visibilitychange"));
  assert.equal(video.paused, false);

  window.dispatchEvent(new Event("pagehide"));
  video.dispatchEvent(new Event("loadeddata"));
  assert.equal(video.paused, true);
  window.dispatchEvent(new Event("pageshow"));
  assert.equal(video.paused, false);

  motion.matches = true;
  motion.dispatchEvent(new Event("change"));
  assert.equal(video.paused, true);
  observers[1].setVisible(false);
  motion.matches = false;
  motion.dispatchEvent(new Event("change"));
  assert.equal(video.paused, true);
  dispose();
});

test("detached WebGL media uses its visible frame and removes lifecycle listeners", (t) => {
  const { observers, document, window, motion } = setup(t);
  const frame = {};
  const states = [];
  const dispose = observeVisibility(frame, (active) => states.push(active));
  assert.equal(observers[0].target, frame);
  observers[0].setVisible(true);
  assert.deepEqual(states, [false, true]);
  dispose();
  document.dispatchEvent(new Event("visibilitychange"));
  window.dispatchEvent(new Event("pagehide"));
  window.dispatchEvent(new Event("pageshow"));
  motion.dispatchEvent(new Event("change"));
  assert.deepEqual(states, [false, true]);
});


test("nearby media preloads without playing outside the viewport", (t) => {
  const { observers } = setup(t);
  const video = new Video();
  video.preload = "none";
  let loads = 0;
  video.load = () => loads++;
  const dispose = manageVideoPlayback(video);
  observers[0].setVisible(true);
  assert.equal(loads, 1);
  assert.equal(video.playCount, 0);
  observers[1].setVisible(true);
  assert.equal(video.playCount, 1);
  observers[1].setVisible(false);
  assert.equal(video.paused, true);
  dispose();
  assert.ok(observers.every(observer => observer.disconnected));
});


test("a touch retries rejected autoplay and cleanup removes the retry", async (t) => {
  const { observers, document } = setup(t);
  const video = new Video();
  video.play = () => {
    video.playCount++;
    return Promise.reject(new Error("NotAllowedError"));
  };
  const dispose = manageVideoPlayback(video);
  observers[1].setVisible(true);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(video.dataset.autoplayBlocked, "true");
  video.play = () => { video.playCount++; video.paused = false; return Promise.resolve(); };
  document.dispatchEvent(new Event("touchend"));
  await Promise.resolve();
  assert.equal(video.paused, false);
  dispose();
  const calls = video.playCount;
  document.dispatchEvent(new Event("touchend"));
  assert.equal(video.playCount, calls);
});


test("visible video requests playback before the first frame is ready", (t) => {
  const { observers } = setup(t);
  const video = new Video();
  video.readyState = 0;
  video.preload = "none";
  video.load = () => {};
  const dispose = manageVideoPlayback(video);
  observers[1].setVisible(true);
  assert.equal(video.playCount, 1);
  dispose();
});
