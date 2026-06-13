import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, ArrowLeft, UserPlus, Users, ClipboardList, Fingerprint, Eye, Camera, RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Link } from "react-router-dom"
import {
  attachCameraStream,
  formatCameraError,
  getStreamFacingMode,
  listVideoInputDevices,
  requestCameraStream,
  stopCameraStream,
  type CameraFacingMode,
} from "@/lib/camera"

const API_BASE = import.meta.env.VITE_ATTEND_API_URL || "https://dagi321-attend.hf.space"
const MARK_COOLDOWN_MS = 8000

// ── Face ID Scanner Ring drawn on canvas ─────────────────────────────────────
function drawFaceIDOverlay(
  canvas: HTMLCanvasElement,
  detection: any,
  imgEl: HTMLImageElement | HTMLVideoElement
) {
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  const rect = imgEl.getBoundingClientRect()
  canvas.width  = rect.width
  canvas.height = rect.height
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  if (!detection?.face_box) return

  const iw = detection.iw || 640
  const ih = detection.ih || 480
  const sx = rect.width  / iw
  const sy = rect.height / ih

  const { x, y, w, h } = detection.face_box
  const cx = (x + w / 2) * sx
  const cy = (y + h / 2) * sy
  const r  = Math.max(w, h) * 0.68 * Math.max(sx, sy)

  const isAligned = detection.ready_to_capture
  const color     = isAligned ? "#22c55e" : detection.face_detected ? "#FFD700" : "#ef4444"

  // ── Outer glow ring ──────────────────────────────────────────────────────
  ctx.save()
  ctx.shadowBlur   = 30
  ctx.shadowColor  = color
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.strokeStyle = color
  ctx.lineWidth   = 3
  ctx.globalAlpha = 0.6
  ctx.stroke()
  ctx.restore()

  // ── Animated dashed ring ─────────────────────────────────────────────────
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.strokeStyle = color
  ctx.lineWidth   = 2.5
  ctx.setLineDash([18, 10])
  ctx.lineDashOffset = -(Date.now() / 40) % 28
  ctx.stroke()
  ctx.restore()

  // ── Scanning laser line ──────────────────────────────────────────────────
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()
  const scanY = cy - r + ((Date.now() / 1200) % 1) * r * 2
  const grad  = ctx.createLinearGradient(cx - r, scanY, cx + r, scanY)
  grad.addColorStop(0,    "transparent")
  grad.addColorStop(0.4,  color + "80")
  grad.addColorStop(0.5,  color)
  grad.addColorStop(0.6,  color + "80")
  grad.addColorStop(1,    "transparent")
  ctx.beginPath()
  ctx.moveTo(cx - r, scanY)
  ctx.lineTo(cx + r, scanY)
  ctx.strokeStyle = grad
  ctx.lineWidth   = 2
  ctx.shadowBlur  = 12
  ctx.shadowColor = color
  ctx.stroke()
  ctx.restore()

  // ── Corner brackets ──────────────────────────────────────────────────────
  const bx = x * sx, by = y * sy, bw = w * sx, bh = h * sy
  const blen = 22
  ctx.strokeStyle = color
  ctx.lineWidth   = 3
  ctx.shadowBlur  = 8
  ctx.shadowColor = color
  const corners = [
    [[bx, by + blen], [bx, by], [bx + blen, by]],
    [[bx + bw - blen, by], [bx + bw, by], [bx + bw, by + blen]],
    [[bx, by + bh - blen], [bx, by + bh], [bx + blen, by + bh]],
    [[bx + bw - blen, by + bh], [bx + bw, by + bh], [bx + bw, by + bh - blen]],
  ]
  corners.forEach(pts => {
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    ctx.lineTo(pts[1][0], pts[1][1])
    ctx.lineTo(pts[2][0], pts[2][1])
    ctx.stroke()
  })
  ctx.shadowBlur = 0

  // ── Mesh landmark dots ───────────────────────────────────────────────────
  if (detection.mesh_landmarks?.length) {
    detection.mesh_landmarks.forEach((pt: any) => {
      ctx.beginPath()
      ctx.arc(pt.x * rect.width, pt.y * rect.height, 1.5, 0, Math.PI * 2)
      ctx.fillStyle = color + "cc"
      ctx.fill()
    })
  }
}

