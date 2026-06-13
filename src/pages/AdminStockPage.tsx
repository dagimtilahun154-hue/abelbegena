import { useEffect, useMemo, useState, type ReactNode } from "react"
import { AlertTriangle, Boxes, Plus, Repeat2, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import AdminLayout from "@/components/AdminLayout"
import { backendApi } from "@/lib/backend"

const emptyItem = {
  name: "",
  sku: "",
  categoryId: "",
  supplierId: "",
  currentQuantity: "",
  reorderLevel: "",
  unitCost: "",
  unitOfMeasure: "pcs",
}

const emptyMovement = {
  stockItemId: "",
  supplierId: "",
  type: "PURCHASE",
  quantity: "",
  unitCost: "",
  reference: "",
  notes: "",
}

export default function AdminStockPage() {
  const [categories, setCategories] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [movements, setMovements] = useState<any[]>([])
  const [lowStock, setLowStock] = useState<any[]>([])
  const [itemForm, setItemForm] = useState(emptyItem)
  const [movementForm, setMovementForm] = useState(emptyMovement)
  const [categoryName, setCategoryName] = useState("")
  const [supplierName, setSupplierName] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  const load = async () => {
    const [categoryRows, supplierRows, itemRows, movementRows, lowRows] = await Promise.all([
      backendApi.listStockCategories(),
      backendApi.listSuppliers(),
      backendApi.listStockItems(),
      backendApi.listStockMovements(),
      backendApi.listLowStockItems(),
    ])

    setCategories(categoryRows.categories || [])
    setSuppliers(supplierRows.suppliers || [])
    setItems(itemRows.items || [])
    setMovements(movementRows.movements || [])
    setLowStock(lowRows.items || [])
    setItemForm((current) => ({
      ...current,
      categoryId: current.categoryId || String(categoryRows.categories?.[0]?.id || ""),
      supplierId: current.supplierId || String(supplierRows.suppliers?.[0]?.id || ""),
    }))
    setMovementForm((current) => ({
      ...current,
      stockItemId: current.stockItemId || String(itemRows.items?.[0]?.id || ""),
      supplierId: current.supplierId || String(supplierRows.suppliers?.[0]?.id || ""),
    }))
  }

  useEffect(() => {
    load().catch((error) => setErrorMsg(error.message || "Could not load stock module."))
  }, [])

  const totalQuantity = useMemo(() => items.reduce((sum, item) => sum + Number(item.currentQuantity || 0), 0), [items])

  const addCategory = async () => {
    if (!categoryName.trim()) return
    setErrorMsg("")
    try {
      await backendApi.createStockCategory({ name: categoryName.trim() })
      setCategoryName("")
      await load()
    } catch (error: any) {
      setErrorMsg(error.message || "Could not add category.")
    }
  }

  const addSupplier = async () => {
    if (!supplierName.trim()) return
    setErrorMsg("")
    try {
      await backendApi.createSupplier({ name: supplierName.trim() })
      setSupplierName("")
      await load()
    } catch (error: any) {
      setErrorMsg(error.message || "Could not add supplier.")
    }
  }

  const addItem = async () => {
    if (!itemForm.name.trim()) return
    setErrorMsg("")
    try {
      await backendApi.createStockItem({
        name: itemForm.name.trim(),
        sku: itemForm.sku.trim() || null,
        categoryId: itemForm.categoryId ? Number(itemForm.categoryId) : null,
        supplierId: itemForm.supplierId ? Number(itemForm.supplierId) : null,
        currentQuantity: Number(itemForm.currentQuantity || 0),
        reorderLevel: Number(itemForm.reorderLevel || 0),
        unitCost: itemForm.unitCost ? Number(itemForm.unitCost) : null,
        unitOfMeasure: itemForm.unitOfMeasure || "pcs",
        status: "ACTIVE",
      })
      setItemForm(emptyItem)
      await load()
    } catch (error: any) {
      setErrorMsg(error.message || "Could not add stock item.")
    }
  }

  const addMovement = async () => {
    if (!movementForm.stockItemId || !movementForm.quantity) return
    setErrorMsg("")
    try {
      await backendApi.createStockMovement({
        stockItemId: Number(movementForm.stockItemId),
        supplierId: movementForm.supplierId ? Number(movementForm.supplierId) : null,
        type: movementForm.type,
        quantity: Number(movementForm.quantity),
        unitCost: movementForm.unitCost ? Number(movementForm.unitCost) : null,
        reference: movementForm.reference.trim() || null,
        notes: movementForm.notes.trim() || null,
      })
      setMovementForm(emptyMovement)
      await load()
    } catch (error: any) {
      setErrorMsg(error.message || "Could not record movement.")
    }
  }

  return (
    <AdminLayout title="Stock Management" description="Manage inventory items, suppliers, stock quantities, and movement history.">
      {errorMsg && <div className="mb-6 p-4 rounded-2xl bg-red-50 text-red-700 font-medium">{errorMsg}</div>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Metric icon={<Boxes className="h-6 w-6" />} label="Items" value={items.length} />
        <Metric icon={<AlertTriangle className="h-6 w-6" />} label="Low Stock" value={lowStock.length} />
        <Metric icon={<Repeat2 className="h-6 w-6" />} label="Movements" value={movements.length} />
        <Metric icon={<Truck className="h-6 w-6" />} label="Total Quantity" value={totalQuantity.toLocaleString()} dark />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <section className="xl:col-span-2 space-y-8">
          <div className="neo-flat-white p-8 rounded-[2rem] border border-white/40">
            <h2 className="text-2xl font-serif font-bold text-brand-grey mb-6">Inventory Items</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((item) => (
                <div key={item.id} className="rounded-2xl bg-[#f8fafc] border border-white/40 shadow-inner p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <p className="font-bold text-brand-grey">{item.name}</p>
                      <p className="text-xs text-brand-grey/40">{item.sku || "No SKU"} - {item.category?.name || "No category"}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-black ${Number(item.currentQuantity) <= Number(item.reorderLevel) ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
                      {Number(item.currentQuantity).toLocaleString()} {item.unitOfMeasure}
                    </span>
                  </div>
                  <p className="text-sm text-brand-grey/50">Reorder at {Number(item.reorderLevel).toLocaleString()} - Supplier: {item.supplier?.name || "None"}</p>
                </div>
              ))}
              {items.length === 0 && <p className="text-brand-grey/40">No stock items yet.</p>}
            </div>
          </div>

          <div className="neo-flat-white p-8 rounded-[2rem] border border-white/40">
            <h2 className="text-2xl font-serif font-bold text-brand-grey mb-6">Recent Movements</h2>
            <div className="space-y-3">
              {movements.slice(0, 12).map((movement) => (
                <div key={movement.id} className="rounded-2xl bg-[#f8fafc] border border-white/40 shadow-inner p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-brand-grey">{movement.stockItem?.name || "Stock item"}</p>
                    <p className="text-xs text-brand-grey/40">{movement.type} - {movement.reference || "No reference"}</p>
                  </div>
                  <p className="font-serif font-bold text-brand-grey">{Number(movement.quantity).toLocaleString()}</p>
                </div>
              ))}
              {movements.length === 0 && <p className="text-brand-grey/40">No movements recorded yet.</p>}
            </div>
          </div>
        </section>

        <aside className="space-y-8">
          <div className="neo-flat-white p-8 rounded-[2rem] border border-white/40">
            <h2 className="text-xl font-serif font-bold text-brand-grey mb-6">Quick Setup</h2>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Category name" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} />
                <Button onClick={addCategory} className="bg-[#2c2c2c] text-brand-yellow rounded-xl"><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex gap-2">
                <Input placeholder="Supplier name" value={supplierName} onChange={(event) => setSupplierName(event.target.value)} />
                <Button onClick={addSupplier} className="bg-[#2c2c2c] text-brand-yellow rounded-xl"><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>

          <div className="neo-flat-white p-8 rounded-[2rem] border border-white/40">
            <h2 className="text-xl font-serif font-bold text-brand-grey mb-6">Add Stock Item</h2>
            <div className="space-y-4">
              <Input placeholder="Item name" value={itemForm.name} onChange={(event) => setItemForm({ ...itemForm, name: event.target.value })} />
              <Input placeholder="SKU" value={itemForm.sku} onChange={(event) => setItemForm({ ...itemForm, sku: event.target.value })} />
              <Select value={itemForm.categoryId} onChange={(value) => setItemForm({ ...itemForm, categoryId: value })} options={categories} label="No category" />
              <Select value={itemForm.supplierId} onChange={(value) => setItemForm({ ...itemForm, supplierId: value })} options={suppliers} label="No supplier" />
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" placeholder="Quantity" value={itemForm.currentQuantity} onChange={(event) => setItemForm({ ...itemForm, currentQuantity: event.target.value })} />
                <Input type="number" placeholder="Reorder level" value={itemForm.reorderLevel} onChange={(event) => setItemForm({ ...itemForm, reorderLevel: event.target.value })} />
              </div>
              <Input type="number" placeholder="Unit cost" value={itemForm.unitCost} onChange={(event) => setItemForm({ ...itemForm, unitCost: event.target.value })} />
              <Button onClick={addItem} className="w-full bg-[#2c2c2c] text-brand-yellow rounded-xl py-6">Add Item</Button>
            </div>
          </div>

          <div className="bg-[#2c2c2c] p-8 rounded-[2rem] text-white shadow-[8px_8px_24px_rgba(163,177,198,0.35),-8px_-8px_24px_#ffffff]">
            <h2 className="text-xl font-serif font-bold mb-6">Record Movement</h2>
            <div className="space-y-4">
              <select value={movementForm.stockItemId} onChange={(event) => setMovementForm({ ...movementForm, stockItemId: event.target.value })} className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-white">
                <option value="" className="text-brand-grey">Select item</option>
                {items.map((item) => <option key={item.id} value={item.id} className="text-brand-grey">{item.name}</option>)}
              </select>
              <select value={movementForm.type} onChange={(event) => setMovementForm({ ...movementForm, type: event.target.value })} className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-white">
                {["PURCHASE", "SALE", "ISSUE", "ADJUSTMENT_IN", "ADJUSTMENT_OUT", "RETURN_IN", "RETURN_OUT"].map((type) => <option key={type} value={type} className="text-brand-grey">{type}</option>)}
              </select>
              <Input type="number" placeholder="Quantity" value={movementForm.quantity} onChange={(event) => setMovementForm({ ...movementForm, quantity: event.target.value })} />
              <Input type="number" placeholder="Unit cost" value={movementForm.unitCost} onChange={(event) => setMovementForm({ ...movementForm, unitCost: event.target.value })} />
              <Input placeholder="Reference" value={movementForm.reference} onChange={(event) => setMovementForm({ ...movementForm, reference: event.target.value })} />
              <Button onClick={addMovement} className="w-full bg-brand-yellow text-brand-grey rounded-xl py-6">Record Movement</Button>
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

function Select({ value, onChange, options, label }: { value: string; onChange: (value: string) => void; options: any[]; label: string }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-white/40 bg-[#f8fafc] shadow-inner px-4 py-3 text-brand-grey">
      <option value="">{label}</option>
      {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
    </select>
  )
}
