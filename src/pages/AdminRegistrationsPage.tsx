import { useEffect, useState } from "react"
import { CheckCircle2, Clock, FileCheck2, Image as ImageIcon, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import AdminLayout from "@/components/AdminLayout"
import { backendApi } from "@/lib/backend"

type OnlineRegistration = {
  id: string
  firstName: string | null
  middleName: string | null
  lastName: string | null
  phone: string | null
  email: string | null
  notes: string | null
  admissionNumber: string | null
  gender: string | null
  dateOfBirth: string | null
  address: string | null
  city: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  profilePhotoUrl: string | null
  registrationSource: string
  registrationStatus: string
  rejectionReason: string | null
  approvedAt: string | null
  guardians: any[]
  enrollments: any[]
  createdAt: string
}

export default function AdminRegistrationsPage() {
  const [registrations, setRegistrations] = useState<OnlineRegistration[]>([])
  const [note, setNote] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [selectedId, setSelectedId] = useState("")

  const load = async () => {
    const { admissions } = await backendApi.listAdmissions({})
    const nextRegistrations = (admissions || []).map((student: any) => ({
      id: String(student.id),
      firstName: student.firstName,
      middleName: student.middleName,
      lastName: student.lastName,
      phone: student.phone,
      email: student.email,
      notes: student.notes,
      admissionNumber: student.admissionNumber,
      gender: student.gender,
      dateOfBirth: student.dateOfBirth,
      address: student.address,
      city: student.city,
      emergencyContactName: student.emergencyContactName,
      emergencyContactPhone: student.emergencyContactPhone,
      profilePhotoUrl: student.profilePhotoUrl,
      registrationSource: student.registrationSource,
      registrationStatus: student.registrationStatus,
      rejectionReason: student.rejectionReason,
      approvedAt: student.approvedAt,
      guardians: student.guardians || [],
      enrollments: student.enrollments || [],
      createdAt: student.createdAt,
    }))

    setRegistrations(nextRegistrations)
    setSelectedId((current) => current || nextRegistrations[0]?.id || "")
  }

  useEffect(() => {
    load().catch((error) => setErrorMsg(error.message || "Could not load admissions."))
  }, [])

  const approveRegistration = async (id: string) => {
    setErrorMsg("")
    try {
      const result = await backendApi.approveAdmission(id)
      setNote("")
      await load()
      if (result.setupEmail?.setupUrl) {
        setErrorMsg(`Dev setup link: ${result.setupEmail.setupUrl}`)
      }
    } catch (error: any) {
      setErrorMsg(error.message || "Could not approve admission.")
    }
  }

  const rejectRegistration = async (id: string) => {
    setErrorMsg("")
    try {
      await backendApi.rejectAdmission(id, note.trim() || "Application rejected by admin")
      setNote("")
      await load()
    } catch (error: any) {
      setErrorMsg(error.message || "Could not reject admission.")
    }
  }

  const pendingCount = registrations.filter((item) => item.registrationStatus === "PENDING_APPROVAL").length
  const approvedCount = registrations.filter((item) => item.registrationStatus === "APPROVED").length
  const selectedRegistration = registrations.find((item) => item.id === selectedId) || registrations[0]
  const fullName = (item?: OnlineRegistration) =>
    [item?.firstName, item?.middleName, item?.lastName].filter(Boolean).join(" ") || "Unnamed student"

  return (
    <AdminLayout title="Registration Approval" description="Approve online applications and create student login accounts through the backend.">
      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-yellow-50 text-yellow-800 font-medium break-words">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="neo-flat-white p-6 rounded-[2rem] border border-white/40 transition-transform duration-300 hover:scale-[1.02]">
          <Clock className="h-6 w-6 text-yellow-600 mb-5" />
          <p className="text-xs font-black uppercase tracking-widest text-brand-grey/40">Pending</p>
          <p className="text-4xl font-serif font-bold text-brand-grey">{pendingCount}</p>
        </div>
        <div className="neo-flat-white p-6 rounded-[2rem] border border-white/40 transition-transform duration-300 hover:scale-[1.02]">
          <FileCheck2 className="h-6 w-6 text-brand-yellow-dark mb-5" />
          <p className="text-xs font-black uppercase tracking-widest text-brand-grey/40">Applications</p>
          <p className="text-4xl font-serif font-bold text-brand-grey">{registrations.length}</p>
        </div>
        <div className="bg-[#2c2c2c] p-6 rounded-[2rem] text-white shadow-[8px_8px_24px_rgba(163,177,198,0.35),-8px_-8px_24px_#ffffff]">
          <CheckCircle2 className="h-6 w-6 text-brand-yellow mb-5" />
          <p className="text-xs font-black uppercase tracking-widest text-white/40">Approved</p>
          <p className="text-4xl font-serif font-bold text-brand-yellow">{approvedCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <section className="xl:col-span-2 neo-flat-white p-8 rounded-[2rem] border border-white/40">
          <h2 className="text-2xl font-serif font-bold text-brand-grey mb-6">Admissions</h2>
          <div className="space-y-4">
            {registrations.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`w-full text-left p-5 rounded-2xl border border-white/40 shadow-inner transition-all ${selectedRegistration?.id === item.id ? "bg-brand-yellow/15 ring-2 ring-brand-yellow/30" : "bg-[#f8fafc] hover:bg-white"}`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="h-20 w-16 rounded-xl overflow-hidden bg-white border border-white/60 shrink-0 flex items-center justify-center">
                      {item.profilePhotoUrl ? (
                        <img src={item.profilePhotoUrl} alt={fullName(item)} className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-brand-grey/20" />
                      )}
                    </div>
                    <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-brand-grey text-lg">{fullName(item)}</h3>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${item.registrationStatus === "PENDING_APPROVAL" ? "bg-yellow-50 text-yellow-700" : item.registrationStatus === "APPROVED" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                        {item.registrationStatus}
                      </span>
                    </div>
                    <p className="text-sm text-brand-grey/50">{item.registrationSource} - {new Date(item.createdAt).toLocaleDateString()}</p>
                    <p className="text-sm text-brand-grey/40 mt-1">{item.phone || "No phone"} - {item.email || "No email"}</p>
                    <p className="text-sm text-brand-grey/40 mt-1">{item.admissionNumber}</p>
                    {item.rejectionReason && <p className="text-sm text-red-600 mt-2">Rejected: {item.rejectionReason}</p>}
                  </div>
                  </div>
                  {item.registrationStatus === "PENDING_APPROVAL" && (
                    <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
                      <Button onClick={() => approveRegistration(item.id)} className="bg-[#2c2c2c] text-brand-yellow hover:bg-[#1a1a1a] rounded-xl font-bold shadow-[2px_2px_6px_#d1d9e6,-2px_-2px_6px_#ffffff]">
                        <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                      </Button>
                      <Button onClick={() => rejectRegistration(item.id)} variant="outline" className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 font-bold">
                        <XCircle className="h-4 w-4 mr-2" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </button>
            ))}
            {registrations.length === 0 && <p className="py-10 text-center text-brand-grey/40">No admissions yet.</p>}
          </div>
        </section>

        <aside className="space-y-8">
          {selectedRegistration && (
            <div className="neo-flat-white p-8 rounded-[2rem] border border-white/40">
              <div className="flex items-start gap-5 mb-6">
                <div className="h-32 w-24 rounded-2xl overflow-hidden bg-[#f8fafc] border border-white/60 shadow-inner flex items-center justify-center shrink-0">
                  {selectedRegistration.profilePhotoUrl ? (
                    <img src={selectedRegistration.profilePhotoUrl} alt={fullName(selectedRegistration)} className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-brand-grey/20" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-serif font-bold text-brand-grey">{fullName(selectedRegistration)}</h2>
                  <p className="text-sm text-brand-grey/50">{selectedRegistration.admissionNumber}</p>
                  <p className="text-xs font-black uppercase tracking-widest text-brand-yellow-dark mt-3">{selectedRegistration.registrationStatus}</p>
                </div>
              </div>

              <div className="space-y-4 text-sm">
                <Detail label="Email" value={selectedRegistration.email} />
                <Detail label="Phone" value={selectedRegistration.phone} />
                <Detail label="Gender" value={selectedRegistration.gender} />
                <Detail label="Date of Birth" value={selectedRegistration.dateOfBirth ? new Date(selectedRegistration.dateOfBirth).toLocaleDateString() : null} />
                <Detail label="Address" value={[selectedRegistration.address, selectedRegistration.city].filter(Boolean).join(", ")} />
                <Detail label="Emergency" value={[selectedRegistration.emergencyContactName, selectedRegistration.emergencyContactPhone].filter(Boolean).join(" - ")} />
                <Detail label="Approved At" value={selectedRegistration.approvedAt ? new Date(selectedRegistration.approvedAt).toLocaleString() : null} />
              </div>

              {selectedRegistration.notes && (
                <div className="mt-6 rounded-2xl bg-[#f8fafc] border border-white/50 shadow-inner p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-brand-grey/40 mb-2">Registration Notes</p>
                  <p className="text-sm text-brand-grey/60 whitespace-pre-line">{selectedRegistration.notes}</p>
                </div>
              )}

              <div className="mt-6 space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-brand-grey/40">Guardians</p>
                {selectedRegistration.guardians.length > 0 ? selectedRegistration.guardians.map((guardian) => (
                  <div key={guardian.id} className="rounded-2xl bg-[#f8fafc] border border-white/50 shadow-inner p-4">
                    <p className="font-bold text-brand-grey">{guardian.fullName}</p>
                    <p className="text-xs text-brand-grey/50">{guardian.relationship} - {guardian.phone}</p>
                  </div>
                )) : <p className="text-sm text-brand-grey/40">No guardian details submitted.</p>}
              </div>

              <div className="mt-6 space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-brand-grey/40">Enrollments</p>
                {selectedRegistration.enrollments.length > 0 ? selectedRegistration.enrollments.map((enrollment) => (
                  <div key={enrollment.id} className="rounded-2xl bg-[#f8fafc] border border-white/50 shadow-inner p-4">
                    <p className="font-bold text-brand-grey">{enrollment.program?.name || "Program"}</p>
                    <p className="text-xs text-brand-grey/50">{enrollment.batch?.name || "Batch"} - {enrollment.status}</p>
                  </div>
                )) : <p className="text-sm text-brand-grey/40">No enrollment selected yet.</p>}
              </div>
            </div>
          )}

          <div className="neo-flat-white p-8 rounded-[2rem] border border-white/40">
            <h2 className="text-xl font-serif font-bold text-brand-grey mb-4">Rejection Note</h2>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Required when rejecting. Approval emails are generated automatically." className="w-full min-h-28 rounded-xl border border-white/40 bg-[#f8fafc] shadow-inner p-4 focus:outline-none focus:ring-2 focus:ring-brand-yellow/40" />
          </div>

          <div className="bg-[#2c2c2c] p-8 rounded-[2rem] text-white shadow-[8px_8px_24px_rgba(163,177,198,0.35),-8px_-8px_24px_#ffffff]">
            <h2 className="text-xl font-serif font-bold mb-4">How Approval Works</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              Approving an admission creates the linked student user with the STUDENT role, generates a permanent admission number, and sends or logs the password setup link from the backend email service.
            </p>
          </div>
        </aside>
      </div>
    </AdminLayout>
  )
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-brand-grey/5 pb-2">
      <span className="text-brand-grey/40 font-bold">{label}</span>
      <span className="text-brand-grey text-right">{value || "Not provided"}</span>
    </div>
  )
}
