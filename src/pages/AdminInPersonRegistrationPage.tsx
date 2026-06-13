import { useState, type ChangeEvent, type FormEvent } from "react"
import { CheckCircle2, Image as ImageIcon, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import AdminLayout from "@/components/AdminLayout"
import { backendApi, fileToImageUploadPayload } from "@/lib/backend"

const emptyForm = {
  firstName: "",
  middleName: "",
  lastName: "",
  gender: "UNSPECIFIED",
  age: "",
  dateOfBirth: "",
  phone: "",
  email: "",
  address: "",
  subCity: "",
  woreda: "",
  houseNumber: "",
  city: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  guardianName: "",
  guardianPhone: "",
  instrumentType: "Begena",
  learningCategory: "",
  mezmurOrSong: "",
  sourceOfInfo: "",
  notes: "",
}

export default function AdminInPersonRegistrationPage() {
  const [form, setForm] = useState(emptyForm)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [lastStudent, setLastStudent] = useState<any>(null)
  const [lastSetupUrl, setLastSetupUrl] = useState("")

  const update = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }))

  const onPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please choose an image file.")
      return
    }
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setErrorMsg("")
    setMessage("")

    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setErrorMsg("First name, last name, and email are required.")
      return
    }

    setLoading(true)
    try {
      let profilePhotoUrl: string | null = null
      if (photo) {
        const upload = await backendApi.uploadRegistrationPhoto(await fileToImageUploadPayload(photo))
        profilePhotoUrl = upload.upload.url
      }

      const addressParts = [
        form.address.trim(),
        form.subCity.trim() ? `Sub-city: ${form.subCity.trim()}` : "",
        form.woreda.trim() ? `Woreda: ${form.woreda.trim()}` : "",
        form.houseNumber.trim() ? `House: ${form.houseNumber.trim()}` : "",
      ].filter(Boolean)

      const notes = [
        `Registration channel: IN_PERSON`,
        `Instrument: ${form.instrumentType || "Not specified"}`,
        `Level/category: ${form.learningCategory || "Not specified"}`,
        `Mezmur/song: ${form.mezmurOrSong || "Not specified"}`,
        `Source: ${form.sourceOfInfo || "Not specified"}`,
        form.age ? `Age entered on form: ${form.age}` : "",
        form.notes.trim(),
        profilePhotoUrl ? `Registration photo: ${profilePhotoUrl}` : "",
      ].filter(Boolean).join("\n")

      const result = await backendApi.createInPersonRegistration({
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim() || null,
        lastName: form.lastName.trim(),
        gender: form.gender,
        dateOfBirth: form.dateOfBirth || null,
        phone: form.phone.trim() || null,
        email: form.email.trim(),
        address: addressParts.join(", ") || null,
        city: form.city.trim() || form.address.trim() || null,
        emergencyContactName: form.emergencyContactName.trim() || null,
        emergencyContactPhone: form.emergencyContactPhone.trim() || null,
        profilePhotoUrl,
        notes: notes || null,
        guardians: form.guardianName.trim() && form.guardianPhone.trim() ? [{
          fullName: form.guardianName.trim(),
          relationship: "GUARDIAN",
          phone: form.guardianPhone.trim(),
          isPrimary: true,
          isEmergencyContact: true,
        }] : undefined,
      })

      setLastStudent(result.student)
      setLastSetupUrl(result.setupEmail?.setupUrl || "")
      setMessage("Student registered, approved, and account setup email triggered.")
      setForm(emptyForm)
      setPhoto(null)
      setPhotoPreview("")
    } catch (error: any) {
      setErrorMsg(error.message || "Could not complete in-person registration.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminLayout title="In-Person Registration" description="Register walk-in students, approve instantly, enroll them, and send the password setup email.">
      {(message || errorMsg) && (
        <div className={`mb-6 rounded-2xl p-4 text-sm font-bold ${errorMsg ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
          {errorMsg || message}
        </div>
      )}

      {lastStudent && (
        <div className="mb-8 neo-flat rounded-[2rem] border border-white/40 p-6 flex items-center gap-4">
          <CheckCircle2 className="h-8 w-8 text-green-600 animate-bounce" />
          <div>
            <p className="font-bold text-brand-grey">{[lastStudent.firstName, lastStudent.lastName].filter(Boolean).join(" ")} approved</p>
            <p className="text-sm text-brand-grey/40">Admission number: {lastStudent.admissionNumber}</p>
            {lastSetupUrl && (
              <a href={lastSetupUrl} className="mt-2 block text-sm font-bold text-brand-yellow-dark break-all hover:underline">
                {lastSetupUrl}
              </a>
            )}
          </div>
        </div>
      )}

      <form onSubmit={submit} className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <section className="xl:col-span-2 neo-flat rounded-[2rem] border border-white/40 p-8 space-y-8">
          <div>
            <h2 className="text-2xl font-serif font-bold text-brand-grey mb-6">Student Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input placeholder="First name" value={form.firstName} onChange={(event) => update("firstName", event.target.value)} className="bg-[#f0f4f8] border border-white/60 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-yellow/50 transition-all text-brand-grey placeholder:text-brand-grey/30 h-12" />
              <Input placeholder="Middle name" value={form.middleName} onChange={(event) => update("middleName", event.target.value)} className="bg-[#f0f4f8] border border-white/60 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-yellow/50 transition-all text-brand-grey placeholder:text-brand-grey/30 h-12" />
              <Input placeholder="Last name" value={form.lastName} onChange={(event) => update("lastName", event.target.value)} className="bg-[#f0f4f8] border border-white/60 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-yellow/50 transition-all text-brand-grey placeholder:text-brand-grey/30 h-12" />
              <select 
                value={form.gender} 
                onChange={(event) => update("gender", event.target.value)} 
                className="rounded-xl border border-white/60 bg-[#f0f4f8] shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff] px-4 py-3 text-brand-grey focus:outline-none"
              >
                <option value="UNSPECIFIED">Unspecified</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
              <Input type="number" min="1" placeholder="Age" value={form.age} onChange={(event) => update("age", event.target.value)} className="bg-[#f0f4f8] border border-white/60 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-yellow/50 transition-all text-brand-grey placeholder:text-brand-grey/30 h-12" />
              <Input type="date" value={form.dateOfBirth} onChange={(event) => update("dateOfBirth", event.target.value)} className="bg-[#f0f4f8] border border-white/60 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-yellow/50 transition-all text-brand-grey placeholder:text-brand-grey/30 h-12" />
              <Input placeholder="Phone" value={form.phone} onChange={(event) => update("phone", event.target.value)} className="bg-[#f0f4f8] border border-white/60 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-yellow/50 transition-all text-brand-grey placeholder:text-brand-grey/30 h-12" />
              <Input type="email" placeholder="Email" value={form.email} onChange={(event) => update("email", event.target.value)} className="bg-[#f0f4f8] border border-white/60 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-yellow/50 transition-all text-brand-grey placeholder:text-brand-grey/30 h-12" />
              <Input placeholder="City" value={form.city} onChange={(event) => update("city", event.target.value)} className="bg-[#f0f4f8] border border-white/60 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-yellow/50 transition-all text-brand-grey placeholder:text-brand-grey/30 h-12" />
              <Input placeholder="Address" value={form.address} onChange={(event) => update("address", event.target.value)} className="bg-[#f0f4f8] border border-white/60 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-yellow/50 transition-all text-brand-grey placeholder:text-brand-grey/30 h-12" />
              <Input placeholder="Sub-city" value={form.subCity} onChange={(event) => update("subCity", event.target.value)} className="bg-[#f0f4f8] border border-white/60 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-yellow/50 transition-all text-brand-grey placeholder:text-brand-grey/30 h-12" />
              <Input placeholder="Woreda" value={form.woreda} onChange={(event) => update("woreda", event.target.value)} className="bg-[#f0f4f8] border border-white/60 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-yellow/50 transition-all text-brand-grey placeholder:text-brand-grey/30 h-12" />
              <Input placeholder="House number" value={form.houseNumber} onChange={(event) => update("houseNumber", event.target.value)} className="bg-[#f0f4f8] border border-white/60 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-yellow/50 transition-all text-brand-grey placeholder:text-brand-grey/30 h-12" />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-serif font-bold text-brand-grey mb-6">Guardian & Emergency</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="Guardian name" value={form.guardianName} onChange={(event) => update("guardianName", event.target.value)} className="bg-[#f0f4f8] border border-white/60 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-yellow/50 transition-all text-brand-grey placeholder:text-brand-grey/30 h-12" />
              <Input placeholder="Guardian phone" value={form.guardianPhone} onChange={(event) => update("guardianPhone", event.target.value)} className="bg-[#f0f4f8] border border-white/60 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-yellow/50 transition-all text-brand-grey placeholder:text-brand-grey/30 h-12" />
              <Input placeholder="Emergency contact name" value={form.emergencyContactName} onChange={(event) => update("emergencyContactName", event.target.value)} className="bg-[#f0f4f8] border border-white/60 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-yellow/50 transition-all text-brand-grey placeholder:text-brand-grey/30 h-12" />
              <Input placeholder="Emergency contact phone" value={form.emergencyContactPhone} onChange={(event) => update("emergencyContactPhone", event.target.value)} className="bg-[#f0f4f8] border border-white/60 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-yellow/50 transition-all text-brand-grey placeholder:text-brand-grey/30 h-12" />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-serif font-bold text-brand-grey mb-6">Learning Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select 
                value={form.instrumentType} 
                onChange={(event) => update("instrumentType", event.target.value)} 
                className="rounded-xl border border-white/60 bg-[#f0f4f8] shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff] px-4 py-3 text-brand-grey focus:outline-none"
              >
                <option value="Begena">Begena</option>
                <option value="Krar">Krar</option>
                <option value="Masinko">Masinko</option>
              </select>
              <select 
                value={form.learningCategory} 
                onChange={(event) => update("learningCategory", event.target.value)} 
                className="rounded-xl border border-white/60 bg-[#f0f4f8] shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff] px-4 py-3 text-brand-grey focus:outline-none"
              >
                <option value="">Select level</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="master">Master</option>
              </select>
              <select 
                value={form.mezmurOrSong} 
                onChange={(event) => update("mezmurOrSong", event.target.value)} 
                className="rounded-xl border border-white/60 bg-[#f0f4f8] shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff] px-4 py-3 text-brand-grey focus:outline-none"
              >
                <option value="">Mezmur/song preference</option>
                <option value="mezmur">Mezmur</option>
                <option value="song">Song</option>
                <option value="both">Both</option>
              </select>
              <select 
                value={form.sourceOfInfo} 
                onChange={(event) => update("sourceOfInfo", event.target.value)} 
                className="rounded-xl border border-white/60 bg-[#f0f4f8] shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff] px-4 py-3 text-brand-grey focus:outline-none md:col-span-3"
              >
                <option value="">Source of information</option>
                <option value="friend">Friend</option>
                <option value="family">Family</option>
                <option value="social_media">Social media</option>
                <option value="event">Event</option>
                <option value="walk_in">Walk-in</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <textarea
            placeholder="Registration notes"
            value={form.notes}
            onChange={(event) => update("notes", event.target.value)}
            className="w-full min-h-28 rounded-xl border border-white/60 bg-[#f0f4f8] shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff] p-4 focus:outline-none"
          />
        </section>

        <aside className="bg-[#2c2c2c] rounded-[2rem] p-8 text-white shadow-[8px_8px_16px_rgba(0,0,0,0.2),-8px_-8px_16px_rgba(255,255,255,0.05)] border border-white/5 h-fit">
          <h2 className="text-xl font-serif font-bold mb-6">Photo & Approval</h2>
          <label className="block rounded-2xl border border-white/10 bg-black/20 p-4 cursor-pointer hover:bg-black/30 transition-colors mb-6">
            <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
            <div className="aspect-[4/3] rounded-xl overflow-hidden bg-black/15 border border-white/5 flex items-center justify-center">
              {photoPreview ? (
                <img src={photoPreview} alt="Student preview" className="h-full w-full object-cover animate-fade-in" />
              ) : (
                <div className="text-center text-white/50">
                  <ImageIcon className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm font-bold">Upload student photo</p>
                </div>
              )}
            </div>
          </label>

          <div className="rounded-2xl bg-black/20 border border-white/10 p-4 mb-6">
            <p className="text-brand-yellow font-black uppercase tracking-widest text-xs mb-2">Instant Approval</p>
            <p className="text-sm text-white/60">This creates an approved student, linked student user account, and password setup email.</p>
          </div>

          <Button 
            disabled={loading} 
            className="w-full bg-brand-yellow text-brand-grey hover:bg-brand-yellow-dark font-bold active:scale-[0.98] transition-all shadow-[4px_4px_10px_rgba(0,0,0,0.15)] border border-brand-yellow/20 rounded-xl py-6"
          >
            <UserPlus className="h-4 w-4 mr-2" /> {loading ? "Registering..." : "Register Student"}
          </Button>
        </aside>
      </form>
    </AdminLayout>
  )
}
