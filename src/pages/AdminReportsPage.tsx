import { useEffect, useState, type ReactNode } from "react"
import { Activity, BarChart3, ClipboardList, CreditCard, Package, ShoppingBag, Users } from "lucide-react"
import AdminLayout from "@/components/AdminLayout"
import { backendApi } from "@/lib/backend"

export default function AdminReportsPage() {
  const [report, setReport] = useState<any>(null)
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    const load = async () => {
      const [dashboard, audit] = await Promise.all([
        backendApi.listDashboardReport(),
        backendApi.listAuditLogs(),
      ])
      setReport(dashboard)
      setAuditLogs(audit.auditLogs || [])
    }

    load().catch((error) => setErrorMsg(error.message || "Could not load reports."))
  }, [])

  const finance = report?.finance || {}
  const students = report?.students || {}
  const shopRequests = report?.shopRequests || {}
  const songProgress = report?.songProgress || {}
  const stock = report?.stock || {}

  return (
    <AdminLayout title="Reports & Audit" description="Operational dashboards and backend audit trail synced from the ERP API.">
      {errorMsg && <div className="mb-6 p-4 rounded-2xl bg-red-50 text-red-700 font-medium">{errorMsg}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
        <Metric icon={<Users className="h-6 w-6" />} label="Students" value={students.total || 0} />
        <Metric icon={<ClipboardList className="h-6 w-6" />} label="Pending" value={students.pendingAdmissions || 0} />
        <Metric icon={<ShoppingBag className="h-6 w-6" />} label="Shop Requests" value={Object.values(shopRequests).reduce((sum: number, value: any) => sum + Number(value || 0), 0)} />
        <Metric icon={<Package className="h-6 w-6" />} label="Low Stock" value={stock.lowStockItems || 0} />
        <Metric icon={<CreditCard className="h-6 w-6" />} label="Net Cash" value={`${Number(finance.netCashFlow || 0).toLocaleString()} ETB`} />
        <Metric icon={<Activity className="h-6 w-6" />} label="Progress Rows" value={Object.values(songProgress).reduce((sum: number, value: any) => sum + Number(value || 0), 0)} dark />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <section className="xl:col-span-2 neo-flat-white p-8 rounded-[2rem] border border-white/40">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="h-6 w-6 text-brand-yellow-dark" />
            <h2 className="text-2xl font-serif font-bold text-brand-grey">Module Breakdown</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Breakdown title="Shop Requests" data={shopRequests} />
            <Breakdown title="Song Progress" data={songProgress} />
            <Breakdown title="Finance" data={{
              confirmedPayments: finance.confirmedPayments || 0,
              confirmedIncome: finance.confirmedIncome || 0,
              confirmedExpenses: finance.confirmedExpenses || 0,
            }} suffix=" ETB" />
            <Breakdown title="Stock" data={{
              activeItems: stock.activeItems || 0,
              lowStockItems: stock.lowStockItems || 0,
            }} />
          </div>
        </section>

        <aside className="neo-flat-white p-8 rounded-[2rem] border border-white/40">
          <h2 className="text-2xl font-serif font-bold text-brand-grey mb-6">Recent Audit Logs</h2>
          <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
            {auditLogs.map((log) => (
              <div key={log.id} className="rounded-2xl bg-[#f8fafc] border border-white/40 shadow-inner p-4">
                <p className="font-bold text-brand-grey">{log.action}</p>
                <p className="text-xs text-brand-grey/40">{log.entityType} #{log.entityId || "n/a"}</p>
                <p className="text-xs text-brand-grey/40 mt-1">{log.actor?.email || "System"} - {new Date(log.createdAt).toLocaleString()}</p>
              </div>
            ))}
            {auditLogs.length === 0 && <p className="text-brand-grey/40">No audit logs yet.</p>}
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
      <p className={`text-2xl font-serif font-bold ${dark ? "text-brand-yellow" : "text-brand-grey"}`}>{value}</p>
    </div>
  )
}

function Breakdown({ title, data, suffix = "" }: { title: string; data: Record<string, any>; suffix?: string }) {
  const entries = Object.entries(data || {})
  return (
    <div className="rounded-2xl bg-[#f8fafc] border border-white/40 shadow-inner p-5">
      <h3 className="font-serif font-bold text-xl text-brand-grey mb-4">{title}</h3>
      <div className="space-y-3">
        {entries.length > 0 ? entries.map(([key, value]) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <span className="text-sm text-brand-grey/50">{key.replace(/([A-Z])/g, " $1")}</span>
            <span className="font-bold text-brand-grey">{Number(value || 0).toLocaleString()}{suffix}</span>
          </div>
        )) : <p className="text-brand-grey/40 text-sm">No data yet.</p>}
      </div>
    </div>
  )
}
