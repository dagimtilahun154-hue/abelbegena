# Abel Begena Face Attendance API

FastAPI backend for strict vector-threshold face attendance. The active engine stores only face embeddings mapped to user IDs; raw enrollment images are decoded, processed, and discarded.

## Stack

- FastAPI with async upload handling
- OpenCV preprocessing with grayscale checks and lighting normalization
- `face_recognition`/dlib 128-dimensional face embeddings
- Repository pattern with in-memory storage for local testing
- SQLAlchemy models prepared for PostgreSQL/pgvector storage

## Run Locally

Python 3.12+ is recommended for the pinned runtime versions in `requirements.txt`.

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 7860
```

## Endpoints

- `POST /enroll`: multipart form with `user_id` and `file`
- `POST /attendance/verify`: multipart `file`, form `image`, or JSON `{ "image": "data:image/jpeg;base64,..." }`
- `GET /recognition_health`: engine health and thresholds

The server rejects frames with zero faces, multiple faces, corrupted uploads, and unknown identities. Unknown faces return HTTP 401 with `Unknown Face Detected`.

## Thresholds

Defaults are strict and can be changed with environment variables:

- `FACE_EUCLIDEAN_THRESHOLD=0.6`
- `FACE_COSINE_THRESHOLD=0.8`
- `FACE_DETECTOR_MODEL=hog` (`cnn` is more accurate but slower and needs more compute)
