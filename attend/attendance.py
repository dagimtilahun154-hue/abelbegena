import os
import sys
import io

os.environ["FLASK_SKIP_DOTENV"] = "1"
if not sys.stdout.encoding or sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)

from flask import Flask, Response, jsonify, request
from flask_cors import CORS
import cv2
import numpy as np
from datetime import datetime
import urllib.request
import urllib.parse
import json
import base64
import hashlib
import re

# ─── ENV & SUPABASE CONFIG ──────────────────────────────────────────────────
if os.path.exists(".env"):
    with open(".env", "r") as f:
        for line in f:
            line = line.strip()
            if line and "=" in line and not line.startswith("#"):
                key, val = line.split("=", 1)
                os.environ[key.strip()] = val.strip()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "").strip()

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: Supabase credentials missing in .env")
    exit(1)

# ─── BULLETPROOF LIGHTWEIGHT SUPABASE REST CLIENT ────────────────────────────
class SupabaseREST:
    def __init__(self, url, key):
        self.url = url.rstrip('/')
        self.key = key
        self.headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json"
        }

    def select(self, table, select_query="*", filters=None):
        url = f"{self.url}/rest/v1/{table}?select={select_query}"
        if filters:
            for k, v in filters.items():
                url += f"&{k}={urllib.parse.quote(str(v))}"
        
        req = urllib.request.Request(url, headers=self.headers, method="GET")
        try:
            with urllib.request.urlopen(req) as resp:
                return json.loads(resp.read().decode())
        except Exception as e:
            print(f"Supabase SELECT Error ({table}): {e}")
            return []

    def upsert(self, table, data):
        url = f"{self.url}/rest/v1/{table}"
        headers = {**self.headers, "Prefer": "resolution=merge-duplicates"}
        req = urllib.request.Request(
            url, 
            data=json.dumps(data).encode(), 
            headers=headers, 
            method="POST"
        )
        try:
            with urllib.request.urlopen(req) as resp:
                return True
        except Exception as e:
            print(f"Supabase UPSERT Error ({table}): {e}")
            raise e

    def insert(self, table, data):
        url = f"{self.url}/rest/v1/{table}"
        req = urllib.request.Request(
            url, 
            data=json.dumps(data).encode(), 
            headers=self.headers, 
            method="POST"
        )
        try:
            with urllib.request.urlopen(req) as resp:
                return True
        except Exception as e:
            print(f"Supabase INSERT Error ({table}): {e}")
            raise e

    def delete(self, table, filters=None):
        url = f"{self.url}/rest/v1/{table}?"
        if filters:
            for k, v in filters.items():
                url += f"&{k}={urllib.parse.quote(str(v))}"

        req = urllib.request.Request(url, headers=self.headers, method="DELETE")
        try:
            with urllib.request.urlopen(req) as resp:
                return True
        except Exception as e:
            print(f"Supabase DELETE Error ({table}): {e}")
            raise e

supabase = SupabaseREST(SUPABASE_URL, SUPABASE_KEY)
print("🌐 Supabase Cloud Link: ESTABLISHED")

# ─── HYBRID FACE RECOGNITION LOADER ──────────────────────────────────────────
face_rec_enabled = False
known_face_encodings = []
known_face_ids = []

try:
    import face_recognition  # type: ignore
    face_rec_enabled = True
    print("✅ face_recognition library: ONLINE")
except Exception:
    print("⚠️ face_recognition library not installed. Falling back to OpenCV LBPH Recognizer.")

# ─── MEDIAPIPE FACE MESH SETUP ───────────────────────────────────────────────
mp_face_mesh = None
face_mesh = None

try:
    import mediapipe as mp  # type: ignore
    try:
        mp_face_mesh = mp.solutions.face_mesh
    except AttributeError:
        import mediapipe.python.solutions as mp_solutions
        mp_face_mesh = mp_solutions.face_mesh
    face_mesh = mp_face_mesh.FaceMesh(
        max_num_faces=1,
        refine_landmarks=True,   # Enables iris landmarks
        min_detection_confidence=0.6,
        min_tracking_confidence=0.5
    )
    print("✅ MediaPipe Face Mesh: ONLINE (468 landmarks)")
except Exception as e:
    print(f"⚠️ MediaPipe Error: {e}. Haar Cascade fallback is fully ACTIVE!")

# Fallback cascades
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
eye_cascade  = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
recognizer   = cv2.face.LBPHFaceRecognizer_create()

# ─── GLOBAL STATE ────────────────────────────────────────────────────────────
names_map     = {}
trained       = False
current_frame = None
known_eye_templates = []
known_eye_ids = []

FACES_DIR = "faces"
if not os.path.exists(FACES_DIR):
    os.makedirs(FACES_DIR)

FACE_IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png")
FACE_REGISTRY_FILE = os.path.join(FACES_DIR, "face_registry.json")
EYE_REGISTRY_FILE = os.path.join(FACES_DIR, "eye_registry.json")
FACE_FILENAME_SPLIT = "__"
FACE_TIMESTAMP_RE = re.compile(r"_\d{8}_\d{6}(?:_\d{1,6})?$")
EYE_TEMPLATE_VERSION = 1
EYE_TEMPLATE_LIMIT_PER_STUDENT = 5
EYE_WEAK_MATCH_THRESHOLD = 0.78
EYE_STRONG_MATCH_THRESHOLD = 0.88
EYE_BIOMETRICS_REQUIRED = os.environ.get("EYE_BIOMETRICS_REQUIRED", "1").lower() not in ("0", "false", "no")
LEFT_EYE_INDICES = [33, 133, 160, 159, 158, 157, 173, 246, 161, 163, 144, 145, 153, 154, 155, 468, 469, 470, 471, 472]
RIGHT_EYE_INDICES = [362, 263, 387, 386, 385, 384, 398, 466, 388, 390, 373, 374, 380, 381, 382, 473, 474, 475, 476, 477]
LEFT_IRIS_INDICES = [468, 469, 470, 471, 472]
RIGHT_IRIS_INDICES = [473, 474, 475, 476, 477]


