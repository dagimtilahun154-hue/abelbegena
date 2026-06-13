"""Application factory for the strict FastAPI attendance backend."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .face_engine import FaceEngine
from .repositories import InMemoryFaceRepository
from .routes import create_router


face_engine = FaceEngine(settings)
repository = InMemoryFaceRepository()

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Strict vector-threshold face attendance backend. No raw face images are stored.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(create_router(face_engine=face_engine, repository=repository))

