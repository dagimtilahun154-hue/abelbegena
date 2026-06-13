import React, { useState } from "react"
import { motion } from "framer-motion"
import { Lock, Mail, ChevronRight, ArrowLeft, Globe, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Link, useNavigate } from "react-router-dom"
import { backendAuth, isAdminUser, BackendError } from "@/lib/backend"
import { normalizeLogin } from "@/lib/adminAuth"
import { useLanguage } from "@/contexts/LanguageContext"

export default function AuthPage() {
  const { t } = useLanguage()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const navigate = useNavigate()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg("")
    setSuccessMsg("")

    try {
      if (!isLogin) {
        navigate("/register")
        return
      }

      const session = await backendAuth.login(normalizeLogin(email), password)
      navigate(isAdminUser(session.user) ? "/admin" : "/dashboard")
    } catch (error: unknown) {
      if (error instanceof BackendError) {
        if (error.status === 0) {
          setErrorMsg(t('auth.errCannotReachBackend'))
        } else if (error.status === 401) {
          setErrorMsg(t('auth.errInvalidCredentials'))
        } else {
          setErrorMsg(error.message)
        }
      } else if (error instanceof Error) {
        setErrorMsg(error.message)
      } else {
        setErrorMsg(t('auth.errUnexpected'))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    setErrorMsg(t('auth.errGoogleNotConnected'))
    setSuccessMsg("")
  }

  const handleForgotPassword = async () => {
    setErrorMsg("")
    setSuccessMsg("")
    if (!email.trim()) {
      setErrorMsg(t('auth.errEnterEmailFirst'))
      return
    }

    setLoading(true)
    try {
      const result = await backendAuth.forgotPassword(normalizeLogin(email))
      setSuccessMsg(result.resetUrl ? `${t('auth.msgResetLinkCreated')}${result.resetUrl}` : t('auth.msgResetLinkSent'))
    } catch (error: unknown) {
      if (error instanceof BackendError && error.status === 0) {
        setErrorMsg(t('auth.errCannotReachBackendReset'))
      } else if (error instanceof Error) {
        setErrorMsg(error.message)
      } else {
        setErrorMsg(t('auth.errCouldNotRequestReset'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-stretch bg-white">
      <div className="hidden lg:flex lg:w-1/2 bg-brand-grey relative overflow-hidden items-center justify-center p-24">
        <div className="absolute inset-0 bg-[url('/images/hero-begena-final.png')] bg-cover bg-center opacity-30 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-grey via-brand-grey/20 to-transparent" />

        <div className="relative z-10 text-center max-w-lg">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-brand-yellow mb-6">{t('auth.welcomeBack')}</h2>
          <p className="text-xl text-white/60 font-light leading-relaxed">
            {t('auth.accessAccount')}
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16 lg:p-24 relative">
        <Link to="/" className="absolute top-8 right-8 flex items-center gap-2 text-brand-grey/40 hover:text-brand-grey transition-colors group">
          <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
          <span className="hidden sm:inline">{t('auth.backToHome')}</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md pt-12 md:pt-0"
        >
          <div className="mb-10 flex flex-col items-center md:items-start">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-brand-yellow rounded-full p-4 shadow-xl border-4 border-white/40 mb-8 inline-flex"
            >
              <img src="/images/logo.png" alt="Logo" className="h-12 w-12 md:h-14 md:w-14 object-contain drop-shadow-md" />
            </motion.div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-brand-grey mb-3 text-center md:text-left w-full">
              {isLogin ? t('auth.welcomeBack') : t('auth.registerFirst')}
            </h1>
            <p className="text-brand-grey/60 text-center md:text-left w-full leading-relaxed">
              {t('auth.studentsReceiveEmail')}
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleAuth}>
            {(errorMsg || successMsg) && (
              <div className={`p-4 rounded-xl text-sm font-medium break-words ${successMsg ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                {successMsg || errorMsg}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-[0.2em] text-brand-grey/40 ml-1">{t('auth.emailOrUsername')}</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-brand-grey/20" />
                <Input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required={isLogin}
                  className="pl-12 h-14 rounded-2xl border-brand-grey/5 bg-slate-50 focus:bg-white transition-all text-lg"
                  placeholder={t('auth.emailPlaceholder')}
                />
              </div>
            </div>

            {isLogin && (
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-brand-grey/40 ml-1">{t('auth.password')}</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-brand-grey/20" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-12 pr-12 h-14 rounded-2xl border-brand-grey/5 bg-slate-50 focus:bg-white transition-all text-lg"
                    placeholder={t('auth.passwordPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-grey/30 hover:text-brand-grey transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            )}

            {isLogin && (
              <div className="text-right">
                <button type="button" onClick={handleForgotPassword} className="text-sm font-bold text-brand-yellow-dark hover:underline">
                  {t('auth.forgotPassword')}
                </button>
              </div>
            )}

            <Button disabled={loading} className="w-full h-14 bg-brand-grey hover:bg-brand-grey-dark text-brand-yellow rounded-2xl font-black text-lg shadow-xl shadow-brand-grey/10 group">
              {loading ? t('auth.processing') : isLogin ? t('auth.enterPortal') : t('auth.openRegistration')}
              {!loading && <ChevronRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-brand-grey/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase font-black text-brand-grey/40 tracking-widest">
                <span className="bg-white px-4">{t('auth.or')}</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              className="w-full h-14 rounded-2xl font-bold text-lg border-brand-grey/10 hover:bg-slate-50 flex items-center justify-center gap-3"
            >
              <Globe className="h-5 w-5 text-blue-500" />
              {t('auth.continueWithGoogle')}
            </Button>
          </form>

          <div className="mt-12 text-center pt-8 border-t border-brand-grey/5">
            <p className="text-brand-grey/60">
              {isLogin ? t('auth.newToAbel') : t('auth.alreadyApproved')}
              <button
                onClick={() => {
                  setIsLogin(!isLogin)
                  setErrorMsg("")
                  setSuccessMsg("")
                }}
                className="ml-2 font-black text-brand-grey hover:text-brand-yellow-dark transition-colors"
              >
                {isLogin ? t('auth.registerNow') : t('auth.login')}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
