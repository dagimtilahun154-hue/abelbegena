"""Strict face embedding and matching service."""

from __future__ import annotations

import base64
import binascii
from dataclasses import dataclass
from typing import Iterable, Protocol

import cv2
import face_recognition
import numpy as np

from .config import Settings

class FaceEngineError(Exception):
    """Base exception raised by the face engine."""


class CorruptImageError(FaceEngineError):
    """Raised when uploaded image bytes cannot be decoded."""


class FaceCountError(FaceEngineError):
    """Raised when an image has zero or more than one face."""

    def __init__(self, count: int) -> None:
        self.count = count
        super().__init__(f"Expected exactly one face, found {count}.")


class EmbeddingExtractionError(FaceEngineError):
    """Raised when dlib cannot produce a face embedding."""


class UnknownFaceError(FaceEngineError):
    """Raised when the closest vector fails strict thresholds."""


@dataclass(slots=True)
class FaceBox:
    """Pixel-space bounding box used by existing webcam overlays."""

    x: int
    y: int
    w: int
    h: int

    @classmethod
    def from_face_recognition(cls, location: tuple[int, int, int, int]) -> "FaceBox":
        top, right, bottom, left = location
        return cls(x=int(left), y=int(top), w=int(right - left), h=int(bottom - top))

    def as_dict(self) -> dict[str, int]:
        return {"x": self.x, "y": self.y, "w": self.w, "h": self.h}


@dataclass(slots=True)
class FaceAnalysis:
    """Face detection and image quality facts."""

    face_count: int
    image_width: int
    image_height: int
    face_box: FaceBox | None
    lighting_normalized: bool
    contrast: float
    brightness: float
    embedding: np.ndarray | None = None


@dataclass(slots=True)
class MatchResult:
    """A threshold-approved identity match."""

    user_id: str
    distance: float
    cosine_similarity: float
    confidence: float


class StoredEmbedding(Protocol):
    """Minimum repository record shape required for vector matching."""

    user_id: str
    embedding: list[float]


