import { useCallback, useEffect, useMemo, useState } from "react"
import { CheckCircle2, Clock, Image as ImageIcon, Package, Plus, ShoppingBag, SlidersHorizontal, Upload, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import AdminLayout from "@/components/AdminLayout"
import { backendApi, fileToImageUploadPayload } from "@/lib/backend"

type Product = {
  id: string
  name: string
  sku: string | null
  description: string
  price: number
  currency: string
  isPublished: boolean
  status: string
  imageUrl: string | null
  categoryName: string | null
  stockItemName: string | null
  createdAt: string
}

type OrderStatus = "REQUESTED" | "CONTACTED" | "RESERVED" | "COMPLETED" | "CANCELLED"

type Order = {
  id: string
  requesterEmail: string | null
  requesterName: string | null
  requesterPhone: string | null
  itemName: string
  quantity: number
  status: OrderStatus
  adminNote: string | null
  createdAt: string
}

const emptyProduct = {
  categoryId: "",
  stockItemId: "",
  name: "",
  sku: "",
  description: "",
  price: "",
  currency: "ETB",
  imageUrl: "",
}

const statusTone: Record<OrderStatus, string> = {
  REQUESTED: "bg-yellow-50 text-yellow-700",
  CONTACTED: "bg-indigo-50 text-indigo-700",
  RESERVED: "bg-green-50 text-green-700",
  COMPLETED: "bg-blue-50 text-blue-700",
  CANCELLED: "bg-red-50 text-red-600",
}

const mapRequest = (request: any): Order => ({
  id: String(request.id),
  requesterEmail: request.requesterEmail,
  requesterName: request.requesterName,
  requesterPhone: request.requesterPhone,
  itemName: request.items?.map((item: any) => item.shopItem?.name || "Shop item").join(", ") || "Shop request",
  quantity: request.items?.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0) || 1,
  status: request.status || "REQUESTED",
  adminNote: request.adminNotes || request.notes || null,
  createdAt: request.createdAt,
})

