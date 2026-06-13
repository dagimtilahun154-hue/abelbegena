import { useEffect, useMemo, useState } from "react"
import { BookOpen, CheckCircle2, Music, Plus, Search, TrendingUp, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import AdminLayout from "@/components/AdminLayout"
import { backendApi } from "@/lib/backend"

type Student = {
  id: string
  email: string | null
  name: string
  status: string
  registrationStatus: string
  admissionNumber: string
  createdAt: string
}

type Program = {
  id: string
  name: string
  skillLevel: string
  durationMonths: number
}

type Batch = {
  id: string
  programId: string
  name: string
  status: string
  startDate: string
  endDate: string
}

type Enrollment = {
  id: string
  studentId: string
  programId: string
  batchId: string
  course_name: string
  batch_name: string
  status: string
  startDate: string
  expectedEndDate: string
}

const emptyEnrollment = {
  programId: "",
  batchId: "",
  status: "ACTIVE",
}

const studentName = (student: any) =>
  [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ") || student.email || "Unnamed student"

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [songs, setSongs] = useState<any[]>([])
  const [selectedStudent, setSelectedStudent] = useState("")
  const [query, setQuery] = useState("")
  const [enrollmentForm, setEnrollmentForm] = useState(emptyEnrollment)
  const [progressForm, setProgressForm] = useState({ songId: "", status: "IN_PROGRESS", adminNotes: "" })
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const load = async () => {
    const [studentRows, programRows, batchRows, enrollmentRows, songRows] = await Promise.all([
      backendApi.listStudents(),
      backendApi.listTrainingPrograms(),
      backendApi.listTrainingBatches(),
      backendApi.listEnrollments(),
      backendApi.listSongs(),
    ])

    const nextStudents = (studentRows.students || []).map((student: any) => ({
      id: String(student.id),
      email: student.email,
      name: studentName(student),
      status: student.status,
      registrationStatus: student.registrationStatus,
      admissionNumber: student.admissionNumber,
      createdAt: student.createdAt,
    }))
    const nextPrograms = (programRows.programs || []).map((program: any) => ({
      id: String(program.id),
      name: program.name,
      skillLevel: program.skillLevel || "ALL_LEVELS",
      durationMonths: Number(program.durationMonths || 3),
    }))
    const nextBatches = (batchRows.batches || []).map((batch: any) => ({
      id: String(batch.id),
      programId: String(batch.programId),
      name: batch.name,
      status: batch.status,
      startDate: batch.startDate,
      endDate: batch.endDate,
    }))
    const nextEnrollments = (enrollmentRows.enrollments || []).map((enrollment: any) => ({
      id: String(enrollment.id),
      studentId: String(enrollment.studentId),
      programId: String(enrollment.programId),
      batchId: String(enrollment.batchId),
      course_name: enrollment.program?.name || "Training program",
      batch_name: enrollment.batch?.name || "Batch",
      status: enrollment.status,
      startDate: enrollment.startDate,
      expectedEndDate: enrollment.expectedEndDate,
    }))

    setStudents(nextStudents)
    setPrograms(nextPrograms)
    setBatches(nextBatches)
    setEnrollments(nextEnrollments)
    setSongs(songRows.songs || [])

    const firstStudentId = nextStudents[0]?.id || ""
    const firstProgramId = nextPrograms[0]?.id || ""
    const firstBatchId = nextBatches.find((batch) => batch.programId === firstProgramId)?.id || nextBatches[0]?.id || ""
    setSelectedStudent((prev) => prev || firstStudentId)
    setEnrollmentForm((prev) => ({
      ...prev,
      programId: prev.programId || firstProgramId,
      batchId: prev.batchId || firstBatchId,
    }))
    setProgressForm((prev) => ({
      ...prev,
      songId: prev.songId || String(songRows.songs?.[0]?.id || ""),
    }))
  }

  useEffect(() => {
    load().catch((error) => setErrorMsg(error.message || "Could not load students."))
  }, [])

  const filteredStudents = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return students
    return students.filter((student) =>
      `${student.name} ${student.email || ""} ${student.status} ${student.admissionNumber}`.toLowerCase().includes(needle)
    )
  }, [query, students])

  const selectedEnrollments = enrollments.filter((enrollment) => enrollment.studentId === selectedStudent)
  const selectedStudentData = students.find((student) => student.id === selectedStudent)
  const programBatches = batches.filter((batch) => batch.programId === enrollmentForm.programId)
  const activeEnrollment = selectedEnrollments.find((enrollment) => enrollment.status === "ACTIVE") || selectedEnrollments[0]

  const assignCourse = async () => {
    const userId = selectedStudent
    if (!userId || !enrollmentForm.programId || !enrollmentForm.batchId) {
      setErrorMsg("Select a student, program, and batch before enrolling.")
      return
    }

    setSaving(true)
    setErrorMsg("")
    try {
      const selectedBatch = batches.find((batch) => batch.id === enrollmentForm.batchId)
      await backendApi.createStudentEnrollment(userId, {
        programId: Number(enrollmentForm.programId),
        batchId: Number(enrollmentForm.batchId),
        status: enrollmentForm.status,
        startDate: selectedBatch?.startDate,
        expectedEndDate: selectedBatch?.endDate,
      })

      await load()
    } catch (error: any) {
      setErrorMsg(error.message || "Could not enroll student.")
    } finally {
      setSaving(false)
    }
  }

  const updateEnrollmentStatus = async (enrollment: Enrollment, status: string) => {
    setErrorMsg("")
    try {
      await backendApi.updateEnrollment(enrollment.id, { status })
      await load()
    } catch (error: any) {
      setErrorMsg(error.message || "Could not update enrollment.")
    }
  }

  const updateSongProgress = async () => {
    if (!selectedStudent || !progressForm.songId) {
      setErrorMsg("Select a student and song before updating progress.")
      return
    }

    setSaving(true)
    setErrorMsg("")
    try {
      await backendApi.updateStudentSongProgress(selectedStudent, progressForm.songId, {
        enrollmentId: activeEnrollment?.id ? Number(activeEnrollment.id) : undefined,
        status: progressForm.status,
        adminNotes: progressForm.adminNotes.trim() || null,
      })
      setProgressForm({ ...progressForm, adminNotes: "" })
      await load()
    } catch (error: any) {
      setErrorMsg(error.message || "Could not update song progress.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout title="Student Directory" description="View approved students, manage backend enrollments, and align students to short-term training batches.">
      {errorMsg && <div className="mb-6 p-4 rounded-2xl bg-red-50 text-red-700 font-medium">{errorMsg}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="neo-flat p-6 rounded-[2rem] border border-white/40">
          <Users className="h-6 w-6 text-brand-yellow-dark mb-5" />
          <p className="text-xs font-black uppercase tracking-widest text-brand-grey/40">Students</p>
          <p className="text-4xl font-serif font-bold text-brand-grey">{students.length}</p>
        </div>
        <div className="neo-flat p-6 rounded-[2rem] border border-white/40">
          <CheckCircle2 className="h-6 w-6 text-green-600 mb-5" />
          <p className="text-xs font-black uppercase tracking-widest text-brand-grey/40">Active</p>
          <p className="text-4xl font-serif font-bold text-brand-grey">{students.filter((student) => student.status === "ACTIVE").length}</p>
        </div>
        <div className="bg-[#2c2c2c] p-6 rounded-[2rem] text-white shadow-[8px_8px_16px_rgba(0,0,0,0.2),-8px_-8px_16px_rgba(255,255,255,0.05)] border border-white/5">
          <BookOpen className="h-6 w-6 text-brand-yellow mb-5" />
          <p className="text-xs font-black uppercase tracking-widest text-white/40">Enrollments</p>
          <p className="text-4xl font-serif font-bold text-brand-yellow">{enrollments.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-8">
        <aside className="neo-flat p-6 rounded-[2rem] border border-white/40 h-fit">
          <div className="relative mb-5">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-grey/20" />
            <Input 
              value={query} 
              onChange={(event) => setQuery(event.target.value)} 
              placeholder="Search students" 
              className="pl-11 rounded-xl border border-white/60 bg-[#f0f4f8] shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] focus-visible:ring-0 focus-visible:ring-offset-0" 
            />
          </div>
          <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
            {filteredStudents.map((student) => (
              <button
                key={student.id}
                onClick={() => setSelectedStudent(student.id)}
                className={`w-full text-left p-4 rounded-2xl transition-all ${
                  selectedStudent === student.id 
                    ? "neo-pressed text-brand-grey border border-brand-yellow/40 font-semibold" 
                    : "neo-btn text-brand-grey"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{student.name}</p>
                    <p className={`text-xs ${selectedStudent === student.id ? "text-brand-grey/60" : "text-brand-grey/40"}`}>{student.email}</p>
                    <p className={`text-xs ${selectedStudent === student.id ? "text-brand-grey/60" : "text-brand-grey/40"}`}>{student.admissionNumber}</p>
                  </div>
                  <span className={`text-[10px] uppercase tracking-widest font-black px-2 py-1 rounded-full ${student.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-white/70 text-yellow-700"}`}>
                    {student.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="space-y-8">
          <div className="neo-flat p-8 rounded-[2rem] border border-white/40">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-serif font-bold text-brand-grey">{selectedStudentData?.name || "Select a student"}</h2>
                <p className="text-brand-grey/40 text-sm">{selectedStudentData?.email || "Choose a student to manage enrollments."}</p>
              </div>
              <span className="px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest bg-brand-yellow/20 text-brand-grey">
                {selectedStudentData?.registrationStatus || "No student selected"}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
              <div className="p-5 rounded-2xl neo-pressed border border-white/30">
                <TrendingUp className="h-5 w-5 text-brand-yellow-dark mb-3" />
                <p className="text-xs font-black uppercase tracking-widest text-brand-grey/40">Programs</p>
                <p className="text-2xl font-serif font-bold text-brand-grey">{programs.length}</p>
              </div>
              <div className="p-5 rounded-2xl neo-pressed border border-white/30">
                <Music className="h-5 w-5 text-brand-yellow-dark mb-3" />
                <p className="text-xs font-black uppercase tracking-widest text-brand-grey/40">Batches</p>
                <p className="text-2xl font-serif font-bold text-brand-grey">{batches.length}</p>
              </div>
              <div className="p-5 rounded-2xl neo-pressed border border-white/30">
                <BookOpen className="h-5 w-5 text-brand-yellow-dark mb-3" />
                <p className="text-xs font-black uppercase tracking-widest text-brand-grey/40">Student Enrollments</p>
                <p className="text-2xl font-serif font-bold text-brand-grey">{selectedEnrollments.length}</p>
              </div>
            </div>

            <div className="space-y-4">
              {selectedEnrollments.map((enrollment) => (
                <div key={enrollment.id} className="p-5 rounded-2xl neo-pressed border border-white/30">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-brand-grey text-lg">{enrollment.course_name}</p>
                      <p className="text-sm text-brand-grey/40">{enrollment.batch_name} - {new Date(enrollment.startDate).toLocaleDateString()} to {new Date(enrollment.expectedEndDate).toLocaleDateString()}</p>
                    </div>
                    <select 
                      value={enrollment.status} 
                      onChange={(event) => updateEnrollmentStatus(enrollment, event.target.value)} 
                      className="rounded-xl neo-btn border border-white/40 px-4 py-3 text-brand-grey cursor-pointer focus:outline-none"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="ACTIVE">Active</option>
                      <option value="DEFERRED">Deferred</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="WITHDRAWN">Withdrawn</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                </div>
              ))}
              {selectedStudent && selectedEnrollments.length === 0 && (
                <p className="py-8 text-center text-brand-grey/40 bg-[#f0f4f8] shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] rounded-2xl border border-white/20">
                  No enrollments yet.
                </p>
              )}
            </div>
          </div>

          <div className="bg-[#2c2c2c] p-8 rounded-[2rem] text-white shadow-[8px_8px_16px_rgba(0,0,0,0.2),-8px_-8px_16px_rgba(255,255,255,0.05)] border border-white/5">
            <h2 className="text-2xl font-serif font-bold mb-6">Assign Program Batch</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <select
                value={enrollmentForm.programId}
                onChange={(event) => {
                  const nextProgramId = event.target.value
                  const nextBatchId = batches.find((batch) => batch.programId === nextProgramId)?.id || ""
                  setEnrollmentForm({ ...enrollmentForm, programId: nextProgramId, batchId: nextBatchId })
                }}
                className="w-full rounded-xl bg-[#2c2c2c] border border-white/10 px-4 py-3 text-white shadow-[inset_3px_3px_6px_rgba(0,0,0,0.3),_inset_-3px_-3px_6px_rgba(255,255,255,0.05)] focus:outline-none"
              >
                <option value="" className="text-brand-grey">Select program</option>
                {programs.map((program) => <option key={program.id} value={program.id} className="text-brand-grey">{program.name} ({program.durationMonths} months)</option>)}
              </select>
              <select
                value={enrollmentForm.batchId}
                onChange={(event) => setEnrollmentForm({ ...enrollmentForm, batchId: event.target.value })}
                className="w-full rounded-xl bg-[#2c2c2c] border border-white/10 px-4 py-3 text-white shadow-[inset_3px_3px_6px_rgba(0,0,0,0.3),_inset_-3px_-3px_6px_rgba(255,255,255,0.05)] focus:outline-none"
              >
                <option value="" className="text-brand-grey">Select batch</option>
                {programBatches.map((batch) => <option key={batch.id} value={batch.id} className="text-brand-grey">{batch.name} ({batch.status})</option>)}
              </select>
              <select
                value={enrollmentForm.status}
                onChange={(event) => setEnrollmentForm({ ...enrollmentForm, status: event.target.value })}
                className="w-full rounded-xl bg-[#2c2c2c] border border-white/10 px-4 py-3 text-white shadow-[inset_3px_3px_6px_rgba(0,0,0,0.3),_inset_-3px_-3px_6px_rgba(255,255,255,0.05)] focus:outline-none"
              >
                <option value="ACTIVE" className="text-brand-grey">Active</option>
                <option value="PENDING" className="text-brand-grey">Pending</option>
                <option value="DEFERRED" className="text-brand-grey">Deferred</option>
              </select>
              <Button 
                onClick={assignCourse} 
                disabled={saving || !selectedStudent || programs.length === 0 || batches.length === 0} 
                className="bg-brand-yellow text-brand-grey font-semibold rounded-xl shadow-[4px_4px_10px_rgba(0,0,0,0.15)] hover:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1)] hover:bg-brand-yellow-dark active:scale-[0.98] transition-all border border-brand-yellow/20"
              >
                <Plus className="h-4 w-4 mr-2" /> Enroll
              </Button>
            </div>
            {batches.length === 0 && (
              <p className="text-white/50 text-sm mt-4">Create training batches in the backend before assigning students to programs.</p>
            )}
          </div>

          <div className="neo-flat p-8 rounded-[2rem] border border-white/40">
            <h2 className="text-2xl font-serif font-bold text-brand-grey mb-2">Update Song Status</h2>
            <p className="text-sm text-brand-grey/40 mb-6">Progress is applied to the selected student's active enrollment. Completing a required song can assign the next song automatically.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select 
                value={progressForm.songId} 
                onChange={(event) => setProgressForm({ ...progressForm, songId: event.target.value })} 
                className="w-full rounded-xl border border-white/60 bg-[#f0f4f8] shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff] px-4 py-3 text-brand-grey focus:outline-none"
              >
                <option value="">Select song</option>
                {songs.map((song) => <option key={song.id} value={song.id}>{song.title}</option>)}
              </select>
              <select 
                value={progressForm.status} 
                onChange={(event) => setProgressForm({ ...progressForm, status: event.target.value })} 
                className="w-full rounded-xl border border-white/60 bg-[#f0f4f8] shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff] px-4 py-3 text-brand-grey focus:outline-none"
              >
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="NEEDS_PRACTICE">Needs practice</option>
                <option value="COMPLETED">Completed</option>
                <option value="SKIPPED">Skipped</option>
                <option value="LOCKED">Locked</option>
              </select>
              <Button 
                onClick={updateSongProgress} 
                disabled={saving || !selectedStudent || !progressForm.songId} 
                className="bg-brand-yellow text-brand-grey font-semibold rounded-xl shadow-[4px_4px_10px_rgba(209,217,230,0.8),-4px_-4px_10px_#ffffff] hover:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1)] hover:bg-brand-yellow-dark active:scale-[0.98] transition-all border border-brand-yellow/20"
              >
                Update Status
              </Button>
              <textarea
                placeholder="Instructor notes"
                value={progressForm.adminNotes}
                onChange={(event) => setProgressForm({ ...progressForm, adminNotes: event.target.value })}
                className="md:col-span-3 min-h-24 rounded-xl border border-white/60 bg-[#f0f4f8] shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff] p-4 focus:outline-none"
              />
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  )
}
