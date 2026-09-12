import assert from "node:assert/strict";
import test from "node:test";
import { build } from "vite";

test("production includes every page and runtime-referenced home media", async () => {
  const result = await build({
    logLevel: "silent",
    build: { write: false, reportCompressedSize: false },
  });
  const output = result.output;
  const cv = output.find((entry) => entry.fileName === "assets/cv/troyanov-cv.pdf");
  assert.ok(cv, "CV must be available at its permanent public URL");
  assert.equal(Buffer.from(cv.source).subarray(0, 5).toString(), "%PDF-", "CV URL must contain a PDF, not an HTML fallback");
  for (const [file, marker] of [
    ["index.html", 'id="root"'],
    ["artifact.html", 'class="artifact-page"'],
    ["ai-producer.html", 'class="ai-producer-page"'],
  ]) {
    const page = output.find((entry) => entry.fileName === file);
    assert.ok(page, `${file} must be emitted as a page`);
    assert.ok(page.source.includes(marker), `${file} must keep its own content`);
  }

  const names = output.filter((entry) => entry.type === "asset").flatMap((entry) => entry.names);
  for (const name of [
    "hero-portrait.mp4", "artifact-screen-source30.mp4", "ai-producer-screen-web.mp4", "ai-producer-screen-poster.jpg", "taya-screen-web.mp4",
    "troyanov-cv.pdf",
    "painting.mp4", "grill.mp4", "camera.mp4", "guitar.mp4", "statue.mp4", "bridge.mp4",
    "sea.mp4", "waves.mp4", "laptop.mp4", "bones.mp4", "river.mp4", "daw.mp4",
    "window.mp4", "museum.mp4", "forest.mp4", "portrait.jpg",
    "figma-home-shot-wide@2x.webp", "figma-home-shot-portrait-a@2x.webp",
    "figma-home-shot-portrait-b@2x.webp", "figma-home-shot-ui@2x.webp",
  ]) {
    assert.ok(names.includes(name), `${name} must be bundled, not left as a development URL`);
  }
  for (const name of ["artifact-screen.mp4", "artifact-screen-web.mp4", "artifact-screen-web30.mp4", "artifact-screen-smooth60.mp4", "ai-producer-screen.mp4", "taya-screen.mp4"]) {
    assert.ok(!names.includes(name), `${name} original must not be shipped`);
  }
});
