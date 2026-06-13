import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Bell, ArrowLeft, Clock, Megaphone } from "lucide-react"
import { Link } from "react-router-dom"
import { listLocalNotifications } from "@/lib/localNotifications"

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNotifications = () => {
      setNotifications(listLocalNotifications())
      setLoading(false)
    }
    fetchNotifications()
  }, [])

  const timeAgo = (dateStr: string) => {
    const now = new Date()
    const date = new Date(dateStr)
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (diff < 60) return "Just now"
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] pt-32 pb-24">
      <div className="container px-4 max-w-3xl mx-auto">
        <Link to="/dashboard" className="neo-btn inline-flex items-center gap-2 text-brand-grey font-bold rounded-xl px-4 py-2 mb-8 group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </Link>

        <div className="flex items-center gap-4 mb-12">
          <div className="p-4 neo-pressed border border-white/40 rounded-2xl">
            <Bell className="h-8 w-8 text-brand-yellow-dark" />
          </div>
          <div>
            <h1 className="text-3xl font-serif font-bold text-brand-grey">Notifications</h1>
            <p className="text-brand-grey/40 font-medium">Announcements from the school administration</p>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <Clock className="h-10 w-10 text-brand-grey/10 mx-auto animate-spin mb-4" />
            <p className="text-brand-grey/40">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center neo-flat rounded-[2rem] border border-white/40 bg-[#f0f4f8]">
            <Megaphone className="h-16 w-16 text-brand-grey/10 mx-auto mb-6" />
            <h3 className="text-xl font-serif font-bold text-brand-grey mb-2">No Announcements Yet</h3>
            <p className="text-brand-grey/40">Check back later for updates from the school.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notif, i) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="neo-flat p-8 rounded-[2rem] border border-white/40 bg-[#f0f4f8]"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-brand-grey rounded-xl flex items-center justify-center text-brand-yellow font-black text-sm shadow-md">
                      A
                    </div>
                    <div>
                      <p className="font-bold text-brand-grey text-sm">Admin</p>
                      <p className="text-brand-grey/30 text-xs">{timeAgo(notif.created_at)}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-yellow-dark bg-brand-yellow/10 px-3 py-1 rounded-full">
                    Announcement
                  </span>
                </div>
                <h3 className="text-xl font-serif font-bold text-brand-grey mb-3">{notif.title}</h3>
                <p className="text-brand-grey/60 leading-relaxed whitespace-pre-wrap">{notif.message}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
