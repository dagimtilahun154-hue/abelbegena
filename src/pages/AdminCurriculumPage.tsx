import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { BookOpen, ListMusic, Music, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import AdminLayout from "@/components/AdminLayout"
import { backendApi } from "@/lib/backend"

const emptyLevel = { name: "", code: "", sortOrder: "" }
const emptySong = { levelId: "", title: "", code: "", description: "" }
const emptyProgramSong = { programId: "", levelId: "", songId: "", sortOrder: "", isRequired: true }

export default function AdminCurriculumPage() {
  const [programs, setPrograms] = useState<any[]>([])
  const [levels, setLevels] = useState<any[]>([])
  const [songs, setSongs] = useState<any[]>([])
  const [programSongs, setProgramSongs] = useState<any[]>([])
  const [levelForm, setLevelForm] = useState(emptyLevel)
  const [songForm, setSongForm] = useState(emptySong)
  const [programSongForm, setProgramSongForm] = useState(emptyProgramSong)
  const [selectedProgramId, setSelectedProgramId] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  const load = useCallback(async (preferredProgramId = "") => {
    const [programRows, levelRows, songRows] = await Promise.all([
      backendApi.listTrainingPrograms(),
      backendApi.listSongLevels(),
      backendApi.listSongs(),
    ])
    const nextPrograms = programRows.programs || []
    const nextLevels = levelRows.levels || []
    const nextSongs = songRows.songs || []
    const nextProgramId = preferredProgramId || String(nextPrograms[0]?.id || "")
    const programSongRows = nextProgramId ? await backendApi.listProgramSongs({ programId: Number(nextProgramId) }) : { programSongs: [] }

    setPrograms(nextPrograms)
    setLevels(nextLevels)
    setSongs(nextSongs)
    setProgramSongs(programSongRows.programSongs || [])
    setSelectedProgramId(nextProgramId)
    setSongForm((current) => ({ ...current, levelId: current.levelId || String(nextLevels[0]?.id || "") }))
    setProgramSongForm((current) => ({
      ...current,
      programId: current.programId || nextProgramId,
      levelId: current.levelId || String(nextLevels[0]?.id || ""),
      songId: current.songId || String(nextSongs[0]?.id || ""),
    }))
  }, [])

  useEffect(() => {
    load().catch((error) => setErrorMsg(error.message || "Could not load curriculum."))
  }, [load])

  const songsByLevel = useMemo(() => {
    return levels.map((level) => ({
      level,
      songs: songs.filter((song) => song.levelId === level.id),
    }))
  }, [levels, songs])

  const addLevel = async () => {
    if (!levelForm.name.trim() || !levelForm.code.trim()) return
    setErrorMsg("")
    try {
      await backendApi.createSongLevel({
        name: levelForm.name.trim(),
        code: levelForm.code.trim().toUpperCase(),
        sortOrder: Number(levelForm.sortOrder || levels.length + 1),
        isActive: true,
      })
      setLevelForm(emptyLevel)
      await load(selectedProgramId)
    } catch (error: any) {
      setErrorMsg(error.message || "Could not add song level.")
    }
  }

  const addSong = async () => {
    if (!songForm.levelId || !songForm.title.trim()) return
    setErrorMsg("")
    try {
      await backendApi.createSong({
        levelId: Number(songForm.levelId),
        title: songForm.title.trim(),
        code: songForm.code.trim() || null,
        description: songForm.description.trim() || null,
        status: "ACTIVE",
      })
      setSongForm({ ...emptySong, levelId: songForm.levelId })
      await load(selectedProgramId)
    } catch (error: any) {
      setErrorMsg(error.message || "Could not add song.")
    }
  }

  const addProgramSong = async () => {
    if (!programSongForm.programId || !programSongForm.levelId || !programSongForm.songId) return
    setErrorMsg("")
    try {
      await backendApi.createProgramSong({
        programId: Number(programSongForm.programId),
        levelId: Number(programSongForm.levelId),
        songId: Number(programSongForm.songId),
        sortOrder: Number(programSongForm.sortOrder || programSongs.length + 1),
        isRequired: programSongForm.isRequired,
      })
      setProgramSongForm({ ...programSongForm, sortOrder: "" })
      const rows = await backendApi.listProgramSongs({ programId: Number(programSongForm.programId) })
      setProgramSongs(rows.programSongs || [])
    } catch (error: any) {
      setErrorMsg(error.message || "Could not attach song to program.")
    }
  }

  const switchProgram = async (programId: string) => {
    setSelectedProgramId(programId)
    setProgramSongForm((current) => ({ ...current, programId }))
    if (programId) {
      const rows = await backendApi.listProgramSongs({ programId: Number(programId) })
      setProgramSongs(rows.programSongs || [])
    } else {
      setProgramSongs([])
    }
  }

  return (
    <AdminLayout title="Song Curriculum" description="Create song levels, songs, and ordered program song paths for student progress.">
      {errorMsg && <div className="mb-6 p-4 rounded-2xl bg-red-50 text-red-700 font-medium">{errorMsg}</div>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Metric icon={<BookOpen className="h-6 w-6" />} label="Programs" value={programs.length} />
        <Metric icon={<ListMusic className="h-6 w-6" />} label="Levels" value={levels.length} />
        <Metric icon={<Music className="h-6 w-6" />} label="Songs" value={songs.length} />
        <Metric icon={<Plus className="h-6 w-6" />} label="Program Songs" value={programSongs.length} dark />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <section className="xl:col-span-2 space-y-8">
          <div className="neo-flat-white p-8 rounded-[2rem] border border-white/40">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h2 className="text-2xl font-serif font-bold text-brand-grey">Program Song Order</h2>
              <select value={selectedProgramId} onChange={(event) => switchProgram(event.target.value)} className="rounded-xl border border-white/40 bg-[#f8fafc] shadow-inner px-4 py-3 text-brand-grey">
                <option value="">Select program</option>
                {programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
              </select>
            </div>
            <div className="space-y-3">
              {programSongs.map((item) => (
                <div key={item.id} className="rounded-2xl bg-[#f8fafc] border border-white/40 shadow-inner p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-brand-grey">{item.song?.title || "Song"}</p>
                    <p className="text-xs text-brand-grey/40">{item.level?.name || "Level"} - Order {item.sortOrder}</p>
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full bg-brand-yellow/20 text-brand-grey">
                    {item.isRequired ? "Required" : "Optional"}
                  </span>
                </div>
              ))}
              {programSongs.length === 0 && <p className="text-brand-grey/40 py-8 text-center">No songs attached to this program yet.</p>}
            </div>
          </div>

          <div className="neo-flat-white p-8 rounded-[2rem] border border-white/40">
            <h2 className="text-2xl font-serif font-bold text-brand-grey mb-6">Songs By Level</h2>
            <div className="space-y-6">
              {songsByLevel.map(({ level, songs: levelSongs }) => (
                <div key={level.id} className="rounded-2xl bg-[#f8fafc] border border-white/40 shadow-inner p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-serif font-bold text-xl text-brand-grey">{level.name}</h3>
                    <span className="text-xs font-black text-brand-grey/40">#{level.sortOrder}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {levelSongs.map((song) => (
                      <div key={song.id} className="rounded-xl bg-white/70 border border-white/60 p-4">
                        <p className="font-bold text-brand-grey">{song.title}</p>
                        <p className="text-xs text-brand-grey/40">{song.code || "No code"} - {song.status}</p>
                      </div>
                    ))}
                    {levelSongs.length === 0 && <p className="text-brand-grey/40">No songs in this level yet.</p>}
                  </div>
                </div>
              ))}
              {levels.length === 0 && <p className="text-brand-grey/40">Create the first song level to begin.</p>}
            </div>
          </div>
        </section>

        <aside className="space-y-8">
          <Panel title="Add Song Level">
            <Input placeholder="Level name" value={levelForm.name} onChange={(event) => setLevelForm({ ...levelForm, name: event.target.value })} />
            <Input placeholder="Code" value={levelForm.code} onChange={(event) => setLevelForm({ ...levelForm, code: event.target.value })} />
            <Input type="number" placeholder="Sort order" value={levelForm.sortOrder} onChange={(event) => setLevelForm({ ...levelForm, sortOrder: event.target.value })} />
            <Button onClick={addLevel} className="w-full bg-[#2c2c2c] text-brand-yellow rounded-xl py-6">Add Level</Button>
          </Panel>

          <Panel title="Add Song">
            <Select value={songForm.levelId} onChange={(value) => setSongForm({ ...songForm, levelId: value })} options={levels} label="Select level" />
            <Input placeholder="Song title" value={songForm.title} onChange={(event) => setSongForm({ ...songForm, title: event.target.value })} />
            <Input placeholder="Optional code" value={songForm.code} onChange={(event) => setSongForm({ ...songForm, code: event.target.value })} />
            <textarea placeholder="Description" value={songForm.description} onChange={(event) => setSongForm({ ...songForm, description: event.target.value })} className="w-full min-h-24 rounded-xl border border-white/40 bg-[#f8fafc] shadow-inner p-4 focus:outline-none focus:ring-2 focus:ring-brand-yellow/40" />
            <Button onClick={addSong} className="w-full bg-[#2c2c2c] text-brand-yellow rounded-xl py-6">Add Song</Button>
          </Panel>

          <div className="bg-[#2c2c2c] p-8 rounded-[2rem] text-white shadow-[8px_8px_24px_rgba(163,177,198,0.35),-8px_-8px_24px_#ffffff]">
            <h2 className="text-xl font-serif font-bold mb-6">Attach To Program</h2>
            <div className="space-y-4">
              <DarkSelect value={programSongForm.programId} onChange={(value) => setProgramSongForm({ ...programSongForm, programId: value })} options={programs} label="Select program" />
              <DarkSelect value={programSongForm.levelId} onChange={(value) => setProgramSongForm({ ...programSongForm, levelId: value })} options={levels} label="Select level" />
              <DarkSelect value={programSongForm.songId} onChange={(value) => setProgramSongForm({ ...programSongForm, songId: value })} options={songs} label="Select song" titleKey="title" />
              <Input type="number" placeholder="Sort order" value={programSongForm.sortOrder} onChange={(event) => setProgramSongForm({ ...programSongForm, sortOrder: event.target.value })} />
              <label className="flex items-center gap-3 text-sm font-bold text-white/70">
                <input type="checkbox" checked={programSongForm.isRequired} onChange={(event) => setProgramSongForm({ ...programSongForm, isRequired: event.target.checked })} />
                Required song
              </label>
              <Button onClick={addProgramSong} className="w-full bg-brand-yellow text-brand-grey rounded-xl py-6">Attach Song</Button>
            </div>
          </div>
        </aside>
      </div>
    </AdminLayout>
  )
}

