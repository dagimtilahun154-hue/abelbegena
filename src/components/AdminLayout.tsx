import { useEffect, useState, type ReactNode } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  CalendarCheck,
  CreditCard,
  FileCheck2,
  Home,
  ListMusic,
  LogOut,
  Menu,
  ShoppingBag,
  Settings,
  UserPlus,
  Users,
} from "lucide-react"
import { backendAuth, getStoredSession, isAdminUser } from "@/lib/backend"

const navItems = [
  { title: "Overview", to: "/admin", icon: <BarChart3 className="h-5 w-5" /> },
  { title: "Users & Roles", to: "/admin/users", icon: <Users className="h-5 w-5" /> },
  { title: "Students", to: "/admin/students", icon: <UserPlus className="h-5 w-5" /> },
  { title: "Registrations", to: "/admin/registrations", icon: <FileCheck2 className="h-5 w-5" /> },
  { title: "In-Person Reg.", to: "/admin/in-person-registration", icon: <UserPlus className="h-5 w-5" /> },
  { title: "Programs", to: "/admin/courses", icon: <BookOpen className="h-5 w-5" /> },
  { title: "Song Curriculum", to: "/admin/curriculum", icon: <ListMusic className="h-5 w-5" /> },
  { title: "Attendance", to: "/admin/attendance", icon: <CalendarCheck className="h-5 w-5" /> },
  { title: "Finance", to: "/admin/finance", icon: <CreditCard className="h-5 w-5" /> },
  { title: "Shop & Orders", to: "/admin/shop", icon: <ShoppingBag className="h-5 w-5" /> },
  { title: "Stock", to: "/admin/stock", icon: <Boxes className="h-5 w-5" /> },
  { title: "Reports", to: "/admin/reports", icon: <BarChart3 className="h-5 w-5" /> },
  { title: "Notifications", to: "/admin/notifications", icon: <Bell className="h-5 w-5" /> },
  { title: "Settings", to: "/admin/settings", icon: <Settings className="h-5 w-5" /> },
  { title: "Enroll Face ID", to: "/admin/enroll", icon: <UserPlus className="h-5 w-5" /> },
  { title: "Scanner", to: "/testattend", icon: <Settings className="h-5 w-5" /> },
  { title: "Public Site", to: "/", icon: <Home className="h-5 w-5" /> },
]

export default function AdminLayout({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    const verifyAdmin = async () => {
      const session = getStoredSession()
      if (!session) {
        navigate("/auth")
        return
      }

      try {
        const user = await backendAuth.me()
        if (!isAdminUser(user)) {
          navigate("/dashboard")
          return
        }
      } catch {
        navigate("/auth")
        return
      }

      setCheckingAccess(false)
    }

    verifyAdmin()
  }, [navigate])

  const handleLogout = async () => {
    await backendAuth.logout()
    navigate("/auth")
  }

  if (checkingAccess) {
    return (
      <div className="min-h-screen bg-[#FBFBFB] flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-brand-yellow border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-brand-grey/50 font-bold">Checking admin access...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <div className="lg:hidden sticky top-0 z-50 bg-[#f0f4f8]/95 backdrop-blur-xl border-b border-white/60 px-4 py-3">
        <div className="neo-flat-white rounded-2xl border border-white/50 px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/admin" className="flex items-center gap-3 min-w-0" onClick={() => setMobileNavOpen(false)}>
            <div className="bg-brand-yellow rounded-xl p-2 shrink-0">
              <img src="/images/logo.png" alt="Logo" className="h-7 w-7 object-contain" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-widest text-brand-grey/40">Admin Hub</p>
              <p className="font-serif font-bold text-brand-grey truncate">{title}</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMobileNavOpen((open) => !open)}
            className="neo-btn h-11 w-11 rounded-xl flex items-center justify-center text-brand-grey border border-white/50"
            aria-label="Toggle admin navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {mobileNavOpen && (
          <nav className="mt-3 neo-flat-white rounded-2xl border border-white/50 p-3 grid grid-cols-2 gap-2 max-h-[70vh] overflow-y-auto">
            {navItems.map((item) => {
              const active = location.pathname === item.to
              return (
                <Link
                  key={`mobile-${item.title}-${item.to}`}
                  to={item.to}
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition-all ${active ? "bg-brand-yellow text-brand-grey shadow-lg shadow-brand-yellow/20" : "bg-[#f8fafc] text-brand-grey/60 shadow-inner"}`}
                >
                  {item.icon}
                  <span className="truncate">{item.title}</span>
                </Link>
              )
            })}
            <button
              onClick={handleLogout}
              className="col-span-2 flex items-center justify-center gap-2 rounded-xl px-4 py-3 bg-brand-grey text-brand-yellow font-bold"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </nav>
        )}
      </div>

      <aside className="w-80 bg-brand-grey hidden lg:flex flex-col p-8 fixed h-full z-50">
        <div className="flex items-center gap-4 mb-12 px-4">
          <div className="bg-brand-yellow rounded-full p-2">
            <img src="/images/logo.png" alt="Logo" className="h-8 w-8 object-contain" />
          </div>
          <span className="text-2xl font-serif font-bold text-white tracking-tight">
            Admin<span className="text-brand-yellow">Hub</span>
          </span>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {navItems.map((item) => {
            const active = location.pathname === item.to
            return (
              <Link key={`${item.title}-${item.to}`} to={item.to} className="block w-full">
                <button className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${active ? "bg-brand-yellow text-brand-grey font-bold shadow-lg shadow-brand-yellow/20" : "text-white/60 hover:text-white hover:bg-white/5"}`}>
                  {item.icon}
                  <span className="text-sm font-medium">{item.title}</span>
                </button>
              </Link>
            )
          })}
        </div>

        <div className="pt-6 border-t border-white/5">
          <button onClick={handleLogout} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all text-white/60 hover:text-white hover:bg-white/5">
            <LogOut className="h-5 w-5" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      <main className="lg:ml-80 p-6 md:p-10 xl:p-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-serif font-bold text-brand-grey mb-2">{title}</h1>
            <p className="text-brand-grey/50 font-medium">{description}</p>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-white shadow-[4px_4px_10px_#d1d9e6,-4px_-4px_10px_#ffffff] flex items-center justify-center font-black text-brand-grey border border-white/40">
            AD
          </div>
        </header>
        {children}
      </main>
    </div>
  )
}
