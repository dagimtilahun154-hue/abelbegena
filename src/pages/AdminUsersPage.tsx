import { useEffect, useMemo, useState, type ReactNode } from "react"
import { ShieldCheck, UserPlus, Users, UserX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import AdminLayout from "@/components/AdminLayout"
import { backendApi, getStoredSession, hasRole } from "@/lib/backend"

const emptyForm = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  role: "STUDENT",
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [form, setForm] = useState(emptyForm)
  const [query, setQuery] = useState("")
  const [message, setMessage] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const session = getStoredSession()
  const owner = hasRole(session?.user, ["OWNER"])

  const load = async () => {
    setLoading(true)
    setErrorMsg("")
    try {
      const [userRows, roleRows] = await Promise.all([
        backendApi.listUsers(),
        backendApi.listRoles(),
      ])
      setUsers(userRows.users || [])
      setRoles((roleRows.roles || []).filter((role: any) => ["OWNER", "ADMIN", "STUDENT"].includes(role.name)))
    } catch (error: any) {
      setErrorMsg(error.message || "Could not load users.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const assignableRoles = roles.filter((role) => owner || role.name === "STUDENT")

  const filteredUsers = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return users
    return users.filter((user) =>
      `${user.fullName} ${user.email} ${user.phone || ""} ${user.roles?.join(" ") || ""} ${user.status}`
        .toLowerCase()
        .includes(needle)
    )
  }, [query, users])

  const counts = {
    total: users.length,
    admins: users.filter((user) => user.roles?.includes("OWNER") || user.roles?.includes("ADMIN")).length,
    inactive: users.filter((user) => user.status !== "ACTIVE").length,
  }

  const createUser = async () => {
    setErrorMsg("")
    setMessage("")

    if (!form.fullName.trim() || !form.email.trim() || !form.password.trim()) {
      setErrorMsg("Full name, email, and password are required.")
      return
    }

    setSaving(true)
    try {
      await backendApi.createUser({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        password: form.password,
        roles: [form.role],
      })
      setForm(emptyForm)
      setMessage("User created successfully.")
      await load()
    } catch (error: any) {
      setErrorMsg(error.message || "Could not create user.")
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (user: any, status: string) => {
    setErrorMsg("")
    setMessage("")
    try {
      await backendApi.updateUserStatus(user.id, status)
      setMessage(`${user.fullName} marked ${status}.`)
      await load()
    } catch (error: any) {
      setErrorMsg(error.message || "Could not update user status.")
    }
  }

  return (
    <AdminLayout title="Users & Roles" description="Manage owner/admin/student access from the Abel backend role model.">
      {(message || errorMsg) && (
        <div className={`mb-6 rounded-2xl p-4 text-sm font-bold ${errorMsg ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
          {errorMsg || message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Metric icon={<Users className="h-6 w-6" />} label="Users" value={counts.total} />
        <Metric icon={<ShieldCheck className="h-6 w-6" />} label="Admin/Owner" value={counts.admins} />
        <Metric icon={<UserX className="h-6 w-6" />} label="Inactive" value={counts.inactive} dark />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <section className="xl:col-span-2 neo-flat rounded-[2rem] border border-white/40 p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-serif font-bold text-brand-grey">System Users</h2>
              <p className="text-brand-grey/40 text-sm">Owner can create admins. Admins can create students only.</p>
            </div>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search users"
              className="md:max-w-xs rounded-xl bg-[#f0f4f8] border border-white/60 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-yellow/50 transition-all text-brand-grey placeholder:text-brand-grey/30 h-12"
            />
          </div>

          {loading ? (
            <p className="py-10 text-center text-brand-grey/40">Loading users...</p>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className="rounded-2xl neo-pressed border border-white/30 p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    <div>
                      <div className="flex flex-wrap items-center gap-3 mb-1">
                        <p className="font-bold text-brand-grey text-lg">{user.fullName}</p>
                        <span className={`text-[10px] font-black uppercase tracking-widest rounded-full px-2 py-1 ${user.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                          {user.status}
                        </span>
                      </div>
                      <p className="text-sm text-brand-grey/50">{user.email} {user.phone ? `- ${user.phone}` : ""}</p>
                      <p className="text-xs text-brand-grey/40 mt-2">Roles: {user.roles?.join(", ") || "None"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => updateStatus(user, "ACTIVE")}
                        disabled={user.status === "ACTIVE"}
                        className="rounded-xl bg-brand-yellow text-brand-grey font-bold hover:bg-brand-yellow-dark active:scale-[0.98] transition-all border border-brand-yellow/20"
                      >
                        Activate
                      </Button>
                      <Button
                        onClick={() => updateStatus(user, "SUSPENDED")}
                        disabled={user.status === "SUSPENDED"}
                        variant="outline"
                        className="rounded-xl border-red-100 text-red-600 hover:bg-red-50 bg-[#f0f4f8] focus:outline-none"
                      >
                        Suspend
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && <p className="py-10 text-center text-brand-grey/40">No users matched your search.</p>}
            </div>
          )}
        </section>

        <aside className="bg-[#2c2c2c] rounded-[2rem] text-white p-8 shadow-[8px_8px_16px_rgba(0,0,0,0.2),-8px_-8px_16px_rgba(255,255,255,0.05)] border border-white/5 h-fit">
          <div className="flex items-center gap-3 mb-6">
            <UserPlus className="h-5 w-5 text-brand-yellow" />
            <h2 className="text-xl font-serif font-bold">Create User</h2>
          </div>
          <div className="space-y-4">
            <Input placeholder="Full name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} className="bg-[#2c2c2c] border-white/10 text-white placeholder:text-white/40 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)] focus-visible:ring-brand-yellow/30 h-12" />
            <Input type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="bg-[#2c2c2c] border-white/10 text-white placeholder:text-white/40 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)] focus-visible:ring-brand-yellow/30 h-12" />
            <Input placeholder="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="bg-[#2c2c2c] border-white/10 text-white placeholder:text-white/40 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)] focus-visible:ring-brand-yellow/30 h-12" />
            <Input type="password" placeholder="Temporary password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="bg-[#2c2c2c] border-white/10 text-white placeholder:text-white/40 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)] focus-visible:ring-brand-yellow/30 h-12" />
            <select 
              value={form.role} 
              onChange={(event) => setForm({ ...form, role: event.target.value })} 
              className="w-full rounded-xl bg-[#2c2c2c] border border-white/10 px-4 py-3 text-white shadow-[inset_3px_3px_6px_rgba(0,0,0,0.3),_inset_-3px_-3px_6px_rgba(255,255,255,0.05)] focus:outline-none"
            >
              {assignableRoles.map((role) => (
                <option key={role.name} value={role.name} className="text-brand-grey">{role.name}</option>
              ))}
            </select>
            {!owner && <p className="text-xs text-white/40">Only owner accounts can create admin or owner users.</p>}
            <Button onClick={createUser} disabled={saving} className="w-full bg-brand-yellow text-brand-grey font-bold hover:bg-brand-yellow-dark rounded-xl active:scale-[0.98] transition-all py-6 shadow-[4px_4px_10px_rgba(0,0,0,0.15)] border border-brand-yellow/20">
              {saving ? "Creating..." : "Create User"}
            </Button>
          </div>
        </aside>
      </div>
    </AdminLayout>
  )
}

function Metric({ icon, label, value, dark = false }: { icon: ReactNode; label: string; value: number | string; dark?: boolean }) {
  return (
    <div className={`${
      dark 
        ? "bg-[#2c2c2c] text-white shadow-[8px_8px_16px_rgba(0,0,0,0.2),-8px_-8px_16px_rgba(255,255,255,0.05)] border border-white/5" 
        : "neo-flat text-brand-grey border border-white/40"
    } rounded-[2rem] p-6`}>
      <div className={dark ? "text-brand-yellow mb-5" : "text-brand-yellow-dark mb-5"}>{icon}</div>
      <p className={`text-xs font-black uppercase tracking-widest ${dark ? "text-white/40" : "text-brand-grey/40"}`}>{label}</p>
      <p className={`text-4xl font-serif font-bold ${dark ? "text-brand-yellow" : "text-brand-grey"}`}>{value}</p>
    </div>
  )
}
