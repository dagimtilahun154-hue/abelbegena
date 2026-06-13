"""Repository interfaces and test-friendly in-memory persistence."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta, timezone
from typing import Any, Protocol

try:  # pragma: no cover - exercised only when SQLAlchemy is installed.
    from sqlalchemy import DateTime, String, UniqueConstraint, select
    from sqlalchemy.dialects.postgresql import JSONB
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
    from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

    try:
        from pgvector.sqlalchemy import Vector
    except Exception:
        Vector = None  # type: ignore[assignment]

    SQLALCHEMY_AVAILABLE = True
except Exception:  # pragma: no cover - lets in-memory mode run without database packages.
    AsyncSession = Any  # type: ignore[misc, assignment]
    async_sessionmaker = Any  # type: ignore[misc, assignment]
    SQLALCHEMY_AVAILABLE = False


@dataclass(slots=True)
class FaceEmbeddingRecord:
    """A stored biometric template mapped to a user id."""

    user_id: str
    embedding: list[float]
    created_at: datetime
    updated_at: datetime
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass(slots=True)
class AttendanceRecord:
    """A single verified attendance event."""

    user_id: str
    timestamp: datetime
    confidence: float
    distance: float


class FaceRepository(Protocol):
    """Storage contract used by the API and face engine."""

    async def upsert_embedding(
        self,
        user_id: str,
        embedding: list[float],
        metadata: dict[str, str] | None = None,
    ) -> FaceEmbeddingRecord:
        """Create or replace a user's biometric embedding."""

    async def delete_embedding(self, user_id: str) -> bool:
        """Delete a user's biometric embedding."""

    async def list_embeddings(self) -> list[FaceEmbeddingRecord]:
        """Return all currently enrolled user embeddings."""

    async def get_embedding(self, user_id: str) -> FaceEmbeddingRecord | None:
        """Return one enrolled embedding by user id."""

    async def log_attendance(
        self,
        user_id: str,
        confidence: float,
        distance: float,
        timestamp: datetime | None = None,
    ) -> AttendanceRecord:
        """Persist a verified attendance event."""

    async def list_attendance(self, day: date | None = None) -> list[AttendanceRecord]:
        """Return attendance events, optionally filtered to one day."""


class InMemoryFaceRepository:
    """Immediate-test repository backed by process memory only."""

    def __init__(self) -> None:
        self._embeddings: dict[str, FaceEmbeddingRecord] = {}
        self._attendance: list[AttendanceRecord] = []

    async def upsert_embedding(
        self,
        user_id: str,
        embedding: list[float],
        metadata: dict[str, str] | None = None,
    ) -> FaceEmbeddingRecord:
        now = datetime.now(timezone.utc)
        existing = self._embeddings.get(user_id)
        record = FaceEmbeddingRecord(
            user_id=user_id,
            embedding=embedding,
            created_at=existing.created_at if existing else now,
            updated_at=now,
            metadata=metadata or (existing.metadata if existing else {}),
        )
        self._embeddings[user_id] = record
        return record

    async def delete_embedding(self, user_id: str) -> bool:
        return self._embeddings.pop(user_id, None) is not None

    async def list_embeddings(self) -> list[FaceEmbeddingRecord]:
        return list(self._embeddings.values())

    async def get_embedding(self, user_id: str) -> FaceEmbeddingRecord | None:
        return self._embeddings.get(user_id)

    async def log_attendance(
        self,
        user_id: str,
        confidence: float,
        distance: float,
        timestamp: datetime | None = None,
    ) -> AttendanceRecord:
        record = AttendanceRecord(
            user_id=user_id,
            timestamp=timestamp or datetime.now(timezone.utc),
            confidence=confidence,
            distance=distance,
        )
        self._attendance.append(record)
        return record

    async def list_attendance(self, day: date | None = None) -> list[AttendanceRecord]:
        if day is None:
            return list(self._attendance)
        return [record for record in self._attendance if record.timestamp.date() == day]


if SQLALCHEMY_AVAILABLE:

    class Base(DeclarativeBase):
        """SQLAlchemy base for PostgreSQL-backed deployments."""


    class FaceEmbeddingModel(Base):
        """PostgreSQL/pgvector-ready schema for production storage."""

        __tablename__ = "face_embeddings"
        __table_args__ = (UniqueConstraint("user_id", name="uq_face_embeddings_user_id"),)

        id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
        user_id: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
        embedding: Mapped[list[float]] = mapped_column(Vector(128) if Vector else JSONB, nullable=False)
        profile_metadata: Mapped[dict[str, str]] = mapped_column(JSONB, default=dict, nullable=False)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
        updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


    class AttendanceModel(Base):
        """SQLAlchemy schema for attendance logs."""

        __tablename__ = "attendance_logs"

        id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
        user_id: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
        confidence: Mapped[float] = mapped_column(nullable=False)
        distance: Mapped[float] = mapped_column(nullable=False)
        timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)

