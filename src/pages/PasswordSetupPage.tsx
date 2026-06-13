import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, Music2, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BackendError, backendAuth, type PasswordTokenPreview } from "@/lib/backend"

export default function PasswordSetupPage() {
  const [params] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewFailed, setPreviewFailed] = useState(false)
  const [preview, setPreview] = useState<PasswordTokenPreview | null>(null)
  const [message, setMessage] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  const token = params.get("token") || ""
  const isReset = location.pathname.includes("reset-password")
  const tokenType: "ACCOUNT_SETUP" | "PASSWORD_RESET" = isReset ? "PASSWORD_RESET" : "ACCOUNT_SETUP"
  const title = isReset ? "Reset Password" : "Set Up Your Password"
  const actionLabel = isReset ? "Reset Password" : "Create Password"

  const helper = useMemo(() => {
    if (!token) return "This link is missing its token. Request a fresh email link from the school."
    return isReset
      ? "Create a new password for your Abel Begena account."
      : "Your admission has been approved. Create your password to enter the student portal."
  }, [isReset, token])

  const allSongs = useMemo(() => {
    const enrollments = preview?.student?.enrollments || []

    return enrollments.flatMap((enrollment) =>
      (enrollment.songs || []).map((song) => ({
        ...song,
        programName: enrollment.program?.name || "Program",
      })),
    )
  }, [preview])

  useEffect(() => {
    let active = true

    if (!token) {
      setPreview(null)
      setPreviewFailed(true)
      return () => {
        active = false
      }
    }

    setPreviewLoading(true)
    setPreviewFailed(false)
    setErrorMsg("")
    backendAuth
      .getPasswordTokenPreview(token, tokenType)
      .then(({ preview: nextPreview }) => {
        if (!active) return
        setPreview(nextPreview)
      })
      .catch((error: unknown) => {
        if (!active) return
        setPreview(null)
        setPreviewFailed(true)
        if (error instanceof BackendError) {
          setErrorMsg(error.message)
        } else if (error instanceof Error) {
          setErrorMsg(error.message)
        } else {
          setErrorMsg("Could not verify this account setup link.")
        }
      })
      .finally(() => {
        if (active) setPreviewLoading(false)
      })

    return () => {
      active = false
    }
  }, [token, tokenType])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setErrorMsg("")
    setMessage("")

    if (!token) {
      setErrorMsg("Token is missing from this link.")
      return
    }

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.")
      return
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.")
      return
    }

    setLoading(true)
    try {
      if (isReset) {
        await backendAuth.resetPassword(token, password)
      } else {
        await backendAuth.setupPassword(token, password)
      }
      setMessage("Password saved. You can now log in with your email and new password.")
      setTimeout(() => navigate("/auth"), 1200)
    } catch (error: unknown) {
      if (error instanceof BackendError) {
        setErrorMsg(error.message)
      } else if (error instanceof Error) {
        setErrorMsg(error.message)
      } else {
        setErrorMsg("Could not save password.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-8 items-stretch">
        <section className="bg-[#2c2c2c] rounded-[2rem] p-10 text-white shadow-[8px_8px_24px_rgba(163,177,198,0.35),-8px_-8px_24px_#ffffff] overflow-hidden relative">
          <div className="absolute -right-16 -bottom-16 h-64 w-64 rounded-full bg-brand-yellow/10" />
          <Link to="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-16 font-bold">
            <ArrowLeft className="h-4 w-4" />
            Back to site
          </Link>
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-brand-yellow flex items-center justify-center mb-8">
              <img src="/images/logo.png" alt="Abel Begena" className="h-11 w-11 object-contain" />
            </div>
            <p className="text-brand-yellow font-black uppercase tracking-[0.25em] text-xs mb-4">Account Access</p>
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6">{title}</h1>
            <p className="text-white/60 leading-relaxed">{helper}</p>

            {preview?.student && (
              <div className="mt-10 rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <p className="text-xs font-black uppercase tracking-widest text-brand-yellow/70 mb-3">Student Account</p>
                <div className="flex items-center gap-4">
                  {preview.student.profilePhotoUrl ? (
                    <img src={preview.student.profilePhotoUrl} alt={preview.student.fullName} className="h-14 w-14 rounded-2xl object-cover border border-white/20" />
                  ) : (
                    <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center">
                      <UserRound className="h-6 w-6 text-brand-yellow" />
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-white">{preview.student.fullName}</p>
                    <p className="text-sm text-white/50">Admission {preview.student.admissionNumber}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <form onSubmit={submit} className="neo-flat-white rounded-[2rem] border border-white/50 p-8 md:p-10">
          <div className="mb-8">
            <h2 className="text-3xl font-serif font-bold text-brand-grey mb-2">{actionLabel}</h2>
            <p className="text-brand-grey/50">Use at least 8 characters. Keep it private and memorable.</p>
          </div>

          {(errorMsg || message) && (
            <div className={`mb-6 rounded-2xl p-4 text-sm font-bold ${message ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
              {message || errorMsg}
            </div>
          )}

          {previewLoading && (
            <div className="mb-6 rounded-2xl border border-brand-grey/10 bg-white/70 p-4 text-sm font-bold text-brand-grey/50">
              Verifying your secure account link...
            </div>
          )}

          {preview && (
            <div className="mb-8 rounded-[1.5rem] border border-white/70 bg-[#f8fafc] p-5 shadow-inner">
              <p className="text-xs font-black uppercase tracking-widest text-brand-grey/40 mb-3">Account Details</p>
              <div className="space-y-2 text-sm text-brand-grey/70">
                <p><span className="font-bold text-brand-grey">Name:</span> {preview.student?.fullName || preview.user.fullName}</p>
                <p><span className="font-bold text-brand-grey">Email:</span> {preview.user.email}</p>
                {preview.student && <p><span className="font-bold text-brand-grey">Student ID:</span> {preview.student.id}</p>}
              </div>

              {!isReset && preview.student && (
                <div className="mt-5 border-t border-brand-grey/10 pt-5">
                  <div className="flex items-center gap-2 text-brand-grey mb-3">
                    <Music2 className="h-4 w-4 text-brand-yellow-dark" />
                    <p className="text-sm font-black uppercase tracking-widest">Enrolled Songs</p>
                  </div>
                  {allSongs.length > 0 ? (
                    <div className="space-y-2">
                      {allSongs.slice(0, 6).map((song) => (
                        <div key={`${song.programName}-${song.songId}`} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm">
                          <div>
                            <p className="font-bold text-brand-grey">{song.title}</p>
                            <p className="text-xs text-brand-grey/40">{song.programName}{song.level?.name ? ` / ${song.level.name}` : ""}</p>
                          </div>
                          <span className="shrink-0 rounded-full bg-brand-yellow/20 px-3 py-1 text-[11px] font-black uppercase text-brand-grey/70">{song.status.replaceAll("_", " ")}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-brand-grey/50">Your curriculum will appear here after the admin assigns your program and songs.</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-brand-grey/40 ml-1">New Password</label>
              <div className="relative mt-2">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-brand-grey/20" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pl-12 pr-12 h-14 rounded-2xl border-white/50 bg-[#f8fafc] shadow-inner"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-grey/30 hover:text-brand-grey"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-widest text-brand-grey/40 ml-1">Confirm Password</label>
              <Input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-2 h-14 rounded-2xl border-white/50 bg-[#f8fafc] shadow-inner"
                placeholder="Confirm new password"
              />
            </div>

            <Button disabled={loading || previewLoading || previewFailed || !token} className="w-full h-14 rounded-2xl bg-brand-grey text-brand-yellow hover:bg-brand-grey-dark font-black">
              {loading ? "Saving..." : actionLabel}
            </Button>

            {message && (
              <div className="flex items-center gap-3 text-green-700 bg-green-50 rounded-2xl p-4">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-bold">Redirecting to login...</span>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
