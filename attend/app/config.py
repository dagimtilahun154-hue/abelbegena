"""Runtime settings for the face attendance backend."""

from __future__ import annotations

import os
from dataclasses import dataclass


def _float_env(name: str, default: float) -> float:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default
    try:
        return float(raw_value)
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    """Typed application settings loaded from environment variables."""

    app_name: str = "Abel Begena Face Attendance API"
    cors_origins: tuple[str, ...] = ("*",)
    detector_model: str = os.getenv("FACE_DETECTOR_MODEL", "hog")
    encoding_model: str = os.getenv("FACE_ENCODING_MODEL", "large")
    encoding_jitters: int = int(os.getenv("FACE_ENCODING_JITTERS", "1"))
    euclidean_threshold: float = _float_env("FACE_EUCLIDEAN_THRESHOLD", 0.6)
    cosine_threshold: float = _float_env("FACE_COSINE_THRESHOLD", 0.8)
    min_face_size_px: int = int(os.getenv("FACE_MIN_SIZE_PX", "80"))
    low_contrast_threshold: float = _float_env("FACE_LOW_CONTRAST_THRESHOLD", 42.0)
    dim_light_threshold: float = _float_env("FACE_DIM_LIGHT_THRESHOLD", 60.0)
    bright_light_threshold: float = _float_env("FACE_BRIGHT_LIGHT_THRESHOLD", 205.0)


settings = Settings()

