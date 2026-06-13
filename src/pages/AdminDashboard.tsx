import { useCallback, useEffect, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { Activity, ArrowUpRight, Bell, BookOpen, CreditCard, FileCheck2, ShoppingBag, Users } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import AdminLayout from "@/components/AdminLayout"
import { backendApi } from "@/lib/backend"
import { listLocalNotifications, type LocalNotice } from "@/lib/localNotifications"

type Registration = {
  id: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  notes: string | null
  registrationStatus: string
}

const API_BASE = import.meta.env.VITE_ATTEND_API_URL || "https://dagi321-attend.hf.space"

const StatCard = ({ title, value, change, icon, tone = "up" }: { title: string; value: string | number; change: string; icon: ReactNode; tone?: "up" | "neutral" }) => (
  <div className="neo-flat-white p-6 rounded-[2rem] border border-white/40 transition-transform duration-300 hover:scale-[1.02]">
    <div className="flex justify-between items-start mb-6">
      <div className="p-4 bg-brand-yellow/10 rounded-2xl text-brand-yellow-dark">{icon}</div>
      <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black ${tone === "up" ? "text-green-600 bg-green-50" : "text-brand-grey/50 bg-slate-50"}`}>
        <ArrowUpRight className="h-3 w-3" />
        {change}
      </div>
    </div>
    <h3 className="text-brand-grey/40 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{title}</h3>
    <p className="text-4xl font-serif font-bold text-brand-grey">{value}</p>
  </div>
)

export default function AdminDashboard() {
  const [attendance, setAttendance] = useState<any[]>([])
  const [stats, setStats] = useState({
    students: 0,
    pendingRegistrations: 0,
    courses: 0,
    orders: 0,
    income: 0,
    expenses: 0,
    stockItems: 0,
    lowStockItems: 0,
  })
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [notifications, setNotifications] = useState<LocalNotice[]>([])

  const loadDashboard = useCallback(async () => {
    const [reportResult, admissionsResult, programsResult, notices] = await Promise.all([
      backendApi.listDashboardReport(),
      backendApi.listAdmissions({ registrationStatus: "PENDING_APPROVAL", limit: 5 }),
      backendApi.listTrainingPrograms(),
      Promise.resolve(listLocalNotifications().slice(0, 3)),
    ])

    setStats({
      students: reportResult.students?.total || 0,
      pendingRegistrations: reportResult.students?.pendingAdmissions || admissionsResult.admissions?.length || 0,
      courses: programsResult.programs?.filter((program: any) => program.status === "ACTIVE").length || 0,
      orders: Number(reportResult.shopRequests?.REQUESTED || 0),
      income: Number(reportResult.finance?.confirmedIncome || 0) + Number(reportResult.finance?.confirmedPayments || 0),
      expenses: Number(reportResult.finance?.confirmedExpenses || 0),
      stockItems: Number(reportResult.stock?.activeItems || 0),
      lowStockItems: Number(reportResult.stock?.lowStockItems || 0),
    })
    setRegistrations((admissionsResult.admissions || []).map((student: any) => ({
      id: String(student.id),
      firstName: student.firstName,
      lastName: student.lastName,
      phone: student.phone,
      notes: student.notes,
      registrationStatus: student.registrationStatus,
    })))
    setNotifications(notices)
  }, [])

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await fetch(`${API_BASE}/today_attendance`)
        if (res.ok) setAttendance(await res.json())
      } catch (error) {
        console.error("Attendance fetch error", error)
      }
    }

    fetchAttendance()
    loadDashboard()
    const interval = setInterval(fetchAttendance, 5000)
    return () => clearInterval(interval)
  }, [loadDashboard])

  return (
    <AdminLayout title="School Analytics" description="Live admissions, learning operations, finance, shop, stock, and attendance.">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
        <StatCard icon={<Users className="h-6 w-6" />} title="Students" value={stats.students} change="Backend" />
        <StatCard icon={<FileCheck2 className="h-6 w-6" />} title="Pending Admissions" value={stats.pendingRegistrations} change="Needs review" tone="neutral" />
        <StatCard icon={<BookOpen className="h-6 w-6" />} title="Active Programs" value={stats.courses} change="3/6/9 month" />
        <StatCard icon={<CreditCard className="h-6 w-6" />} title="Net Cash Flow" value={`${(stats.income - stats.expenses).toLocaleString()} ETB`} change={`${stats.orders} requests`} tone="neutral" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <section className="xl:col-span-2 space-y-8">
          <div className="neo-flat-white p-8 rounded-[2rem] border border-white/40">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-serif font-bold text-brand-grey">Admission Queue</h2>
                <p className="text-brand-grey/40 text-sm">Online registrations waiting for approval and account setup email.</p>
              </div>
              <Link to="/admin/registrations">
                <Button className="bg-[#f0f4f8] text-brand-grey hover:bg-[#ebf0f6] rounded-xl shadow-[2px_2px_6px_#d1d9e6,-2px_-2px_6px_#ffffff] border border-white/40 font-bold active:scale-[0.98] transition-all">Review All</Button>
              </Link>
            </div>
            <div className="space-y-4">
              {registrations.map((registration, index) => (
                <motion.div key={registration.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }} className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[#f8fafc] border border-white/40 shadow-inner">
                  <div>
                    <p className="font-bold text-brand-grey">{registration.firstName} {registration.lastName}</p>
                    <p className="text-sm text-brand-grey/40">{registration.phone || "No phone"} - {registration.notes?.split("\n")[0] || "Student registration"}</p>
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-yellow-700 bg-yellow-50 px-3 py-1 rounded-full">{registration.registrationStatus}</span>
                </motion.div>
              ))}
              {registrations.length === 0 && (
                <p className="py-8 text-center text-brand-grey/40">No pending admissions right now.</p>
              )}
            </div>
          </div>

          <div className="neo-flat-white p-8 rounded-[2rem] border border-white/40">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-serif font-bold text-brand-grey">Live Attendance</h2>
                <p className="text-brand-grey/40 text-sm">Scanner activity from today.</p>
              </div>
              <div className="flex items-center gap-2 text-green-600 text-xs font-black uppercase tracking-widest">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Syncing
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {attendance.length > 0 ? attendance.slice(0, 6).map((log, index) => (
                <div key={`${log.Name}-${index}`} className="p-4 rounded-2xl bg-[#f8fafc] border border-white/40 flex items-center justify-between shadow-inner">
                  <div>
                    <p className="font-bold text-brand-grey">{log.Name}</p>
                    <p className="text-sm text-brand-grey/40">{log.Status}</p>
                  </div>
                  <p className="text-sm font-serif font-bold text-brand-grey">{log.Time}</p>
                </div>
              )) : (
                <div className="md:col-span-2 py-10 text-center text-brand-grey/40">
                  <Activity className="h-10 w-10 mx-auto mb-3 text-brand-grey/10" />
                  Waiting for attendance scans.
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-8">
          <div className="bg-[#2c2c2c] p-8 rounded-[2rem] text-white shadow-[8px_8px_24px_rgba(163,177,198,0.35),-8px_-8px_24px_#ffffff]">
            <h2 className="text-2xl font-serif font-bold mb-6">Operations Snapshot</h2>
            <div className="space-y-5">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Income + payments</span>
                <span className="font-bold text-brand-yellow">{stats.income.toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Expenses</span>
                <span className="font-bold">{stats.expenses.toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Low stock items</span>
                <span className="font-bold">{stats.lowStockItems}/{stats.stockItems}</span>
              </div>
              <Link to="/admin/finance">
                <Button className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white rounded-xl">Open Finance</Button>
              </Link>
              <Link to="/admin/shop">
                <Button className="w-full mt-3 bg-brand-yellow text-brand-grey hover:bg-brand-yellow-dark rounded-xl">
                  <ShoppingBag className="h-4 w-4 mr-2" /> Manage Shop
                </Button>
              </Link>
            </div>
          </div>

          <div className="neo-flat-white p-8 rounded-[2rem] border border-white/40">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="h-5 w-5 text-brand-yellow-dark" />
              <h2 className="text-xl font-serif font-bold text-brand-grey">Recent Notices</h2>
            </div>
            <div className="space-y-4">
              {notifications.length > 0 ? notifications.map((item) => (
                <div key={item.id} className="p-4 rounded-2xl bg-[#f8fafc] border border-white/40 shadow-inner">
                  <div className="flex items-center gap-2 mb-1">
                    {item.is_important && <span className="h-2 w-2 rounded-full bg-red-500" />}
                    <p className="font-bold text-brand-grey">{item.title}</p>
                  </div>
                  <p className="text-sm text-brand-grey/50 line-clamp-2">{item.message}</p>
                </div>
              )) : (
                <p className="text-brand-grey/40 text-sm">No announcements posted yet.</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </AdminLayout>
  )
}
