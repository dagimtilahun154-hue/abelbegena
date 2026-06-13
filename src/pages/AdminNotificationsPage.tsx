import { useEffect, useState } from "react"
import { Bell, Megaphone, Plus, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import AdminLayout from "@/components/AdminLayout"
import { createLocalNotification, listLocalNotifications } from "@/lib/localNotifications"

type Notice = {
  id: string
  title: string
  message: string
  is_important: boolean
  created_at: string
}

export default function AdminNotificationsPage() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [form, setForm] = useState({ title: "", message: "", is_important: true })

  const load = () => {
    setNotices(listLocalNotifications())
  }

  useEffect(() => {
    load()
  }, [])

  const postNotice = async () => {
    if (!form.title.trim() || !form.message.trim()) return
    createLocalNotification({
      title: form.title.trim(),
      message: form.message.trim(),
      is_important: form.is_important,
    })
    setForm({ title: "", message: "", is_important: true })
    load()
  }

  return (
    <AdminLayout title="Student Notifications" description="Post local announcements that appear on student dashboards until backend notifications are added.">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <section className="xl:col-span-2 neo-flat p-8 rounded-[2rem] border border-white/40">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="h-6 w-6 text-brand-yellow-dark" />
            <h2 className="text-2xl font-serif font-bold text-brand-grey">Posted Announcements</h2>
          </div>
          <div className="space-y-4">
            {notices.map((notice) => (
              <div key={notice.id} className="p-6 rounded-2xl neo-pressed border border-white/30">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-brand-grey text-brand-yellow flex items-center justify-center shadow-md">
                      {notice.is_important ? <Star className="h-5 w-5" /> : <Megaphone className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-brand-grey">{notice.title}</h3>
                      <p className="text-xs text-brand-grey/40">{new Date(notice.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  {notice.is_important && <span className="text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 px-3 py-1 rounded-full">Important</span>}
                </div>
                <p className="text-brand-grey/60 whitespace-pre-wrap">{notice.message}</p>
              </div>
            ))}
            {notices.length === 0 && <p className="py-10 text-center text-brand-grey/40">No announcements yet.</p>}
          </div>
        </section>

        <aside className="bg-[#2c2c2c] p-8 rounded-[2rem] text-white shadow-[8px_8px_16px_rgba(0,0,0,0.2),-8px_-8px_16px_rgba(255,255,255,0.05)] border border-white/5 h-fit">
          <h2 className="text-xl font-serif font-bold mb-6">Post Notification</h2>
          <div className="space-y-4">
            <Input 
              placeholder="Title" 
              value={form.title} 
              onChange={(e) => setForm({ ...form, title: e.target.value })} 
              className="bg-[#2c2c2c] border-white/10 text-white placeholder:text-white/40 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)] focus-visible:ring-brand-yellow/30"
            />
            <textarea 
              placeholder="Message for students" 
              value={form.message} 
              onChange={(e) => setForm({ ...form, message: e.target.value })} 
              className="w-full min-h-36 rounded-xl border border-white/10 bg-[#2c2c2c] p-4 text-white placeholder:text-white/40 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)] focus:outline-none focus:ring-1 focus:ring-white/20" 
            />
            <label className="flex items-center gap-3 p-4 rounded-xl bg-black/25 cursor-pointer border border-white/5">
              <input type="checkbox" checked={form.is_important} onChange={(e) => setForm({ ...form, is_important: e.target.checked })} className="rounded accent-brand-yellow" />
              <span className="font-bold">Mark as important</span>
            </label>
            <Button 
              onClick={postNotice} 
              className="w-full bg-brand-yellow text-brand-grey font-bold hover:bg-brand-yellow-dark rounded-xl active:scale-[0.98] transition-all py-6 shadow-[4px_4px_10px_rgba(0,0,0,0.15)] border border-brand-yellow/20"
            >
              <Plus className="h-4 w-4 mr-2" /> Post to Students
            </Button>
          </div>
        </aside>
      </div>
    </AdminLayout>
  )
}