export default function AdminShopPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [stockItems, setStockItems] = useState<any[]>([])
  const [productForm, setProductForm] = useState(emptyProduct)
  const [categoryName, setCategoryName] = useState("")
  const [productImage, setProductImage] = useState<File | null>(null)
  const [productImagePreview, setProductImagePreview] = useState("")
  const [orderNotes, setOrderNotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [savingProduct, setSavingProduct] = useState(false)
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")

    try {
      const [productRows, orderRows, categoryRows, stockRows] = await Promise.all([
        backendApi.listShopItems(),
        backendApi.listShopRequests(),
        backendApi.listShopCategories(),
        backendApi.listStockItems(),
      ])

      const productData = (productRows.items || []).map((item: any) => ({
        id: String(item.id),
        name: item.name,
        sku: item.sku || null,
        description: item.description || "",
        price: Number(item.price || 0),
        currency: item.currency || "ETB",
        isPublished: Boolean(item.isPublished),
        status: item.status,
        imageUrl: item.images?.[0]?.imageUrl || null,
        categoryName: item.category?.name || null,
        stockItemName: item.stockItem?.name || null,
        createdAt: item.createdAt,
      }))
      const orderData = (orderRows.requests || []).map(mapRequest)

      setProducts(productData)
      setOrders(orderData)
      setCategories(categoryRows.categories || [])
      setStockItems(stockRows.items || [])
      setOrderNotes(orderData.reduce<Record<string, string>>((notes, order) => {
        notes[order.id] = order.adminNote || ""
        return notes
      }, {}))
    } catch (loadError: any) {
      setError(loadError.message || "Could not load shop data.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const counts = useMemo(() => ({
    activeProducts: products.filter((product) => product.isPublished && product.status === "ACTIVE").length,
    pendingOrders: orders.filter((order) => order.status === "REQUESTED").length,
    fulfilledOrders: orders.filter((order) => order.status === "COMPLETED").length,
  }), [orders, products])

  const addProduct = async () => {
    setMessage("")
    setError("")
    if (!productForm.name.trim() || !productForm.description.trim()) {
      setError("Product name and description are required.")
      return
    }

    setSavingProduct(true)
    try {
      let imageUrl = productForm.imageUrl.trim()

      if (productImage) {
        const upload = await backendApi.uploadShopImage(await fileToImageUploadPayload(productImage))
        imageUrl = upload.upload.url
      }

      await backendApi.createShopItem({
        categoryId: productForm.categoryId ? Number(productForm.categoryId) : null,
        stockItemId: productForm.stockItemId ? Number(productForm.stockItemId) : null,
        name: productForm.name.trim(),
        sku: productForm.sku.trim() || null,
        description: productForm.description.trim(),
        price: Number(productForm.price || 0),
        currency: productForm.currency.trim() || "ETB",
        isPublished: true,
        status: "ACTIVE",
        images: imageUrl ? [{
          imageUrl,
          altText: productForm.name.trim(),
          sortOrder: 1,
        }] : undefined,
      })

      setProductForm(emptyProduct)
      setProductImage(null)
      setProductImagePreview("")
      setMessage("Item published to the backend shop catalog.")
      await load()
    } catch (saveError: any) {
      setError(saveError.message || "Could not publish shop item.")
    } finally {
      setSavingProduct(false)
    }
  }

  const addCategory = async () => {
    setMessage("")
    setError("")
    if (!categoryName.trim()) return

    try {
      await backendApi.createShopCategory({
        name: categoryName.trim(),
        isActive: true,
      })
      setCategoryName("")
      setMessage("Shop category created.")
      await load()
    } catch (categoryError: any) {
      setError(categoryError.message || "Could not create category.")
    }
  }

  const onProductImage = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.")
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("Image must be 3MB or smaller.")
      return
    }
    setProductImage(file)
    setProductImagePreview(URL.createObjectURL(file))
  }

  const toggleProduct = async (product: Product) => {
    setMessage("")
    setError("")
    try {
      await backendApi.updateShopItem(product.id, {
        isPublished: !product.isPublished,
        status: product.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      })
      setMessage(product.isPublished ? "Item hidden from the public shop." : "Item published to the public shop.")
      await load()
    } catch (updateError: any) {
      setError(updateError.message || "Could not update shop item.")
    }
  }

  const updateOrder = async (order: Order, status: OrderStatus) => {
    setMessage("")
    setError("")
    setUpdatingOrder(order.id)

    try {
      await backendApi.updateShopRequestStatus(order.id, status, orderNotes[order.id]?.trim() || undefined)
      setMessage(`Request marked ${status}.`)
      await load()
    } catch (updateError: any) {
      setError(updateError.message || "Could not update request.")
    } finally {
      setUpdatingOrder(null)
    }
  }

  return (
    <AdminLayout title="Shop & Orders" description="Publish instruments, review pickup requests, and keep the public shop current.">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="neo-flat p-6 rounded-[2rem] border border-white/40 hover:scale-[1.02] transition-transform duration-300">
          <Package className="h-6 w-6 text-brand-yellow-dark mb-5" />
          <p className="text-xs font-black uppercase tracking-widest text-brand-grey/40">Published Items</p>
          <p className="text-4xl font-serif font-bold text-brand-grey">{counts.activeProducts}</p>
        </div>
        <div className="neo-flat p-6 rounded-[2rem] border border-white/40 hover:scale-[1.02] transition-transform duration-300">
          <Clock className="h-6 w-6 text-yellow-600 mb-5" />
          <p className="text-xs font-black uppercase tracking-widest text-brand-grey/40">New Requests</p>
          <p className="text-4xl font-serif font-bold text-brand-grey">{counts.pendingOrders}</p>
        </div>
        <div className="bg-[#2c2c2c] p-6 rounded-[2rem] text-white shadow-[8px_8px_16px_rgba(0,0,0,0.2),-8px_-8px_16px_rgba(255,255,255,0.05)] border border-white/5">
          <CheckCircle2 className="h-6 w-6 text-brand-yellow mb-5" />
          <p className="text-xs font-black uppercase tracking-widest text-white/40">Completed</p>
          <p className="text-4xl font-serif font-bold text-brand-yellow">{counts.fulfilledOrders}</p>
        </div>
      </div>

      {(message || error) && (
        <div className={`mb-6 rounded-2xl px-5 py-4 text-sm font-bold ${error ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
          {error || message}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <section className="xl:col-span-2 space-y-8">
          <div className="neo-flat p-8 rounded-[2rem] border border-white/40">
            <div className="flex items-center gap-3 mb-6">
              <ShoppingBag className="h-6 w-6 text-brand-yellow-dark" />
              <h2 className="text-2xl font-serif font-bold text-brand-grey">Pickup Requests</h2>
            </div>

            {loading ? (
              <p className="py-10 text-center text-brand-grey/40">Loading requests...</p>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="p-5 rounded-2xl neo-pressed border border-white/30">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                      <div>
                        <div className="flex flex-wrap items-center gap-3 mb-1">
                          <h3 className="font-bold text-brand-grey text-lg">{order.itemName}</h3>
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${statusTone[order.status]}`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-sm text-brand-grey/50">
                          {order.requesterName || order.requesterEmail || "Customer"} - {order.requesterPhone || "No phone"} - Qty {order.quantity} - {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button onClick={() => updateOrder(order, "CONTACTED")} disabled={updatingOrder === order.id || order.status === "CONTACTED"} className="bg-brand-grey text-brand-yellow hover:bg-brand-grey-dark rounded-xl">
                          Contacted
                        </Button>
                        <Button onClick={() => updateOrder(order, "RESERVED")} disabled={updatingOrder === order.id || order.status === "RESERVED"} className="bg-brand-yellow text-brand-grey hover:bg-brand-yellow-dark rounded-xl">
                          Reserve
                        </Button>
                        <Button onClick={() => updateOrder(order, "COMPLETED")} disabled={updatingOrder === order.id || order.status === "COMPLETED"} className="bg-blue-600 text-white hover:bg-blue-700 rounded-xl">
                          Complete
                        </Button>
                        <Button onClick={() => updateOrder(order, "CANCELLED")} disabled={updatingOrder === order.id || order.status === "CANCELLED"} variant="outline" className="rounded-xl border-red-100 text-red-600 hover:bg-red-50">
                          <XCircle className="h-4 w-4 mr-2" /> Cancel
                        </Button>
                      </div>
                    </div>
                    <textarea
                      value={orderNotes[order.id] || ""}
                      onChange={(event) => setOrderNotes((current) => ({ ...current, [order.id]: event.target.value }))}
                      placeholder="Add pickup notes or customer follow-up details"
                      className="mt-4 w-full min-h-20 rounded-xl border border-white/60 bg-[#f0f4f8] shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff] p-4 text-sm text-brand-grey focus:outline-none"
                    />
                  </div>
                ))}
                {orders.length === 0 && <p className="py-10 text-center text-brand-grey/40">No shop requests yet.</p>}
              </div>
            )}
          </div>

          <div className="neo-flat p-8 rounded-[2rem] border border-white/40">
            <div className="flex items-center gap-3 mb-6">
              <SlidersHorizontal className="h-6 w-6 text-brand-yellow-dark" />
              <h2 className="text-2xl font-serif font-bold text-brand-grey">Shop Items</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map((product) => (
                <div key={product.id} className="p-5 rounded-2xl neo-pressed border border-white/30">
                  <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-[#f0f4f8] border border-white/40 mb-4 flex items-center justify-center neo-pressed p-2">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover rounded-xl shadow-inner" />
                    ) : (
                      <ImageIcon className="h-10 w-10 text-brand-grey/15" />
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-bold text-brand-grey">{product.name}</p>
                      <p className="text-xs text-brand-grey/40">{product.categoryName || "No category"} {product.stockItemName ? `- Stock: ${product.stockItemName}` : ""}</p>
                      <p className="text-sm text-brand-yellow-dark font-bold">{product.price.toLocaleString()} {product.currency}</p>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${product.isPublished && product.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-slate-200 text-brand-grey/50"}`}>
                      {product.isPublished && product.status === "ACTIVE" ? "Published" : "Hidden"}
                    </span>
                  </div>
                  <p className="text-sm text-brand-grey/50 mb-4">{product.description}</p>
                  <Button onClick={() => toggleProduct(product)} variant="outline" className="rounded-xl border-brand-grey/10 bg-[#f0f4f8] hover:bg-slate-100 text-brand-grey">
                    {product.isPublished ? "Hide Item" : "Publish Item"}
                  </Button>
                </div>
              ))}
              {products.length === 0 && <p className="text-brand-grey/40">No items in the shop yet.</p>}
            </div>
          </div>
        </section>

        <aside className="bg-[#2c2c2c] p-8 rounded-[2rem] text-white shadow-[8px_8px_16px_rgba(0,0,0,0.2),-8px_-8px_16px_rgba(255,255,255,0.05)] border border-white/5 h-fit">
          <h2 className="text-xl font-serif font-bold mb-6">Add Instrument</h2>
          <div className="space-y-4">
            <div className="rounded-2xl bg-black/20 border border-white/10 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-white/40 mb-3">Quick Category</p>
              <div className="flex gap-2">
                <Input 
                  placeholder="Category name" 
                  value={categoryName} 
                  onChange={(event) => setCategoryName(event.target.value)} 
                  className="bg-[#2c2c2c] border-white/10 text-white placeholder:text-white/40 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)] focus-visible:ring-brand-yellow/30"
                />
                <Button 
                  onClick={addCategory} 
                  className="bg-brand-yellow text-brand-grey font-semibold hover:bg-brand-yellow-dark rounded-xl active:scale-95 transition-all shadow-[2px_2px_5px_rgba(0,0,0,0.15)] border border-brand-yellow/20"
                >
                  Add
                </Button>
              </div>
            </div>
            <label className="block rounded-2xl border border-white/10 bg-black/10 p-4 cursor-pointer hover:bg-black/20 transition-colors">
              <input type="file" accept="image/*" className="hidden" onChange={(event) => onProductImage(event.target.files?.[0])} />
              <div className="aspect-[4/3] rounded-xl overflow-hidden bg-black/15 border border-white/5 mb-3 flex items-center justify-center">
                {productImagePreview ? (
                  <img src={productImagePreview} alt="Shop item preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="text-center text-white/50">
                    <Upload className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm font-bold">Upload shop image</p>
                  </div>
                )}
              </div>
              {productImage && <p className="text-xs text-white/50 truncate">{productImage.name}</p>}
            </label>
            <select 
              value={productForm.categoryId} 
              onChange={(event) => setProductForm({ ...productForm, categoryId: event.target.value })} 
              className="w-full rounded-xl bg-[#2c2c2c] border border-white/10 px-4 py-3 text-white shadow-[inset_3px_3px_6px_rgba(0,0,0,0.3),_inset_-3px_-3px_6px_rgba(255,255,255,0.05)] focus:outline-none"
            >
              <option value="" className="text-brand-grey">No category</option>
              {categories.map((category) => <option key={category.id} value={category.id} className="text-brand-grey">{category.name}</option>)}
            </select>
            <select 
              value={productForm.stockItemId} 
              onChange={(event) => setProductForm({ ...productForm, stockItemId: event.target.value })} 
              className="w-full rounded-xl bg-[#2c2c2c] border border-white/10 px-4 py-3 text-white shadow-[inset_3px_3px_6px_rgba(0,0,0,0.3),_inset_-3px_-3px_6px_rgba(255,255,255,0.05)] focus:outline-none"
            >
              <option value="" className="text-brand-grey">No stock item link</option>
              {stockItems.map((item) => <option key={item.id} value={item.id} className="text-brand-grey">{item.name} ({item.currentQuantity ?? 0})</option>)}
            </select>
            <Input 
              placeholder="Instrument name" 
              value={productForm.name} 
              onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} 
              className="bg-[#2c2c2c] border-white/10 text-white placeholder:text-white/40 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)] focus-visible:ring-brand-yellow/30"
            />
            <Input 
              placeholder="SKU/reference" 
              value={productForm.sku} 
              onChange={(event) => setProductForm({ ...productForm, sku: event.target.value })} 
              className="bg-[#2c2c2c] border-white/10 text-white placeholder:text-white/40 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)] focus-visible:ring-brand-yellow/30"
            />
            <textarea
              placeholder="Description"
              value={productForm.description}
              onChange={(event) => setProductForm({ ...productForm, description: event.target.value })}
              className="w-full min-h-28 rounded-xl border border-white/10 bg-[#2c2c2c] p-4 text-white placeholder:text-white/40 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)] focus:outline-none focus:ring-1 focus:ring-white/20"
            />
            <Input 
              type="number" 
              min="0" 
              step="0.01" 
              placeholder="Price" 
              value={productForm.price} 
              onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} 
              className="bg-[#2c2c2c] border-white/10 text-white placeholder:text-white/40 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)] focus-visible:ring-brand-yellow/30"
            />
            <Input 
              placeholder="Currency" 
              value={productForm.currency} 
              onChange={(event) => setProductForm({ ...productForm, currency: event.target.value })} 
              className="bg-[#2c2c2c] border-white/10 text-white placeholder:text-white/40 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)] focus-visible:ring-brand-yellow/30"
            />
            <Input 
              placeholder="Or paste image URL" 
              value={productForm.imageUrl} 
              onChange={(event) => setProductForm({ ...productForm, imageUrl: event.target.value })} 
              className="bg-[#2c2c2c] border-white/10 text-white placeholder:text-white/40 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)] focus-visible:ring-brand-yellow/30"
            />
            <Button 
              onClick={addProduct} 
              disabled={savingProduct} 
              className="w-full bg-brand-yellow text-brand-grey font-bold hover:bg-brand-yellow-dark rounded-xl active:scale-[0.98] transition-all py-6 shadow-[4px_4px_10px_rgba(0,0,0,0.15)] border border-brand-yellow/20"
            >
              <Plus className="h-4 w-4 mr-2" /> Publish Item
            </Button>
          </div>
        </aside>
      </div>
    </AdminLayout>
  )
}
