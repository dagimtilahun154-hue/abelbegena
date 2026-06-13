import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Building2, CalendarDays, MapPin, Plus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import AdminLayout from "@/components/AdminLayout"
import { backendApi } from "@/lib/backend"

const emptySchool = {
  name: "Abel Begena School",
  legalName: "",
  email: "",
  phone: "",
  address: "",
  timezone: "Africa/Nairobi",
  defaultCurrency: "ETB",
  description: "",
}

const emptyGroup = {
  batchId: "",
  name: "",
  code: "",
  instructorName: "",
  room: "",
  capacity: "",
  scheduleNotes: "",
  status: "ACTIVE",
}

export default function AdminSettingsPage() {
  const [schoolForm, setSchoolForm] = useState(emptySchool)
  const [programs, setPrograms] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [groupForm, setGroupForm] = useState(emptyGroup)
  const [savingSchool, setSavingSchool] = useState(false)
  const [savingGroup, setSavingGroup] = useState(false)
  const [message, setMessage] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  const load = async () => {
    setErrorMsg("")
    const [schoolRows, programRows, batchRows, groupRows] = await Promise.all([
      backendApi.getSchoolProfile(),
      backendApi.listTrainingPrograms(),
      backendApi.listTrainingBatches(),
      backendApi.listTrainingGroups(),
    ])

    const school = schoolRows.school || {}
    const nextPrograms = programRows.programs || []
    const nextBatches = batchRows.batches || []

    setSchoolForm({
      name: school.name || emptySchool.name,
      legalName: school.legalName || "",
      email: school.email || "",
      phone: school.phone || "",
      address: school.address || "",
      timezone: school.timezone || emptySchool.timezone,
      defaultCurrency: school.defaultCurrency || emptySchool.defaultCurrency,
      description: school.description || "",
    })
    setPrograms(nextPrograms)
    setBatches(nextBatches)
    setGroups(groupRows.groups || [])
    setGroupForm((current) => ({
      ...current,
      batchId: current.batchId || String(nextBatches[0]?.id || ""),
    }))
  }

  useEffect(() => {
    load().catch((error) => setErrorMsg(error.message || "Could not load school settings."))
  }, [])

  const groupedBatches = useMemo(() => {
    return batches.map((batch) => ({
      ...batch,
      programName: batch.program?.name || programs.find((program) => program.id === batch.programId)?.name || "Program",
    }))
  }, [batches, programs])

  const saveSchool = async () => {
    setSavingSchool(true)
    setErrorMsg("")
    setMessage("")
    try {
      await backendApi.updateSchoolProfile({
        name: schoolForm.name,
        legalName: schoolForm.legalName || null,
        email: schoolForm.email || null,
        phone: schoolForm.phone || null,
        address: schoolForm.address || null,
        timezone: schoolForm.timezone,
        defaultCurrency: schoolForm.defaultCurrency,
        description: schoolForm.description || null,
      })
      setMessage("School profile saved.")
      await load()
    } catch (error: any) {
      setErrorMsg(error.message || "Could not save school profile.")
    } finally {
      setSavingSchool(false)
    }
  }

  const createGroup = async () => {
    setSavingGroup(true)
    setErrorMsg("")
    setMessage("")
    try {
      await backendApi.createTrainingGroup({
        batchId: Number(groupForm.batchId),
        name: groupForm.name.trim(),
        code: groupForm.code.trim().toUpperCase(),
        instructorName: groupForm.instructorName.trim() || null,
        room: groupForm.room.trim() || null,
        capacity: groupForm.capacity ? Number(groupForm.capacity) : null,
        scheduleNotes: groupForm.scheduleNotes.trim() || null,
        status: groupForm.status,
      })
      setGroupForm({ ...emptyGroup, batchId: groupForm.batchId })
      setMessage("Training group created.")
      await load()
    } catch (error: any) {
      setErrorMsg(error.message || "Could not create training group.")
    } finally {
      setSavingGroup(false)
    }
  }

  const updateGroupStatus = async (group: any, status: string) => {
    setErrorMsg("")
    setMessage("")
    try {
      await backendApi.updateTrainingGroup(group.id, { status })
      setMessage(`${group.name} marked ${status}.`)
      await load()
    } catch (error: any) {
      setErrorMsg(error.message || "Could not update group.")
    }
  }

  return (
    <AdminLayout title="School Settings" description="Configure school profile details and class groups for 3, 6, and 9 month training batches.">
      {(message || errorMsg) && (
        <div className={`mb-6 rounded-2xl p-4 text-sm font-bold ${errorMsg ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
          {errorMsg || message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Metric icon={<Building2 className="h-6 w-6" />} label="Programs" value={programs.length} />
        <Metric icon={<CalendarDays className="h-6 w-6" />} label="Batches" value={batches.length} />
        <Metric icon={<Users className="h-6 w-6" />} label="Groups" value={groups.length} />
        <Metric icon={<MapPin className="h-6 w-6" />} label="Currency" value={schoolForm.defaultCurrency} dark />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <section className="xl:col-span-2 neo-flat rounded-[2rem] border border-white/40 p-8">
          <h2 className="text-2xl font-serif font-bold text-brand-grey mb-6">School Profile</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input placeholder="School name" value={schoolForm.name} onChange={(event) => setSchoolForm({ ...schoolForm, name: event.target.value })} className="bg-[#f0f4f8] border border-white/60 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-yellow/50 transition-all text-brand-grey placeholder:text-brand-grey/30 h-12" />
            <Input placeholder="Legal name" value={schoolForm.legalName} onChange={(event) => setSchoolForm({ ...schoolForm, legalName: event.target.value })} className="bg-[#f0f4f8] border border-white/60 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-yellow/50 transition-all text-brand-grey placeholder:text-brand-grey/30 h-12" />
            <Input type="email" placeholder="Email" value={schoolForm.email} onChange={(event) => setSchoolForm({ ...schoolForm, email: event.target.value })} className="bg-[#f0f4f8] border border-white/60 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-yellow/50 transition-all text-brand-grey placeholder:text-brand-grey/30 h-12" />
            <Input placeholder="Phone" value={schoolForm.phone} onChange={(event) => setSchoolForm({ ...schoolForm, phone: event.target.value })} className="bg-[#f0f4f8] border border-white/60 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-yellow/50 transition-all text-brand-grey placeholder:text-brand-grey/30 h-12" />
            <Input placeholder="Timezone" value={schoolForm.timezone} onChange={(event) => setSchoolForm({ ...schoolForm, timezone: event.target.value })} className="bg-[#f0f4f8] border border-white/60 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-yellow/50 transition-all text-brand-grey placeholder:text-brand-grey/30 h-12" />
            <Input placeholder="Currency" value={schoolForm.defaultCurrency} onChange={(event) => setSchoolForm({ ...schoolForm, defaultCurrency: event.target.value })} className="bg-[#f0f4f8] border border-white/60 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-yellow/50 transition-all text-brand-grey placeholder:text-brand-grey/30 h-12" />
            <Input className="md:col-span-2 bg-[#f0f4f8] border border-white/60 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-yellow/50 transition-all text-brand-grey placeholder:text-brand-grey/30 h-12" placeholder="Address" value={schoolForm.address} onChange={(event) => setSchoolForm({ ...schoolForm, address: event.target.value })} />
            <textarea
              className="md:col-span-2 min-h-28 rounded-xl border border-white/60 bg-[#f0f4f8] shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff] p-4 focus:outline-none"
              placeholder="School description"
              value={schoolForm.description}
              onChange={(event) => setSchoolForm({ ...schoolForm, description: event.target.value })}
            />
          </div>
          <Button onClick={saveSchool} disabled={savingSchool} className="mt-6 neo-btn text-brand-grey font-bold px-6 py-4 rounded-xl border border-white/40 hover:bg-slate-100 transition-all active:scale-[0.98]">
            {savingSchool ? "Saving..." : "Save School Profile"}
          </Button>
        </section>

        <aside className="bg-[#2c2c2c] rounded-[2rem] p-8 text-white shadow-[8px_8px_16px_rgba(0,0,0,0.2),-8px_-8px_16px_rgba(255,255,255,0.05)] border border-white/5 h-fit">
          <h2 className="text-xl font-serif font-bold mb-6">Create Group</h2>
          <div className="space-y-4">
            <select 
              value={groupForm.batchId} 
              onChange={(event) => setGroupForm({ ...groupForm, batchId: event.target.value })} 
              className="w-full rounded-xl bg-[#2c2c2c] border border-white/10 px-4 py-3 text-white shadow-[inset_3px_3px_6px_rgba(0,0,0,0.3),_inset_-3px_-3px_6px_rgba(255,255,255,0.05)] focus:outline-none"
            >
              <option value="" className="text-brand-grey">Select batch</option>
              {groupedBatches.map((batch) => (
                <option key={batch.id} value={batch.id} className="text-brand-grey">{batch.programName} - {batch.name}</option>
              ))}
            </select>
            <Input placeholder="Group name" value={groupForm.name} onChange={(event) => setGroupForm({ ...groupForm, name: event.target.value })} className="bg-[#2c2c2c] border-white/10 text-white placeholder:text-white/40 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)] focus-visible:ring-brand-yellow/30 h-12" />
            <Input placeholder="Group code" value={groupForm.code} onChange={(event) => setGroupForm({ ...groupForm, code: event.target.value })} className="bg-[#2c2c2c] border-white/10 text-white placeholder:text-white/40 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)] focus-visible:ring-brand-yellow/30 h-12" />
            <Input placeholder="Instructor" value={groupForm.instructorName} onChange={(event) => setGroupForm({ ...groupForm, instructorName: event.target.value })} className="bg-[#2c2c2c] border-white/10 text-white placeholder:text-white/40 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)] focus-visible:ring-brand-yellow/30 h-12" />
            <Input placeholder="Room" value={groupForm.room} onChange={(event) => setGroupForm({ ...groupForm, room: event.target.value })} className="bg-[#2c2c2c] border-white/10 text-white placeholder:text-white/40 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)] focus-visible:ring-brand-yellow/30 h-12" />
            <Input type="number" placeholder="Capacity" value={groupForm.capacity} onChange={(event) => setGroupForm({ ...groupForm, capacity: event.target.value })} className="bg-[#2c2c2c] border-white/10 text-white placeholder:text-white/40 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)] focus-visible:ring-brand-yellow/30 h-12" />
            <textarea placeholder="Schedule notes" value={groupForm.scheduleNotes} onChange={(event) => setGroupForm({ ...groupForm, scheduleNotes: event.target.value })} className="w-full min-h-24 rounded-xl bg-[#2c2c2c] border border-white/10 p-4 text-white placeholder:text-white/40 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)] focus:outline-none focus:ring-1 focus:ring-white/20" />
            <Button onClick={createGroup} disabled={savingGroup || !groupForm.batchId || !groupForm.name || !groupForm.code} className="w-full bg-brand-yellow text-brand-grey font-bold hover:bg-brand-yellow-dark rounded-xl active:scale-[0.98] transition-all py-6 shadow-[4px_4px_10px_rgba(0,0,0,0.15)] border border-brand-yellow/20">
              <Plus className="h-4 w-4 mr-2" /> {savingGroup ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </aside>
      </div>

      <section className="mt-8 neo-flat rounded-[2rem] border border-white/40 p-8">
        <h2 className="text-2xl font-serif font-bold text-brand-grey mb-6">Training Groups</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {groups.map((group) => (
            <div key={group.id} className="rounded-2xl neo-pressed border border-white/30 p-5">
              <p className="font-bold text-brand-grey text-lg">{group.name}</p>
              <p className="text-sm text-brand-grey/40">{group.batch?.program?.name || "Program"} - {group.batch?.name || "Batch"}</p>
              <p className="text-sm text-brand-grey/50 mt-3">{group.instructorName || "No instructor"} {group.room ? `- ${group.room}` : ""}</p>
              <div className="flex items-center justify-between gap-3 mt-5">
                <span className="text-xs font-black uppercase tracking-widest rounded-full bg-brand-yellow/20 px-3 py-1 text-brand-grey">{group.status}</span>
                <select 
                  value={group.status} 
                  onChange={(event) => updateGroupStatus(group, event.target.value)} 
                  className="rounded-xl border border-white/60 bg-[#f0f4f8] shadow-[inset_2px_2px_4px_#d1d9e6,inset_-2px_-2px_4px_#ffffff] px-3 py-2 text-sm text-brand-grey focus:outline-none cursor-pointer"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>
          ))}
          {groups.length === 0 && <p className="text-brand-grey/40">No groups created yet.</p>}
        </div>
      </section>
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