// ── Camera view ───────────────────────────────────────────────────────────────
function CameraView({ mode, setTab, logs = [] }: { mode: "scan" | "enroll", setTab: any, logs?: any[] }) {
  const [capturing, setCapturing]   = useState(false)
  const [detection, setDetection]   = useState<any>(null)
  const [success, setSuccess]       = useState<any>(null)
  const [formData, setFormData]     = useState({ name: "", id: "", instrument: "Begena", phone: "" })
  const [enrollMsg, setEnrollMsg]   = useState("")
  const [enrolling, setEnrolling]   = useState(false)
  const [countdown, setCountdown]   = useState<number | null>(null)
  const [lastError, setLastError]   = useState<string | null>(null)
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>()
  const [preferredFacingMode, setPreferredFacingMode] = useState<CameraFacingMode>("user")
  const [activeFacingMode, setActiveFacingMode] = useState<CameraFacingMode>("user")
  const [cameraReady, setCameraReady] = useState(false)

  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef    = useRef<number>(0)
  const markLockRef = useRef<{ id: string; at: number } | null>(null)
  const markInFlightRef = useRef(false)

  // Animate canvas
  const animate = useCallback(() => {
    if (canvasRef.current && videoRef.current && detection) {
      drawFaceIDOverlay(canvasRef.current, detection, videoRef.current)
    }
    rafRef.current = requestAnimationFrame(animate)
  }, [detection])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [animate])

  useEffect(() => {
    markLockRef.current = null
    markInFlightRef.current = false
    setSuccess(null)
    setLastError(null)
  }, [mode])

  const startScanner = useCallback(() => {
    setLastError(null)
    setDetection(null)
    setCountdown(null)
    setCameraReady(false)
    setCapturing(true)
  }, [])

  const stopScanner = useCallback(() => {
    setCapturing(false)
    setCameraReady(false)
    setDetection(null)
    setCountdown(null)
    markLockRef.current = null
    markInFlightRef.current = false
    stopCameraStream(streamRef.current)
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const switchCamera = useCallback(() => {
    setLastError(null)
    setDetection(null)
    setCountdown(null)
    setCameraReady(false)

    if (cameraDevices.length > 1) {
      const currentIndex = cameraDevices.findIndex((device) => device.deviceId === selectedDeviceId)
      const nextDevice = cameraDevices[(currentIndex + 1 + cameraDevices.length) % cameraDevices.length]
      setSelectedDeviceId(nextDevice.deviceId)
      return
    }

    setSelectedDeviceId(undefined)
    setPreferredFacingMode((current) => current === "user" ? "environment" : "user")
  }, [cameraDevices, selectedDeviceId])

  // Trigger auto registration capture
  const triggerAutoEnroll = useCallback(async () => {
    if (!formData.name || !formData.id) {
      setEnrollMsg("⚠️ Enter Name and ID before auto-capturing!")
      return
    }
    setEnrolling(true)
    setEnrollMsg("Capturing Face...")
    if (!videoRef.current || videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
      setEnrollMsg("Camera is still starting. Try again in a moment.")
      setEnrolling(false)
      return
    }
    const canvas = document.createElement("canvas")
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const context = canvas.getContext("2d")
    if (!context) {
      setEnrollMsg("Camera capture failed. Try again.")
      setEnrolling(false)
      return
    }
    context.drawImage(videoRef.current, 0, 0)
    const imageBase64 = canvas.toDataURL("image/jpeg", 0.8)

    try {
      const res  = await fetch(`${API_BASE}/register_student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, image: imageBase64 })
      })
      const data = await res.json()
      setEnrollMsg(data.message)
      if (data.status === "success") {
        setFormData({ name: "", id: "", instrument: "Begena", phone: "" })
        setSuccess({
          name: formData.name,
          instrument: formData.instrument,
          msg: "Face Registered Successfully!"
        })
        setTimeout(() => {
          setSuccess(null)
          setTab("scan") // Redirect to Scan Tab
        }, 3000)
      }
    } catch {
      setEnrollMsg("Backend offline.")
    }
    setEnrolling(false)
  }, [formData, setTab])

  // Countdown timer trigger
  useEffect(() => {
    if (countdown === null) return
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCountdown(null)
      triggerAutoEnroll()
    }
  }, [countdown, triggerAutoEnroll])

  // Handle device camera stream lifecycle.
  useEffect(() => {
    if (!capturing) return

    let stream: MediaStream | null = null
    let attachedVideo: HTMLVideoElement | null = null
    let cancelled = false

    const startCamera = async () => {
      setCameraReady(false)
      setLastError(null)

      try {
        const nextStream = await requestCameraStream({
          deviceId: selectedDeviceId,
          facingMode: preferredFacingMode,
        })

        if (cancelled) {
          stopCameraStream(nextStream)
          return
        }

        stream = nextStream
        streamRef.current = nextStream
        setActiveFacingMode(getStreamFacingMode(nextStream, preferredFacingMode))

        if (videoRef.current) {
          attachedVideo = videoRef.current
          await attachCameraStream(attachedVideo, nextStream)
        }

        if (cancelled) return

        const devices = await listVideoInputDevices()
        if (!cancelled) {
          setCameraDevices(devices)
          setCameraReady(true)
        }
      } catch (err) {
        console.error("Camera access error:", err)
        stopCameraStream(stream)
        streamRef.current = null
        if (!cancelled) {
          setCameraReady(false)
          setCapturing(false)
          setLastError(formatCameraError(err))
        }
      }
    }

    startCamera()

    return () => {
      cancelled = true
      stopCameraStream(stream)
      if (streamRef.current === stream) {
        streamRef.current = null
      }
      if (attachedVideo?.srcObject === stream) {
        attachedVideo.srcObject = null
      }
    }
  }, [capturing, preferredFacingMode, selectedDeviceId])

  // Poll status using frontend camera frame
  useEffect(() => {
    if (!capturing || !cameraReady) return

    let isPolling = true
    let isFetching = false

    const poll = async () => {
      if (!isPolling || !videoRef.current || videoRef.current.videoWidth === 0 || isFetching) {
        if (isPolling) setTimeout(poll, 250)
        return
      }

      isFetching = true
      try {
        const canvas = document.createElement("canvas")
        canvas.width = videoRef.current.videoWidth
        canvas.height = videoRef.current.videoHeight
        canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0)
        const imageBase64 = canvas.toDataURL("image/jpeg", 0.6)

        const res = await fetch(`${API_BASE}/process_frame`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: imageBase64 })
        })
        const data = await res.json()

        if (data.error) {
          throw new Error("Backend: " + data.error)
        }

        setDetection(data)
        setLastError(null) // clear previous errors if successful

        // Auto-mark attendance once per detected identity instead of once per frame.
        if (mode === "scan" && data.matches?.length > 0) {
          const match = data.matches.find((item: any) => item?.id)
          const now = Date.now()
          const lock = markLockRef.current
          const isLocked = Boolean(lock && match?.id && lock.id === match.id && now - lock.at < MARK_COOLDOWN_MS)

          if (match?.id && !isLocked && !markInFlightRef.current) {
            markLockRef.current = { id: match.id, at: now }
            markInFlightRef.current = true

            try {
              const r = await fetch(`${API_BASE}/mark_attendance`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: match.id })
              })
              const d = await r.json()
              const student = d.student || match
              const ok = d.status === "success" || d.status === "already_marked"

              if (ok) {
                setSuccess({
                  ...match,
                  ...student,
                  status: d.status,
                  msg: d.message || `${student.name || match.name || "Student"} marked`
                })
                setTimeout(() => setSuccess(null), 4000)
              } else {
                setLastError(d.message || "Could not mark attendance for this student.")
              }
            } finally {
              markInFlightRef.current = false
            }
          }
        }

        // Auto-trigger registration countdown on face alignment complete
        if (mode === "enroll" && data.ready_to_capture && countdown === null && !enrolling) {
          if (formData.name && formData.id) {
            setCountdown(3) // 3 seconds countdown
          } else {
            setEnrollMsg("⚠️ Please enter Name & ID in the form first!")
          }
        }
      } catch (err: any) {
        console.error("Polling error", err)
        setLastError(err.message || String(err))
      } finally {
        isFetching = false
        if (isPolling) setTimeout(poll, 250)
      }
    }

    poll()

    return () => {
      isPolling = false
    }

  }, [capturing, cameraReady, mode, countdown, enrolling, formData])

  const isAligned = detection?.ready_to_capture ?? false
  const lightingOk = detection?.lighting_ok ?? true
  const eyeBiometric = detection?.eye_biometric
  const shouldMirrorCamera = activeFacingMode === "user"

  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full">
      {/* Camera Panel */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="relative bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl aspect-[3/4] sm:aspect-[4/3]">

          {!capturing ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black">
              <div className="relative">
                <div className="h-32 w-32 rounded-full border-2 border-yellow-500/40 flex items-center justify-center">
                  <div className="h-24 w-24 rounded-full border border-yellow-400/60 flex items-center justify-center animate-pulse">
                    <Fingerprint className="h-12 w-12 text-yellow-400" />
                  </div>
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-yellow-500 animate-ping opacity-20" />
              </div>
              <p className="text-white/60 text-sm text-center max-w-[220px]">
                {mode === "scan" ? "Start scanner to mark attendance" : "Align your face in the circle to register"}
              </p>
              <Button
                onClick={startScanner}
                className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold px-10 h-12 rounded-2xl shadow-xl shadow-yellow-500/15"
              >
                <Camera className="h-4 w-4 mr-2" /> Start Face ID
              </Button>
              {lastError && (
                <p className="max-w-sm px-4 text-center text-xs font-bold text-red-300">
                  {lastError}
                </p>
              )}
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${shouldMirrorCamera ? "-scale-x-100" : ""}`}
              />
              <canvas
                ref={canvasRef}
                className={`absolute inset-0 w-full h-full pointer-events-none ${shouldMirrorCamera ? "-scale-x-100" : ""}`}
              />

              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white z-[20]">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 rounded-full border-4 border-yellow-400 border-t-transparent animate-spin" />
                    <p className="text-xs font-bold uppercase tracking-widest text-white/60">Starting camera</p>
                  </div>
                </div>
              )}

              {/* Debug error overlay */}
              {lastError && (
                <div className="absolute bottom-4 left-4 right-4 bg-red-900/80 text-white p-2 text-xs rounded break-all z-50">
                  {lastError}
                </div>
              )}

              {/* Guidance badge */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[30]">
                <motion.div
                  key={detection?.guidance}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`px-6 py-2 rounded-full text-sm font-bold backdrop-blur-md border ${
                    isAligned
                      ? "bg-green-500/20 border-green-500/50 text-green-400"
                      : !lightingOk
                      ? "bg-red-500/20 border-red-500/50 text-red-400"
                      : "bg-black/60 border-white/10 text-white"
                  }`}
                >
                  {detection?.guidance || "Searching..."}
                </motion.div>
              </div>

              {/* Countdown overlay */}
              {countdown !== null && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-md z-[50]">
                  <motion.div
                    key={countdown}
                    initial={{ scale: 0.3, opacity: 0 }}
                    animate={{ scale: [0.8, 1.2, 1], opacity: 1 }}
                    className="text-8xl font-black font-mono text-yellow-400 drop-shadow-[0_0_40px_#FFD700] mb-4"
                  >
                    {countdown > 0 ? countdown : "Smile! 📸"}
                  </motion.div>
                  <p className="text-white/60 text-xs font-bold uppercase tracking-widest animate-pulse">Hold still, capturing face...</p>
                </div>
              )}

              {/* Lighting ok indicator */}
              <div className="absolute bottom-4 left-4 text-[10px] text-white/30 font-mono space-y-0.5 z-[30]">
                <div className="flex items-center gap-1">
                  LIGHTING: {lightingOk ? <span className="text-green-400 font-bold">OK</span> : <span className="text-red-400 font-bold">LOW</span>}
                </div>
                <div>CAMERA: {activeFacingMode === "environment" ? "REAR" : "FRONT"}</div>
                <div>
                  EYE ID: {eyeBiometric?.available ? (
                    <span className="text-green-400 font-bold">{Math.round(eyeBiometric.quality || 0)}%</span>
                  ) : (
                    <span className="text-yellow-400 font-bold">{eyeBiometric?.enabled ? "SCANNING" : "OFF"}</span>
                  )}
                </div>
              </div>

              <div className="absolute top-4 right-4 z-[30] flex gap-2">
                <button
                  type="button"
                  onClick={switchCamera}
                  className="bg-black/60 border border-white/10 text-white/70 text-xs px-3 py-1.5 rounded-xl hover:text-white flex items-center gap-1.5"
                  title="Switch camera"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Switch</span>
                </button>
                <button
                  type="button"
                  onClick={stopScanner}
                  className="bg-black/60 border border-white/10 text-white/70 text-xs px-3 py-1.5 rounded-xl hover:text-white"
                >
                  Stop
                </button>
              </div>
            </>
          )}
        </div>

        {/* Dynamic live feed of today's checked-in students (directly under camera) */}
        {mode === "scan" && (
          <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider">
                <ClipboardList className="h-4 w-4 text-yellow-400" /> Today's Check-ins ({logs.length})
              </h3>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {logs.map((log, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 hover:border-yellow-500/20 rounded-2xl transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-yellow-500/10 text-yellow-400 flex items-center justify-center font-bold text-sm">
                      {log.Name?.[0] ?? "?"}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{log.Name}</p>
                      <p className="text-[10px] text-white/40">{log.Instrument} • {log.ID}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-yellow-400 bg-yellow-500/10 px-2.5 py-1 rounded-lg border border-yellow-500/20">
                    {log.Time}
                  </span>
                </motion.div>
              ))}

              {!logs.length && (
                <div className="text-center py-8 opacity-20 border border-dashed border-white/10 rounded-2xl">
                  <ClipboardList className="h-8 w-8 mx-auto mb-2 text-white/50" />
                  <p className="text-[10px] font-bold uppercase tracking-wider">No check-ins today</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Side Panel */}
      <div className="w-full lg:w-80 flex flex-col gap-4">
        {mode === "scan" ? (
          <div className="bg-white/5 rounded-3xl p-6 border border-white/10 flex-1">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <Eye className="h-4 w-4 text-yellow-400" /> Live Match
            </h3>
            <AnimatePresence>
              {detection?.matches?.map((m: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="flex items-center gap-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl mb-3"
                >
                  <div className="h-12 w-12 rounded-xl bg-yellow-500 text-gray-900 flex items-center justify-center font-black text-lg">
                    {m.name?.[0] ?? "?"}
                  </div>
                  <div>
                    <p className="font-bold text-white">{m.name || "Matched student"}</p>
                    <p className="text-xs text-yellow-400">
                      {m.confidence ?? "--"}% match{m.eye_verified ? ` • Eye ID ${m.eye_confidence ?? "--"}%` : ""}
                    </p>
                    {m.method && (
                      <p className="text-[10px] text-white/35 uppercase tracking-wider mt-0.5">{m.method}</p>
                    )}
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-green-400 ml-auto" />
                </motion.div>
              ))}
            </AnimatePresence>
            {!detection?.matches?.length && (
              <div className="flex flex-col items-center justify-center py-12 opacity-20">
                <Fingerprint className="h-16 w-16 mb-3" />
                <p className="text-xs font-bold uppercase tracking-widest">Awaiting identity...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white/5 rounded-3xl p-6 border border-white/10 space-y-4">
            <h3 className="font-bold text-white flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-yellow-400" /> Enroll Student
            </h3>
            {[
              { label: "Full Name", key: "name", placeholder: "Samuel Tadesse" },
              { label: "Student ID", key: "id",   placeholder: "STU-001" },
              { label: "Phone",     key: "phone", placeholder: "+251 9..." },
            ].map(f => (
              <div key={f.key} className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold">{f.label}</label>
                <Input
                  value={(formData as any)[f.key]}
                  onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  className="h-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20"
                />
              </div>
            ))}
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Instrument</label>
              <select
                value={formData.instrument}
                onChange={e => setFormData({ ...formData, instrument: e.target.value })}
                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl text-white px-4 outline-none font-bold"
              >
                <option className="bg-gray-900">Begena</option>
                <option className="bg-gray-900">Krar</option>
                <option className="bg-gray-900">Masinko</option>
              </select>
            </div>

            {/* Alignment status */}
            <div className={`text-xs font-bold text-center py-2.5 rounded-xl transition-all ${
              isAligned ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
            }`}>
              {isAligned
                ? eyeBiometric?.available
                  ? `Face + Eye ID ready (${Math.round(eyeBiometric.quality || 0)}%)`
                  : "Face aligned - keep both eyes visible"
                : `Guidance: ${detection?.guidance || "Start scanner first"}`}
            </div>

            <Button
              onClick={triggerAutoEnroll}
              disabled={enrolling || !isAligned || !cameraReady}
              className={`w-full h-12 font-bold rounded-xl transition-all ${
                isAligned && cameraReady
                  ? "bg-yellow-500 hover:bg-yellow-400 text-gray-900 shadow-lg shadow-yellow-500/20 font-extrabold"
                  : "bg-white/5 text-white/20 cursor-not-allowed"
              }`}
            >
              <Camera className="h-4 w-4 mr-2" />
              {enrolling ? "Registering..." : cameraReady ? "Capture & Register" : "Start Camera First"}
            </Button>

            {enrollMsg && (
              <p className={`text-xs text-center font-bold px-2 py-1.5 rounded-lg ${enrollMsg.includes("✅") || enrollMsg.includes("Success") ? "text-green-400 bg-green-500/10" : "text-yellow-400 bg-yellow-500/10"}`}>
                {enrollMsg}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/95 backdrop-blur-2xl"
          >
            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: [0, 1.2, 1] }} 
              transition={{ duration: 0.5 }}
              className={`${success.status === "already_marked" ? "bg-yellow-500 shadow-[0_0_80px_#eab308]" : "bg-green-500 shadow-[0_0_80px_#22c55e]"} p-10 rounded-full mb-6`}
            >
              <CheckCircle2 className="h-20 w-20 text-white" />
            </motion.div>
            <h2 className="text-5xl font-serif font-black text-white mb-2 text-center px-6">{success.name || "Student"}</h2>
            <p className="text-green-400 font-bold uppercase tracking-widest text-sm mb-4">{success.instrument}</p>
            <div className="bg-white/10 px-8 py-3 rounded-2xl text-white font-bold animate-pulse">{success.msg}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AttendanceTest() {
  const [tab, setTab] = useState<"scan" | "enroll" | "students" | "logs">("scan")
  const [students, setStudents]     = useState<any>({})
  const [logs, setLogs]             = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, lRes] = await Promise.all([
          fetch(`${API_BASE}/students`),
          fetch(`${API_BASE}/today_attendance`)
        ])
        setStudents(await sRes.json())
        setLogs(await lRes.json())
      } catch { /* offline */ }
    }
    load()
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="min-h-screen bg-[#08090a] text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-4">
          <Link to="/admin">
            <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
              <ArrowLeft className="h-4 w-4 text-white/50" />
            </div>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">
              Face <span className="text-yellow-400">ID</span> Terminal
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-white/30">Biometric Attendance System</p>
          </div>
        </div>

        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 gap-1">
          {[
            { id: "scan",     icon: <Fingerprint className="h-3.5 w-3.5" />, label: "Scan"      },
            { id: "enroll",   icon: <UserPlus    className="h-3.5 w-3.5" />, label: "Enroll"    },
            { id: "students", icon: <Users       className="h-3.5 w-3.5" />, label: "Students"  },
            { id: "logs",     icon: <ClipboardList className="h-3.5 w-3.5"/>, label: "Logs"     },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                tab === t.id ? "bg-yellow-500 text-gray-900 shadow-lg shadow-yellow-500/20 font-extrabold" : "text-white/40 hover:text-white"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {(tab === "scan" || tab === "enroll") && (
            <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <CameraView mode={tab} setTab={setTab} logs={logs} />
            </motion.div>
          )}

          {tab === "students" && (
            <motion.div key="students" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(students).map(([id, s]: any) => (
                <div key={id} className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/10 group hover:border-red-500/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-xl bg-yellow-500 text-gray-900 flex items-center justify-center text-xl font-black">{s.name[0]}</div>
                    <div>
                      <p className="font-bold text-white">{s.name}</p>
                      <p className="text-xs text-yellow-400 uppercase tracking-widest">{s.instrument}</p>
                      <p className="text-[10px] text-white/20 mt-0.5">{id}</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (window.confirm("Delete this student and their registered faces?")) {
                        try {
                          await fetch(`${API_BASE}/delete_student`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id })
                          })
                          setStudents((prev: any) => {
                            const newStudents = { ...prev }
                            delete newStudents[id]
                            return newStudents
                          })
                        } catch {
                          alert("Failed to delete student.")
                        }
                      }
                    }}
                    className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    title="Delete Student"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              ))}
            </motion.div>
          )}

          {tab === "logs" && (
            <motion.div key="logs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              {logs.map((log, i) => (
                <div key={i} className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-bold text-white">{log.Name}</p>
                      <p className="text-xs text-yellow-400 uppercase tracking-widest">{log.Instrument} • {log.ID}</p>
                    </div>
                  </div>
                  <p className="text-2xl font-serif font-bold text-yellow-400">{log.Time}</p>
                </div>
              ))}
              {!logs.length && (
                <div className="text-center py-20 opacity-20">
                  <ClipboardList className="h-12 w-12 mx-auto mb-3" />
                  <p className="text-sm font-bold">No attendance logged today</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
