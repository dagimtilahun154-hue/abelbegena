import React from "react"
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion"
import { Music, GraduationCap, Users, Calendar, ChevronRight, PlayCircle, BookOpen, Quote, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu"

// --- Components ---

const Navbar = () => {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: "circOut" }}
      className="sticky top-0 z-50 w-full border-b border-brand-grey/10 bg-brand-yellow shadow-md"
    >
      <div className="container flex h-20 md:h-24 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center"
          >
            <img 
              src="/images/logo.png" 
              alt="Logo" 
              className="h-12 md:h-16 w-auto object-contain"
            />
          </motion.div>
          <div className="flex flex-col">
            <span className="text-xl md:text-3xl font-serif font-bold tracking-tight text-brand-grey leading-none">Abel Begena</span>
            <span className="text-[10px] md:text-xs font-sans font-bold uppercase tracking-[0.3em] text-brand-grey/60 mt-1">Sacred Sound School</span>
          </div>
        </div>
        
        <nav className="hidden lg:flex items-center gap-8">
          <NavigationMenu>
            <NavigationMenuList className="gap-2">
              <NavItem title="Heritage" />
              <NavItem title="Courses" />
              <NavItem title="Contact" />
            </NavigationMenuList>
          </NavigationMenu>
        </nav>

        <div className="flex items-center gap-4">
          <Button variant="ghost" className="hidden sm:flex text-brand-grey hover:bg-brand-grey/10 font-bold">Login</Button>
          <Button className="hidden sm:flex bg-brand-grey hover:bg-brand-grey-dark text-brand-yellow border-none shadow-lg transition-all hover:scale-105 active:scale-95 font-bold px-10 h-12 md:h-14">
            Begin Journey
          </Button>
          <button 
            className="lg:hidden p-2 text-brand-grey"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-brand-yellow border-t border-brand-grey/10 overflow-hidden"
          >
            <div className="container flex flex-col py-6 gap-4 px-4">
              <MobileNavItem title="Heritage" onClick={() => setIsOpen(false)} />
              <MobileNavItem title="Courses" onClick={() => setIsOpen(false)} />
              <MobileNavItem title="Contact" onClick={() => setIsOpen(false)} />
              <div className="flex flex-col gap-4 mt-4">
                <Button variant="outline" className="w-full border-brand-grey text-brand-grey font-bold py-6">Login</Button>
                <Button className="w-full bg-brand-grey text-brand-yellow font-bold py-6 text-lg">
                  Begin Journey
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}

const MobileNavItem = ({ title, onClick }: { title: string, onClick: () => void }) => (
  <a 
    href="#" 
    onClick={onClick}
    className="text-xl font-serif font-bold text-brand-grey py-4 border-b border-brand-grey/5"
  >
    {title}
  </a>
)

const NavItem = ({ title }: { title: string }) => (
  <NavigationMenuItem>
    <NavigationMenuLink className={`${navigationMenuTriggerStyle()} bg-transparent text-brand-grey hover:text-brand-grey/70 font-semibold`}>
      {title}
    </NavigationMenuLink>
  </NavigationMenuItem>
)

