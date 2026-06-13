import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { Activity, CalendarCheck, CheckCircle2, Clock, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import AdminLayout from "@/components/AdminLayout"
import { backendApi } from "@/lib/backend"

const today = new Date().toISOString().slice(0, 10)

const emptySession = {
  programId: "",
  batchId: "",
  groupId: "",
  sessionDate: today,
  sessionName: "",
  startTime: "",
  endTime: "",
  location: "",
  notes: "",
  status: "OPEN",
}

const emptyRecord = {
  studentId: "",
  status: "PRESENT",
  notes: "",
}

export default function AdminAttendancePage() {
  const [programs, setPrograms] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [records, setRecords] = useState<any[]>([])
  const [recognitionEvents, setRecognitionEvents] = useState<any[]>([])
  const [dailyReport, setDailyReport] = useState<any>(null)
  const [sessionForm, setSessionForm] = useState(emptySession)
  const [recordForm, setRecordForm] = useState(emptyRecord)
  const [selectedSessionId, setSelectedSessionId] = useState("")
  const [message, setMessage] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  const load = useCallback(async (preferredSessionId = "", reportDate = today) => {
    setErrorMsg("")
    const [programRows, batchRows, groupRows, studentRows, sessionRows, eventRows] = await Promise.all([
      backendApi.listTrainingPrograms(),
      backendApi.listTrainingBatches(),
      backendApi.listTrainingGroups(),
      backendApi.listStudents(),
      backendApi.listAttendanceSessions(),
      backendApi.listRecognitionEvents(),
    ])

    const nextPrograms = programRows.programs || []
    const nextBatches = batchRows.batches || []
    const nextGroups = groupRows.groups || []
    const nextStudents = studentRows.students || []
    const nextSessions = sessionRows.sessions || []
    const nextSessionId = preferredSessionId || String(nextSessions[0]?.id || "")

    setPrograms(nextPrograms)
    setBatches(nextBatches)
    setGroups(nextGroups)
    setStudents(nextStudents)
    setSessions(nextSessions)
    setRecognitionEvents(eventRows.recognitionEvents || [])
    setSelectedSessionId(nextSessionId)
    setSessionForm((current) => ({
      ...current,
      programId: current.programId || String(nextPrograms[0]?.id || ""),
      batchId: current.batchId || String(nextBatches[0]?.id || ""),
    }))
    setRecordForm((current) => ({
      ...current,
      studentId: current.studentId || String(nextStudents[0]?.id || ""),
    }))

    if (nextSessionId) {
      const recordRows = await backendApi.listAttendanceRecords(nextSessionId)
      setRecords(recordRows.records || [])
    } else {
      setRecords([])
    }

    try {
      const report = await backendApi.getDailyAttendanceReport({ sessionDate: reportDate })
      setDailyReport(report.report)
    } catch {
      setDailyReport(null)
    }
  }, [])

  useEffect(() => {
    load().catch((error) => setErrorMsg(error.message || "Could not load attendance."))
  }, [load])

  const selectedSession = sessions.find((session) => String(session.id) === selectedSessionId)
  const selectedBatchId = sessionForm.batchId
  const availableGroups = groups.filter((group) => String(group.batchId) === selectedBatchId)

  const counts = useMemo(() => {
    const summary = dailyReport?.summary || {}
    return {
      sessions: sessions.length,
      present: Number(summary.PRESENT || 0),
      late: Number(summary.LATE || 0),
      events: recognitionEvents.length,
    }
  }, [dailyReport, recognitionEvents.length, sessions.length])

  const createSession = async () => {
    setErrorMsg("")
    setMessage("")
    try {
      await backendApi.createAttendanceSession({
        programId: Number(sessionForm.programId),
        batchId: Number(sessionForm.batchId),
        groupId: sessionForm.groupId ? Number(sessionForm.groupId) : null,
        sessionDate: sessionForm.sessionDate,
        sessionName: sessionForm.sessionName.trim() || undefined,
        startTime: sessionForm.startTime || undefined,
        endTime: sessionForm.endTime || undefined,
        status: sessionForm.status,
        location: sessionForm.location.trim() || null,
        notes: sessionForm.notes.trim() || null,
      })
      setSessionForm({ ...emptySession, programId: sessionForm.programId, batchId: sessionForm.batchId })
      setMessage("Attendance session created.")
      await load(selectedSessionId, sessionForm.sessionDate || today)
    } catch (error: any) {
      setErrorMsg(error.message || "Could not create attendance session.")
    }
  }

  const selectSession = async (sessionId: string) => {
    setSelectedSessionId(sessionId)
    setErrorMsg("")
    try {
      const recordRows = await backendApi.listAttendanceRecords(sessionId)
      setRecords(recordRows.records || [])
    } catch (error: any) {
      setErrorMsg(error.message || "Could not load records.")
    }
  }

  const updateSessionStatus = async (session: any, status: string) => {
    setErrorMsg("")
    setMessage("")
    try {
      await backendApi.updateAttendanceSession(session.id, { status })
      setMessage(`${session.sessionName || "Session"} marked ${status}.`)
      await load(selectedSessionId, sessionForm.sessionDate || today)
    } catch (error: any) {
      setErrorMsg(error.message || "Could not update session.")
    }
  }

  const createRecord = async () => {
    setErrorMsg("")
    setMessage("")
    if (!selectedSessionId || !recordForm.studentId) {
      setErrorMsg("Select a session and student.")
      return
    }
    try {
      await backendApi.createAttendanceRecord(selectedSessionId, {
        studentId: Number(recordForm.studentId),
        status: recordForm.status,
        source: "MANUAL",
        notes: recordForm.notes.trim() || null,
      })
      setRecordForm({ ...recordForm, notes: "" })
      setMessage("Attendance recorded.")
      await selectSession(selectedSessionId)
    } catch (error: any) {
      setErrorMsg(error.message || "Could not record attendance.")
    }
  }

  return (
    <AdminLayout title="Attendance" description="Manage ERP attendance sessions, manual records, reports, and face-recognition event logs.">
      {(message || errorMsg) && (
        <div className={`mb-6 rounded-2xl p-4 text-sm font-bold ${errorMsg ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
          {errorMsg || message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Metric icon={<CalendarCheck className="h-6 w-6" />} label="Sessions" value={counts.sessions} />
        <Metric icon={<CheckCircle2 className="h-6 w-6" />} label="Present Today" value={counts.present} />
        <Metric icon={<Clock className="h-6 w-6" />} label="Late Today" value={counts.late} />
        <Metric icon={<Activity className="h-6 w-6" />} label="Recognition Events" value={counts.events} dark />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <section className="xl:col-span-2 space-y-8">
          <div className="neo-flat rounded-[2rem] border border-white/40 p-8">
            <h2 className="text-2xl font-serif font-bold text-brand-grey mb-6">Attendance Sessions</h2>
            <div className="space-y-4">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => selectSession(String(session.id))}
                  className={`w-full text-left rounded-2xl border p-5 transition-all ${
                    String(session.id) === selectedSessionId 
                      ? "neo-pressed border border-brand-yellow/40 font-semibold" 
                      : "neo-btn text-brand-grey"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-lg">{session.sessionName || "Training Session"}</p>
                      <p className={`text-sm ${String(session.id) === selectedSessionId ? "text-brand-grey/60" : "text-brand-grey/40"}`}>
                        {session.program?.name || "Program"} - {session.batch?.name || "Batch"} - {new Date(session.sessionDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-widest rounded-full bg-white/50 px-3 py-1">{session.status}</span>
                      <select
                        value={session.status}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => updateSessionStatus(session, event.target.value)}
                        className="rounded-xl bg-white px-3 py-2 text-sm text-brand-grey border border-white/50 focus:outline-none"
                      >
                        <option value="PLANNED">Planned</option>
                        <option value="OPEN">Open</option>
                        <option value="CLOSED">Closed</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </button>
              ))}
              {sessions.length === 0 && <p className="py-10 text-center text-brand-grey/40">No attendance sessions yet.</p>}
            </div>
          </div>

          <div className="neo-flat rounded-[2rem] border border-white/40 p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-serif font-bold text-brand-grey">Records</h2>
                <p className="text-brand-grey/40 text-sm">{selectedSession?.sessionName || "Select a session"} records.</p>
              </div>
              <span className="text-xs font-black uppercase tracking-widest rounded-full bg-brand-yellow/20 px-3 py-1 text-brand-grey">{records.length} records</span>
            </div>
            <div className="space-y-3">
              {records.map((record) => (
                <div key={record.id} className="rounded-2xl neo-pressed border border-white/30 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-brand-grey">{[record.student?.firstName, record.student?.lastName].filter(Boolean).join(" ") || "Student"}</p>
                    <p className="text-sm text-brand-grey/40">{record.source} - {new Date(record.recordedAt).toLocaleString()}</p>
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest rounded-full bg-white px-3 py-1 text-brand-grey">{record.status}</span>
                </div>
              ))}
              {records.length === 0 && <p className="py-8 text-center text-brand-grey/40">No records for this session.</p>}
            </div>
          </div>
        </section>

        <aside className="space-y-8">
          <div className="bg-[#2c2c2c] rounded-[2rem] text-white p-8 shadow-[8px_8px_16px_rgba(0,0,0,0.2),-8px_-8px_16px_rgba(255,255,255,0.05)] border border-white/5">
            <h2 className="text-xl font-serif font-bold mb-6">Create Session</h2>
            <div className="space-y-4">
              <DarkSelect value={sessionForm.programId} onChange={(value) => {
                const batchId = String(batches.find((batch) => String(batch.programId) === value)?.id || "")
                setSessionForm({ ...sessionForm, programId: value, batchId, groupId: "" })
              }} options={programs} label="Select program" />
              <DarkSelect value={sessionForm.batchId} onChange={(value) => setSessionForm({ ...sessionForm, batchId: value, groupId: "" })} options={batches.filter((batch) => String(batch.programId) === sessionForm.programId)} label="Select batch" />
              <DarkSelect value={sessionForm.groupId} onChange={(value) => setSessionForm({ ...sessionForm, groupId: value })} options={availableGroups} label="Optional group" />
              <Input type="date" value={sessionForm.sessionDate} onChange={(event) => setSessionForm({ ...sessionForm, sessionDate: event.target.value })} className="bg-[#2c2c2c] border-white/10 text-white placeholder:text-white/40 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)] focus-visible:ring-brand-yellow/30" />
              <Input placeholder="Session name" value={sessionForm.sessionName} onChange={(event) => setSessionForm({ ...sessionForm, sessionName: event.target.value })} className="bg-[#2c2c2c] border-white/10 text-white placeholder:text-white/40 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)] focus-visible:ring-brand-yellow/30" />
              <div className="grid grid-cols-2 gap-3">
                <Input type="time" value={sessionForm.startTime} onChange={(event) => setSessionForm({ ...sessionForm, startTime: event.target.value })} className="bg-[#2c2c2c] border-white/10 text-white placeholder:text-white/40 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)] focus-visible:ring-brand-yellow/30" />
                <Input type="time" value={sessionForm.endTime} onChange={(event) => setSessionForm({ ...sessionForm, endTime: event.target.value })} className="bg-[#2c2c2c] border-white/10 text-white placeholder:text-white/40 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)] focus-visible:ring-brand-yellow/30" />
              </div>
              <Input placeholder="Location" value={sessionForm.location} onChange={(event) => setSessionForm({ ...sessionForm, location: event.target.value })} className="bg-[#2c2c2c] border-white/10 text-white placeholder:text-white/40 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)] focus-visible:ring-brand-yellow/30" />
              <Button onClick={createSession} disabled={!sessionForm.programId || !sessionForm.batchId || !sessionForm.sessionDate} className="w-full bg-brand-yellow text-brand-grey font-bold hover:bg-brand-yellow-dark rounded-xl active:scale-[0.98] transition-all py-6 shadow-[4px_4px_10px_rgba(0,0,0,0.15)] border border-brand-yellow/20">
                <Plus className="h-4 w-4 mr-2" /> Create Session
              </Button>
            </div>
          </div>

          <div className="neo-flat rounded-[2rem] border border-white/40 p-8">
            <h2 className="text-xl font-serif font-bold text-brand-grey mb-6">Manual Record</h2>
            <div className="space-y-4">
              <select 
                value={recordForm.studentId} 
                onChange={(event) => setRecordForm({ ...recordForm, studentId: event.target.value })} 
                className="w-full rounded-xl border border-white/60 bg-[#f0f4f8] shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff] px-4 py-3 text-brand-grey focus:outline-none"
              >
                <option value="">Select student</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>{[student.firstName, student.lastName].filter(Boolean).join(" ") || student.email}</option>
                ))}
              </select>
              <select 
                value={recordForm.status} 
                onChange={(event) => setRecordForm({ ...recordForm, status: event.target.value })} 
                className="w-full rounded-xl border border-white/60 bg-[#f0f4f8] shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff] px-4 py-3 text-brand-grey focus:outline-none"
              >
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="LATE">Late</option>
                <option value="EXCUSED">Excused</option>
              </select>
              <textarea 
                placeholder="Notes" 
                value={recordForm.notes} 
                onChange={(event) => setRecordForm({ ...recordForm, notes: event.target.value })} 
                className="w-full min-h-24 rounded-xl border border-white/60 bg-[#f0f4f8] shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff] p-4 focus:outline-none text-brand-grey" 
              />
              <Button 
                onClick={createRecord} 
                disabled={!selectedSessionId || !recordForm.studentId} 
                className="w-full rounded-xl bg-brand-grey text-brand-yellow hover:bg-brand-grey-dark py-6 shadow-md"
              >
                Record Attendance
              </Button>
            </div>
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

function DarkSelect({ value, onChange, options, label }: { value: string; onChange: (value: string) => void; options: any[]; label: string }) {
  return (
    <select 
      value={value} 
      onChange={(event) => onChange(event.target.value)} 
      className="w-full rounded-xl bg-[#2c2c2c] border border-white/10 px-4 py-3 text-white shadow-[inset_3px_3px_6px_rgba(0,0,0,0.3),_inset_-3px_-3px_6px_rgba(255,255,255,0.05)] focus:outline-none"
    >
      <option value="" className="text-brand-grey">{label}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id} className="text-brand-grey">{option.name}</option>
      ))}
    </select>
  )
}
