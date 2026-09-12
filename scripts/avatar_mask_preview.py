#!/usr/bin/env python3
"""Generate a quick matte preview for the avatar source.

The final pass uses the same pipeline frame-by-frame; this helper keeps the
model and compositing parameters easy to inspect before the full export.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from rembg import new_session, remove


def segment(path: Path, session) -> np.ndarray:
    source = Image.open(path).convert("RGBA")
    result = remove(
        source,
        session=session,
        alpha_matting=True,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=12,
        alpha_matting_erode_size=8,
    )
    rgba = np.asarray(result)
    return rgba[:, :, 3]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    args.output.parent.mkdir(parents=True, exist_ok=True)
    session = new_session("isnet-general-use", providers=["CPUExecutionProvider"])
    alpha = segment(args.input, session)

    # Keep the full head and a controlled neck wedge; remove shoulders/chest.
    # This is deliberately a soft constraint on top of the model matte, not a
    # hard polygon painted over the hair. The model remains responsible for
    # hair/ear contours; the gate only limits the lower body.
    h, w = alpha.shape
    gate = np.zeros_like(alpha)
    gate[: int(h * 0.57), :] = 255
    points = np.array(
        [
            [int(w * 0.18), int(h * 0.56)],
            [int(w * 0.82), int(h * 0.56)],
            [int(w * 0.82), int(h * 0.62)],
            [int(w * 0.78), int(h * 0.67)],
            [int(w * 0.73), int(h * 0.71)],
            [int(w * 0.69), int(h * 0.74)],
            [int(w * 0.66), int(h * 0.77)],
            [int(w * 0.34), int(h * 0.77)],
            [int(w * 0.31), int(h * 0.74)],
            [int(w * 0.27), int(h * 0.71)],
            [int(w * 0.22), int(h * 0.67)],
            [int(w * 0.18), int(h * 0.62)],
        ],
        dtype=np.int32,
    )
    cv2.fillPoly(gate, [points], 255)
    gate = cv2.GaussianBlur(gate, (0, 0), 2.5)
    alpha = cv2.multiply(alpha.astype(np.float32), gate.astype(np.float32) / 255.0).astype(np.uint8)

    # Pull down the low-confidence fringe left by the light wall without
    # hard-clipping the actual hair edge.
    alpha = np.clip((alpha.astype(np.int16) - 14) * 255 / 241, 0, 255).astype(np.uint8)

    # Remove isolated matte specks while preserving hair detail.
    alpha = cv2.medianBlur(alpha, 3)
    rgba = cv2.cvtColor(cv2.imread(str(args.input), cv2.IMREAD_COLOR), cv2.COLOR_BGR2BGRA)
    rgba[:, :, 3] = alpha
    cv2.imwrite(str(args.output), rgba)


if __name__ == "__main__":
    main()
