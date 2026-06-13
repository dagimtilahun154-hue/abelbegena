"""FastAPI routes for strict enrollment and verification."""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status

from .face_engine import CorruptImageError, EmbeddingExtractionError, FaceCountError, FaceEngine, UnknownFaceError
from .repositories import FaceRepository
from .schemas import EnrollResponse, HealthResponse, VerifyResponse


def create_router(
    *,
    face_engine: FaceEngine,
    repository: FaceRepository,
) -> APIRouter:
    """Build an API router with injected services."""
    router = APIRouter()

    def get_face_engine() -> FaceEngine:
        return face_engine

    def get_repository() -> FaceRepository:
        return repository

    @router.post("/enroll", response_model=EnrollResponse)
    async def enroll(
        user_id: str = Form(...),
        file: UploadFile = File(...),
        engine: FaceEngine = Depends(get_face_engine),
        repo: FaceRepository = Depends(get_repository),
    ) -> EnrollResponse:
        """Register a user by storing only the extracted embedding vector."""
        clean_user_id = user_id.strip()
        if not clean_user_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="user_id is required.")

        frame = await _read_upload(file, engine)
        analysis = _extract_or_http_error(engine, frame)
        assert analysis.embedding is not None

        await repo.upsert_embedding(clean_user_id, analysis.embedding.astype(float).round(8).tolist())
        return EnrollResponse(
            message="Face enrolled successfully.",
            user_id=clean_user_id,
            embedding_dimensions=int(analysis.embedding.size),
        )

    @router.post("/attendance/verify", response_model=VerifyResponse)
    async def verify_attendance(
        request: Request,
        file: UploadFile | None = File(default=None),
        image: str | None = Form(default=None),
        engine: FaceEngine = Depends(get_face_engine),
        repo: FaceRepository = Depends(get_repository),
    ) -> VerifyResponse:
        """Verify a live frame and log attendance only after strict matching."""
        frame = await _read_image_from_request(request, engine, file, image)
        analysis = _extract_or_http_error(engine, frame)
        assert analysis.embedding is not None

        try:
            match = engine.identify(analysis.embedding, await repo.list_embeddings())
        except UnknownFaceError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unknown Face Detected",
            ) from None

        log = await repo.log_attendance(
            match.user_id,
            confidence=match.confidence,
            distance=match.distance,
            timestamp=datetime.now(timezone.utc),
        )
        return VerifyResponse(
            user_id=match.user_id,
            confidence=match.confidence,
            distance=match.distance,
            timestamp=log.timestamp,
        )

    @router.post("/register_student")
    async def register_student_compat(
        request: Request,
        engine: FaceEngine = Depends(get_face_engine),
        repo: FaceRepository = Depends(get_repository),
    ) -> dict[str, Any]:
        """Compatibility endpoint for the current React enrollment flow."""
        payload = await request.json()
        user_id = str(payload.get("id") or payload.get("user_id") or "").strip()
        if not user_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Student ID required.")

        frame = engine.decode_base64(str(payload.get("image") or ""))
        analysis = _extract_or_http_error(engine, frame)
        assert analysis.embedding is not None

        metadata = {
            key: str(payload.get(key) or "")
            for key in ("name", "instrument", "phone")
            if payload.get(key) is not None
        }
        await repo.upsert_embedding(user_id, analysis.embedding.astype(float).round(8).tolist(), metadata)
        return {
            "status": "success",
            "message": f"Registered: {metadata.get('name') or user_id}",
            "student": {"id": user_id, "student_id": user_id, **metadata},
        }

    @router.post("/process_frame")
    async def process_frame_compat(
        request: Request,
        engine: FaceEngine = Depends(get_face_engine),
        repo: FaceRepository = Depends(get_repository),
    ) -> dict[str, Any]:
        """Compatibility endpoint for scanner overlays and live matching."""
        payload = await request.json()
        try:
            frame = engine.decode_base64(str(payload.get("image") or ""))
        except CorruptImageError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No valid image provided.") from None

        analysis = engine.analyze(frame, require_embedding=False)
        enrolled_records = await repo.list_embeddings()
        response: dict[str, Any] = {
            "face_detected": analysis.face_count > 0,
            "eyes_detected": analysis.face_count == 1,
            "ready_to_capture": analysis.face_count == 1,
            "face_box": analysis.face_box.as_dict() if analysis.face_box else None,
            "matches": [],
            "guidance": _guidance_for_face_count(analysis.face_count),
            "iw": analysis.image_width,
            "ih": analysis.image_height,
            "lighting_ok": not analysis.lighting_normalized,
            "eye_biometric": {"enabled": False, "available": False, "quality": 0.0, "templates": 0, "match": None},
        }

        if analysis.face_count == 1 and analysis_requires_embedding(enrolled_records):
            try:
                match_analysis = engine.extract_single_embedding(frame)
                assert match_analysis.embedding is not None
                match = engine.identify(match_analysis.embedding, enrolled_records)
                student = await repo.get_embedding(match.user_id)
                metadata = student.metadata if student else {}
                response["matches"].append(
                    {
                        "id": match.user_id,
                        "student_id": match.user_id,
                        "name": metadata.get("name", match.user_id),
                        "instrument": metadata.get("instrument", ""),
                        "phone": metadata.get("phone", ""),
                        "confidence": round(match.confidence * 100),
                        "distance": match.distance,
                        "method": "strict-vector",
                    }
                )
            except UnknownFaceError:
                response["guidance"] = "Unknown face"
            except EmbeddingExtractionError:
                response["guidance"] = "Hold still"

        return response

    @router.post("/mark_attendance")
    async def mark_attendance_compat(
        request: Request,
        repo: FaceRepository = Depends(get_repository),
    ) -> dict[str, Any]:
        """Compatibility endpoint for the current React attendance logger."""
        payload = await request.json()
        user_id = str(payload.get("id") or payload.get("user_id") or "").strip()
        if not user_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Student ID missing.")

        record = await repo.get_embedding(user_id)
        if record is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

        today = date.today()
        existing = [
            item for item in await repo.list_attendance(today)
            if item.user_id == user_id
        ]
        student = {
            "id": record.user_id,
            "student_id": record.user_id,
            "name": record.metadata.get("name", record.user_id),
            "instrument": record.metadata.get("instrument", ""),
            "phone": record.metadata.get("phone", ""),
        }

        if existing:
            return {
                "status": "already_marked",
                "message": f"{student['name']} is already marked present today",
                "student": student,
            }

        await repo.log_attendance(user_id, confidence=1.0, distance=0.0)
        return {
            "status": "success",
            "message": f"Attendance marked for {student['name']}",
            "student": student,
        }

    @router.post("/delete_student")
    async def delete_student_compat(
        request: Request,
        repo: FaceRepository = Depends(get_repository),
    ) -> dict[str, Any]:
        """Compatibility endpoint to delete an enrolled vector."""
        payload = await request.json()
        user_id = str(payload.get("id") or payload.get("user_id") or "").strip()
        if not user_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Student ID required.")
        deleted = await repo.delete_embedding(user_id)
        return {
            "status": "success" if deleted else "error",
            "message": "Student vector deleted." if deleted else "Student not found.",
            "deleted_faces": 0,
        }

    @router.get("/students")
    async def list_students_compat(repo: FaceRepository = Depends(get_repository)) -> dict[str, dict[str, str]]:
        """Return enrolled users in the shape the current UI expects."""
        students: dict[str, dict[str, str]] = {}
        for record in await repo.list_embeddings():
            students[record.user_id] = {
                "id": record.user_id,
                "name": record.metadata.get("name", record.user_id),
                "instrument": record.metadata.get("instrument", ""),
                "phone": record.metadata.get("phone", ""),
            }
        return students

    @router.get("/today_attendance")
    async def today_attendance_compat(repo: FaceRepository = Depends(get_repository)) -> list[dict[str, str]]:
        """Return today's attendance in the existing dashboard format."""
        rows: list[dict[str, str]] = []
        embeddings = {record.user_id: record for record in await repo.list_embeddings()}
        for item in await repo.list_attendance(date.today()):
            student = embeddings.get(item.user_id)
            metadata = student.metadata if student else {}
            rows.append(
                {
                    "Name": metadata.get("name", item.user_id),
                    "ID": item.user_id,
                    "Instrument": metadata.get("instrument", ""),
                    "Time": item.timestamp.strftime("%H:%M:%S"),
                }
            )
        return rows

    @router.get("/recognition_health", response_model=HealthResponse)
    async def recognition_health(
        engine: FaceEngine = Depends(get_face_engine),
        repo: FaceRepository = Depends(get_repository),
    ) -> HealthResponse:
        """Report strict engine readiness."""
        return HealthResponse(
            engine="face_recognition/dlib",
            embedding_dimensions=engine.embedding_dimensions,
            enrolled_users=len(await repo.list_embeddings()),
            euclidean_threshold=engine.settings.euclidean_threshold,
            cosine_threshold=engine.settings.cosine_threshold,
        )

    @router.get("/health", response_model=HealthResponse)
    async def health(
        engine: FaceEngine = Depends(get_face_engine),
        repo: FaceRepository = Depends(get_repository),
    ) -> HealthResponse:
        """Alias for service health checks."""
        return await recognition_health(engine, repo)

    return router


