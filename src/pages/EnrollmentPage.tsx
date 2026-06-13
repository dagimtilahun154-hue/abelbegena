import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Camera, UserPlus, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck, RefreshCcw } from "lucide-react"
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

export default function EnrollmentPage() {
  const [name, setName] = useState("")
  const [studentId, setStudentId] = useState("")
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState("")
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>()
  const [preferredFacingMode, setPreferredFacingMode] = useState<CameraFacingMode>("user")
  const [activeFacingMode, setActiveFacingMode] = useState<CameraFacingMode>("user")
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const cameraRequestRef = useRef(0)

  const startCamera = useCallback(async () => {
    const requestId = ++cameraRequestRef.current
    stopCameraStream(streamRef.current)
    streamRef.current = null
    setCameraReady(false)
    setMessage("")
    setStatus((current) => current === "success" ? current : "idle")

    try {
      const stream = await requestCameraStream({
        deviceId: selectedDeviceId,
        facingMode: preferredFacingMode,
      })

      if (requestId !== cameraRequestRef.current) {
        stopCameraStream(stream)
        return
      }

      streamRef.current = stream
      setActiveFacingMode(getStreamFacingMode(stream, preferredFacingMode))

      if (videoRef.current) {
        await attachCameraStream(videoRef.current, stream)
      }

      if (requestId !== cameraRequestRef.current) return

      setCameraDevices(await listVideoInputDevices())
      setCameraReady(true)
    } catch (err) {
      console.error("Camera Error:", err)
      if (requestId === cameraRequestRef.current) {
        setCameraReady(false)
        setStatus("error")
        setMessage(formatCameraError(err))
      }
    }
  }, [preferredFacingMode, selectedDeviceId])

  useEffect(() => {
    const videoElement = videoRef.current
    startCamera()
    return () => {
      cameraRequestRef.current += 1
      stopCameraStream(streamRef.current)
      streamRef.current = null
      if (videoElement) {
        videoElement.srcObject = null
      }
    }
  }, [startCamera])

  const switchCamera = useCallback(() => {
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

  const handleEnroll = async () => {
    if (!name || !studentId) return alert("Please enter the student's full name and ID")
    if (!cameraReady || !videoRef.current || videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
      setStatus("error")
      setMessage("Camera is not ready yet. Start the camera and try again.")
      return
    }
    
    setStatus('loading')
    try {
      // Capture frame from local video
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error("Camera capture failed. Try again.")
      }

      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
      const base64Image = canvas.toDataURL('image/jpeg', 0.9)
        
      const res = await fetch(`${API_BASE}/register_student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, id: studentId, instrument: "Begena", image: base64Image })
      })
        
      const data = await res.json()
      if (data.status === 'success') {
        setStatus('success')
        setMessage(data.message || `Successfully enrolled ${name} with Eye ID.`)
        setName("")
        setStudentId("")
        setTimeout(() => setStatus('idle'), 3000)
      } else {
        throw new Error(data.message)
      }
    } catch (err: any) {
      setStatus('error')
      setMessage(err.message || "Connection to Neural Engine failed.")
    }
  }

  const shouldMirrorCamera = activeFacingMode === "user"

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col">
      {/* Header */}
      <header className="p-8 flex items-center justify-between">
        <Link to="/admin">
          <Button variant="ghost" className="neo-btn gap-2 text-brand-grey font-bold rounded-xl px-4 py-2 hover:bg-slate-100">
            <ArrowLeft className="h-5 w-5" />
            Back to Admin
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-brand-yellow-dark" />
          <span className="font-serif font-bold text-xl text-brand-grey">Neural Enrollment Center</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left: Camera Preview */}
          <div className="relative group">
            <div className="absolute -inset-4 bg-brand-yellow/5 rounded-[3rem] blur-2xl group-hover:bg-brand-yellow/10 transition-all duration-700" />
            <div className="relative neo-flat aspect-[3/4] sm:aspect-video rounded-[2.5rem] overflow-hidden border-4 border-[#f0f4f8] p-2 bg-[#f0f4f8]">
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline 
                className={`w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 rounded-[2rem] ${shouldMirrorCamera ? "-scale-x-100" : ""}`}
              />
              <div className="absolute inset-2 border-[20px] border-white/5 pointer-events-none rounded-[2rem]" />
              <div className="absolute top-8 left-8 bg-[#f0f4f8]/90 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-2 text-brand-grey font-bold text-sm shadow-[2px_2px_5px_rgba(0,0,0,0.05),-2px_-2px_5px_#ffffff] border border-white/20">
                <Camera className="h-4 w-4" />
                BIOMETRIC LIVE SCAN
              </div>
              {cameraReady && (
                <button
                  type="button"
                  onClick={switchCamera}
                  className="absolute top-8 right-8 bg-black/40 backdrop-blur-md px-3 py-2 rounded-xl flex items-center gap-2 text-white hover:bg-black/50 font-bold text-xs border border-white/10"
                  title="Switch camera"
                >
                  <RefreshCcw className="h-4 w-4" />
                  <span className="hidden sm:inline">Switch</span>
                </button>
              )}
              {!cameraReady && (
                <div className="absolute inset-2 bg-[#2c2c2c]/90 rounded-[2rem] flex flex-col items-center justify-center gap-4 p-6 text-center">
                  <div className="h-12 w-12 rounded-full border-4 border-brand-yellow border-t-transparent animate-spin" />
                  <p className="text-white/80 text-sm font-bold">
                    {message || "Starting device camera..."}
                  </p>
                  {status === "error" && (
                    <Button
                      type="button"
                      onClick={startCamera}
                      className="bg-brand-yellow hover:bg-brand-yellow-dark text-brand-grey font-black rounded-2xl"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Start Camera
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Form */}
          <div className="space-y-10">
            <div>
              <h1 className="text-5xl font-serif font-bold text-brand-grey mb-4">Register New Student</h1>
              <p className="text-brand-grey/40 text-lg">Enter student details to initialize their neural identity.</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-brand-grey/40 ml-1">Full Name</label>
                <Input 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-16 bg-[#f0f4f8] border border-white/60 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] rounded-2xl px-6 text-lg focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-yellow/50 transition-all text-brand-grey placeholder:text-brand-grey/30" 
                  placeholder="e.g. Samuel Bekele" 
                />
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-brand-grey/40 ml-1">Student ID</label>
                <Input
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="h-16 bg-[#f0f4f8] border border-white/60 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] rounded-2xl px-6 text-lg focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-yellow/50 transition-all text-brand-grey placeholder:text-brand-grey/30"
                  placeholder="e.g. STU-001"
                />
              </div>

              <AnimatePresence mode="wait">
                {status === 'loading' ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Button disabled className="w-full h-20 bg-[#2c2c2c] text-white rounded-3xl font-black text-xl flex items-center justify-center gap-4 shadow-[4px_4px_10px_rgba(0,0,0,0.15)] border border-white/5">
                      <div className="h-6 w-6 border-4 border-brand-yellow border-t-transparent rounded-full animate-spin" />
                      ANALYZING BIOMETRICS...
                    </Button>
                  </motion.div>
                ) : status === 'success' ? (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <div className="w-full h-20 bg-green-500 text-white rounded-3xl font-black text-xl flex items-center justify-center gap-4 shadow-xl shadow-green-500/20">
                      <CheckCircle2 className="h-8 w-8" />
                      ENROLLMENT SUCCESSFUL
                    </div>
                  </motion.div>
                ) : (
                  <Button 
                    onClick={handleEnroll}
                    disabled={!cameraReady}
                    className="w-full h-20 bg-brand-yellow hover:bg-brand-yellow-dark text-brand-grey rounded-3xl font-black text-xl shadow-[4px_4px_10px_rgba(209,217,230,0.8),-4px_-4px_10px_#ffffff] hover:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1)] active:scale-[0.98] transition-all flex items-center justify-center gap-4 border border-brand-yellow/20"
                  >
                    <UserPlus className="h-8 w-8" />
                    CREATE NEURAL PROFILE
                  </Button>
                )}
              </AnimatePresence>

              {status === 'error' && (
                <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 font-bold border border-red-100">
                  <AlertCircle className="h-5 w-5" />
                  {message}
                </div>
              )}

              {status === 'success' && message && (
                <div className="p-4 bg-green-50 text-green-700 rounded-2xl flex items-center gap-3 font-bold border border-green-100">
                  <CheckCircle2 className="h-5 w-5" />
                  {message}
                </div>
              )}
            </div>

            <div className="pt-10 border-t border-brand-grey/5">
              <div className="flex items-center gap-4 text-brand-grey/30">
                <ShieldCheck className="h-5 w-5" />
                <p className="text-sm font-medium">Face and Eye ID biometric templates active.</p>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