const Hero = () => {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white">
      {/* Immersive Background Image with Parallax */}
      <motion.div 
        style={{ y: y1, opacity }}
        className="absolute inset-0 z-0 flex items-center justify-center"
      >
        <div className="relative w-full h-full max-w-full mx-auto opacity-50 md:opacity-70">
          <img 
            src="/images/hero-begena-final.png" 
            alt="Sacred Begena" 
            className="w-full h-full object-cover object-center scale-100 md:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-white" />
        </div>
      </motion.div>

      {/* Hero Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[90vh] px-4 pt-10 pb-20 md:pb-40">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="w-full flex flex-col items-center text-center"
        >
          <h1 className="text-5xl sm:text-7xl md:text-9xl font-serif font-bold text-brand-grey leading-tight mb-8 tracking-tighter flex flex-col md:flex-row items-center justify-center gap-x-8">
            <span>Abel</span>
            <span className="italic">Begena</span>
          </h1>
          
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: "100px" }}
            transition={{ delay: 0.8, duration: 1 }}
            className="h-[1px] bg-brand-yellow mb-12"
          />

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="flex flex-col sm:flex-row gap-6 justify-center items-center w-full max-w-2xl mx-auto"
          >
            <Button size="lg" className="bg-brand-yellow hover:bg-brand-yellow-dark text-brand-grey px-12 h-16 text-xl rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 font-bold uppercase tracking-wider w-full sm:w-auto min-w-[220px]">
              Begin Journey
            </Button>
            <Button size="lg" variant="outline" className="border-brand-grey text-brand-grey px-12 h-16 text-xl rounded-full group hover:bg-brand-grey hover:text-white transition-all w-full sm:w-auto min-w-[220px]">
              <PlayCircle className="mr-3 h-6 w-6 text-brand-yellow transition-transform group-hover:scale-110" />
              Listen
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

const AboutSection = ({ 
  title, 
  subtitle, 
  content, 
  imageSrc, 
  reverse = false 
}: { 
  title: string, 
  subtitle: string, 
  content: string, 
  imageSrc?: string,
  reverse?: boolean 
}) => {
  return (
    <section className={`py-32 ${reverse ? 'bg-slate-50' : 'bg-white'}`}>
      <div className="container px-4">
        <div className={`flex flex-col ${reverse ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-16 md:gap-24`}>
          <motion.div 
            initial={{ opacity: 0, x: reverse ? 50 : -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="flex-1"
          >
            <span className="text-brand-yellow-dark font-medium tracking-widest uppercase mb-4 block">{subtitle}</span>
            <h2 className="text-4xl md:text-6xl font-serif font-bold text-brand-grey mb-8">{title}</h2>
            <p className="text-lg text-brand-grey/70 leading-relaxed mb-8 whitespace-pre-line">
              {content}
            </p>
            <Button variant="link" className="text-brand-yellow-dark p-0 h-auto text-lg font-bold group">
              Learn more about this art
              <ChevronRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2 }}
            className="flex-1 w-full"
          >
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl bg-brand-grey/5 border-8 border-white">
              <div className="absolute inset-0 flex items-center justify-center bg-brand-grey/5 group hover:scale-105 transition-transform duration-700">
                <Music className="h-32 w-32 text-brand-grey/10" />
                {imageSrc && <img src={imageSrc} alt={title} className="w-full h-full object-cover" />}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

const FeatureSection = () => {
  return (
    <section className="py-32 bg-brand-grey text-white overflow-hidden">
      <div className="container px-4 relative">
        <div className="max-w-3xl mb-24">
          <h2 className="text-4xl md:text-6xl font-serif font-bold mb-8">Modern Management for <br/><span className="text-brand-yellow">Ancient Heritage</span></h2>
          <p className="text-xl text-white/70 font-light leading-relaxed">
            Abel Begena integrates state-of-the-art ERP systems to streamline your learning experience while keeping the focus on spiritual practice.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          <FeatureItem 
            icon={<Calendar className="h-8 w-8 text-brand-yellow" />}
            title="Spiritual Scheduling"
            description="Book your individual sessions with masters using our intelligent conflict-free system."
          />
          <FeatureItem 
            icon={<GraduationCap className="h-8 w-8 text-brand-yellow" />}
            title="Curriculum Tracking"
            description="Monitor your progress from beginner 'Tezkar' to advanced 'Mezmur' styles."
          />
          <FeatureItem 
            icon={<BookOpen className="h-8 w-8 text-brand-yellow" />}
            title="Digital Library"
            description="Access exclusive recordings, historical manuscripts, and practice materials."
          />
        </div>
      </div>
    </section>
  )
}

const FeatureItem = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <motion.div 
    whileHover={{ y: -10 }}
    className="border-t border-white/10 pt-8"
  >
    <div className="mb-6">{icon}</div>
    <h3 className="text-2xl font-serif font-bold mb-4">{title}</h3>
    <p className="text-white/60 leading-relaxed">
      {description}
    </p>
  </motion.div>
)

const Testimonial = () => (
  <section className="py-32 bg-white">
    <div className="container px-4 text-center">
      <Quote className="h-16 w-16 text-brand-grey/5 mx-auto mb-8" />
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
      >
        <p className="text-3xl md:text-5xl font-serif italic text-brand-grey mb-12 max-w-4xl mx-auto leading-tight">
          "The Begena is not just an instrument; it is a conversation with the divine. Abel Begena School provides the perfect bridge between this ancient tradition and our modern lives."
        </p>
        <div className="flex items-center justify-center gap-4">
          <div className="h-12 w-12 rounded-full bg-brand-yellow/10 flex items-center justify-center">
            <Users className="h-6 w-6 text-brand-yellow-dark" />
          </div>
          <div className="text-left">
            <p className="font-bold text-brand-grey">Dr. Melaku Belay</p>
            <p className="text-brand-grey/50 text-sm">Cultural Historian</p>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
)

const Footer = () => (
  <footer className="bg-brand-grey text-white py-24 border-t border-brand-yellow/20">
    <div className="container px-4 grid grid-cols-1 md:grid-cols-4 gap-16">
      <div className="col-span-1 md:col-span-2">
        <div className="flex items-center gap-4 mb-8">
          <img src="/images/logo.png" alt="Logo" className="h-12 w-auto object-contain" />
          <span className="text-3xl md:text-4xl font-serif font-bold tracking-tight text-brand-yellow">Abel Begena</span>
        </div>
        <p className="text-white/60 text-lg max-w-md leading-relaxed">
          Dedicated to the preservation and teaching of the Ethiopian Begena. Join us in keeping this spiritual light alive.
        </p>
      </div>
      <div>
        <h4 className="text-brand-yellow font-bold mb-8 uppercase tracking-widest text-sm">Navigation</h4>
        <ul className="space-y-4 text-white/70">
          <li className="hover:text-brand-yellow transition-colors cursor-pointer">The Legend</li>
          <li className="hover:text-brand-yellow transition-colors cursor-pointer">Course Levels</li>
          <li className="hover:text-brand-yellow transition-colors cursor-pointer">Student Portal</li>
          <li className="hover:text-brand-yellow transition-colors cursor-pointer">Admissions</li>
        </ul>
      </div>
      <div>
        <h4 className="text-brand-yellow font-bold mb-8 uppercase tracking-widest text-sm">Connect</h4>
        <ul className="space-y-4 text-white/70">
          <li className="hover:text-brand-yellow transition-colors cursor-pointer">Instagram</li>
          <li className="hover:text-brand-yellow transition-colors cursor-pointer">YouTube</li>
          <li className="hover:text-brand-yellow transition-colors cursor-pointer">Email Us</li>
        </ul>
      </div>
    </div>
    <div className="container px-4 mt-24 pt-8 border-t border-white/5 text-center text-white/40 text-sm">
      © 2026 Abel Begena. All rights reserved. Preserving the Sound of King David.
    </div>
  </footer>
)

// --- Main Application ---

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-brand-grey font-sans selection:bg-brand-yellow/30">
      <AnimatePresence>
        <Navbar key="navbar" />
        <main>
          <Hero key="hero" />
          
          <AboutSection 
            key="about-1"
            subtitle="The Instrument of Kings"
            title="The Sacred Begena"
            content={`For over three thousand years, the Begena has echoed through the highlands of Ethiopia. Known as the Harp of David, this ten-stringed instrument is unique for its deep, buzzing resonance and its meditative spiritual power.

At Abel Begena, we believe this art form is a bridge to the past and a sanctuary for the future. Our school is dedicated to passing down the ancient 'Qene' and 'Zelesegna' styles to a new generation of masters.`}
          />

          <FeatureSection key="features" />

          <AboutSection 
            key="about-2"
            reverse
            subtitle="Expert Guidance"
            title="Learn from the Masters"
            content={`Our instructors are recognized keepers of the Begena tradition, having studied under the great masters of Ethiopia. 

We offer a structured path from basic string manipulation to complex spiritual compositions. Whether you are seeking a meditative hobby or a deep cultural dive, Abel Begena provides the professional environment you need to flourish.`}
          />

          <Testimonial key="testimonial" />

          <AboutSection 
            key="about-3"
            subtitle="The Philosophy of Sound"
            title="Silence & Resonance"
            content={`In the Ethiopian tradition, the Begena is the voice of humility. Its unique 'buzzing' sound, created by the careful placement of leather bridges, is designed to mimic the human voice in prayer.

At Abel Begena, we don't just teach the mechanics of the strings; we teach the philosophy of the space between notes. Our students learn to embrace the silence that precedes the sound, turning each practice session into a personal sanctuary.`}
          />

          <AboutSection 
            key="about-4"
            reverse
            subtitle="Ancient Curriculum"
            title="A Path of 10 Strings"
            content={`Our curriculum follows the centuries-old 'Zema' system. Each student begins with the foundational 'Yeres' techniques, slowly graduating to the complex polyphonic patterns of the masters.

1. Foundation: Mastering the 10 strings and the buzzing bridge.
2. Narrative: Learning the historical chants and poems.
3. Spiritual: Advancing to the meditative Zelesegna styles.
4. Mastery: Composing new pieces within the ancient framework.`}
          />

          <section className="py-32 bg-brand-grey text-white relative overflow-hidden">
            <motion.div 
              initial={{ opacity: 0, scale: 1.1 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 2 }}
              className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-10" 
            />
            <div className="container px-4 text-center relative z-10">
              <h2 className="text-4xl md:text-7xl font-serif font-bold mb-10 leading-tight">Begin Your <br/><span className="text-brand-yellow">Spiritual Masterpiece</span></h2>
              <p className="text-xl md:text-2xl text-white/80 mb-12 max-w-2xl mx-auto font-light">
                Enrollment for the 2026 Summer Session is now open. Seats are limited to maintain individual master-student interaction.
              </p>
              <Button size="lg" className="bg-brand-yellow hover:bg-brand-yellow-dark text-brand-grey font-bold px-12 h-20 text-xl rounded-full shadow-2xl transition-transform hover:scale-110 active:scale-95">
                Apply to the School
              </Button>
            </div>
          </section>
        </main>
        <Footer key="footer" />
      </AnimatePresence>
    </div>
  )
}