def normalize_identity(value):
    return " ".join(str(value or "").strip().lower().replace("_", " ").split())


def safe_face_id(value):
    raw = str(value or "").strip()
    digest = hashlib.sha1(raw.encode("utf-8")).hexdigest()[:8]
    cleaned = re.sub(r"[^A-Za-z0-9-]+", "-", raw).strip("-").lower() or "student"
    return f"{cleaned[:40]}-{digest}"


def face_label_for_student(student_id):
    return int(hashlib.sha1(str(student_id).encode("utf-8")).hexdigest()[:8], 16) & 0x7fffffff


def load_face_registry():
    if not os.path.exists(FACE_REGISTRY_FILE):
        return {}
    try:
        with open(FACE_REGISTRY_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except Exception as e:
        print(f"Face registry load error: {e}")
        return {}


def save_face_registry(registry):
    tmp_path = FACE_REGISTRY_FILE + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(registry, f, indent=2, sort_keys=True)
    os.replace(tmp_path, FACE_REGISTRY_FILE)


def load_eye_registry():
    if not os.path.exists(EYE_REGISTRY_FILE):
        return {}
    try:
        with open(EYE_REGISTRY_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except Exception as e:
        print(f"Eye registry load error: {e}")
        return {}


def save_eye_registry(registry):
    tmp_path = EYE_REGISTRY_FILE + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(registry, f, indent=2, sort_keys=True)
    os.replace(tmp_path, EYE_REGISTRY_FILE)


def face_image_files():
    if not os.path.exists(FACES_DIR):
        return []
    return [
        filename for filename in os.listdir(FACES_DIR)
        if filename.lower().endswith(FACE_IMAGE_EXTENSIONS)
    ]


def register_face_file(filename, student_id, name):
    registry = load_face_registry()
    registry[filename] = {
        "student_id": str(student_id),
        "name": str(name or ""),
        "created_at": datetime.now().isoformat(timespec="seconds")
    }
    save_face_registry(registry)


def register_eye_template(student_id, name, template):
    if not template or not template.get("vector"):
        return False

    registry = load_eye_registry()
    sid = str(student_id)
    templates = registry.get(sid, [])
    if not isinstance(templates, list):
        templates = []

    templates.append({
        "version": EYE_TEMPLATE_VERSION,
        "student_id": sid,
        "name": str(name or ""),
        "quality": float(template.get("quality", 0.0)),
        "vector": template["vector"],
        "created_at": datetime.now().isoformat(timespec="seconds")
    })
    registry[sid] = templates[-EYE_TEMPLATE_LIMIT_PER_STUDENT:]
    save_eye_registry(registry)
    return True


def resolve_face_student_id(filename, students, registry):
    record = registry.get(filename)
    if isinstance(record, dict):
        registered_id = str(record.get("student_id", ""))
        if registered_id in students:
            return registered_id

    stem = os.path.splitext(filename)[0]
    if FACE_FILENAME_SPLIT in stem:
        prefix = stem.split(FACE_FILENAME_SPLIT, 1)[0]
        for student_id in students:
            if safe_face_id(student_id) == prefix:
                registry[filename] = {
                    "student_id": str(student_id),
                    "name": str(students[student_id].get("name", "")),
                    "created_at": datetime.now().isoformat(timespec="seconds"),
                    "source": "filename"
                }
                return student_id

    legacy_candidates = [stem, FACE_TIMESTAMP_RE.sub("", stem)]
    if "_" in stem:
        legacy_candidates.append(stem.rsplit("_", 1)[0])

    for candidate in legacy_candidates:
        normalized = normalize_identity(candidate)
        matches = [
            student_id for student_id, info in students.items()
            if normalize_identity(info.get("name")) == normalized
        ]
        if len(matches) == 1:
            student_id = matches[0]
            registry[filename] = {
                "student_id": str(student_id),
                "name": str(students[student_id].get("name", "")),
                "created_at": datetime.now().isoformat(timespec="seconds"),
                "source": "legacy-name"
            }
            return student_id

    return None


def decode_base64_frame(image_data):
    if not image_data:
        return None
    encoded_data = image_data.split(",", 1)[1] if "," in image_data else image_data
    nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)


def crop_face_from_box(frame, box, pad=40):
    ih, iw = frame.shape[:2]
    x = max(0, int(box["x"]) - pad)
    y = max(0, int(box["y"]) - pad)
    x2 = min(iw, int(box["x"]) + int(box["w"]) + pad)
    y2 = min(ih, int(box["y"]) + int(box["h"]) + pad)
    return frame[y:y2, x:x2]

latest_results = {
    "face_detected": False,
    "eyes_detected": False,
    "ready_to_capture": False,
    "face_box": None,
    "landmarks": [],
    "mesh_landmarks": [],
    "guidance": "Searching...",
    "matches": [],
    "ear": 0.0,
    "yaw": 0.0,
    "pitch": 0.0,
    "liveness_step": 0,
    "liveness_msg": "Center your face",
    "liveness_done": False,
    "iw": 640,
    "ih": 480,
    "lighting_ok": True,
    "eye_biometric": {
        "enabled": False,
        "available": False,
        "quality": 0.0,
        "templates": 0,
        "match": None
    }
}

app = Flask(__name__)
CORS(app)

# ─── DATABASE HELPERS ─────────────────────────────────────────────────────────
def get_student(sid):
    data = supabase.select("students", filters={"id": "eq." + sid})
    return data[0] if data else None

def get_all_students():
    data = supabase.select("students")
    return {row['id']: row for row in data}


def build_match(student_id, confidence):
    student = get_student(str(student_id))
    if not student:
        return None

    return {
        "id": str(student_id),
        "student_id": str(student_id),
        "confidence": int(round(float(confidence))),
        "name": student.get("name", "Unknown"),
        "instrument": student.get("instrument", ""),
        "phone": student.get("phone", "")
    }


def student_payload(student_id, student):
    return {
        "id": str(student_id),
        "student_id": str(student_id),
        "name": student.get("name", "Unknown"),
        "instrument": student.get("instrument", ""),
        "phone": student.get("phone", "")
    }

# ─── LIGHTING & POSITION GUIDANCE ─────────────────────────────────────────────
def normalize_vector(values):
    vector = np.asarray(values, dtype=np.float32).flatten()
    if vector.size == 0:
        return []
    norm = float(np.linalg.norm(vector))
    if norm <= 1e-6:
        return []
    return (vector / norm).astype(float).round(6).tolist()


def cosine_similarity(a, b):
    va = np.asarray(a, dtype=np.float32).flatten()
    vb = np.asarray(b, dtype=np.float32).flatten()
    if va.size == 0 or vb.size == 0 or va.size != vb.size:
        return 0.0
    denom = float(np.linalg.norm(va) * np.linalg.norm(vb))
    if denom <= 1e-6:
        return 0.0
    return float(np.dot(va, vb) / denom)


def crop_from_landmarks(frame, landmarks, indices, iw, ih, pad_x=0.35, pad_y=0.65):
    points = []
    for idx in indices:
        if idx < len(landmarks):
            points.append((float(landmarks[idx].x) * iw, float(landmarks[idx].y) * ih))
    if len(points) < 4:
        return None

    pts = np.asarray(points, dtype=np.float32)
    x1, y1 = np.min(pts, axis=0)
    x2, y2 = np.max(pts, axis=0)
    width = max(1.0, x2 - x1)
    height = max(1.0, y2 - y1)
    x1 = max(0, int(x1 - width * pad_x))
    x2 = min(iw, int(x2 + width * pad_x))
    y1 = max(0, int(y1 - height * pad_y))
    y2 = min(ih, int(y2 + height * pad_y))

    if x2 - x1 < 12 or y2 - y1 < 8:
        return None
    return frame[y1:y2, x1:x2]


def iris_crop_from_landmarks(frame, landmarks, indices, iw, ih):
    points = []
    for idx in indices:
        if idx < len(landmarks):
            points.append((float(landmarks[idx].x) * iw, float(landmarks[idx].y) * ih))
    if len(points) < 4:
        return None

    pts = np.asarray(points, dtype=np.float32)
    center = np.mean(pts, axis=0)
    radius = max(3.0, float(np.max(np.linalg.norm(pts - center, axis=1))))
    size = radius * 5.5
    x1 = max(0, int(center[0] - size))
    x2 = min(iw, int(center[0] + size))
    y1 = max(0, int(center[1] - size))
    y2 = min(ih, int(center[1] + size))

    if x2 - x1 < 12 or y2 - y1 < 12:
        return None
    return frame[y1:y2, x1:x2]


def dct_descriptor(crop, size, coeff_shape):
    rows, cols = coeff_shape
    expected_len = max(0, rows * cols - 1)
    if crop is None or crop.size == 0:
        return [0.0] * expected_len

    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) if len(crop.shape) == 3 else crop
    gray = cv2.resize(gray, size, interpolation=cv2.INTER_AREA)
    gray = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(4, 4)).apply(gray)
    gray = cv2.GaussianBlur(gray, (3, 3), 0)
    values = gray.astype(np.float32) / 255.0
    values = (values - float(np.mean(values))) / (float(np.std(values)) + 1e-6)
    dct = cv2.dct(values)
    coeffs = dct[:rows, :cols].flatten()
    if coeffs.size > 1:
        coeffs = coeffs[1:]
    if coeffs.size < expected_len:
        coeffs = np.pad(coeffs, (0, expected_len - coeffs.size))
    return coeffs[:expected_len].astype(np.float32).tolist()


