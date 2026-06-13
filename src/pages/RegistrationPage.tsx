import React, { useState, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Music, Upload, CheckCircle, Clock, XCircle, Globe, ChevronLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { backendApi, fileToImageUploadPayload } from "@/lib/backend";

type View = "form" | "submitted" | "checking";

export default function RegistrationPage() {
  const { t, language, setLanguage } = useLanguage();
  const [searchParams] = useSearchParams();
  
  const initialInstrument = searchParams.get("instrument") || "";
  const initialLevel = searchParams.get("level") || "";
  
  const [form, setForm] = useState({
    firstName: "", middleName: "", lastName: "",
    gender: "", age: "", dateOfBirth: "",
    phone: "", email: "",
    address: "", subCity: "", woreda: "", houseNumber: "",
    emergencyName: "", emergencyPhone: "",
    instrumentType: initialInstrument, 
    learningCategory: initialLevel, 
    mezmurOrSong: "",
    sourceOfInfo: "",
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>("form");
  const [checkPhone, setCheckPhone] = useState("");
  const [result, setResult] = useState<{ status: string; admin_note?: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = t('register.title');
  }, [t]);

  const upd = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { 
      alert(t('register.imgOnly')); 
      return; 
    }
    setPhoto(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const required: [string, string][] = [
      ["firstName", t('register.firstName')], ["lastName", t('register.lastName')], ["gender", t('register.gender')],
      ["dateOfBirth", t('register.dob')], ["phone", t('register.phone')], ["email", t('register.email')],
      ["address", t('register.address')], ["subCity", t('register.subCity')], ["woreda", t('register.woreda')],
      ["instrumentType", t('register.instrument')],
    ];
    for (const [k, label] of required) {
      if (!(form as any)[k]?.trim()) { 
        alert(`${label.replace(' *','')} ${t('register.requiredField')}`); 
        return; 
      }
    }
    if (!photo) {
      alert(t('register.photoRequired'));
      return;
    }
    setLoading(true);
    try {
      const photoUpload = await backendApi.uploadRegistrationPhoto(await fileToImageUploadPayload(photo));
      const addressParts = [
        form.address.trim(),
        form.subCity.trim() ? `Sub-city: ${form.subCity.trim()}` : "",
        form.woreda.trim() ? `Woreda: ${form.woreda.trim()}` : "",
        form.houseNumber.trim() ? `House: ${form.houseNumber.trim()}` : "",
      ].filter(Boolean)

      const notes = [
        `Instrument: ${form.instrumentType || "Not specified"}`,
        `Level/category: ${form.learningCategory || "Not specified"}`,
        `Mezmur/song: ${form.mezmurOrSong || "Not specified"}`,
        "Registration channel: ONLINE",
        `Source: ${form.sourceOfInfo || "Not specified"}`,
        form.age ? `Age entered on form: ${form.age}` : "",
        `Registration photo: ${photoUpload.upload.url}`,
      ].filter(Boolean).join("\n")

      await backendApi.createPublicRegistration({
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim() || null,
        lastName: form.lastName.trim(),
        gender: form.gender === "male" ? "MALE" : form.gender === "female" ? "FEMALE" : "UNSPECIFIED",
        dateOfBirth: form.dateOfBirth,
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: addressParts.join(", "),
        city: form.address.trim(),
        emergencyContactName: form.emergencyName.trim() || null,
        emergencyContactPhone: form.emergencyPhone.trim() || null,
        profilePhotoUrl: photoUpload.upload.url,
        notes,
        guardians: form.emergencyName.trim() && form.emergencyPhone.trim() ? [{
          fullName: form.emergencyName.trim(),
          relationship: "GUARDIAN",
          phone: form.emergencyPhone.trim(),
          isPrimary: true,
          isEmergencyContact: true,
        }] : undefined,
      });

      setView("submitted");
    } catch (err: any) {
      alert(err.message || t('register.errorTitle'));
    }
    setLoading(false);
  };

  const checkStatus = async () => {
    if (!checkPhone.trim()) { alert(t('register.phoneRequired')); return; }
    setLoading(true);
    try {
      const { registration } = await backendApi.getPublicRegistrationStatus(checkPhone.trim());
      setResult({
        status: registration.publicStatus || "pending",
        admin_note: registration.rejectionReason || undefined,
      });
    } catch {
      alert(t('register.notFound'));
      setResult(null);
    }
    setLoading(false);
  };

  const LangToggle = () => (
    <button 
      onClick={() => setLanguage(language === 'en' ? 'am' : 'en')}
      className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-1.5 text-brand-grey hover:text-brand-grey/70 transition-colors p-2 rounded-lg hover:bg-brand-grey/10 font-bold bg-white/50 backdrop-blur-md border border-brand-grey/10 shadow-sm z-50"
    >
      <Globe className="h-4 w-4" />
      <span className="text-xs uppercase">{language === 'en' ? 'EN' : 'አማ'}</span>
    </button>
  );

  if (view === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-yellow/10 px-4 py-8 relative">
        <LangToggle />
        <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-brand-yellow flex items-center justify-center">
              <Music className="h-8 w-8 text-brand-grey" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-brand-grey">{t('register.checkStatusTitle')}</h2>
            <p className="text-sm text-brand-grey/70">{t('register.checkStatusDesc')}</p>
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-brand-grey font-bold">{t('register.phone')}</label>
            <input 
              value={checkPhone} 
              onChange={(e) => setCheckPhone(e.target.value)} 
              placeholder="+251 9XX XXX XXX" 
              className="w-full px-4 py-2 rounded-md border border-brand-grey/20 focus:outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow"
            />
          </div>
          <button 
            className="w-full bg-brand-grey hover:bg-brand-grey-dark text-brand-yellow font-bold py-4 rounded-md text-lg disabled:opacity-50" 
            onClick={checkStatus} 
            disabled={loading}
          >
            {loading ? t('register.checking') : t('register.checkBtn')}
          </button>
          
          {result && (
            <div className="p-5 rounded-xl border border-brand-grey/10 bg-white shadow-sm mt-4">
              {result.status === "pending" && (
                <div className="flex gap-4 items-start"><Clock className="h-6 w-6 text-brand-yellow mt-0.5" /><div><p className="font-bold text-brand-grey">{t('register.pending')}</p><p className="text-sm text-brand-grey/60 mt-1">{t('register.pendingDesc')}</p></div></div>
              )}
              {(result.status === "approved" || result.status === "active") && (
                <div className="flex gap-4 items-start"><CheckCircle className="h-6 w-6 text-green-500 mt-0.5" /><div><p className="font-bold text-brand-grey">{t('register.approved')}</p><p className="text-sm text-brand-grey/60 mt-1">{t('register.approvedDesc')}</p>
                  <Link to="/auth" className="inline-block mt-4 px-4 py-2 bg-brand-yellow hover:bg-brand-yellow-dark text-brand-grey rounded text-sm font-bold">{t('register.continueLogin')}</Link>
                </div></div>
              )}
              {result.status === "rejected" && (
                <div className="flex gap-4 items-start"><XCircle className="h-6 w-6 text-red-500 mt-0.5" /><div><p className="font-bold text-brand-grey">{t('register.rejected')}</p>{result.admin_note && <p className="text-sm text-brand-grey/60 mt-1">Note: {result.admin_note}</p>}</div></div>
              )}
              {result.status === "interrupted" && (
                <div className="flex gap-4 items-start"><XCircle className="h-6 w-6 text-orange-500 mt-0.5" /><div><p className="font-bold text-brand-grey">{t('register.interrupted')}</p></div></div>
              )}
            </div>
          )}
          
          <div className="flex gap-3 pt-4 border-t border-brand-grey/10">
            <button className="flex-1 py-2 px-4 border border-brand-grey/20 text-brand-grey hover:bg-brand-grey/5 font-bold rounded-md" onClick={() => { setView("form"); setResult(null); }}>
              {t('register.newRegistration')}
            </button>
            <Link to="/" className="flex-1 py-2 px-4 flex items-center justify-center text-brand-grey/70 hover:text-brand-grey">
              <ChevronLeft className="h-4 w-4 mr-1" /> {t('register.home')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (view === "submitted") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-yellow/10 px-4 py-8 relative">
        <LangToggle />
        <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-8 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-serif font-bold text-brand-grey mb-2">{t('register.submittedTitle')}</h2>
            <p className="text-sm text-brand-grey/70 leading-relaxed">{t('register.submittedDesc')}</p>
          </div>
          <div className="pt-6 border-t border-brand-grey/10 space-y-3">
            <button className="w-full bg-brand-grey hover:bg-brand-grey-dark text-brand-yellow font-bold py-4 rounded-md" onClick={() => setView("checking")}>
              {t('register.checkBtn')}
            </button>
            <Link to="/" className="block w-full py-2 flex items-center justify-center text-brand-grey/70 hover:text-brand-grey">
              <ChevronLeft className="h-4 w-4 mr-1" /> {t('register.home')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-yellow/5 px-4 py-8 relative">
      <LangToggle />
      
      <div className="max-w-4xl mx-auto pb-4">
        <Link to="/" className="inline-flex items-center py-2 text-brand-grey/70 hover:text-brand-grey">
          <ChevronLeft className="h-4 w-4 mr-1" /> {t('register.home')}
        </Link>
      </div>

      <div className="max-w-4xl mx-auto shadow-xl overflow-hidden rounded-2xl bg-white">
        <div className="bg-brand-grey text-brand-yellow px-8 py-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-brand-yellow/20 flex items-center justify-center">
                <Music className="h-8 w-8 text-brand-yellow" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3">{t('register.title')}</h1>
            <p className="text-brand-yellow/80 font-serif text-lg mb-6">{t('nav.schoolName')}</p>
            <div className="w-24 h-1 bg-brand-yellow/30 mx-auto rounded-full mb-6"></div>
            <p className="text-xl font-bold uppercase tracking-widest text-white">{t('register.subtitle')}</p>
            
            <div className="mt-8">
              <button className="px-6 py-2 border border-brand-yellow/50 text-brand-yellow hover:bg-brand-yellow hover:text-brand-grey transition-colors rounded-full font-bold" onClick={() => setView("checking")}>
                {t('register.checkStatusBtn')}
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-8 md:p-12">
          <form onSubmit={submit} className="space-y-8 sm:space-y-10">
            {/* Photo */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-6 rounded-xl bg-brand-grey/5 border border-brand-grey/10 border-dashed">
              <div className="w-32 h-40 rounded-lg border-2 border-dashed border-brand-grey/20 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <Upload className="h-8 w-8 text-brand-grey/30 mx-auto mb-2" />
                    <span className="text-xs text-brand-grey/50 font-bold uppercase">{t('register.photoLabel').replace(' *','')}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-3 text-center sm:text-left">
                <label className="block text-lg font-bold text-brand-grey">{t('register.photoLabel')}</label>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
                <div className="pt-2">
                  <button type="button" className="px-4 py-2 border border-brand-grey/20 text-brand-grey font-bold rounded hover:bg-brand-grey/5 inline-flex items-center" onClick={() => fileRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" /> 
                    {photo ? photo.name.slice(0, 24) + (photo.name.length > 24 ? "..." : "") : t('register.photoSelect')}
                  </button>
                </div>
                <p className="text-sm text-brand-grey/50">{t('register.photoDesc')}</p>
              </div>
            </div>

            {/* Personal */}
            <Section title={t('register.personalInfo')}>
              <Grid cols={3}>
                <Field label={t('register.firstName')}><Input value={form.firstName} onChange={(e: any) => upd("firstName", e.target.value)} required /></Field>
                <Field label={t('register.middleName')}><Input value={form.middleName} onChange={(e: any) => upd("middleName", e.target.value)} /></Field>
                <Field label={t('register.lastName')}><Input value={form.lastName} onChange={(e: any) => upd("lastName", e.target.value)} required /></Field>
              </Grid>
              <Grid cols={3}>
                <Field label={t('register.gender')}>
                  <Select value={form.gender} onChange={(e: any) => upd("gender", e.target.value)}>
                    <option value="">{t('register.select')}</option>
                    <option value="male">{t('register.male')}</option>
                    <option value="female">{t('register.female')}</option>
                  </Select>
                </Field>
                <Field label={t('register.age')}><Input type="number" min="1" value={form.age} onChange={(e: any) => upd("age", e.target.value)} /></Field>
                <Field label={t('register.dob')}><Input type="date" value={form.dateOfBirth} onChange={(e: any) => upd("dateOfBirth", e.target.value)} required /></Field>
              </Grid>
              <Grid cols={2}>
                <Field label={t('register.phone')}><Input value={form.phone} onChange={(e: any) => upd("phone", e.target.value)} placeholder="+251 9XX XXX XXX" required /></Field>
                <Field label={t('register.email')}><Input type="email" value={form.email} onChange={(e: any) => upd("email", e.target.value)} /></Field>
              </Grid>
            </Section>

            {/* Address */}
            <Section title={t('register.address')}>
              <Grid cols={2}>
                <Field label={t('register.city')}><Input value={form.address} onChange={(e: any) => upd("address", e.target.value)} placeholder="Addis Ababa" required /></Field>
                <Field label={t('register.subCity')}><Input value={form.subCity} onChange={(e: any) => upd("subCity", e.target.value)} required /></Field>
              </Grid>
              <Grid cols={2}>
                <Field label={t('register.woreda')}><Input value={form.woreda} onChange={(e: any) => upd("woreda", e.target.value)} required /></Field>
                <Field label={t('register.houseNo')}><Input value={form.houseNumber} onChange={(e: any) => upd("houseNumber", e.target.value)} /></Field>
              </Grid>
            </Section>

            {/* Emergency */}
            <Section title={t('register.emergencyContact')}>
              <Grid cols={2}>
                <Field label={t('register.contactName')}><Input value={form.emergencyName} onChange={(e: any) => upd("emergencyName", e.target.value)} /></Field>
                <Field label={t('register.contactPhone')}><Input value={form.emergencyPhone} onChange={(e: any) => upd("emergencyPhone", e.target.value)} /></Field>
              </Grid>
            </Section>

            {/* Learning */}
            <Section title={t('register.learningInfo')}>
              {initialInstrument || initialLevel ? (
                <div className="bg-brand-yellow/10 p-4 rounded-lg mb-4 border border-brand-yellow/30">
                  <p className="text-sm font-bold text-brand-grey mb-1">Pre-selected Course:</p>
                  <p className="text-brand-grey/80">
                    {initialInstrument} - <span className="capitalize">{initialLevel}</span>
                  </p>
                </div>
              ) : null}
              
              <Grid cols={2}>
                <Field label={t('register.instrument')}>
                  <Select value={form.instrumentType} onChange={(e: any) => upd("instrumentType", e.target.value)} disabled={!!initialInstrument}>
                    <option value="">{t('register.select')}</option>
                    <option value="Begena">{t('register.begena')}</option>
                    <option value="Krar">{t('register.krar')}</option>
                    <option value="Masinko">{t('register.masinko')}</option>
                  </Select>
                </Field>
                <Field label={t('register.category')}>
                  <Select value={form.learningCategory} onChange={(e: any) => upd("learningCategory", e.target.value)} disabled={!!initialLevel}>
                    <option value="">{t('register.select')}</option>
                    <option value="beginner">{t('register.beginner')}</option>
                    <option value="intermediate">{t('register.intermediate')}</option>
                    <option value="advanced">{t('register.advanced')}</option>
                    <option value="master">Master</option>
                  </Select>
                </Field>
              </Grid>
              <Grid cols={1}>
                <Field label={t('register.mezmurSong')}>
                  <Select value={form.mezmurOrSong} onChange={(e: any) => upd("mezmurOrSong", e.target.value)}>
                    <option value="">{t('register.select')}</option>
                    <option value="mezmur">{t('register.mezmur')}</option>
                    <option value="song">{t('register.song')}</option>
                    <option value="both">{t('register.both')}</option>
                  </Select>
                </Field>
              </Grid>
            </Section>

            {/* Source */}
            <Section title={t('register.sourceInfo')}>
              <Select value={form.sourceOfInfo} onChange={(e: any) => upd("sourceOfInfo", e.target.value)}>
                <option value="">{t('register.select')}</option>
                <option value="friend">{t('register.friend')}</option>
                <option value="family">{t('register.family')}</option>
                <option value="social_media">{t('register.socialMedia')}</option>
                <option value="event">{t('register.event')}</option>
                <option value="walk_in">{t('register.walkIn')}</option>
                <option value="other">{t('register.other')}</option>
              </Select>
            </Section>

            <div className="pt-8 border-t border-brand-grey/10">
              <button 
                type="submit" 
                className="w-full h-16 text-xl bg-brand-grey hover:bg-brand-grey-dark text-brand-yellow font-bold rounded-full shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50" 
                disabled={loading}
              >
                {loading ? t('register.submitting') : t('register.submitBtn')}
              </button>
              <p className="text-sm text-center text-brand-grey/60 mt-6 font-medium">
                {t('register.alreadyRegistered')} <Link to="/auth" className="text-brand-yellow-dark hover:underline mx-1">{t('register.login')}</Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center gap-4">
        <h3 className="text-xl font-serif font-bold text-brand-grey shrink-0">{title}</h3>
        <div className="h-px bg-brand-grey/10 flex-1"></div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Grid({ cols, children }: { cols: 1 | 2 | 3; children: React.ReactNode }) {
  const cls =
    cols === 1
      ? "grid grid-cols-1 gap-4 sm:gap-5"
      : cols === 2
        ? "grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5"
        : "grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5";
  return <div className={cls}>{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-brand-grey/80">{label}</label>
      {children}
    </div>
  );
}

function Input(props: any) {
  return (
    <input 
      {...props} 
      className={`w-full px-4 py-3 sm:py-2 rounded-md border border-brand-grey/20 focus:outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow bg-white ${props.className || ''}`}
    />
  );
}

function Select({ children, ...props }: any) {
  return (
    <select 
      {...props} 
      className={`w-full px-4 py-3 sm:py-2 rounded-md border border-brand-grey/20 focus:outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow bg-white disabled:bg-brand-grey/5 disabled:text-brand-grey/50 ${props.className || ''}`}
    >
      {children}
    </select>
  );
}