async def _read_upload(file: UploadFile, engine: FaceEngine) -> Any:
    try:
        return engine.decode_upload(await file.read())
    except CorruptImageError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


async def _read_image_from_request(
    request: Request,
    engine: FaceEngine,
    file: UploadFile | None,
    image: str | None,
) -> Any:
    if file is not None:
        return await _read_upload(file, engine)

    if image:
        try:
            return engine.decode_base64(image)
        except CorruptImageError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if request.headers.get("content-type", "").startswith("application/json"):
        payload = await request.json()
        try:
            return engine.decode_base64(str(payload.get("image") or ""))
        except CorruptImageError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image file or base64 image is required.")


def _extract_or_http_error(engine: FaceEngine, frame: Any) -> Any:
    try:
        return engine.extract_single_embedding(frame)
    except CorruptImageError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except FaceCountError as exc:
        detail = "No face detected." if exc.count == 0 else "Multiple faces detected. Submit exactly one face."
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail) from exc
    except EmbeddingExtractionError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


def _guidance_for_face_count(face_count: int) -> str:
    if face_count == 0:
        return "Searching..."
    if face_count > 1:
        return "Only one face allowed"
    return "Face ready"


def analysis_requires_embedding(records: list[Any]) -> bool:
    """Only spend dlib encoding time during compatibility polling when matching is possible."""
    return bool(records)