function Metric({ icon, label, value, dark = false }: { icon: ReactNode; label: string; value: string | number; dark?: boolean }) {
  return (
    <div className={`${dark ? "bg-[#2c2c2c] text-white shadow-[8px_8px_24px_rgba(163,177,198,0.35),-8px_-8px_24px_#ffffff]" : "neo-flat-white text-brand-grey"} p-6 rounded-[2rem] border border-white/40`}>
      <div className={dark ? "text-brand-yellow mb-5" : "text-brand-yellow-dark mb-5"}>{icon}</div>
      <p className={`text-xs font-black uppercase tracking-widest ${dark ? "text-white/40" : "text-brand-grey/40"}`}>{label}</p>
      <p className={`text-4xl font-serif font-bold ${dark ? "text-brand-yellow" : "text-brand-grey"}`}>{value}</p>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="neo-flat-white p-8 rounded-[2rem] border border-white/40">
      <h2 className="text-xl font-serif font-bold text-brand-grey mb-6">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Select({ value, onChange, options, label, titleKey = "name" }: { value: string; onChange: (value: string) => void; options: any[]; label: string; titleKey?: string }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-white/40 bg-[#f8fafc] shadow-inner px-4 py-3 text-brand-grey">
      <option value="">{label}</option>
      {options.map((option) => <option key={option.id} value={option.id}>{option[titleKey]}</option>)}
    </select>
  )
}

function DarkSelect(props: Parameters<typeof Select>[0]) {
  return (
    <select value={props.value} onChange={(event) => props.onChange(event.target.value)} className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-white">
      <option value="" className="text-brand-grey">{props.label}</option>
      {props.options.map((option) => <option key={option.id} value={option.id} className="text-brand-grey">{option[props.titleKey || "name"]}</option>)}
    </select>
  )
}
