import { useCallback, useEffect, useState } from "react"
import { BookOpen, Music, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import AdminLayout from "@/components/AdminLayout"
import { backendApi } from "@/lib/backend"

type Course = {
  id: string
  name: string
  code: string
  instrumentFocus: string | null
  skillLevel: string
  durationMonths: number
  description: string | null
  status: string
}

type Batch = {
  id: string
  programId: string
  name: string
  code: string
  status: string
  startDate: string
  endDate: string
}

const emptyCourse = {
  name: "",
  code: "",
  instrumentFocus: "Begena",
  skillLevel: "BEGINNER",
  durationMonths: "3",
  description: "",
  status: "ACTIVE",
}

const emptyBatch = {
  programId: "",
  name: "",
  startDate: new Date().toISOString().slice(0, 10),
  capacity: "",
  location: "",
  scheduleNotes: "",
}

const slugCode = (name: string) =>
  name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 28) || `PROGRAM-${Date.now()}`

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [courseForm, setCourseForm] = useState(emptyCourse)
  const [editingCourseId, setEditingCourseId] = useState("")
  const [batchForm, setBatchForm] = useState(emptyBatch)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const load = useCallback(async () => {
    const [{ programs }, batchRows] = await Promise.all([
      backendApi.listTrainingPrograms(),
      backendApi.listTrainingBatches(),
    ])
    const nextCourses = (programs || []).map((program: any) => ({
      id: String(program.id),
      name: program.name,
      code: program.code,
      instrumentFocus: program.instrumentFocus,
      skillLevel: program.skillLevel || "ALL_LEVELS",
      durationMonths: Number(program.durationMonths || 3),
      description: program.description,
      status: program.status,
    }))
    setCourses(nextCourses)
    setBatches((batchRows.batches || []).map((batch: any) => ({
      id: String(batch.id),
      programId: String(batch.programId),
      name: batch.name,
      code: batch.code,
      status: batch.status,
      startDate: batch.startDate,
      endDate: batch.endDate,
    })))
    setBatchForm((current) => ({ ...current, programId: current.programId || nextCourses[0]?.id || "" }))
  }, [])

  useEffect(() => {
    load().catch((error) => setErrorMsg(error.message || "Could not load programs."))
  }, [load])

  const editCourse = (course: Course) => {
    setEditingCourseId(course.id)
    setCourseForm({
      name: course.name,
      code: course.code,
      instrumentFocus: course.instrumentFocus || "Begena",
      skillLevel: course.skillLevel,
      durationMonths: String(course.durationMonths),
      description: course.description || "",
      status: course.status,
    })
  }

  const resetCourseForm = () => {
    setEditingCourseId("")
    setCourseForm(emptyCourse)
  }

  const saveCourse = async () => {
    if (!courseForm.name.trim() || !courseForm.instrumentFocus.trim()) return
    setSaving(true)
    setErrorMsg("")

    try {
      const payload = {
        name: courseForm.name.trim(),
        code: courseForm.code.trim() || `${slugCode(courseForm.name)}-${courseForm.durationMonths}M`,
        instrumentFocus: courseForm.instrumentFocus.trim(),
        skillLevel: courseForm.skillLevel,
        durationMonths: Number(courseForm.durationMonths),
        description: courseForm.description.trim() || null,
        status: courseForm.status,
      }

      if (editingCourseId) {
        await backendApi.updateTrainingProgram(editingCourseId, payload)
      } else {
        await backendApi.createTrainingProgram(payload)
      }

      resetCourseForm()
      await load()
    } catch (error: any) {
      setErrorMsg(error.message || "Could not save program.")
    } finally {
      setSaving(false)
    }
  }

  const toggleCourse = async (course: Course) => {
    setErrorMsg("")
    try {
      await backendApi.updateTrainingProgram(course.id, {
        status: course.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      })
      await load()
    } catch (error: any) {
      setErrorMsg(error.message || "Could not update program.")
    }
  }

  const addBatch = async () => {
    if (!batchForm.programId || !batchForm.name.trim() || !batchForm.startDate) return
    setSaving(true)
    setErrorMsg("")

    try {
      await backendApi.createTrainingBatch({
        programId: Number(batchForm.programId),
        name: batchForm.name.trim(),
        code: `${slugCode(batchForm.name)}-${Date.now().toString().slice(-5)}`,
        startDate: batchForm.startDate,
        capacity: batchForm.capacity ? Number(batchForm.capacity) : null,
        location: batchForm.location.trim() || null,
        scheduleNotes: batchForm.scheduleNotes.trim() || null,
        status: "PLANNED",
      })
      setBatchForm({ ...emptyBatch, programId: batchForm.programId })
      await load()
    } catch (error: any) {
      setErrorMsg(error.message || "Could not add batch.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <AdminLayout title="Courses & Songs" description="Manage short-term 3, 6, and 9 month music training programs connected to the backend.">
        {errorMsg && <div className="mb-6 p-4 rounded-2xl bg-red-50 text-red-700 font-medium">{errorMsg}</div>}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <section className="xl:col-span-2 space-y-6">
            <div className="neo-flat-white p-8 rounded-[2rem] border border-white/40">
              <div className="flex items-center gap-3 mb-6">
                <BookOpen className="h-6 w-6 text-brand-yellow-dark" />
                <h2 className="text-2xl font-serif font-bold text-brand-grey">Training Programs</h2>
              </div>
              <div className="space-y-4">
                {courses.map((course) => (
                  <div key={course.id} className="p-5 rounded-2xl bg-[#f8fafc] border border-white/40 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-inner animate-fade-in">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-brand-grey text-lg">{course.name}</h3>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${course.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-slate-200 text-brand-grey/50"}`}>
                          {course.status}
                        </span>
                      </div>
                      <p className="text-sm text-brand-grey/50">{course.instrumentFocus || "Instrument"} - {course.skillLevel.replace("_", " ")} - {course.durationMonths} months - {course.code}</p>
                      {course.description && <p className="text-sm text-brand-grey/50 mt-2 line-clamp-2">{course.description}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => editCourse(course)} variant="outline" className="rounded-xl border-white/60 bg-[#f0f4f8] shadow-[2px_2px_5px_#d1d9e6,-2px_-2px_5px_#ffffff] text-brand-grey font-bold hover:bg-[#ebf0f6] active:scale-[0.98] transition-all">
                        Edit
                      </Button>
                      <Button onClick={() => toggleCourse(course)} variant="outline" className="rounded-xl border-white/60 bg-[#f0f4f8] shadow-[2px_2px_5px_#d1d9e6,-2px_-2px_5px_#ffffff] text-brand-grey font-bold hover:bg-[#ebf0f6] active:scale-[0.98] transition-all">
                        {course.status === "ACTIVE" ? "Hide" : "Publish"}
                      </Button>
                    </div>
                  </div>
                ))}
                {courses.length === 0 && <p className="text-brand-grey/40 py-8 text-center">No backend training programs yet.</p>}
              </div>
            </div>

            <div className="neo-flat-white p-8 rounded-[2rem] border border-white/40">
              <div className="flex items-center gap-3 mb-4">
                <Music className="h-6 w-6 text-brand-yellow-dark" />
                <h2 className="text-2xl font-serif font-bold text-brand-grey">Training Batches</h2>
              </div>
              <div className="space-y-3">
                {batches.map((batch) => (
                  <div key={batch.id} className="rounded-2xl bg-[#f8fafc] border border-white/40 shadow-inner p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-brand-grey">{batch.name}</p>
                      <p className="text-xs text-brand-grey/40">{courses.find((course) => course.id === batch.programId)?.name || "Program"} - {new Date(batch.startDate).toLocaleDateString()} to {new Date(batch.endDate).toLocaleDateString()}</p>
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full bg-brand-yellow/20 text-brand-grey">{batch.status}</span>
                  </div>
                ))}
                {batches.length === 0 && <p className="text-brand-grey/40">No training batches yet.</p>}
              </div>
            </div>
          </section>

          <aside className="space-y-8">
            <div className="neo-flat-white p-8 rounded-[2rem] border border-white/40">
              <div className="flex items-center justify-between gap-4 mb-6">
                <h2 className="text-xl font-serif font-bold text-brand-grey">{editingCourseId ? "Edit Program" : "Add Program"}</h2>
                {editingCourseId && (
                  <button onClick={resetCourseForm} className="text-sm font-bold text-brand-grey/50 hover:text-brand-grey">
                    New Program
                  </button>
                )}
              </div>
              <div className="space-y-4">
                <Input placeholder="Program title" value={courseForm.name} onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })} className="bg-[#f8fafc] border border-white/40 shadow-inner rounded-xl h-12" />
                <Input placeholder="Program code" value={courseForm.code} onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })} className="bg-[#f8fafc] border border-white/40 shadow-inner rounded-xl h-12" />
                <Input placeholder="Instrument focus" value={courseForm.instrumentFocus} onChange={(e) => setCourseForm({ ...courseForm, instrumentFocus: e.target.value })} className="bg-[#f8fafc] border border-white/40 shadow-inner rounded-xl h-12" />
                <select value={courseForm.skillLevel} onChange={(e) => setCourseForm({ ...courseForm, skillLevel: e.target.value })} className="w-full rounded-xl border border-white/40 bg-[#f8fafc] shadow-inner px-4 py-3 text-brand-grey focus:outline-none focus:ring-2 focus:ring-brand-yellow/40">
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="ALL_LEVELS">All levels</option>
                </select>
                <select value={courseForm.durationMonths} onChange={(e) => setCourseForm({ ...courseForm, durationMonths: e.target.value })} className="w-full rounded-xl border border-white/40 bg-[#f8fafc] shadow-inner px-4 py-3 text-brand-grey focus:outline-none focus:ring-2 focus:ring-brand-yellow/40">
                  <option value="3">3 months</option>
                  <option value="6">6 months</option>
                  <option value="9">9 months</option>
                </select>
                <select value={courseForm.status} onChange={(e) => setCourseForm({ ...courseForm, status: e.target.value })} className="w-full rounded-xl border border-white/40 bg-[#f8fafc] shadow-inner px-4 py-3 text-brand-grey focus:outline-none focus:ring-2 focus:ring-brand-yellow/40">
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
                <textarea placeholder="Description" value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} className="w-full min-h-28 rounded-xl border border-white/40 bg-[#f8fafc] shadow-inner p-4 focus:outline-none focus:ring-2 focus:ring-brand-yellow/40" />
                <Button onClick={saveCourse} disabled={saving} className="w-full bg-[#2c2c2c] text-brand-yellow hover:bg-[#1a1a1a] rounded-xl font-bold py-6 shadow-[4px_4px_10px_#d1d9e6,-4px_-4px_10px_#ffffff] transition-all duration-200 active:scale-[0.98]">
                  <Plus className="h-4 w-4 mr-2" /> {editingCourseId ? "Save Program" : "Add Program"}
                </Button>
              </div>
            </div>

            <div className="bg-[#2c2c2c] p-8 rounded-[2rem] text-white shadow-[8px_8px_24px_rgba(163,177,198,0.35),-8px_-8px_24px_#ffffff]">
              <h2 className="text-xl font-serif font-bold mb-6">Add Batch</h2>
              <div className="space-y-4 mb-8">
                <select value={batchForm.programId} onChange={(e) => setBatchForm({ ...batchForm, programId: e.target.value })} className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-white">
                  <option value="" className="text-brand-grey">Select program</option>
                  {courses.map((course) => <option key={course.id} value={course.id} className="text-brand-grey">{course.name}</option>)}
                </select>
                <Input placeholder="Batch name" value={batchForm.name} onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })} />
                <Input type="date" value={batchForm.startDate} onChange={(e) => setBatchForm({ ...batchForm, startDate: e.target.value })} />
                <Input type="number" placeholder="Capacity" value={batchForm.capacity} onChange={(e) => setBatchForm({ ...batchForm, capacity: e.target.value })} />
                <Input placeholder="Location" value={batchForm.location} onChange={(e) => setBatchForm({ ...batchForm, location: e.target.value })} />
                <Button onClick={addBatch} disabled={saving || courses.length === 0} className="w-full bg-brand-yellow text-brand-grey hover:bg-brand-yellow-dark rounded-xl py-6 font-bold">
                  <Plus className="h-4 w-4 mr-2" /> Add Batch
                </Button>
              </div>

              <h2 className="text-xl font-serif font-bold mb-4">Training School Fit</h2>
              <p className="text-white/60 text-sm leading-relaxed">
                Programs are constrained to 3, 6, or 9 months in the backend so admissions, batches, fees, and progress stay aligned with the short-term music school model.
              </p>
            </div>
          </aside>
        </div>
      </AdminLayout>
    </div>
  )
}
