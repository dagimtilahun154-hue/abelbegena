export type CameraFacingMode = "user" | "environment"

const LOCAL_CAMERA_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"])

function isLocalCameraHost() {
  if (typeof window === "undefined") return true
  return LOCAL_CAMERA_HOSTS.has(window.location.hostname)
}

function cameraSupportError() {
  if (typeof navigator === "undefined") {
    return "Camera access is not available in this browser context."
  }

  if (!window.isSecureContext && !isLocalCameraHost()) {
    return "Camera access requires HTTPS on phones and tablets. Open this app with an https:// address, or use localhost on the same device."
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return "This browser cannot expose a camera to the app. Use a modern Chrome, Edge, Safari, or Firefox browser and allow camera access."
  }

  return null
}

export function formatCameraError(error: unknown) {
  const supportError = cameraSupportError()
  if (supportError) return supportError

  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "Camera permission was blocked. Allow camera access in the browser settings, then start the scanner again."
    }

    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return "No camera was found on this device. Connect or enable a camera and try again."
    }

    if (error.name === "NotReadableError" || error.name === "TrackStartError") {
      return "The camera is already in use by another app or browser tab. Close the other camera app and try again."
    }

    if (error.name === "OverconstrainedError" || error.name === "ConstraintNotSatisfiedError") {
      return "This camera could not match the requested settings. Try switching cameras or starting the scanner again."
    }
  }

  return error instanceof Error
    ? `Camera start failed: ${error.message}`
    : "Camera start failed. Check camera permission and try again."
}

export async function requestCameraStream(options: {
  deviceId?: string
  facingMode?: CameraFacingMode
} = {}) {
  const supportError = cameraSupportError()
  if (supportError) throw new Error(supportError)

  const facingMode = options.facingMode || "user"
  const idealSize = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
  }

  const attempts: MediaStreamConstraints[] = []

  if (options.deviceId) {
    attempts.push({
      audio: false,
      video: {
        deviceId: { exact: options.deviceId },
        ...idealSize,
      },
    })
  }

  attempts.push(
    {
      audio: false,
      video: {
        facingMode: { ideal: facingMode },
        ...idealSize,
      },
    },
    {
      audio: false,
      video: idealSize,
    },
    {
      audio: false,
      video: true,
    },
  )

  let lastError: unknown

  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints)
    } catch (error) {
      lastError = error
    }
  }

  throw new Error(formatCameraError(lastError))
}

export async function attachCameraStream(video: HTMLVideoElement, stream: MediaStream) {
  video.muted = true
  video.playsInline = true
  video.setAttribute("playsinline", "true")
  video.srcObject = stream
  await video.play()
}

export function stopCameraStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((track) => track.stop())
}

export async function listVideoInputDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) return []

  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.filter((device) => device.kind === "videoinput")
  } catch {
    return []
  }
}

export function getStreamFacingMode(stream: MediaStream, fallback: CameraFacingMode = "user") {
  const facingMode = stream.getVideoTracks()[0]?.getSettings().facingMode
  return facingMode === "environment" || facingMode === "user" ? facingMode : fallback
}