else:

    class Base:
        """Placeholder used when SQLAlchemy is not installed in in-memory mode."""


    class FaceEmbeddingModel:
        """Placeholder used when SQLAlchemy is not installed in in-memory mode."""


    class AttendanceModel:
        """Placeholder used when SQLAlchemy is not installed in in-memory mode."""


class SQLAlchemyFaceRepository:
    """Async SQLAlchemy repository skeleton for PostgreSQL/pgvector deployments."""

    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        if not SQLALCHEMY_AVAILABLE:
            raise RuntimeError("SQLAlchemy is not installed. Use InMemoryFaceRepository or install database extras.")
        self._session_factory = session_factory

    async def upsert_embedding(
        self,
        user_id: str,
        embedding: list[float],
        metadata: dict[str, str] | None = None,
    ) -> FaceEmbeddingRecord:
        now = datetime.now(timezone.utc)
        async with self._session_factory() as session:
            result = await session.execute(
                select(FaceEmbeddingModel).where(FaceEmbeddingModel.user_id == user_id)
            )
            model = result.scalar_one_or_none()
            if model is None:
                model = FaceEmbeddingModel(
                    user_id=user_id,
                    embedding=embedding,
                    profile_metadata=metadata or {},
                    created_at=now,
                    updated_at=now,
                )
                session.add(model)
            else:
                model.embedding = embedding
                model.profile_metadata = metadata or model.profile_metadata or {}
                model.updated_at = now

            await session.commit()
            await session.refresh(model)
            return _embedding_model_to_record(model)

    async def delete_embedding(self, user_id: str) -> bool:
        async with self._session_factory() as session:
            result = await session.execute(
                select(FaceEmbeddingModel).where(FaceEmbeddingModel.user_id == user_id)
            )
            model = result.scalar_one_or_none()
            if model is None:
                return False
            await session.delete(model)
            await session.commit()
            return True

    async def list_embeddings(self) -> list[FaceEmbeddingRecord]:
        async with self._session_factory() as session:
            result = await session.execute(select(FaceEmbeddingModel))
            return [_embedding_model_to_record(model) for model in result.scalars().all()]

    async def get_embedding(self, user_id: str) -> FaceEmbeddingRecord | None:
        async with self._session_factory() as session:
            result = await session.execute(
                select(FaceEmbeddingModel).where(FaceEmbeddingModel.user_id == user_id)
            )
            model = result.scalar_one_or_none()
            return _embedding_model_to_record(model) if model else None

    async def log_attendance(
        self,
        user_id: str,
        confidence: float,
        distance: float,
        timestamp: datetime | None = None,
    ) -> AttendanceRecord:
        event_time = timestamp or datetime.now(timezone.utc)
        async with self._session_factory() as session:
            model = AttendanceModel(
                user_id=user_id,
                confidence=confidence,
                distance=distance,
                timestamp=event_time,
            )
            session.add(model)
            await session.commit()
            return AttendanceRecord(
                user_id=user_id,
                confidence=confidence,
                distance=distance,
                timestamp=event_time,
            )

    async def list_attendance(self, day: date | None = None) -> list[AttendanceRecord]:
        async with self._session_factory() as session:
            statement = select(AttendanceModel)
            if day is not None:
                start = datetime.combine(day, time.min, tzinfo=timezone.utc)
                end = start + timedelta(days=1)
                statement = statement.where(
                    AttendanceModel.timestamp >= start,
                    AttendanceModel.timestamp < end,
                )
            result = await session.execute(statement)
            return [
                AttendanceRecord(
                    user_id=model.user_id,
                    timestamp=model.timestamp,
                    confidence=model.confidence,
                    distance=model.distance,
                )
                for model in result.scalars().all()
            ]


def _embedding_model_to_record(model: FaceEmbeddingModel) -> FaceEmbeddingRecord:
    return FaceEmbeddingRecord(
        user_id=model.user_id,
        embedding=[float(value) for value in model.embedding],
        created_at=model.created_at,
        updated_at=model.updated_at,
        metadata=dict(model.profile_metadata or {}),
    )
