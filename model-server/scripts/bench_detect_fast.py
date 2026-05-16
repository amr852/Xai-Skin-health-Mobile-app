"""Phase 1.7 — p50 latency probe for /detect-fast on the dev box.

Runs N iterations of the real ``lesion_detector.detect`` against a synthetic
320px frame, warms the model once, and prints p50 / p95 / count. No Flask
client overhead — the route's serialization adds <1ms vs. raw inference, so
this is the right floor measurement.

Usage:
    python -m scripts.bench_detect_fast
    (run from model-server/ with .venv active)
"""

from __future__ import annotations

import statistics
import time

import cv2
import numpy as np

from services.detector import lesion_detector


def synthetic_frame(side: int = 320) -> np.ndarray:
    rng = np.random.default_rng(0)
    return rng.integers(0, 255, size=(side, side, 3), dtype=np.uint8)


def main(iters: int = 30, side: int = 320) -> None:
    frame = synthetic_frame(side)
    lesion_detector.detect(frame)  # warmup

    samples_ms: list[float] = []
    for _ in range(iters):
        t0 = time.perf_counter()
        lesion_detector.detect(frame)
        samples_ms.append((time.perf_counter() - t0) * 1000.0)

    p50 = statistics.median(samples_ms)
    p95 = sorted(samples_ms)[int(0.95 * len(samples_ms)) - 1]
    print(f"iters={iters} side={side}px")
    print(f"p50 = {p50:.1f} ms")
    print(f"p95 = {p95:.1f} ms")
    print(f"min = {min(samples_ms):.1f} ms  max = {max(samples_ms):.1f} ms")


if __name__ == "__main__":
    main()
