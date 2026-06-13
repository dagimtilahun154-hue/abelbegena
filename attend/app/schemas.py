"""Pydantic request and response schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class Base64ImageRequest(BaseModel):
    """JSON body for base64 camera frames."""

    image: str = Field(..., min_length=1, description="Base64 image or data URL")


class EnrollBase64Request(Base64ImageRequest):
    """JSON body used by compatibility enrollment clients."""

    user_id: str | None = None
    id: str | None = None
    name: str | None = None
    instrument: str | None = None
    phone: str | None = None


class EnrollResponse(BaseModel):
    """Response returned after a user embedding is enrolled."""

    status: Literal["success"] = "success"
    message: str
    user_id: str
    embedding_dimensions: int


class VerifyResponse(BaseModel):
    """Response returned after strict face verification succeeds."""

    status: Literal["verified"] = "verified"
    user_id: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    distance: float = Field(..., ge=0.0)
    timestamp: datetime


class HealthResponse(BaseModel):
    """Small health payload for readiness checks."""

    status: Literal["ok"] = "ok"
    engine: str
    embedding_dimensions: int
    enrolled_users: int
    euclidean_threshold: float
    cosine_threshold: float

