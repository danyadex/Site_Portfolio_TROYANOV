importScripts("./assets/vendor/mediapipe/vision_bundle.js");

const { FilesetResolver, ImageSegmenter } = self.Vision;

const MODEL_PATH = "./assets/models/selfie_segmenter_landscape.tflite";
const WASM_PATH = new URL("./assets/vendor/mediapipe/wasm", self.location.href).href;

let segmenter;
let initializing;

async function initialize() {
  if (segmenter) return;
  if (initializing) return initializing;

  initializing = (async () => {
    const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
    segmenter = await ImageSegmenter.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_PATH,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      outputCategoryMask: true,
      outputConfidenceMasks: false,
    });
    self.postMessage({ type: "READY" });
  })();

  try {
    await initializing;
  } finally {
    initializing = undefined;
  }
}

function closeResult(result) {
  result.categoryMask?.close();
  result.confidenceMasks?.forEach((mask) => mask.close());
}

self.addEventListener("message", async (event) => {
  const { type } = event.data;

  if (type === "INIT") {
    try {
      await initialize();
    } catch (error) {
      self.postMessage({ type: "ERROR", message: error instanceof Error ? error.message : "Не удалось загрузить AI-модель" });
    }
    return;
  }

  if (type !== "SEGMENT" || !event.data.bitmap) return;

  const { bitmap, timestampMs } = event.data;

  try {
    await initialize();
    segmenter.segmentForVideo(bitmap, timestampMs, (result) => {
      try {
        const categoryMask = result.categoryMask;
        if (!categoryMask) throw new Error("AI-модель не вернула маску персонажа");

        const source = categoryMask.getAsUint8Array();
        const alpha = new Uint8ClampedArray(source.length);
        for (let index = 0; index < source.length; index += 1) {
          const isForeground = source[index] === 255;
          alpha[index] = isForeground ? 255 : 0;
        }

        self.postMessage(
          {
            type: "MASK",
            width: categoryMask.width,
            height: categoryMask.height,
            alpha: alpha.buffer,
          },
          [alpha.buffer],
        );
      } catch (error) {
        self.postMessage({ type: "ERROR", message: error instanceof Error ? error.message : "Не удалось обработать кадр" });
      } finally {
        bitmap.close();
        closeResult(result);
      }
    });
  } catch (error) {
    bitmap.close();
    self.postMessage({ type: "ERROR", message: error instanceof Error ? error.message : "Не удалось обработать кадр" });
  }
});