def crop_quality(crop):
    if crop is None or crop.size == 0:
        return 0.0
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) if len(crop.shape) == 3 else crop
    brightness = float(np.mean(gray))
    blur = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    brightness_score = max(0.0, min(1.0, (brightness - 35.0) / 95.0))
    blur_score = max(0.0, min(1.0, blur / 90.0))
    size_score = max(0.0, min(1.0, min(gray.shape[:2]) / 24.0))
    return round((brightness_score * 0.35 + blur_score * 0.4 + size_score * 0.25) * 100, 2)


def extract_eye_template(frame, landmarks, iw, ih):
    left_eye = crop_from_landmarks(frame, landmarks, LEFT_EYE_INDICES, iw, ih)
    right_eye = crop_from_landmarks(frame, landmarks, RIGHT_EYE_INDICES, iw, ih)
    left_iris = iris_crop_from_landmarks(frame, landmarks, LEFT_IRIS_INDICES, iw, ih)
    right_iris = iris_crop_from_landmarks(frame, landmarks, RIGHT_IRIS_INDICES, iw, ih)

    parts = []
    for crop in (left_eye, right_eye):
        parts.extend(dct_descriptor(crop, (64, 32), (12, 16)))
    for crop in (left_iris, right_iris):
        parts.extend(dct_descriptor(crop, (32, 32), (10, 10)))

    vector = normalize_vector(parts)
    qualities = [
        crop_quality(left_eye),
        crop_quality(right_eye),
        crop_quality(left_iris),
        crop_quality(right_iris),
    ]
    quality = round(float(np.mean([q for q in qualities if q > 0])) if any(q > 0 for q in qualities) else 0.0, 2)

    if not vector or quality < 22:
        return None

    return {
        "version": EYE_TEMPLATE_VERSION,
        "quality": quality,
        "vector": vector,
        "parts": {
            "left_eye": left_eye is not None,
            "right_eye": right_eye is not None,
            "left_iris": left_iris is not None,
            "right_iris": right_iris is not None,
        }
    }


def build_eye_status(template=None, match=None):
    return {
        "enabled": bool(face_mesh),
        "available": bool(template),
        "quality": round(float(template.get("quality", 0.0)), 2) if template else 0.0,
        "templates": len(known_eye_templates),
        "match": {
            "id": match.get("id"),
            "confidence": match.get("eye_confidence", match.get("confidence")),
            "similarity": match.get("eye_similarity", 0.0)
        } if match else None
    }


