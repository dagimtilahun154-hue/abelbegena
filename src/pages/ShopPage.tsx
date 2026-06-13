import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Music, ShoppingBag, Package, CheckCircle2, Clock, ArrowLeft, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { backendApi, getStoredSession, type BackendUser } from "@/lib/backend"

type Product = {
  id: string
  name: string
  description: string
  price_label: string
  pickup_note: string
  imageUrl?: string | null
}

type Order = {
  id: string
  item_name: string
  status: string
  created_at: string
}

export default function ShopPage() {
  const [user, setUser] = useState<BackendUser | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [ordering, setOrdering] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [requestForm, setRequestForm] = useState({ requesterName: "", requesterPhone: "", requesterEmail: "" })
  const [successMsg, setSuccessMsg] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    const init = async () => {
      try {
        const { items } = await backendApi.listPublicShopItems()
        setProducts((items || []).map((item: any) => ({
          id: String(item.id),
          name: item.name,
          description: item.description || "Available for in-person pickup.",
          price_label: `${Number(item.price || 0).toLocaleString()} ${item.currency || "ETB"}`,
          pickup_note: item.stockItem ? "Inventory item" : "In-person pickup",
          imageUrl: item.images?.[0]?.imageUrl || null,
        })))

        const session = getStoredSession()
        if (session?.user) {
          setUser(session.user)
          const { requests } = await backendApi.listOwnShopRequests()
          setOrders((requests || []).map((request: any) => ({
            id: String(request.id),
            item_name: request.items?.map((requestItem: any) => requestItem.shopItem?.name || "Shop item").join(", ") || "Shop request",
            status: String(request.status || "REQUESTED").toLowerCase(),
            created_at: request.createdAt,
          })))
        }
      } catch (error: any) {
        setErrorMsg(error.message || "Could not load shop catalog.")
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const handleOrder = async (product: Product) => {
    setOrdering(product.id)
    setSuccessMsg("")
    setErrorMsg("")

    try {
      if (user) {
        await backendApi.createStudentShopRequest({
          items: [{
            shopItemId: Number(product.id),
            quantity: 1,
            notes: `Website pickup request for ${product.name}`,
          }],
        })
      } else {
        if (!requestForm.requesterName.trim() || !requestForm.requesterPhone.trim()) {
          setErrorMsg("Enter your name and phone number to request this item.")
          setOrdering(null)
          return
        }

        await backendApi.createPublicShopRequest({
          requesterName: requestForm.requesterName.trim(),
          requesterPhone: requestForm.requesterPhone.trim(),
          requesterEmail: requestForm.requesterEmail.trim() || null,
          notes: `Public website pickup request for ${product.name}`,
          items: [{
            shopItemId: Number(product.id),
            quantity: 1,
            notes: `Website pickup request for ${product.name}`,
          }],
        })
      }

      setSuccessMsg(`Request for ${product.name} placed. The admin will contact you for in-person pickup.`)
      setSelectedProduct(null)
      setRequestForm({ requesterName: "", requesterPhone: "", requesterEmail: "" })

      if (user) {
        const { requests } = await backendApi.listOwnShopRequests()
        setOrders((requests || []).map((request: any) => ({
          id: String(request.id),
          item_name: request.items?.map((requestItem: any) => requestItem.shopItem?.name || "Shop item").join(", ") || "Shop request",
          status: String(request.status || "REQUESTED").toLowerCase(),
          created_at: request.createdAt,
        })))
      }
    } catch (error: any) {
      setErrorMsg(error.message || "Could not place shop request.")
    } finally {
      setOrdering(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] pt-32 pb-24">
      <div className="container px-4">
        <Link to="/" className="neo-btn inline-flex items-center gap-2 text-brand-grey font-bold rounded-xl px-4 py-2 mb-8 group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        <div className="max-w-3xl mb-16">
          <motion.span
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-brand-yellow-dark font-bold uppercase tracking-[0.3em] text-sm mb-4 block"
          >
            Instrument Shop
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl md:text-7xl font-serif font-bold text-brand-grey leading-tight mb-8"
          >
            Order Your <span className="italic text-brand-yellow-dark underline decoration-brand-yellow decoration-4 underline-offset-8">Instrument</span>
          </motion.h1>
          <p className="text-xl text-brand-grey/60 leading-relaxed font-light">
            Browse active instruments from the school catalog. Place an order and pick it up in person from the school.
          </p>
        </div>

        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-4 shadow-sm"
          >
            <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
            <p className="text-green-700 font-medium">{successMsg}</p>
          </motion.div>
        )}

        {errorMsg && (
          <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 font-medium shadow-sm">
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-brand-grey/40 font-medium">Loading instruments...</div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
            {products.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -8 }}
                className="bg-[#f0f4f8] rounded-[2rem] p-8 neo-flat border border-white/40 group transition-all"
              >
                <div className="mb-6">
                  <div className="h-24 w-24 bg-[#f0f4f8] rounded-2xl overflow-hidden flex items-center justify-center neo-pressed border border-white/30 p-2">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover rounded-xl shadow-inner" />
                    ) : (
                      <Music className="h-9 w-9 text-brand-yellow-dark" />
                    )}
                  </div>
                </div>
                <h3 className="text-2xl font-serif font-bold text-brand-grey mb-3">{item.name}</h3>
                <p className="text-brand-grey/60 mb-6 leading-relaxed">{item.description}</p>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-lg font-bold text-brand-yellow-dark">{item.price_label}</span>
                  <div className="flex items-center gap-2 text-brand-grey/40 text-sm">
                    <Package className="h-4 w-4" />
                    {item.pickup_note}
                  </div>
                </div>
                <Button
                  onClick={() => user ? handleOrder(item) : setSelectedProduct(item)}
                  disabled={ordering === item.id}
                  className="w-full bg-[#2c2c2c] hover:bg-[#1a1a1a] text-white rounded-xl py-6 font-bold hover:scale-[1.01] active:scale-[0.99] transition-all shadow-md"
                >
                  {ordering === item.id ? (
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4 animate-spin" /> Placing Order...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5" /> Order for Pickup
                    </span>
                  )}
                </Button>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center bg-[#f0f4f8] rounded-3xl border border-white/40 mb-24 neo-pressed">
            <h2 className="text-2xl font-serif font-bold text-brand-grey mb-2">No instruments available yet</h2>
            <p className="text-brand-grey/50">Add published shop items in the backend admin panel to publish the shop.</p>
          </div>
        )}

        {user && orders.length > 0 && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-serif font-bold text-brand-grey mb-8">My Orders</h2>
            <div className="neo-flat rounded-[2rem] border border-white/40 overflow-hidden bg-[#f0f4f8]">
              {orders.map((order, i) => (
                <div key={order.id} className={`flex items-center gap-6 p-6 ${i !== orders.length - 1 ? 'border-b border-brand-grey/10' : ''}`}>
                  <div className="h-14 w-14 neo-pressed border border-white/30 rounded-xl flex items-center justify-center p-2">
                    <Music className="h-6 w-6 text-brand-yellow-dark" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-brand-grey">{order.item_name}</h4>
                    <p className="text-brand-grey/40 text-sm">
                      Ordered {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest ${
                    order.status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                    order.status === 'requested' ? 'bg-yellow-50 text-yellow-700' :
                    order.status === 'reserved' ? 'bg-green-50 text-green-700' :
                    order.status === 'completed' ? 'bg-blue-50 text-blue-700' :
                    'bg-gray-50 text-gray-700'
                  }`}>
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedProduct && (
          <div className="fixed inset-0 z-[100] bg-brand-grey/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="w-full max-w-lg bg-[#f0f4f8] border border-white/40 rounded-[2rem] shadow-2xl p-6 md:p-8 relative neo-flat"
            >
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute right-5 top-5 h-10 w-10 rounded-full bg-[#f0f4f8] shadow-[2px_2px_5px_#d1d9e6,-2px_-2px_5px_#ffffff] border border-white/30 flex items-center justify-center text-brand-grey/50 hover:text-brand-grey active:scale-95 transition-all"
                aria-label="Close request form"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="pr-12 mb-6">
                <p className="text-brand-yellow-dark font-black uppercase tracking-widest text-xs mb-2">Pickup Request</p>
                <h2 className="text-3xl font-serif font-bold text-brand-grey">{selectedProduct.name}</h2>
                <p className="text-brand-grey/50 mt-2">{selectedProduct.price_label}</p>
              </div>
              <div className="space-y-4">
                <input
                  value={requestForm.requesterName}
                  onChange={(event) => setRequestForm({ ...requestForm, requesterName: event.target.value })}
                  placeholder="Your full name"
                  className="w-full rounded-xl border border-white/60 bg-[#f0f4f8] shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] px-4 py-4 focus:outline-none text-brand-grey placeholder:text-brand-grey/30"
                />
                <input
                  value={requestForm.requesterPhone}
                  onChange={(event) => setRequestForm({ ...requestForm, requesterPhone: event.target.value })}
                  placeholder="Phone number"
                  className="w-full rounded-xl border border-white/60 bg-[#f0f4f8] shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] px-4 py-4 focus:outline-none text-brand-grey placeholder:text-brand-grey/30"
                />
                <input
                  value={requestForm.requesterEmail}
                  onChange={(event) => setRequestForm({ ...requestForm, requesterEmail: event.target.value })}
                  placeholder="Email address optional"
                  className="w-full rounded-xl border border-white/60 bg-[#f0f4f8] shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] px-4 py-4 focus:outline-none text-brand-grey placeholder:text-brand-grey/30"
                />
                <Button
                  onClick={() => handleOrder(selectedProduct)}
                  disabled={ordering === selectedProduct.id}
                  className="w-full bg-brand-yellow hover:bg-brand-yellow-dark text-brand-grey rounded-xl py-6 font-black shadow-[4px_4px_10px_rgba(209,217,230,0.8),-4px_-4px_10px_#ffffff] hover:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1)] active:scale-[0.98] transition-all border border-brand-yellow/20"
                >
                  {ordering === selectedProduct.id ? "Sending request..." : "Send Pickup Request"}
                </Button>
                <p className="text-sm text-brand-grey/40 text-center font-medium mt-2">No online payment. The school will call you for in-person pickup.</p>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
