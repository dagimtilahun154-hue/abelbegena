import { useEffect, useState } from "react"
import { ArrowDownRight, ArrowUpRight, FileText, Plus, Receipt, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import AdminLayout from "@/components/AdminLayout"
import { backendApi } from "@/lib/backend"

type Transaction = {
  id: string
  type: "income" | "expense"
  amount: number
  currency: string
  category: string
  description: string | null
  transaction_date: string
}

export default function AdminFinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [programs, setPrograms] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [feePlans, setFeePlans] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [form, setForm] = useState({ type: "income", amount: "", category: "", description: "", transaction_date: new Date().toISOString().slice(0, 10), currency: "ETB" })
  const [feePlanForm, setFeePlanForm] = useState({ name: "", code: "", amount: "", programId: "", batchId: "", dueDate: "", currency: "ETB", description: "" })
  const [assignmentForm, setAssignmentForm] = useState({ studentId: "", feePlanId: "", amount: "", discountAmount: "", dueDate: "", currency: "ETB", notes: "" })
  const [paymentForm, setPaymentForm] = useState({ studentId: "", feeAssignmentId: "", amount: "", method: "CASH", paidAt: new Date().toISOString().slice(0, 10), currency: "ETB", notes: "" })
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  const load = async () => {
    const [incomeRows, expenseRows, studentRows, programRows, batchRows, feePlanRows, assignmentRows, paymentRows] = await Promise.all([
      backendApi.listIncomes(),
      backendApi.listExpenses(),
      backendApi.listStudents(),
      backendApi.listTrainingPrograms(),
      backendApi.listTrainingBatches(),
      backendApi.listFeePlans(),
      backendApi.listFeeAssignments(),
      backendApi.listPayments(),
    ])

    const incomes: Transaction[] = (incomeRows.incomes || []).map((item: any) => ({
      id: `income-${item.id}`,
      type: "income",
      amount: Number(item.amount || 0),
      currency: item.currency || "ETB",
      category: item.category?.name || item.source || "Income",
      description: item.description,
      transaction_date: item.receivedAt || item.createdAt,
    }))

    const expenses: Transaction[] = (expenseRows.expenses || []).map((item: any) => ({
      id: `expense-${item.id}`,
      type: "expense",
      amount: Number(item.amount || 0),
      currency: item.currency || "ETB",
      category: item.category?.name || item.payeeName || "Expense",
      description: item.description,
      transaction_date: item.spentAt || item.createdAt,
    }))

    setTransactions([...incomes, ...expenses].sort((left, right) => new Date(right.transaction_date).getTime() - new Date(left.transaction_date).getTime()))
    setStudents(studentRows.students || [])
    setPrograms(programRows.programs || [])
    setBatches(batchRows.batches || [])
    setFeePlans(feePlanRows.feePlans || [])
    setAssignments(assignmentRows.assignments || [])
    setPayments(paymentRows.payments || [])

    setFeePlanForm((current) => ({
      ...current,
      programId: current.programId || String(programRows.programs?.[0]?.id || ""),
    }))
    setAssignmentForm((current) => ({
      ...current,
      studentId: current.studentId || String(studentRows.students?.[0]?.id || ""),
      feePlanId: current.feePlanId || String(feePlanRows.feePlans?.[0]?.id || ""),
    }))
    setPaymentForm((current) => ({
      ...current,
      studentId: current.studentId || String(studentRows.students?.[0]?.id || ""),
      feeAssignmentId: current.feeAssignmentId || String(assignmentRows.assignments?.[0]?.id || ""),
    }))
  }

  useEffect(() => {
    load().catch((error) => setErrorMsg(error.message || "Could not load finance records."))
  }, [])

  const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const expenses = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const addTransaction = async () => {
    setErrorMsg("")
    setSuccessMsg("")
    if (!form.amount || !form.category.trim()) return

    try {
      if (form.type === "income") {
        await backendApi.createIncome({
          amount: Number(form.amount),
          currency: form.currency.trim() || "ETB",
          status: "CONFIRMED",
          source: form.category.trim(),
          receivedAt: form.transaction_date,
          description: form.description.trim() || null,
        })
      } else {
        await backendApi.createExpense({
          amount: Number(form.amount),
          currency: form.currency.trim() || "ETB",
          status: "CONFIRMED",
          payeeName: form.category.trim(),
          spentAt: form.transaction_date,
          description: form.description.trim() || null,
        })
      }

      setForm({ type: "income", amount: "", category: "", description: "", transaction_date: new Date().toISOString().slice(0, 10), currency: "ETB" })
      setSuccessMsg("Finance record saved.")
      await load()
    } catch (error: any) {
      setErrorMsg(error.message || "Could not save finance record.")
    }
  }

  const createFeePlan = async () => {
    setErrorMsg("")
    setSuccessMsg("")
    if (!feePlanForm.name.trim() || !feePlanForm.amount) {
      setErrorMsg("Fee plan name and amount are required.")
      return
    }

    try {
      await backendApi.createFeePlan({
        name: feePlanForm.name.trim(),
        code: feePlanForm.code.trim() || null,
        amount: Number(feePlanForm.amount),
        currency: feePlanForm.currency.trim() || "ETB",
        programId: feePlanForm.programId ? Number(feePlanForm.programId) : null,
        batchId: feePlanForm.batchId ? Number(feePlanForm.batchId) : null,
        dueDate: feePlanForm.dueDate || null,
        description: feePlanForm.description.trim() || null,
        status: "ACTIVE",
      })
      setFeePlanForm({ name: "", code: "", amount: "", programId: feePlanForm.programId, batchId: feePlanForm.batchId, dueDate: "", currency: "ETB", description: "" })
      setSuccessMsg("Fee plan created.")
      await load()
    } catch (error: any) {
      setErrorMsg(error.message || "Could not create fee plan.")
    }
  }

  const createAssignment = async () => {
    setErrorMsg("")
    setSuccessMsg("")
    if (!assignmentForm.studentId || !assignmentForm.amount) {
      setErrorMsg("Student and amount are required.")
      return
    }

    try {
      await backendApi.createFeeAssignment({
        studentId: Number(assignmentForm.studentId),
        feePlanId: assignmentForm.feePlanId ? Number(assignmentForm.feePlanId) : null,
        amount: Number(assignmentForm.amount),
        discountAmount: Number(assignmentForm.discountAmount || 0),
        currency: assignmentForm.currency.trim() || "ETB",
        dueDate: assignmentForm.dueDate || null,
        status: "PENDING",
        notes: assignmentForm.notes.trim() || null,
      })
      setAssignmentForm({ ...assignmentForm, amount: "", discountAmount: "", dueDate: "", notes: "" })
      setSuccessMsg("Student fee assigned.")
      await load()
    } catch (error: any) {
      setErrorMsg(error.message || "Could not assign fee.")
    }
  }

  const createPayment = async () => {
    setErrorMsg("")
    setSuccessMsg("")
    if (!paymentForm.studentId || !paymentForm.amount) {
      setErrorMsg("Student and payment amount are required.")
      return
    }

    try {
      await backendApi.createPayment({
        studentId: Number(paymentForm.studentId),
        feeAssignmentId: paymentForm.feeAssignmentId ? Number(paymentForm.feeAssignmentId) : null,
        amount: Number(paymentForm.amount),
        currency: paymentForm.currency.trim() || "ETB",
        method: paymentForm.method,
        status: "CONFIRMED",
        paidAt: paymentForm.paidAt,
        notes: paymentForm.notes.trim() || null,
      })
      setPaymentForm({ ...paymentForm, amount: "", notes: "" })
      setSuccessMsg("Payment recorded.")
      await load()
    } catch (error: any) {
      setErrorMsg(error.message || "Could not record payment.")
    }
  }

  const studentName = (student: any) =>
    [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ") || student.email || "Student"

  const assignmentLabel = (assignment: any) => {
    const student = assignment.student ? studentName(assignment.student) : students.find((item) => item.id === assignment.studentId)
    const label = typeof student === "string" ? student : student ? studentName(student) : "Student"
    return `${label} - ${Number(assignment.amount || 0).toLocaleString()} ${assignment.currency || "ETB"}`
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <AdminLayout title="Finance & Expenses" description="Track school income, expenses, and operational balance through the backend finance module.">
        {(errorMsg || successMsg) && (
          <div className={`mb-6 p-4 rounded-2xl font-medium ${errorMsg ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
            {errorMsg || successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="neo-flat-white p-6 rounded-[2rem] border border-white/40 transition-transform duration-300 hover:scale-[1.02]">
            <ArrowUpRight className="h-6 w-6 text-green-600 mb-5" />
            <p className="text-xs font-black uppercase tracking-widest text-brand-grey/40">Income</p>
            <p className="text-4xl font-serif font-bold text-brand-grey">{income.toLocaleString()} ETB</p>
          </div>
          <div className="neo-flat-white p-6 rounded-[2rem] border border-white/40 transition-transform duration-300 hover:scale-[1.02]">
            <ArrowDownRight className="h-6 w-6 text-red-500 mb-5" />
            <p className="text-xs font-black uppercase tracking-widest text-brand-grey/40">Expenses</p>
            <p className="text-4xl font-serif font-bold text-brand-grey">{expenses.toLocaleString()} ETB</p>
          </div>
          <div className="bg-[#2c2c2c] p-6 rounded-[2rem] text-white shadow-[8px_8px_24px_rgba(163,177,198,0.35),-8px_-8px_24px_#ffffff]">
            <Wallet className="h-6 w-6 text-brand-yellow mb-5" />
            <p className="text-xs font-black uppercase tracking-widest text-white/40">Net Balance</p>
            <p className="text-4xl font-serif font-bold text-brand-yellow">{(income - expenses).toLocaleString()} ETB</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <section className="xl:col-span-2 neo-flat-white p-8 rounded-[2rem] border border-white/40">
            <h2 className="text-2xl font-serif font-bold text-brand-grey mb-6">Finance Ledger</h2>
            <div className="space-y-4">
              {transactions.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[#f8fafc] border border-white/40 shadow-inner">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${item.type === "income" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                      {item.type === "income" ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-brand-grey">{item.category}</p>
                      <p className="text-sm text-brand-grey/40">{item.description || new Date(item.transaction_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <p className={`font-serif font-bold text-xl ${item.type === "income" ? "text-green-600" : "text-red-500"}`}>
                    {item.type === "income" ? "+" : "-"}{Number(item.amount).toLocaleString()} {item.currency}
                  </p>
                </div>
              ))}
              {transactions.length === 0 && <p className="py-10 text-center text-brand-grey/40">No finance records yet.</p>}
            </div>
          </section>

          <aside className="neo-flat-white p-8 rounded-[2rem] border border-white/40 h-fit">
            <h2 className="text-xl font-serif font-bold text-brand-grey mb-6">Add Record</h2>
            <div className="space-y-4">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-xl border border-white/40 bg-[#f8fafc] shadow-inner px-4 py-3 text-brand-grey focus:outline-none focus:ring-2 focus:ring-brand-yellow/40">
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
              <Input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="bg-[#f8fafc] border border-white/40 shadow-inner rounded-xl h-12" />
              <Input placeholder={form.type === "income" ? "Income source" : "Payee"} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="bg-[#f8fafc] border border-white/40 shadow-inner rounded-xl h-12" />
              <Input placeholder="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="bg-[#f8fafc] border border-white/40 shadow-inner rounded-xl h-12" />
              <Input type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} className="bg-[#f8fafc] border border-white/40 shadow-inner rounded-xl h-12" />
              <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full min-h-28 rounded-xl border border-white/40 bg-[#f8fafc] shadow-inner p-4 focus:outline-none focus:ring-2 focus:ring-brand-yellow/40" />
              <Button onClick={addTransaction} className="w-full bg-[#2c2c2c] text-brand-yellow hover:bg-[#1a1a1a] rounded-xl font-bold py-6 shadow-[4px_4px_10px_#d1d9e6,-4px_-4px_10px_#ffffff] transition-all duration-200 active:scale-[0.98]">
                <Plus className="h-4 w-4 mr-2" /> Save Record
              </Button>
            </div>
          </aside>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mt-8">
          <section className="xl:col-span-2 neo-flat-white p-8 rounded-[2rem] border border-white/40">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="h-6 w-6 text-brand-yellow-dark" />
              <h2 className="text-2xl font-serif font-bold text-brand-grey">Training Fee Plans</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {feePlans.map((plan) => (
                <div key={plan.id} className="rounded-2xl bg-[#f8fafc] border border-white/40 shadow-inner p-5">
                  <p className="font-bold text-brand-grey">{plan.name}</p>
                  <p className="text-sm text-brand-grey/40">{plan.program?.name || "Any program"} {plan.batch ? `- ${plan.batch.name}` : ""}</p>
                  <p className="text-2xl font-serif font-bold text-brand-grey mt-4">{Number(plan.amount || 0).toLocaleString()} {plan.currency || "ETB"}</p>
                  <span className="inline-block mt-3 text-xs font-black uppercase tracking-widest rounded-full bg-brand-yellow/20 text-brand-grey px-3 py-1">{plan.status}</span>
                </div>
              ))}
              {feePlans.length === 0 && <p className="text-brand-grey/40">No fee plans yet.</p>}
            </div>
          </section>

          <aside className="bg-[#2c2c2c] p-8 rounded-[2rem] text-white shadow-[8px_8px_24px_rgba(163,177,198,0.35),-8px_-8px_24px_#ffffff] h-fit">
            <h2 className="text-xl font-serif font-bold mb-6">Create Fee Plan</h2>
            <div className="space-y-4">
              <Input placeholder="Plan name" value={feePlanForm.name} onChange={(event) => setFeePlanForm({ ...feePlanForm, name: event.target.value })} />
              <Input placeholder="Code" value={feePlanForm.code} onChange={(event) => setFeePlanForm({ ...feePlanForm, code: event.target.value })} />
              <select value={feePlanForm.programId} onChange={(event) => setFeePlanForm({ ...feePlanForm, programId: event.target.value, batchId: "" })} className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-white">
                <option value="" className="text-brand-grey">Any program</option>
                {programs.map((program) => <option key={program.id} value={program.id} className="text-brand-grey">{program.name}</option>)}
              </select>
              <select value={feePlanForm.batchId} onChange={(event) => setFeePlanForm({ ...feePlanForm, batchId: event.target.value })} className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-white">
                <option value="" className="text-brand-grey">Any batch</option>
                {batches.filter((batch) => !feePlanForm.programId || String(batch.programId) === feePlanForm.programId).map((batch) => <option key={batch.id} value={batch.id} className="text-brand-grey">{batch.name}</option>)}
              </select>
              <Input type="number" placeholder="Amount" value={feePlanForm.amount} onChange={(event) => setFeePlanForm({ ...feePlanForm, amount: event.target.value })} />
              <Input placeholder="Currency" value={feePlanForm.currency} onChange={(event) => setFeePlanForm({ ...feePlanForm, currency: event.target.value })} />
              <Input type="date" value={feePlanForm.dueDate} onChange={(event) => setFeePlanForm({ ...feePlanForm, dueDate: event.target.value })} />
              <Button onClick={createFeePlan} className="w-full bg-brand-yellow text-brand-grey hover:bg-brand-yellow-dark rounded-xl py-6">Create Fee Plan</Button>
            </div>
          </aside>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">
          <section className="neo-flat-white p-8 rounded-[2rem] border border-white/40">
            <div className="flex items-center gap-3 mb-6">
              <Wallet className="h-6 w-6 text-brand-yellow-dark" />
              <h2 className="text-2xl font-serif font-bold text-brand-grey">Assign Student Fee</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select value={assignmentForm.studentId} onChange={(event) => setAssignmentForm({ ...assignmentForm, studentId: event.target.value })} className="rounded-xl border border-white/40 bg-[#f8fafc] shadow-inner px-4 py-3 text-brand-grey">
                <option value="">Select student</option>
                {students.map((student) => <option key={student.id} value={student.id}>{studentName(student)}</option>)}
              </select>
              <select value={assignmentForm.feePlanId} onChange={(event) => {
                const plan = feePlans.find((item) => String(item.id) === event.target.value)
                setAssignmentForm({ ...assignmentForm, feePlanId: event.target.value, amount: plan ? String(plan.amount || "") : assignmentForm.amount })
              }} className="rounded-xl border border-white/40 bg-[#f8fafc] shadow-inner px-4 py-3 text-brand-grey">
                <option value="">No fee plan</option>
                {feePlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
              </select>
              <Input type="number" placeholder="Amount" value={assignmentForm.amount} onChange={(event) => setAssignmentForm({ ...assignmentForm, amount: event.target.value })} />
              <Input type="number" placeholder="Discount" value={assignmentForm.discountAmount} onChange={(event) => setAssignmentForm({ ...assignmentForm, discountAmount: event.target.value })} />
              <Input type="date" value={assignmentForm.dueDate} onChange={(event) => setAssignmentForm({ ...assignmentForm, dueDate: event.target.value })} />
              <Input placeholder="Currency" value={assignmentForm.currency} onChange={(event) => setAssignmentForm({ ...assignmentForm, currency: event.target.value })} />
              <textarea placeholder="Notes" value={assignmentForm.notes} onChange={(event) => setAssignmentForm({ ...assignmentForm, notes: event.target.value })} className="md:col-span-2 min-h-24 rounded-xl border border-white/40 bg-[#f8fafc] shadow-inner p-4 focus:outline-none focus:ring-2 focus:ring-brand-yellow/40" />
              <Button onClick={createAssignment} className="md:col-span-2 bg-brand-grey text-brand-yellow hover:bg-brand-grey-dark rounded-xl py-6">Assign Fee</Button>
            </div>
          </section>

          <section className="neo-flat-white p-8 rounded-[2rem] border border-white/40">
            <div className="flex items-center gap-3 mb-6">
              <Receipt className="h-6 w-6 text-brand-yellow-dark" />
              <h2 className="text-2xl font-serif font-bold text-brand-grey">Record Payment</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select value={paymentForm.studentId} onChange={(event) => setPaymentForm({ ...paymentForm, studentId: event.target.value })} className="rounded-xl border border-white/40 bg-[#f8fafc] shadow-inner px-4 py-3 text-brand-grey">
                <option value="">Select student</option>
                {students.map((student) => <option key={student.id} value={student.id}>{studentName(student)}</option>)}
              </select>
              <select value={paymentForm.feeAssignmentId} onChange={(event) => setPaymentForm({ ...paymentForm, feeAssignmentId: event.target.value })} className="rounded-xl border border-white/40 bg-[#f8fafc] shadow-inner px-4 py-3 text-brand-grey">
                <option value="">Unassigned payment</option>
                {assignments.filter((assignment) => !paymentForm.studentId || String(assignment.studentId) === paymentForm.studentId).map((assignment) => <option key={assignment.id} value={assignment.id}>{assignmentLabel(assignment)}</option>)}
              </select>
              <Input type="number" placeholder="Amount" value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} />
              <select value={paymentForm.method} onChange={(event) => setPaymentForm({ ...paymentForm, method: event.target.value })} className="rounded-xl border border-white/40 bg-[#f8fafc] shadow-inner px-4 py-3 text-brand-grey">
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="MOBILE_MONEY">Mobile money</option>
                <option value="CARD">Card</option>
                <option value="OTHER">Other</option>
              </select>
              <Input type="date" value={paymentForm.paidAt} onChange={(event) => setPaymentForm({ ...paymentForm, paidAt: event.target.value })} />
              <Input placeholder="Currency" value={paymentForm.currency} onChange={(event) => setPaymentForm({ ...paymentForm, currency: event.target.value })} />
              <textarea placeholder="Notes" value={paymentForm.notes} onChange={(event) => setPaymentForm({ ...paymentForm, notes: event.target.value })} className="md:col-span-2 min-h-24 rounded-xl border border-white/40 bg-[#f8fafc] shadow-inner p-4 focus:outline-none focus:ring-2 focus:ring-brand-yellow/40" />
              <Button onClick={createPayment} className="md:col-span-2 bg-brand-yellow text-brand-grey hover:bg-brand-yellow-dark rounded-xl py-6">Record Payment</Button>
            </div>

            <div className="mt-6 space-y-3">
              {payments.slice(0, 4).map((payment) => (
                <div key={payment.id} className="rounded-2xl bg-[#f8fafc] border border-white/40 shadow-inner p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-brand-grey">{payment.student ? studentName(payment.student) : "Student payment"}</p>
                    <p className="text-sm text-brand-grey/40">{payment.method} - {new Date(payment.paidAt || payment.createdAt).toLocaleDateString()}</p>
                  </div>
                  <p className="font-serif font-bold text-green-600">{Number(payment.amount || 0).toLocaleString()} {payment.currency || "ETB"}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </AdminLayout>
    </div>
  )
}