def recognize_eye_match(template):
    if not template or not template.get("vector") or not known_eye_templates:
        return None

    best = None
    for stored in known_eye_templates:
        similarity = cosine_similarity(template["vector"], stored["vector"])
        if best is None or similarity > best["similarity"]:
            best = {
                "student_id": stored["student_id"],
                "similarity": similarity,
                "quality": stored.get("quality", 0.0)
            }

    if not best or best["similarity"] < EYE_WEAK_MATCH_THRESHOLD:
        return None

    match = build_match(best["student_id"], 55 + (best["similarity"] - EYE_WEAK_MATCH_THRESHOLD) * 140)
    if not match:
        return None

    eye_confidence = int(round(min(99, max(0, 55 + (best["similarity"] - EYE_WEAK_MATCH_THRESHOLD) * 140))))
    match.update({
        "method": "eye_iris",
        "eye_verified": True,
        "eye_confidence": eye_confidence,
        "eye_similarity": round(float(best["similarity"]), 4),
        "confidence": eye_confidence
    })
    return match


def student_has_eye_template(student_id):
    sid = str(student_id)
    return any(str(stored.get("student_id")) == sid for stored in known_eye_templates)


def merge_identity_matches(face_match, eye_match):
    if face_match and eye_match and str(face_match.get("id")) == str(eye_match.get("id")):
        merged = {**face_match}
        merged["method"] = "face+eye"
        merged["eye_verified"] = True
        merged["eye_confidence"] = eye_match.get("eye_confidence")
        merged["eye_similarity"] = eye_match.get("eye_similarity")
        merged["confidence"] = max(int(face_match.get("confidence", 0)), int(eye_match.get("eye_confidence", 0)))
        return [merged]

    if eye_match and eye_match.get("eye_similarity", 0.0) >= EYE_STRONG_MATCH_THRESHOLD:
        if face_match and str(face_match.get("id")) != str(eye_match.get("id")):
            eye_match["face_conflict"] = True
        return [eye_match]

    if face_match:
        face_match.setdefault("method", "face")
        face_match.setdefault("eye_verified", False)
        if not student_has_eye_template(face_match.get("id")):
            return [face_match]

    return []


def analyze_position(x, y, w, h, iw, ih):
    cx, cy   = x + w // 2, y + h // 2
    target_x = iw // 2
    target_y = ih // 2
    ratio    = w / iw

    if ratio < 0.18: return "Move Closer",   False
    if ratio > 0.75: return "Move Back",     False

    margin_x = iw * 0.22
    margin_y = ih * 0.22

    if cx < target_x - margin_x: return "Move Right",  False
    if cx > target_x + margin_x: return "Move Left",   False
    if cy < target_y - margin_y: return "Move Down",   False
    if cy > target_y + margin_y: return "Move Up",     False

    return "Face Aligned ✓", True


def recognize_face_match(frame, gray, x, y, w, h):
    if not trained:
        return None

    if face_rec_enabled:
        if not known_face_encodings:
            return None
        try:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            encodings = face_recognition.face_encodings(rgb, [(y, x + w, y + h, x)])
            if not encodings:
                return None
            face_distances = face_recognition.face_distance(known_face_encodings, encodings[0])
            if len(face_distances) == 0:
                return None
            best_match_idx = int(np.argmin(face_distances))
            if face_distances[best_match_idx] < 0.55:
                confidence = (1.0 - float(face_distances[best_match_idx])) * 100
                return build_match(known_face_ids[best_match_idx], confidence)
        except Exception as e:
            print(f"Prediction error (face_recognition): {e}")
        return None

    try:
        roi = gray[y:y + h, x:x + w]
        if roi.size == 0:
            return None
        roi = cv2.equalizeHist(cv2.resize(roi, (200, 200)))
        label, confidence = recognizer.predict(roi)
        if confidence < 75:
            student_id = names_map.get(label)
            if student_id:
                return build_match(student_id, max(0, 100 - confidence))
    except Exception as e:
        print(f"Prediction error (lbph): {e}")
    return None