class FaceEngine:
    """Owns image preprocessing, dlib embeddings, and strict vector matching."""

    embedding_dimensions = 128

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def decode_upload(self, image_bytes: bytes) -> np.ndarray:
        """Decode an uploaded image into a BGR OpenCV frame."""
        if not image_bytes:
            raise CorruptImageError("Empty image upload.")

        buffer = np.frombuffer(image_bytes, dtype=np.uint8)
        frame = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
        if frame is None or frame.size == 0:
            raise CorruptImageError("Image upload is corrupt or unsupported.")
        return frame

    def decode_base64(self, image: str) -> np.ndarray:
        """Decode a base64 data URL or raw base64 image into a BGR frame."""
        try:
            encoded = image.split(",", 1)[1] if "," in image else image
            return self.decode_upload(base64.b64decode(encoded, validate=True))
        except (binascii.Error, ValueError) as exc:
            raise CorruptImageError("Base64 image is corrupt or unsupported.") from exc

    def analyze(self, frame: np.ndarray, require_embedding: bool = False) -> FaceAnalysis:
        """Detect faces and optionally extract a single embedding."""
        working_frame, lighting_normalized, gray = self._preprocess(frame)
        rgb = cv2.cvtColor(working_frame, cv2.COLOR_BGR2RGB)
        locations = face_recognition.face_locations(rgb, model=self.settings.detector_model)
        face_box = FaceBox.from_face_recognition(locations[0]) if locations else None

        analysis = FaceAnalysis(
            face_count=len(locations),
            image_width=int(frame.shape[1]),
            image_height=int(frame.shape[0]),
            face_box=face_box,
            lighting_normalized=lighting_normalized,
            contrast=float(np.std(gray)),
            brightness=float(np.mean(gray)),
        )

        if not require_embedding:
            return analysis

        if len(locations) != 1:
            raise FaceCountError(len(locations))

        if face_box and min(face_box.w, face_box.h) < self.settings.min_face_size_px:
            raise EmbeddingExtractionError("Face is too small for reliable embedding extraction.")

        landmarks = face_recognition.face_landmarks(rgb, face_locations=locations)
        if len(landmarks) != 1:
            raise EmbeddingExtractionError("Face landmarks could not be extracted.")

        encodings = face_recognition.face_encodings(
            rgb,
            known_face_locations=locations,
            num_jitters=self.settings.encoding_jitters,
            model=self.settings.encoding_model,
        )
        if len(encodings) != 1:
            raise EmbeddingExtractionError("Face embedding could not be extracted.")

        analysis.embedding = np.asarray(encodings[0], dtype=np.float32)
        return analysis

    def extract_single_embedding(self, frame: np.ndarray) -> FaceAnalysis:
        """Return a single-face analysis with a populated 128D embedding."""
        return self.analyze(frame, require_embedding=True)

    def identify(
        self,
        probe_embedding: np.ndarray,
        enrolled_records: Iterable[StoredEmbedding],
    ) -> MatchResult:
        """Return the best match only when it passes strict vector thresholds."""
        candidates = list(enrolled_records)
        if not candidates:
            raise UnknownFaceError("Unknown Face Detected")

        probe = np.asarray(probe_embedding, dtype=np.float32).flatten()
        if probe.size != self.embedding_dimensions:
            raise EmbeddingExtractionError("Unexpected embedding dimensions.")

        best_record: FaceEmbeddingRecord | None = None
        best_distance = float("inf")
        best_cosine = -1.0

        for record in candidates:
            stored = np.asarray(record.embedding, dtype=np.float32).flatten()
            if stored.size != probe.size:
                continue
            distance = self.euclidean_distance(probe, stored)
            cosine = self.cosine_similarity(probe, stored)
            if distance < best_distance:
                best_record = record
                best_distance = distance
                best_cosine = cosine

        if best_record is None:
            raise UnknownFaceError("Unknown Face Detected")

        if (
            best_distance > self.settings.euclidean_threshold
            or best_cosine < self.settings.cosine_threshold
        ):
            raise UnknownFaceError("Unknown Face Detected")

        return MatchResult(
            user_id=best_record.user_id,
            distance=round(best_distance, 6),
            cosine_similarity=round(best_cosine, 6),
            confidence=round(max(0.0, min(1.0, best_cosine)), 4),
        )

    @staticmethod
    def euclidean_distance(a: np.ndarray, b: np.ndarray) -> float:
        """Compute L2 distance between two face embeddings."""
        return float(np.linalg.norm(a - b))

    @staticmethod
    def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
        """Compute cosine similarity between two face embeddings."""
        denom = float(np.linalg.norm(a) * np.linalg.norm(b))
        if denom <= 1e-12:
            return 0.0
        return float(np.dot(a, b) / denom)

    def _preprocess(self, frame: np.ndarray) -> tuple[np.ndarray, bool, np.ndarray]:
        """Normalize lighting while preserving a color frame for dlib."""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        brightness = float(np.mean(gray))
        contrast = float(np.std(gray))
        should_normalize = (
            contrast < self.settings.low_contrast_threshold
            or brightness < self.settings.dim_light_threshold
            or brightness > self.settings.bright_light_threshold
        )

        if not should_normalize:
            return frame, False, gray

        ycrcb = cv2.cvtColor(frame, cv2.COLOR_BGR2YCrCb)
        y, cr, cb = cv2.split(ycrcb)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        normalized_y = clahe.apply(y)
        normalized = cv2.merge((normalized_y, cr, cb))
        normalized_frame = cv2.cvtColor(normalized, cv2.COLOR_YCrCb2BGR)
        normalized_gray = cv2.equalizeHist(cv2.cvtColor(normalized_frame, cv2.COLOR_BGR2GRAY))
        return normalized_frame, True, normalized_gray
