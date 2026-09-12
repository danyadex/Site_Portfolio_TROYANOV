#!/usr/bin/env python3
"""Create a temporally stable head-and-neck alpha matte for a portrait video."""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from rembg import new_session, remove


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = PROJECT_ROOT / "assets" / "avatar" / "matte-output"
MODEL_CACHE = Path.home() / "Library" / "Caches" / "portfolio-avatar-models"
os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def video_info(path: Path) -> tuple[float, int, int]:
    capture = cv2.VideoCapture(str(path))
    if not capture.isOpened():
        raise RuntimeError(f"Не удалось открыть видео: {path}")
    fps = capture.get(cv2.CAP_PROP_FPS) or 24.0
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    capture.release()
    return fps, width, height


def extract_first_frame(video: Path, destination: Path) -> np.ndarray:
    capture = cv2.VideoCapture(str(video))
    ok, frame = capture.read()
    capture.release()
    if not ok:
        raise RuntimeError("Не удалось прочитать первый кадр")
    cv2.imwrite(str(destination), frame)
    return frame


def head_neck_gate(height: int, width: int) -> np.ndarray:
    """Keep the neural contour intact and only remove the lower torso."""
    gate = np.zeros((height, width), dtype=np.uint8)
    gate[: int(height * 0.73), :] = 255
    points = np.array(
        [
            [0, int(height * 0.72)],
            [width - 1, int(height * 0.72)],
            [width - 1, int(height * 0.86)],
            [int(width * 0.68), int(height * 0.86)],
            [int(width * 0.62), int(height * 0.91)],
            [int(width * 0.38), int(height * 0.91)],
            [int(width * 0.32), int(height * 0.86)],
            [0, int(height * 0.86)],
        ],
        dtype=np.int32,
    )
    cv2.fillPoly(gate, [points], 255)
    return cv2.GaussianBlur(gate, (0, 0), 8.0)


def make_initial_mask(frame_path: Path, mask_path: Path) -> None:
    os.environ.setdefault("U2NET_HOME", str(MODEL_CACHE / "rembg"))
    source = Image.open(frame_path).convert("RGBA")
    session = new_session("isnet-general-use", providers=["CPUExecutionProvider"])
    result = remove(
        source,
        session=session,
        alpha_matting=True,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=12,
        alpha_matting_erode_size=8,
    )
    alpha = np.asarray(result)[:, :, 3]
    gate = head_neck_gate(*alpha.shape)
    alpha = cv2.multiply(alpha.astype(np.float32), gate.astype(np.float32) / 255.0)
    alpha = cv2.morphologyEx(alpha, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    alpha[alpha < 4] = 0
    cv2.imwrite(str(mask_path), alpha)


def polish_alpha_sequence(sequence_dir: Path) -> None:
    """Suppress one-frame shimmer without redrawing the model's silhouette."""
    paths = sorted(sequence_dir.glob("*.png"))
    if not paths:
        raise RuntimeError(f"Пустая альфа-последовательность: {sequence_dir}")

    for index, path in enumerate(paths):
        neighbors = paths[max(0, index - 1) : min(len(paths), index + 2)]
        stack = [cv2.imread(str(item), cv2.IMREAD_GRAYSCALE) for item in neighbors]
        alpha = np.median(np.stack(stack), axis=0).astype(np.uint8)
        height, width = alpha.shape

        # The portrait already ends around the upper chest. Fade only the very
        # bottom so the neck remains natural instead of forming a polygonal cut.
        fade_start = int(height * 0.84)
        fade_end = int(height * 0.92)
        fade = np.ones((height, 1), dtype=np.float32)
        ramp = np.linspace(0.0, 1.0, fade_end - fade_start, dtype=np.float32)
        fade[fade_start:fade_end, 0] = 0.5 + 0.5 * np.cos(np.pi * ramp)
        fade[fade_end:, 0] = 0.0
        alpha = (alpha.astype(np.float32) * fade).astype(np.uint8)

        # Remove isolated near-transparent noise while preserving fine hair.
        alpha[alpha < 6] = 0
        cv2.imwrite(str(path), alpha)


def export_alpha_video(
    source: Path,
    alpha_sequence: Path,
    output_dir: Path,
    fps: float,
) -> tuple[Path, Path, Path]:
    master = output_dir / "avatar-matte-master.mov"
    web = output_dir / "avatar-matte-web.webm"
    preview = output_dir / "avatar-matte-preview.mp4"
    alpha_pattern = str(alpha_sequence / "%05d.png")

    filter_graph = "[0:v]format=rgb24[src];[1:v]format=gray[a];[src][a]alphamerge"
    common = [
        "ffmpeg",
        "-y",
        "-v",
        "error",
        "-i",
        str(source),
        "-framerate",
        f"{fps:.6f}",
        "-i",
        alpha_pattern,
        "-filter_complex",
        filter_graph,
        "-an",
    ]
    run(common + ["-c:v", "prores_ks", "-profile:v", "4", "-pix_fmt", "yuva444p10le", str(master)])
    run(
        common
        + [
            "-c:v",
            "libvpx-vp9",
            "-pix_fmt",
            "yuva420p",
            "-b:v",
            "0",
            "-crf",
            "18",
            "-auto-alt-ref",
            "0",
            str(web),
        ]
    )
    run(
        [
            "ffmpeg",
            "-y",
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            "color=c=0x121418:s=720x1280:r=24",
            "-i",
            str(master),
            "-filter_complex",
            "[0:v][1:v]overlay=shortest=1:format=auto",
            "-c:v",
            "libx264",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            str(preview),
        ]
    )
    return master, web, preview


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--keep-frames", action="store_true")
    args = parser.parse_args()

    source = args.input.expanduser().resolve()
    if not source.exists():
        raise FileNotFoundError(source)

    output_dir = args.output.expanduser().resolve()
    work_dir = output_dir / "work"
    if work_dir.exists():
        shutil.rmtree(work_dir)
    work_dir.mkdir(parents=True)

    fps, width, height = video_info(source)
    print(f"1/4  Первый кадр: {width}x{height}, {fps:.2f} fps", flush=True)
    frame_path = work_dir / "first-frame.png"
    mask_path = work_dir / "first-frame-mask.png"
    extract_first_frame(source, frame_path)

    print("2/4  Создаю стартовую маску головы и шеи", flush=True)
    make_initial_mask(frame_path, mask_path)

    print("3/4  MatAnyone ведёт маску по всему ролику", flush=True)
    os.environ.setdefault("HF_HOME", str(MODEL_CACHE / "huggingface"))
    from matanyone import InferenceCore

    processor = InferenceCore("PeiqingYang/MatAnyone")
    processor.process_video(
        input_path=str(source),
        mask_path=str(mask_path),
        output_path=str(work_dir),
        n_warmup=8,
        r_erode=4,
        r_dilate=4,
        save_image=True,
        max_size=720,
    )

    sequence_dir = work_dir / source.stem / "pha"
    if not sequence_dir.exists():
        raise RuntimeError(f"MatAnyone не создал альфа-кадры: {sequence_dir}")
    polish_alpha_sequence(sequence_dir)

    print("4/4  Собираю MOV, WebM и контрольное превью", flush=True)
    master, web, preview = export_alpha_video(source, sequence_dir, output_dir, fps)
    if not args.keep_frames:
        shutil.rmtree(work_dir)

    print("Готово:", flush=True)
    print(master, flush=True)
    print(web, flush=True)
    print(preview, flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Ошибка: {error}", file=sys.stderr, flush=True)
        raise