def process_browser_frame(frame, include_private=False):
    global current_frame, latest_results
    current_frame = frame.copy()

    ih, iw = frame.shape[:2]
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    brightness = np.mean(gray)
    lighting_ok = bool(brightness > 50)

    results = {
        "face_detected": False,
        "eyes_detected": False,
        "ready_to_capture": False,
        "face_box": None,
        "landmarks": [],
        "mesh_landmarks": [],
        "guidance": "Searching...",
        "matches": [],
        "ear": 0.0,
        "yaw": 0.0,
        "pitch": 0.0,
        "liveness_step": 0,
        "liveness_msg": "Center your face",
        "liveness_done": False,
        "iw": iw,
        "ih": ih,
        "lighting_ok": lighting_ok,
        "eye_biometric": build_eye_status()
    }

    if not lighting_ok:
        results["guidance"] = "Lighting too low"
        results["liveness_msg"] = "Lighting too low"
        latest_results = results
        return results

    enhanced_frame = frame
    if face_mesh:
        lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
        l_channel, a, b = cv2.split(lab)
        cl = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(l_channel)
        enhanced_frame = cv2.cvtColor(cv2.merge((cl, a, b)), cv2.COLOR_LAB2BGR)
        rgb = cv2.cvtColor(enhanced_frame, cv2.COLOR_BGR2RGB)
        mp_res = face_mesh.process(rgb)

        if mp_res.multi_face_landmarks:
            fl = mp_res.multi_face_landmarks[0].landmark
            results["face_detected"] = True
            results["eyes_detected"] = True

            xs = [lm.x * iw for lm in fl]
            ys = [lm.y * ih for lm in fl]
            x1, y1 = max(0, int(min(xs))), max(0, int(min(ys)))
            x2, y2 = min(iw, int(max(xs))), min(ih, int(max(ys)))
            w_b, h_b = x2 - x1, y2 - y1
            if w_b <= 0 or h_b <= 0:
                latest_results = results
                return results
            results["face_box"] = {"x": x1, "y": y1, "w": w_b, "h": h_b}

            guidance, aligned = analyze_position(x1, y1, w_b, h_b, iw, ih)
            results["guidance"] = guidance
            results["liveness_msg"] = guidance
            results["ready_to_capture"] = aligned
            results["liveness_done"] = aligned

            key_indices = [
                1, 4, 5, 6, 8,
                33, 133, 362, 263,
                61, 291, 13, 14,
                234, 454, 10, 152,
                70, 105, 107, 336, 334,
                168, 197, 195, 5,
                160, 144, 385, 380,
                468, 469, 470, 471, 472,
                473, 474, 475, 476, 477,
            ]
            results["mesh_landmarks"] = [
                {"x": fl[i].x, "y": fl[i].y}
                for i in key_indices if i < len(fl)
            ]
            results["landmarks"] = [
                {"x": int(fl[33].x * iw), "y": int(fl[33].y * ih)},
                {"x": int(fl[263].x * iw), "y": int(fl[263].y * ih)},
                {"x": int(fl[1].x * iw), "y": int(fl[1].y * ih)},
                {"x": int(fl[152].x * iw), "y": int(fl[152].y * ih)},
                {"x": int(fl[61].x * iw), "y": int(fl[61].y * ih)},
                {"x": int(fl[291].x * iw), "y": int(fl[291].y * ih)},
            ]

            eye_template = extract_eye_template(enhanced_frame, fl, iw, ih)
            eye_match = recognize_eye_match(eye_template)
            results["eye_biometric"] = build_eye_status(eye_template, eye_match)

            face_match = recognize_face_match(enhanced_frame, gray, x1, y1, w_b, h_b)
            results["matches"].extend(merge_identity_matches(face_match, eye_match))

            if include_private and eye_template:
                results["_eye_template"] = eye_template

            latest_results = results
            return results

    faces = face_cascade.detectMultiScale(gray, 1.2, 5)
    if len(faces) > 0:
        x, y, w, h = [int(v) for v in faces[0]]
        results["face_detected"] = True
        results["face_box"] = {"x": x, "y": y, "w": w, "h": h}

        eyes = eye_cascade.detectMultiScale(gray[y:y + h, x:x + w])
        results["eyes_detected"] = len(eyes) >= 1

        guidance, aligned = analyze_position(x, y, w, h, iw, ih)
        results["guidance"] = guidance
        results["liveness_msg"] = guidance
        results["ready_to_capture"] = aligned
        results["liveness_done"] = aligned

        match = recognize_face_match(frame, gray, x, y, w, h)
        if match:
            match.setdefault("method", "face")
            match.setdefault("eye_verified", False)
            results["matches"].append(match)

    latest_results = results
    return results

