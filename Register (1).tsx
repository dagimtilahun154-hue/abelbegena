import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Music, Upload, CheckCircle, Clock, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Helmet } from "react-helmet-async";

type View = "form" | "submitted" | "checking";

export default function Register() {
  const [form, setForm] = useState({
    firstName: "", middleName: "", lastName: "",
    gender: "", age: "", dateOfBirth: "",
    phone: "", email: "",
    address: "", subCity: "", woreda: "", houseNumber: "",
    emergencyName: "", emergencyPhone: "",
    instrumentType: "", learningCategory: "", mezmurOrSong: "",
    learningMode: "in_person",
    sourceOfInfo: "",
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>("form");
  const [checkPhone, setCheckPhone] = useState("");
  const [result, setResult] = useState<{ status: string; admin_note?: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const upd = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast({ title: "የምስል ፋይል ብቻ", variant: "destructive" }); return; }
    setPhoto(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const required: [string, string][] = [
      ["firstName", "ስም"], ["lastName", "የአያት ስም"], ["gender", "ጾታ"],
      ["dateOfBirth", "የልደት ቀን"], ["phone", "ስልክ ቁጥር"],
      ["address", "አድራሻ"], ["subCity", "ክፍለ ከተማ"], ["woreda", "ወረዳ"],
      ["instrumentType", "የመሳሪያ ዓይነት"], ["learningMode", "የትምህርት መንገድ"],
    ];
    for (const [k, label] of required) {
      if (!(form as any)[k]?.trim()) { toast({ title: `${label} ያስፈልጋል`, variant: "destructive" }); return; }
    }
    if (!photo) { toast({ title: "ፎቶ ያስፈልጋል", variant: "destructive" }); return; }

    setLoading(true);
    try {
      const ext = photo.name.split(".").pop();
      const fname = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("registration-photos").upload(fname, photo);
      if (upErr) throw upErr;
      const { data: u } = supabase.storage.from("registration-photos").getPublicUrl(fname);

      const { error } = await supabase.from("registrations").insert({
        first_name: form.firstName.trim(),
        middle_name: form.middleName.trim() || null,
        father_name: form.middleName.trim() || form.firstName.trim(),
        grandfather_name: form.lastName.trim(),
        gender: form.gender,
        age: form.age ? Number(form.age) : null,
        date_of_birth: form.dateOfBirth,
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        nationality: "Ethiopian",
        region: form.address.trim(),
        sub_city: form.subCity.trim(),
        woreda: form.woreda.trim(),
        kebele: form.subCity.trim() || "—",
        house_number: form.houseNumber.trim() || "—",
        full_address: `${form.address}, ${form.subCity}, Woreda ${form.woreda}`,
        id_type: "kebele_id",
        id_number: "—",
        emergency_contact_name: form.emergencyName.trim() || null,
        emergency_contact_phone: form.emergencyPhone.trim() || null,
        instrument_type: form.instrumentType,
        learning_category: form.learningCategory || null,
        mezmur_or_song: form.mezmurOrSong || null,
        learning_mode: form.learningMode,
        source_of_info: form.sourceOfInfo || null,
        photo_url: u.publicUrl,
      } as any);

      if (error) throw error;
      setView("submitted");
      toast({ title: "ምዝገባ ተልኳል!", description: "ምዝገባዎ ለአስተዳዳሪ ሰላም ሰጥቷል። እባክዎ ይጠብቁ።" });
    } catch (err: any) {
      toast({ title: "ስህተት", description: err.message || "Something went wrong", variant: "destructive" });
    }
    setLoading(false);
  };

  const checkStatus = async () => {
    if (!checkPhone.trim()) { toast({ title: "ስልክ ቁጥር ያስገቡ", variant: "destructive" }); return; }
    setLoading(true);
    const { data } = await supabase
      .from("registrations").select("status, admin_note")
      .eq("phone", checkPhone.trim()).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!data) { toast({ title: "ምዝገባ አልተገኘም", variant: "destructive" }); setResult(null); }
    else setResult({ status: data.status, admin_note: data.admin_note ?? undefined });
    setLoading(false);
  };

  if (view === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-accent/40 to-background px-4 py-8">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="p-6 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-xl bg-primary flex items-center justify-center"><Music className="h-6 w-6 text-primary-foreground" /></div>
              <h2 className="text-xl font-heading font-bold">የምዝገባ ሁኔታ ማረጋገጫ</h2>
              <p className="text-sm text-muted-foreground">Check your registration status</p>
            </div>
            <div><Label>ስልክ ቁጥር / Phone Number</Label>
              <Input value={checkPhone} onChange={(e) => setCheckPhone(e.target.value)} placeholder="+251 9XX XXX XXX" /></div>
            <Button className="w-full" onClick={checkStatus} disabled={loading}>{loading ? "Checking..." : "Check Status"}</Button>
            {result && (
              <div className="p-4 rounded-lg border bg-card">
                {result.status === "pending" && (<div className="flex gap-3"><Clock className="h-5 w-5 text-warning" /><div><p className="font-medium">በመጠባበቅ ላይ</p><p className="text-sm text-muted-foreground">Pending admin review.</p></div></div>)}
                {(result.status === "approved" || result.status === "active") && (<div className="flex gap-3"><CheckCircle className="h-5 w-5 text-success" /><div><p className="font-medium">ተፈቅዷል!</p><p className="text-sm text-muted-foreground">Approved. You may continue.</p><Button asChild size="sm" className="mt-2"><Link to="/login">Continue to Login</Link></Button></div></div>)}
                {result.status === "rejected" && (<div className="flex gap-3"><XCircle className="h-5 w-5 text-destructive" /><div><p className="font-medium">ተቀባይነት አላገኘም</p>{result.admin_note && <p className="text-sm text-muted-foreground">Note: {result.admin_note}</p>}</div></div>)}
                {result.status === "interrupted" && (<div className="flex gap-3"><XCircle className="h-5 w-5 text-warning" /><div><p className="font-medium">ተቋርጧል</p></div></div>)}
              </div>
            )}
            <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => { setView("form"); setResult(null); }}>አዲስ ምዝገባ</Button>
              <Button variant="ghost" className="flex-1" asChild><Link to="/">← Home</Link></Button></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (view === "submitted") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-accent/40 to-background px-4 py-8">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-xl bg-success flex items-center justify-center"><CheckCircle className="h-7 w-7 text-success-foreground" /></div>
            <h2 className="text-xl font-heading font-bold">ምዝገባ ተልኳል</h2>
            <p className="text-sm text-muted-foreground">Your registration is under review. You'll be notified once approved.</p>
            <Button className="w-full" onClick={() => setView("checking")}>ሁኔታ ማረጋገጥ / Check Status</Button>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground inline-block">← Back to Home</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent/30 to-background px-4 py-8">
      <Helmet>
        <title>Student Registration — Abel Begena School</title>
        <meta name="description" content="Apply to study Begena, Krar, or Masinko at Abel Begena Instrumental School. Submit your registration for admin review." />
        <link rel="canonical" href="/register" />
        <meta property="og:title" content="Student Registration — Abel Begena School" />
        <meta property="og:url" content="/register" />
      </Helmet>
      <Card className="max-w-3xl mx-auto shadow-lg border-2">
        {/* Paper-form header */}
        <div className="border-b-2 border-double border-primary/30 bg-card px-6 py-5 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center"><Music className="h-6 w-6 text-primary-foreground" /></div>
          </div>
          <h1 className="text-2xl font-heading font-bold">Student Registration — Abel Begena Instrumental School</h1>
          <p className="text-sm text-muted-foreground">አቤል በገና የመሳሪያ ት/ቤት</p>
          <p className="text-base font-heading font-semibold mt-2">የተማሪ መመዝገቢያ ቅጽ / Student Registration Form</p>
          <Button variant="link" size="sm" onClick={() => setView("checking")}>ቀደም ሲል ተመዝግበዋል? ሁኔታ ይፈትሹ</Button>
        </div>

        <CardContent className="p-6">
          <form onSubmit={submit} className="space-y-6">
            {/* Photo */}
            <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 border border-dashed">
              <div className="w-24 h-28 rounded border-2 border-dashed bg-card flex items-center justify-center overflow-hidden shrink-0">
                {photoPreview ? <img src={photoPreview} alt="Uploaded applicant photo preview" className="w-full h-full object-cover" /> : <span className="text-xs text-muted-foreground text-center px-2">ፎቶ<br/>Photo</span>}
              </div>
              <div className="flex-1 space-y-2">
                <Label>የተመዝጋቢ ፎቶ / Applicant Photo *</Label>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 mr-1" /> {photo ? photo.name.slice(0, 24) : "ፎቶ ይምረጡ / Choose Photo"}</Button>
                <p className="text-xs text-muted-foreground">JPG / PNG · ≤ 5MB</p>
              </div>
            </div>

            {/* Personal */}
            <Section title="የግል መረጃ / Personal Information">
              <Grid cols={3}>
                <Field label="ስም / First Name *"><Input value={form.firstName} onChange={(e) => upd("firstName", e.target.value)} required /></Field>
                <Field label="የአባት ስም / Middle Name"><Input value={form.middleName} onChange={(e) => upd("middleName", e.target.value)} /></Field>
                <Field label="የአያት ስም / Last Name *"><Input value={form.lastName} onChange={(e) => upd("lastName", e.target.value)} required /></Field>
              </Grid>
              <Grid cols={3}>
                <Field label="ጾታ / Gender *">
                  <Select value={form.gender} onValueChange={(v) => upd("gender", v)}>
                    <SelectTrigger><SelectValue placeholder="ይምረጡ" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">ወንድ / Male</SelectItem>
                      <SelectItem value="female">ሴት / Female</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="ዕድሜ / Age"><Input type="number" min={1} value={form.age} onChange={(e) => upd("age", e.target.value)} /></Field>
                <Field label="የልደት ቀን / Date of Birth *"><Input type="date" value={form.dateOfBirth} onChange={(e) => upd("dateOfBirth", e.target.value)} required /></Field>
              </Grid>
              <Grid cols={2}>
                <Field label="ስልክ ቁጥር / Phone *"><Input value={form.phone} onChange={(e) => upd("phone", e.target.value)} placeholder="+251 9XX XXX XXX" required /></Field>
                <Field label="ኢሜይል / Email"><Input type="email" value={form.email} onChange={(e) => upd("email", e.target.value)} /></Field>
              </Grid>
            </Section>

            {/* Address */}
            <Section title="አድራሻ / Address">
              <Grid cols={2}>
                <Field label="ከተማ / City *"><Input value={form.address} onChange={(e) => upd("address", e.target.value)} placeholder="Addis Ababa" required /></Field>
                <Field label="ክፍለ ከተማ / Sub City *"><Input value={form.subCity} onChange={(e) => upd("subCity", e.target.value)} required /></Field>
              </Grid>
              <Grid cols={2}>
                <Field label="ወረዳ / Woreda *"><Input value={form.woreda} onChange={(e) => upd("woreda", e.target.value)} required /></Field>
                <Field label="የቤት ቁጥር / House No."><Input value={form.houseNumber} onChange={(e) => upd("houseNumber", e.target.value)} /></Field>
              </Grid>
            </Section>

            {/* Emergency */}
            <Section title="የድንገተኛ ጊዜ ተጠሪ / Emergency Contact">
              <Grid cols={2}>
                <Field label="ስም / Contact Name"><Input value={form.emergencyName} onChange={(e) => upd("emergencyName", e.target.value)} /></Field>
                <Field label="ስልክ / Contact Phone"><Input value={form.emergencyPhone} onChange={(e) => upd("emergencyPhone", e.target.value)} /></Field>
              </Grid>
            </Section>

            {/* Learning */}
            <Section title="የትምህርት መረጃ / Learning Information">
              <Grid cols={2}>
                <Field label="የመሳሪያ ዓይነት / Instrument *">
                  <Select value={form.instrumentType} onValueChange={(v) => upd("instrumentType", v)}>
                    <SelectTrigger><SelectValue placeholder="ይምረጡ" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Begena">በገና / Begena</SelectItem>
                      <SelectItem value="Krar">ክራር / Krar</SelectItem>
                      <SelectItem value="Masinko">ማሲንቆ / Masinko</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="ምድብ / Learning Category">
                  <Select value={form.learningCategory} onValueChange={(v) => upd("learningCategory", v)}>
                    <SelectTrigger><SelectValue placeholder="ይምረጡ" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">ጀማሪ / Beginner</SelectItem>
                      <SelectItem value="intermediate">መካከለኛ / Intermediate</SelectItem>
                      <SelectItem value="advanced">ከፍተኛ / Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </Grid>
              <Grid cols={2}>
                <Field label="መዝሙር ወይም ዘፈን / Mezmur or Song">
                  <Select value={form.mezmurOrSong} onValueChange={(v) => upd("mezmurOrSong", v)}>
                    <SelectTrigger><SelectValue placeholder="ይምረጡ" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mezmur">መዝሙር / Mezmur</SelectItem>
                      <SelectItem value="song">ዘፈን / Song</SelectItem>
                      <SelectItem value="both">ሁለቱም / Both</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="የትምህርት መንገድ / Learning Mode *">
                  <Select value={form.learningMode} onValueChange={(v) => upd("learningMode", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_person">በአካል / In Person</SelectItem>
                      <SelectItem value="online">ኦንላይን / Online</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </Grid>
            </Section>

            {/* Source */}
            <Section title="ስለ ት/ቤታችን እንዴት አወቁ? / How did you hear about us?">
              <Select value={form.sourceOfInfo} onValueChange={(v) => upd("sourceOfInfo", v)}>
                <SelectTrigger><SelectValue placeholder="ይምረጡ" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="friend">ከጓደኛ / Friend recommendation</SelectItem>
                  <SelectItem value="family">ከቤተሰብ / Family recommendation</SelectItem>
                  <SelectItem value="social_media">ሶሻል ሚዲያ / Social media</SelectItem>
                  <SelectItem value="event">ት/ቤት ወይም ዝግጅት / School / event</SelectItem>
                  <SelectItem value="walk_in">በመንገድ አየሁ / Walk-in / passerby</SelectItem>
                  <SelectItem value="other">ሌላ / Other</SelectItem>
                </SelectContent>
              </Select>
            </Section>

            <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
              {loading ? "በመላክ ላይ..." : "ምዝገባ ላክ / Submit Registration"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              ተመዝጋቢ ሆነዋል? <Link to="/login" className="text-primary hover:underline">Login</Link> · <Link to="/" className="text-primary hover:underline">Home</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-heading font-semibold border-b pb-2 text-foreground">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
function Grid({ cols, children }: { cols: 2 | 3; children: React.ReactNode }) {
  const cls = cols === 2 ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "grid grid-cols-1 sm:grid-cols-3 gap-3";
  return <div className={cls}>{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
