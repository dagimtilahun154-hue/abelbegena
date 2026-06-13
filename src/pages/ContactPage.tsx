import React from "react"
import { motion } from "framer-motion"
import { MapPin, Phone, Mail, MessageSquare, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const ContactInfo = ({ icon, title, detail }: { icon: React.ReactNode, title: string, detail: string }) => (
  <div className="flex items-start gap-6 mb-12 group">
    <div className="p-4 bg-brand-yellow/10 rounded-2xl text-brand-yellow-dark group-hover:bg-brand-yellow group-hover:text-brand-grey transition-colors">
      {icon}
    </div>
    <div>
      <h4 className="text-xl font-serif font-bold text-brand-grey mb-1">{title}</h4>
      <p className="text-brand-grey/60">{detail}</p>
    </div>
  </div>
)

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white pt-32 pb-24">
      <div className="container px-4">
        <div className="flex flex-col lg:flex-row gap-24">
          <div className="flex-1">
            <motion.span 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-brand-yellow-dark font-bold uppercase tracking-[0.3em] text-sm mb-4 block"
            >
              Get in Touch
            </motion.span>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl sm:text-5xl md:text-7xl font-serif font-bold text-brand-grey leading-tight mb-8"
            >
              Connect with <span className="italic text-brand-yellow-dark">History</span>
            </motion.h1>
            <p className="text-xl text-brand-grey/60 leading-relaxed font-light mb-16">
              Have questions about our curriculum, enrollment, or the history of the Begena? We are here to help you begin your spiritual journey.
            </p>

            <div className="mt-12">
              <ContactInfo 
                icon={<MapPin className="h-6 w-6" />}
                title="Our Sanctuary"
                detail="Addis Ababa, Ethiopia. Near the National Museum."
              />
              <ContactInfo 
                icon={<Phone className="h-6 w-6" />}
                title="Direct Line"
                detail="+251 911 234 567"
              />
              <ContactInfo 
                icon={<Mail className="h-6 w-6" />}
                title="Email Us"
                detail="contact@abelbegena.com"
              />
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 bg-brand-grey p-8 md:p-12 rounded-[2rem] shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <MessageSquare className="h-64 w-64 text-brand-yellow" />
            </div>
            
            <form className="relative z-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-brand-yellow/70 uppercase tracking-widest ml-1">Your Name</label>
                  <Input className="bg-white/5 border-white/10 text-white h-14 rounded-xl focus:border-brand-yellow transition-all" placeholder="Abel Begena" />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-brand-yellow/70 uppercase tracking-widest ml-1">Email Address</label>
                  <Input className="bg-white/5 border-white/10 text-white h-14 rounded-xl focus:border-brand-yellow transition-all" placeholder="abel@example.com" />
                </div>
              </div>
              
              <div className="space-y-3">
                <label className="text-sm font-bold text-brand-yellow/70 uppercase tracking-widest ml-1">Subject</label>
                <Input className="bg-white/5 border-white/10 text-white h-14 rounded-xl focus:border-brand-yellow transition-all" placeholder="Inquiry about Beginner Course" />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-brand-yellow/70 uppercase tracking-widest ml-1">Your Message</label>
                <Textarea className="bg-white/5 border-white/10 text-white min-h-[160px] rounded-xl focus:border-brand-yellow transition-all" placeholder="How can we help you?" />
              </div>

              <Button className="w-full bg-brand-yellow hover:bg-brand-yellow-dark text-brand-grey font-black h-16 rounded-xl text-lg group transition-all">
                Send Message
                <Send className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