# ─── VIDEO STREAM ─────────────────────────────────────────────────────────────
def generate_frames():
    global current_frame, latest_results
    camera = cv2.VideoCapture(0)
    camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))

    while True:
        success, frame = camera.read()
        if not success:
            break

        frame = cv2.flip(frame, 1)
        current_frame = frame.copy()
        ih, iw, _ = frame.shape

        lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
        l_channel, a, b = cv2.split(lab)
        cl = clahe.apply(l_channel)
        limg = cv2.merge((cl, a, b))
        enhanced_frame = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        brightness = np.mean(gray)
        lighting_ok = brightness > 50

        results = {
            "face_detected":  False,
            "eyes_detected":  False,
            "ready_to_capture": False,
            "face_box":       None,
            "landmarks":      [],
            "mesh_landmarks": [],
            "guidance":       "Searching...",
            "matches":        [],
            "ear":            0.0,
            "yaw":            0.0,
            "pitch":          0.0,
            "liveness_step":  0,
            "liveness_msg":   "Center your face",
            "liveness_done":  False,
            "iw":             iw,
            "ih":             ih,
            "lighting_ok":    lighting_ok,
            "eye_biometric":  build_eye_status()
        }

        if not lighting_ok:
            results["guidance"] = "Lighting too low"
            results["liveness_msg"] = "Lighting too low"
            latest_results = results
            ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            if ret:
                yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' +
                       buffer.tobytes() + b'\r\n')
            continue

        if face_mesh:
            rgb = cv2.cvtColor(enhanced_frame, cv2.COLOR_BGR2RGB)
            mp_res = face_mesh.process(rgb)

            if mp_res.multi_face_landmarks:
                fl = mp_res.multi_face_landmarks[0].landmark
                results["face_detected"] = True
                results["eyes_detected"] = True

                xs = [lm.x * iw for lm in fl]
                ys = [lm.y * ih for lm in fl]
                x1, y1 = int(min(xs)), int(min(ys))
                x2, y2 = int(max(xs)), int(max(ys))
                w_b, h_b = x2 - x1, y2 - y1
                results["face_box"] = {"x": x1, "y": y1, "w": w_b, "h": h_b}

                guidance, aligned = analyze_position(x1, y1, w_b, h_b, iw, ih)

                results["guidance"] = guidance
                results["liveness_msg"] = guidance
                results["ready_to_capture"] = aligned
                results["liveness_done"] = aligned

                KEY_INDICES = [
                    1, 4, 5, 6, 8,           
                    33, 133, 362, 263,        
                    61, 291, 13, 14,          
                    234, 454, 10, 152,        
                    70, 105, 107, 336, 334,   
                    168, 197, 195, 5,         
                    160, 144, 385, 380,       
                ]
                results["mesh_landmarks"] = [
                    {"x": fl[i].x, "y": fl[i].y}
                    for i in KEY_INDICES if i < len(fl)
                ]

                results["landmarks"] = [
                    {"x": int(fl[33].x * iw),  "y": int(fl[33].y * ih)},
                    {"x": int(fl[263].x * iw), "y": int(fl[263].y * ih)},
                    {"x": int(fl[1].x * iw),   "y": int(fl[1].y * ih)},
                    {"x": int(fl[152].x * iw), "y": int(fl[152].y * ih)},
                    {"x": int(fl[61].x * iw),  "y": int(fl[61].y * ih)},
                    {"x": int(fl[291].x * iw), "y": int(fl[291].y * ih)},
                ]

                if trained:
                    x_c = max(0, x1 - 20)
                    y_c = max(0, y1 - 20)
                    face_crop = enhanced_frame[y_c:y_c + h_b + 40, x_c:x_c + w_b + 40]
                    
                    if face_crop.size > 0:
                        if face_rec_enabled:
                            try:
                                rgb_crop = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)
                                encodings = face_recognition.face_encodings(rgb_crop)
                                if encodings:
                                    matches = face_recognition.compare_faces(known_face_encodings, encodings[0], tolerance=0.55)
                                    face_distances = face_recognition.face_distance(known_face_encodings, encodings[0])
                                    best_match_idx = np.argmin(face_distances) if len(face_distances) > 0 else None
                                    
                                    if best_match_idx is not None and matches[best_match_idx]:
                                        sid = known_face_ids[best_match_idx]
                                        conf = round((1.0 - face_distances[best_match_idx]) * 100)
                                        match = build_match(sid, conf)
                                        if match:
                                            results["matches"].append(match)
                            except Exception as e:
                                print(f"Prediction error (face_recognition): {e}")
                        else:
                            gray_c = cv2.cvtColor(enhanced_frame, cv2.COLOR_BGR2GRAY)
                            roi  = gray_c[y_c:y_c + h_b + 40, x_c:x_c + w_b + 40]
                            if roi.size > 0:
                                roi = cv2.equalizeHist(cv2.resize(roi, (200, 200)))
                                hid, conf = recognizer.predict(roi)
                                if conf < 85:
                                    sid = names_map.get(hid)
                                    if sid:
                                        match = build_match(sid, round(100 - conf))
                                        if match:
                                            results["matches"].append(match)

        else:
            gray_c  = cv2.cvtColor(enhanced_frame, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray_c, 1.1, 5)
            if len(faces) > 0:
                x, y, w, h = faces[0]
                results["face_detected"] = True
                results["face_box"] = {"x": int(x), "y": int(y), "w": int(w), "h": int(h)}
                eyes = eye_cascade.detectMultiScale(gray_c[y:y+h, x:x+w])
                results["eyes_detected"] = len(eyes) >= 1
                guidance, aligned = analyze_position(x, y, w, h, iw, ih)
                
                results["guidance"] = guidance
                results["liveness_msg"] = guidance
                results["ready_to_capture"] = aligned
                results["liveness_done"] = aligned

                if trained:
                    x_c = max(0, x - 20)
                    y_c = max(0, y - 20)
                    face_crop = enhanced_frame[y_c:y_c + h + 40, x_c:x_c + w + 40]
                    
                    if face_crop.size > 0:
                        if face_rec_enabled:
                            try:
                                rgb_crop = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)
                                encodings = face_recognition.face_encodings(rgb_crop)
                                if encodings:
                                    matches = face_recognition.compare_faces(known_face_encodings, encodings[0], tolerance=0.55)
                                    face_distances = face_recognition.face_distance(known_face_encodings, encodings[0])
                                    best_match_idx = np.argmin(face_distances) if len(face_distances) > 0 else None
                                    
                                    if best_match_idx is not None and matches[best_match_idx]:
                                        sid = known_face_ids[best_match_idx]
                                        conf = round((1.0 - face_distances[best_match_idx]) * 100)
                                        match = build_match(sid, conf)
                                        if match:
                                            results["matches"].append(match)
                            except Exception as e:
                                print(f"Prediction error (face_recognition fallback): {e}")
                        else:
                            gray_c = cv2.cvtColor(enhanced_frame, cv2.COLOR_BGR2GRAY)
                            roi  = gray_c[y_c:y_c + h + 40, x_c:x_c + w + 40]
                            if roi.size > 0:
                                roi = cv2.equalizeHist(cv2.resize(roi, (200, 200)))
                                hid, conf = recognizer.predict(roi)
                                if conf < 85:
                                    sid = names_map.get(hid)
                                    if sid:
                                        match = build_match(sid, round(100 - conf))
                                        if match:
                                            results["matches"].append(match)

        latest_results = results
        ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        if ret:
            yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' +
                   buffer.tobytes() + b'\r\n')


def clean_numpy(val):
    if isinstance(val, dict):
        return {k: clean_numpy(v) for k, v in val.items()}
    elif isinstance(val, list):
        return [clean_numpy(v) for v in val]
    elif isinstance(val, (np.integer, np.int64, np.int32)):
        return int(val)
    elif isinstance(val, (np.floating, np.float64, np.float32)):
        return float(val)
    elif isinstance(val, (np.bool_, bool)):
        return bool(val)
    else:
        return val


# ─── ROUTES ───────────────────────────────────────────────────────────────────
@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/status')
def get_status():
    matches = []
    for m in latest_results.get("matches", []):
        info = get_student(m['id'])
        if info:
            matches.append({**m, **info})
    return jsonify(clean_numpy({**latest_results, "matches": matches}))

@app.route('/reset_liveness', methods=['POST'])
def reset_liveness():
    return jsonify({"status": "ok"})

