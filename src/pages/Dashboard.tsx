import { useEffect, useState, type ReactNode } from "react"
import {
  Bell,
  BookOpen,
  CheckCircle2,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Music,
  Settings,
  ShoppingBag,
  Target,
  Trophy,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Link, useNavigate } from "react-router-dom"
import { backendApi, backendAuth } from "@/lib/backend"
import { listLocalNotifications, type LocalNotice } from "@/lib/localNotifications"

type StudentCourse = {
  id: string
  course_name: string
  instructor: string | null
  level: string | null
  progress: number
  current_song: string | null
  next_lesson: string | null
  completed_lessons: number
  total_lessons: number
  delivery_mode: string | null
}

const SidebarLink = ({ icon, title, to = "#", active = false }: { icon: ReactNode; title: string; to?: string; active?: boolean }) => (
  <Link to={to} className="block w-full">
    <button className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${active ? "bg-brand-yellow text-brand-grey font-bold shadow-lg shadow-brand-yellow/20" : "text-white/60 hover:text-white hover:bg-white/5"}`}>
      {icon}
      <span className="text-sm font-medium">{title}</span>
    </button>
  </Link>
)

const MobileLink = ({ icon, title, to = "#", active = false }: { icon: ReactNode; title: string; to?: string; active?: boolean }) => (
  <Link to={to} className={`shrink-0 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all ${active ? "bg-brand-yellow text-brand-grey shadow-lg shadow-brand-yellow/20" : "bg-[#f8fafc] text-brand-grey/60 shadow-inner"}`}>
    {icon}
    <span>{title}</span>
  </Link>
)

const StatCard = ({ title, value, icon, tone = "yellow" }: { title: string; value: string; icon: ReactNode; tone?: "yellow" | "green" | "blue" | "red" }) => {
  const tones = {
    yellow: "bg-brand-yellow/10 text-brand-yellow-dark",
    green: "bg-green-50 text-green-600",
    blue: "bg-blue-50 text-blue-600",
    red: "bg-red-50 text-red-500",
  }
  return (
    <div className="neo-flat-white p-6 rounded-[2rem] border border-white/40 transition-transform duration-300 hover:scale-[1.02]">
      <div className={`p-3 rounded-xl w-fit mb-5 ${tones[tone]}`}>{icon}</div>
      <h3 className="text-brand-grey/40 text-xs font-black uppercase tracking-widest mb-1">{title}</h3>
      <p className="text-3xl font-serif font-bold text-brand-grey">{value}</p>
    </div>
  )
}

const buildCourseFromSongProgress = (payload: any): StudentCourse | null => {
  if (!payload?.enrollment) {
    return null
  }

  const levelSummary = payload.levelSummary || []
  const totalSongs = levelSummary.reduce((sum: number, item: any) => sum + Number(item.totalSongs || 0), 0)
  const completedSongs = payload.completed?.length || 0
  const progress = totalSongs ? Math.round((completedSongs / totalSongs) * 100) : 0

  return {
    id: String(payload.enrollment.id),
    course_name: payload.enrollment.program?.name || "Current Training Program",
    instructor: payload.enrollment.group?.instructorName || "School instructor",
    level: payload.current?.song?.level?.name || payload.enrollment.program?.skillLevel || "All levels",
    progress,
    current_song: payload.current?.song?.title || null,
    next_lesson: payload.nextLocked?.song?.title || null,
    completed_lessons: completedSongs,
    total_lessons: totalSongs,
    delivery_mode: payload.enrollment.group?.name || payload.enrollment.batch?.name || "in person",
  }
}

export default function Dashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [courses, setCourses] = useState<StudentCourse[]>([])
  const [financeSummary, setFinanceSummary] = useState<any>(null)
  const [shopRequests, setShopRequests] = useState<any[]>([])
  const [notices, setNotices] = useState<LocalNotice[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState("")
  const navigate = useNavigate()

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const user = await backendAuth.me()
        setProfile({ email: user.email, name: user.fullName })

        const [studentProfile, songProgress, finance, shop] = await Promise.allSettled([
          backendApi.getOwnStudentProfile(),
          backendApi.getOwnSongProgress(),
          backendApi.getOwnFinanceSummary(),
          backendApi.listOwnShopRequests(),
        ])

        if (studentProfile.status === "fulfilled") {
          const student = studentProfile.value.student
          setProfile({
            email: student.email || user.email,
            name: [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ") || user.fullName,
          })
        }

        if (songProgress.status === "fulfilled") {
          const course = buildCourseFromSongProgress(songProgress.value)
          setCourses(course ? [course] : [])
        }

        if (finance.status === "fulfilled") {
          setFinanceSummary(finance.value)
        }

        if (shop.status === "fulfilled") {
          setShopRequests(shop.value.requests || [])
        }

        setNotices(listLocalNotifications().slice(0, 4))
      } catch (error: any) {
        if (error.status === 401) {
          navigate("/auth")
          return
        }
        setErrorMsg(error.message || "Could not load dashboard.")
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [navigate])

  const handleLogout = async () => {
    await backendAuth.logout()
    navigate("/auth")
  }

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) return name.substring(0, 2).toUpperCase()
    if (email) return email.substring(0, 2).toUpperCase()
    return "ST"
  }

  const averageProgress = courses.length ? Math.round(courses.reduce((sum, course) => sum + course.progress, 0) / courses.length) : 0
  const activeCourse = courses[0]
  const completedLessons = courses.reduce((sum, course) => sum + course.completed_lessons, 0)
  const totalLessons = courses.reduce((sum, course) => sum + course.total_lessons, 0)
  const balance = Number(financeSummary?.totals?.balance || 0)

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <div className="lg:hidden sticky top-0 z-50 bg-[#f0f4f8]/95 backdrop-blur-xl border-b border-white/60 px-4 py-3 space-y-3">
        <div className="neo-flat-white rounded-2xl border border-white/50 px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/dashboard" className="flex items-center gap-3 min-w-0">
            <div className="bg-brand-yellow rounded-xl p-2 shrink-0">
              <img src="/images/logo.png" alt="Logo" className="h-7 w-7 object-contain" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-widest text-brand-grey/40">Student Portal</p>
              <p className="font-serif font-bold text-brand-grey truncate">{profile?.name || profile?.email || "Dashboard"}</p>
            </div>
          </Link>
          <button onClick={handleLogout} className="neo-btn h-11 w-11 rounded-xl flex items-center justify-center text-brand-grey border border-white/50" aria-label="Logout">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex gap-2 overflow-x-auto pb-1">
          <MobileLink icon={<LayoutDashboard className="h-4 w-4" />} title="Dashboard" to="/dashboard" active />
          <MobileLink icon={<BookOpen className="h-4 w-4" />} title="Courses" to="/courses" />
          <MobileLink icon={<ShoppingBag className="h-4 w-4" />} title="Shop" to="/shop" />
          <MobileLink icon={<Bell className="h-4 w-4" />} title="Notices" to="/notifications" />
          <MobileLink icon={<Users className="h-4 w-4" />} title="Public" to="/" />
        </nav>
      </div>

      <aside className="w-80 bg-brand-grey hidden lg:flex flex-col p-8 fixed h-full z-50">
        <div className="flex items-center gap-3 mb-12 px-4">
          <div className="bg-brand-yellow rounded-full p-2">
            <img src="/images/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
          </div>
          <span className="text-2xl font-serif font-bold text-white tracking-tight">Student<span className="text-brand-yellow">Portal</span></span>
        </div>

        <div className="flex-1 space-y-2">
          <SidebarLink icon={<LayoutDashboard className="h-5 w-5" />} title="Dashboard" to="/dashboard" active />
          <SidebarLink icon={<BookOpen className="h-5 w-5" />} title="Courses" to="/courses" />
          <SidebarLink icon={<ShoppingBag className="h-5 w-5" />} title="Shop" to="/shop" />
          <SidebarLink icon={<Bell className="h-5 w-5" />} title="Notifications" to="/notifications" />
          <SidebarLink icon={<Users className="h-5 w-5" />} title="Public Site" to="/" />
        </div>

        <div className="pt-8 border-t border-white/5 space-y-2">
          <SidebarLink icon={<Settings className="h-5 w-5" />} title="Settings" to="#" />
          <button onClick={handleLogout} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all text-white/60 hover:text-white hover:bg-white/5">
            <LogOut className="h-5 w-5" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      <main className="lg:ml-80 p-6 md:p-10 xl:p-12">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-serif font-bold text-brand-grey mb-2">Welcome back, {profile?.name || profile?.email || "Student"}</h1>
            <p className="text-brand-grey/40 font-medium">Your song progress, finance balance, and shop requests are synced from the backend.</p>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/notifications" className="p-3 neo-flat-white rounded-2xl text-brand-grey relative hover:scale-105 transition-transform duration-200">
              <Bell className="h-5 w-5" />
              {notices.some((notice) => notice.is_important) && <span className="absolute top-3 right-3 h-2 w-2 bg-red-500 rounded-full ring-4 ring-white" />}
            </Link>
            <div className="h-12 w-12 rounded-2xl bg-brand-yellow shadow-lg shadow-brand-yellow/20 flex items-center justify-center font-black text-brand-grey">
              {getInitials(profile?.name, profile?.email)}
            </div>
          </div>
        </header>

        {errorMsg && <div className="mb-8 p-4 rounded-2xl bg-red-50 text-red-700 font-medium">{errorMsg}</div>}

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-10">
          <div className="xl:col-span-2 bg-[#2c2c2c] rounded-[2rem] p-8 text-white shadow-[8px_8px_24px_rgba(163,177,198,0.35),-8px_-8px_24px_#ffffff] overflow-hidden relative">
            <div className="absolute -right-16 -bottom-16 opacity-10">
              <Trophy className="h-72 w-72 text-brand-yellow" />
            </div>
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-[180px_1fr] gap-8 items-center">
              <div className="relative h-44 w-44 rounded-full flex items-center justify-center animate-pulse" style={{ background: `conic-gradient(#FFD700 ${averageProgress * 3.6}deg, rgba(255,255,255,0.12) 0deg)` }}>
                <div className="h-32 w-32 rounded-full bg-[#2c2c2c] flex items-center justify-center border border-white/10">
                  <span className="text-4xl font-serif font-bold text-brand-yellow">{averageProgress}%</span>
                </div>
              </div>
              <div>
                <p className="text-brand-yellow font-black uppercase tracking-[0.25em] text-xs mb-3">Learning Path</p>
                <h2 className="text-3xl md:text-5xl font-serif font-bold mb-4">{activeCourse?.course_name || "Song progress pending"}</h2>
                <p className="text-white/60 mb-6">{activeCourse?.current_song ? `Currently learning: ${activeCourse.current_song}` : "Your current song appears after an instructor assigns curriculum progress."}</p>
                <div className="flex flex-wrap gap-3">
                  <span className="px-4 py-2 rounded-full bg-white/10 text-white/80 text-sm font-bold">{activeCourse?.next_lesson || "Next song pending"}</span>
                  <span className="px-4 py-2 rounded-full bg-brand-yellow text-brand-grey text-sm font-black">{completedLessons}/{totalLessons || 0} songs completed</span>
                </div>
              </div>
            </div>
          </div>

          <div className="neo-flat-white rounded-[2rem] p-8 border border-white/40">
            <h2 className="text-2xl font-serif font-bold text-brand-grey mb-6">Today</h2>
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-brand-yellow/10 text-brand-yellow-dark flex items-center justify-center"><Target className="h-6 w-6" /></div>
                <div>
                  <p className="font-bold text-brand-grey">Practice goal</p>
                  <p className="text-sm text-brand-grey/40">Review your assigned song status</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center"><CheckCircle2 className="h-6 w-6" /></div>
                <div>
                  <p className="font-bold text-brand-grey">{completedLessons}/{totalLessons || 0} songs</p>
                  <p className="text-sm text-brand-grey/40">Completed in current enrollment</p>
                </div>
              </div>
              <Button className="w-full bg-[#f0f4f8] text-brand-grey hover:bg-[#ebf0f6] rounded-xl py-6 shadow-[4px_4px_10px_#d1d9e6,-4px_-4px_10px_#ffffff] border border-white/40 font-bold transition-all duration-200 active:scale-[0.98]">Continue Learning</Button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
          <StatCard icon={<Music className="h-5 w-5" />} title="Current Song" value={activeCourse?.current_song || "Not assigned"} />
          <StatCard icon={<BookOpen className="h-5 w-5" />} title="Programs" value={String(courses.length)} tone="blue" />
          <StatCard icon={<CreditCard className="h-5 w-5" />} title="Balance" value={`${balance.toLocaleString()} ETB`} tone={balance > 0 ? "red" : "green"} />
          <StatCard icon={<ShoppingBag className="h-5 w-5" />} title="Shop Requests" value={String(shopRequests.length)} tone="green" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <section className="xl:col-span-2 space-y-8">
            <div className="neo-flat-white p-8 rounded-[2rem] border border-white/40">
              <h2 className="text-2xl font-serif font-bold text-brand-grey mb-6">My Song Progress</h2>
              <div className="space-y-4">
                {loading ? (
                  <p className="text-brand-grey/40">Loading song progress...</p>
                ) : courses.length > 0 ? courses.map((course) => (
                  <div key={course.id} className="p-5 rounded-2xl bg-[#f8fafc] border border-white/40 shadow-inner">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                      <div>
                        <h3 className="font-bold text-brand-grey text-lg">{course.course_name}</h3>
                        <p className="text-sm text-brand-grey/40">{course.instructor || "School instructor"} - {course.level || "All levels"} - {course.delivery_mode || "in person"}</p>
                      </div>
                      <span className="text-sm font-black text-brand-grey">{course.progress}%</span>
                    </div>
                    <div className="h-3 bg-[#e2e8f0] rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-brand-yellow rounded-full shadow" style={{ width: `${course.progress}%` }} />
                    </div>
                  </div>
                )) : (
                  <div className="py-10 text-center text-brand-grey/40">No active song progress yet. Your instructor will assign songs after enrollment.</div>
                )}
              </div>
            </div>

            <div className="neo-flat-white p-8 rounded-[2rem] border border-white/40">
              <h2 className="text-2xl font-serif font-bold text-brand-grey mb-6">Recent Shop Requests</h2>
              {shopRequests.length > 0 ? (
                <div className="space-y-4">
                  {shopRequests.slice(0, 5).map((request: any) => (
                    <div key={request.id} className="p-4 rounded-2xl bg-[#f8fafc] border border-white/40 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-brand-grey">{request.items?.map((item: any) => item.shopItem?.name || "Shop item").join(", ") || "Shop request"}</p>
                        <p className="text-sm text-brand-grey/40">{new Date(request.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-brand-yellow/20 text-brand-grey">{request.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-brand-grey/40">No shop requests yet.</p>
              )}
            </div>
          </section>

          <aside className="space-y-8">
            <div className="neo-flat-white p-8 rounded-[2rem] border border-white/40">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-serif font-bold text-brand-grey">Notifications</h2>
                <Link to="/notifications" className="text-sm font-bold text-brand-yellow-dark hover:underline">View all</Link>
              </div>
              <div className="space-y-4">
                {notices.length > 0 ? notices.map((notice) => (
                  <div key={notice.id} className="p-4 rounded-2xl bg-[#f8fafc] border border-white/40">
                    <div className="flex items-center gap-2 mb-2">
                      {notice.is_important && <span className="h-2 w-2 rounded-full bg-red-500" />}
                      <p className="font-bold text-brand-grey">{notice.title}</p>
                    </div>
                    <p className="text-sm text-brand-grey/50 line-clamp-3">{notice.message}</p>
                  </div>
                )) : (
                  <p className="text-brand-grey/40 text-sm">No announcements yet.</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
