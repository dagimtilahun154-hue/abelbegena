import cv2
import os

def register():
    # Ensure the faces directory exists
    FACES_DIR = "faces"
    if not os.path.exists(FACES_DIR):
        os.makedirs(FACES_DIR)

    name = input("👤 Enter the name of the student to register: ").strip()
    if not name:
        print("❌ Name cannot be empty.")
        return

    cap = cv2.VideoCapture(0)
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

    print(f"\n📸 Look at the camera to register '{name}'...")
    print("Press 'SPACE' to capture or 'ESC' to cancel.")

    while True:
        ret, frame = cap.read()
        if not ret: break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)

        for (x, y, w, h) in faces:
            cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 255, 0), 2)
            cv2.putText(frame, "Ready to Capture", (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 2)

        cv2.imshow("Register Face - Press SPACE", frame)

        key = cv2.waitKey(1)
        if key % 256 == 27: # ESC pressed
            print("🚫 Registration cancelled.")
            break
        elif key % 256 == 32: # SPACE pressed
            if len(faces) == 0:
                print("❌ No face detected! Please look at the camera.")
                continue
            
            # Save the full image
            file_path = os.path.join(FACES_DIR, f"{name}.jpg")
            cv2.imwrite(file_path, frame)
            print(f"✅ Success! '{name}' has been registered in {FACES_DIR}/")
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    register()