@app.route('/process_frame', methods=['POST'])
def process_frame():
    try:
        frame = decode_base64_frame((request.json or {}).get("image", ""))
        if frame is None:
            return jsonify({"error": "No valid image provided"}), 400
        return jsonify(clean_numpy(process_browser_frame(frame)))
    except Exception as e:
        print(f"Error processing frame: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/register_student', methods=['POST'])
def register_student():
    global current_frame
    data = request.json or {}
    sid = str(data.get('id', '')).strip()
    name = str(data.get('name', '')).strip()

    if not sid or not name:
        return jsonify({"status": "error", "message": "Name and ID required."})

    submitted_frame = decode_base64_frame(data.get("image", ""))
    if submitted_frame is not None:
        img = submitted_frame
        frame_results = process_browser_frame(img, include_private=True)
    elif current_frame is not None:
        img = current_frame.copy()
        frame_results = process_browser_frame(img, include_private=True)
    else:
        return jsonify({"status": "error", "message": "Camera frame missing. Please start the scanner and try again."})

    if not frame_results.get("ready_to_capture"):
        return jsonify({
            "status": "error",
            "message": f"Align face first: {frame_results.get('guidance', '...')}"
        })

    if not frame_results.get("face_box"):
        return jsonify({"status": "error", "message": "No face detected."})

    eye_template = frame_results.get("_eye_template")
    if EYE_BIOMETRICS_REQUIRED and not eye_template:
        return jsonify({
            "status": "error",
            "message": "Eye biometric could not be captured. Move closer, face the camera, keep both eyes visible, and try again."
        })

    face_crop = crop_face_from_box(img, frame_results["face_box"])
    if face_crop.size == 0:
        return jsonify({"status": "error", "message": "Face crop failed. Please move closer and try again."})

    try:
        supabase.upsert("students", {
            "id": sid, 
            "name": name, 
            "instrument": data.get('instrument'), 
            "phone": data.get('phone'),
            "guardian": data.get('guardian'), 
            "guardian_phone": data.get('guardian_phone'), 
            "branch": data.get('branch')
        })
    except Exception as e:
        return jsonify({"status": "error", "message": f"Supabase Error: {str(e)}"})

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    face_filename = f"{safe_face_id(sid)}{FACE_FILENAME_SPLIT}{timestamp}.jpg"
    face_path = os.path.join(FACES_DIR, face_filename)
    if not cv2.imwrite(face_path, face_crop):
        return jsonify({"status": "error", "message": "Face image could not be saved."})

    register_face_file(face_filename, sid, name)
    eye_registered = register_eye_template(sid, name, eye_template) if eye_template else False
    train_ai()

    return jsonify({
        "status": "success",
        "message": f"Registered: {name}" + (" with Eye ID" if eye_registered else ""),
        "eye_biometric": {
            "registered": bool(eye_registered),
            "quality": eye_template.get("quality", 0.0) if eye_template else 0.0
        },
        "student": student_payload(sid, {
            "name": name,
            "instrument": data.get('instrument'),
            "phone": data.get('phone')
        })
    })

@app.route('/delete_student', methods=['POST'])
def delete_student():
    sid = str((request.json or {}).get('id', '')).strip()
    if not sid:
        return jsonify({"status": "error", "message": "Student ID required"})

    try:
        student = get_student(sid)
        registry = load_face_registry()
        eye_registry = load_eye_registry()
        all_students = get_all_students()
        if student and sid not in all_students:
            all_students[sid] = student
        deleted_count = 0
        if student:
            safe_id = safe_face_id(sid)
            for filename in face_image_files():
                owner_id = resolve_face_student_id(filename, all_students, registry)
                filename_stem = os.path.splitext(filename)[0]
                if owner_id == sid or filename_stem.startswith(f"{safe_id}{FACE_FILENAME_SPLIT}"):
                    try:
                        os.remove(os.path.join(FACES_DIR, filename))
                        registry.pop(filename, None)
                        deleted_count += 1
                    except Exception as e:
                        print(f"Face delete error ({filename}): {e}")
            save_face_registry(registry)
            if sid in eye_registry:
                eye_registry.pop(sid, None)
                save_eye_registry(eye_registry)

        supabase.delete("students", filters={"id": "eq." + sid})
        train_ai()
        return jsonify({"status": "success", "message": "Student and faces deleted.", "deleted_faces": deleted_count})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/submit_registration', methods=['POST'])
def submit_registration():
    try:
        data = request.form.to_dict()
        photo = request.files.get('photo')

        photo_url = ""
        if photo:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            ext = photo.filename.split('.')[-1]
            fname = f"reg_{timestamp}_{data.get('phone', 'unknown')}.{ext}"
            save_path = os.path.join(FACES_DIR, fname) # saving in faces dir for now or another dir
            photo.save(save_path)
            photo_url = f"/local_uploads/{fname}" # Just a placeholder since we aren't uploading to Supabase Storage

        reg_data = {
            "first_name": data.get("firstName", "").strip(),
            "middle_name": data.get("middleName", "").strip() or None,
            "father_name": data.get("middleName", "").strip() or data.get("firstName", "").strip(),
            "grandfather_name": data.get("lastName", "").strip(),
            "gender": data.get("gender"),
            "age": int(data.get("age")) if data.get("age") else None,
            "date_of_birth": data.get("dateOfBirth"),
            "phone": data.get("phone", "").strip(),
            "email": data.get("email", "").strip() or None,
            "nationality": "Ethiopian",
            "region": data.get("address", "").strip(),
            "sub_city": data.get("subCity", "").strip(),
            "woreda": data.get("woreda", "").strip(),
            "kebele": data.get("subCity", "").strip() or "—",
            "house_number": data.get("houseNumber", "").strip() or "—",
            "full_address": f"{data.get('address')}, {data.get('subCity')}, Woreda {data.get('woreda')}",
            "id_type": "kebele_id",
            "id_number": "—",
            "emergency_contact_name": data.get("emergencyName", "").strip() or None,
            "emergency_contact_phone": data.get("emergencyPhone", "").strip() or None,
            "instrument_type": data.get("instrumentType"),
            "learning_category": data.get("learningCategory") or None,
            "mezmur_or_song": data.get("mezmurOrSong") or None,
            "learning_mode": data.get("learningMode"),
            "source_of_info": data.get("sourceOfInfo") or None,
            "photo_url": photo_url,
            "status": "pending"
        }

        supabase.insert("registrations", reg_data)
        return jsonify({"status": "success", "message": "Registration submitted"})
    except Exception as e:
        print(f"Error in submit_registration: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/check_status', methods=['POST'])
def check_status():
    try:
        data = request.json
        phone = data.get('phone', '').strip()
        if not phone:
            return jsonify({"status": "error", "message": "Phone number required"}), 400

        results = supabase.select("registrations", filters={"phone": "eq." + phone})
        if not results:
            return jsonify({"status": "error", "message": "Registration not found"}), 404

        # Supabase returns a list, order by created_at desc isn't fully supported by our lightweight client
        # so we just take the first one or sort locally
        latest = results[-1] if len(results) > 0 else None
        if latest:
            return jsonify({
                "status": "success",
                "data": {
                    "status": latest.get("status"),
                    "admin_note": latest.get("admin_note")
                }
            })
        return jsonify({"status": "error", "message": "Registration not found"}), 404
    except Exception as e:
        print(f"Error in check_status: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/mark_attendance', methods=['POST'])
def mark_present():
    sid = str((request.json or {}).get('id', '')).strip()
    date_str = datetime.now().strftime("%Y-%m-%d")

    if not sid:
        return jsonify({"status": "error", "message": "Student ID missing"})

    try:
        student = get_student(sid)
        if not student:
            return jsonify({"status": "error", "message": "Student not found"})

        exists = supabase.select("attendance", filters={"student_id": "eq." + sid, "date": "eq." + date_str})
        if exists:
            payload = student_payload(sid, student)
            return jsonify({
                "status": "already_marked",
                "message": f"{payload['name']} is already marked present today",
                "student": payload
            })

        supabase.insert("attendance", {
            "student_id": sid,
            "date": date_str,
            "time": datetime.now().strftime("%H:%M:%S"),
            "status": "PRESENT"
        })
        payload = student_payload(sid, student)
        return jsonify({"status": "success", "message": f"Attendance marked for {payload['name']}", "student": payload})
    except Exception as e:
        return jsonify({"status": "error", "message": f"Supabase Error: {str(e)}"})

@app.route('/students')
def get_students():
    return jsonify(get_all_students())

@app.route('/today_attendance')
def get_today_attendance():
    date_str = datetime.now().strftime("%Y-%m-%d")
    try:
        students = get_all_students()
        attendance = supabase.select("attendance", filters={"date": "eq." + date_str})
        
        formatted = []
        for log in attendance:
            sid = log.get("student_id")
            s = students.get(sid, {})
            formatted.append({
                "Name": s.get("name", "Unknown"),
                "ID": sid,
                "Instrument": s.get("instrument", ""),
                "Time": log.get("time")
            })
        return jsonify(formatted)
    except Exception as e:
        print(f"Error fetching today attendance: {e}")
        return jsonify([])

@app.route('/recognition_health')
def recognition_health():
    students = get_all_students()
    registry = load_face_registry()
    eye_registry = load_eye_registry()
    mapped_faces = []
    unmapped_faces = []
    eye_templates = []

    for filename in face_image_files():
        student_id = resolve_face_student_id(filename, students, registry)
        if student_id:
            mapped_faces.append({
                "filename": filename,
                "student_id": student_id,
                "name": students.get(student_id, {}).get("name", "Unknown")
            })
        else:
            unmapped_faces.append(filename)

    save_face_registry(registry)
    for student_id, templates in eye_registry.items():
        if student_id in students and isinstance(templates, list):
            eye_templates.append({
                "student_id": student_id,
                "name": students.get(student_id, {}).get("name", "Unknown"),
                "templates": len(templates),
                "best_quality": max([float(t.get("quality", 0.0)) for t in templates] or [0.0])
            })

    return jsonify({
        "status": "ok",
        "trained": trained,
        "engine": "face_recognition" if face_rec_enabled else "opencv_lbph",
        "students": len(students),
        "known_faces": len(known_face_ids) if face_rec_enabled else len(names_map),
        "eye_biometrics_enabled": bool(face_mesh),
        "known_eye_templates": len(known_eye_templates),
        "eye_templates": eye_templates,
        "mapped_faces": mapped_faces,
        "unmapped_faces": unmapped_faces
    })

def train_ai():
    global names_map, trained, known_face_encodings, known_face_ids, known_eye_templates, known_eye_ids
    students = get_all_students()
    registry = load_face_registry()
    eye_registry = load_eye_registry()
    unmapped_files = []
    known_eye_templates = []
    known_eye_ids = []

    for student_id, templates in eye_registry.items():
        if student_id not in students or not isinstance(templates, list):
            continue
        for template in templates:
            vector = template.get("vector")
            if isinstance(vector, list) and vector:
                known_eye_templates.append({
                    "student_id": str(student_id),
                    "quality": float(template.get("quality", 0.0)),
                    "vector": vector
                })
                known_eye_ids.append(str(student_id))

    if face_rec_enabled:
        known_face_encodings = []
        known_face_ids = []
        for filename in face_image_files():
            student_id = resolve_face_student_id(filename, students, registry)
            if not student_id:
                unmapped_files.append(filename)
                continue
            try:
                img_path = os.path.join(FACES_DIR, filename)
                image = face_recognition.load_image_file(img_path)
                encodings = face_recognition.face_encodings(image)
                if encodings:
                    known_face_encodings.append(encodings[0])
                    known_face_ids.append(student_id)
            except Exception as e:
                print(f"Error encoding {filename}: {e}")
        trained = len(known_face_encodings) > 0
        save_face_registry(registry)
        print(f"Face registry: mapped {len(known_face_ids)} face image(s), unmapped {len(unmapped_files)}.")
        print(f"🧠 face_recognition database: Loaded {len(known_face_encodings)} face encodings.")
    else:
        face_samples, ids = [], []
        names_map = {}
        for filename in face_image_files():
            student_id = resolve_face_student_id(filename, students, registry)
            if not student_id:
                unmapped_files.append(filename)
                continue
            user_hash = face_label_for_student(student_id)
            img = cv2.imread(os.path.join(FACES_DIR, filename))
            if img is not None:
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                gray = cv2.equalizeHist(cv2.resize(gray, (200, 200)))
                face_samples.append(gray)
                ids.append(user_hash)
                names_map[user_hash] = student_id

        if len(face_samples) > 0:
            recognizer.train(face_samples, np.array(ids))
            trained = True
            save_face_registry(registry)
            print(f"Face registry: mapped {len(face_samples)} face image(s), unmapped {len(unmapped_files)}.")
            print(f"OpenCV LBPH: Trained on {len(face_samples)} face(s)")
        else:
            trained = False
            save_face_registry(registry)
            print(f"Face registry: no usable face images, unmapped {len(unmapped_files)}.")
            print(f"🧠 OpenCV LBPH: Trained on {len(face_samples)} face(s)")

if __name__ == '__main__':
    train_ai()
    port = int(os.environ.get("PORT", 7860))
    app.run(host='0.0.0.0', port=port, threaded=True)
