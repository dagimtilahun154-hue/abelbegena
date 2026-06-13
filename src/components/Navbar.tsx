import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "@/components/ui/navigation-menu"
import { Link } from "react-router-dom"
import { useLanguage } from "@/contexts/LanguageContext"

const NavItem = ({ title, to, isScrolled }: { title: string, to: string, isScrolled: boolean }) => (
  <NavigationMenuItem>
    <NavigationMenuLink asChild className={`inline-flex h-9 items-center justify-center rounded-full border px-4 text-[11px] md:text-[12px] font-black leading-none tracking-wide shadow-sm backdrop-blur-md transition-all duration-500 ${
      isScrolled 
        ? "bg-white/55 border-white/50 text-brand-grey hover:bg-white hover:text-brand-grey" 
        : "bg-white/65 border-white/70 text-brand-grey hover:bg-brand-yellow hover:text-brand-grey"
    }`}>
      <Link to={to}>
        {title}
      </Link>
    </NavigationMenuLink>
  </NavigationMenuItem>
)

export default function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [langOpen, setLangOpen] = React.useState(false)
  const [isScrolled, setIsScrolled] = React.useState(false)
  const { t, language, setLanguage } = useLanguage()

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: "circOut" }}
      className="fixed top-0 left-0 right-0 z-50 bg-transparent border-transparent w-full"
    >
      <div className={`mx-auto flex items-center justify-between transition-all duration-700 ${
        isScrolled 
          ? `mx-4 sm:mx-8 xl:mx-auto mt-4 mb-[-10px] max-w-7xl bg-brand-yellow/90 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-brand-yellow/20 rounded-full h-16 px-6 lg:px-8`
          : `mx-0 mt-0 bg-transparent border-transparent rounded-none w-full h-16 md:h-24 px-4 container`
      }`}>
        <Link to="/" className={`flex items-center gap-4 py-2 transition-all duration-700 ${
          isScrolled 
            ? "bg-transparent px-2 md:px-4 rounded-full scale-95 ml-0" 
            : "bg-transparent px-4 md:px-6 rounded-full ml-0"
        }`}>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center bg-brand-yellow rounded-full p-2"
          >
            <img 
              src="/images/logo.png" 
              alt="Logo" 
              className={`w-auto object-contain transition-all duration-700 ${isScrolled ? "h-8 md:h-10" : "h-10 md:h-12"}`}
            />
          </motion.div>
          <div className="flex flex-col ml-2">
            <span className={`font-serif font-bold tracking-tight text-brand-grey leading-none transition-all duration-700 ${isScrolled ? "text-xs md:text-sm" : "text-sm md:text-base"}`}>Abel Begena</span>
            <span className={`font-sans font-bold uppercase tracking-[0.3em] text-brand-grey/60 mt-1 transition-all duration-700 ${isScrolled ? "text-[7px]" : "text-[8px]"}`}>{t('nav.schoolName')}</span>
          </div>
        </Link>
        
        <nav className="hidden lg:flex items-center gap-4 xl:gap-8">
          <NavigationMenu>
            <NavigationMenuList className="gap-2">
              <NavItem title={t('nav.heritage')} to="/" isScrolled={isScrolled} />
              <NavItem title={t('nav.courses')} to="/courses" isScrolled={isScrolled} />
              <NavItem title={t('nav.shop')} to="/shop" isScrolled={isScrolled} />
              <NavItem title={t('nav.contact')} to="/contact" isScrolled={isScrolled} />
            </NavigationMenuList>
          </NavigationMenu>
        </nav>

        <div className="flex items-center gap-2 xl:gap-4">
          <div className="hidden sm:flex items-center relative">
            <button 
              onClick={() => setLangOpen(!langOpen)}
              className={`flex items-center gap-1.5 transition-all duration-700 p-2 px-3 rounded-full font-bold border hover:scale-105 active:scale-95 ${
                isScrolled
                  ? "border-transparent text-brand-grey hover:bg-brand-yellow hover:text-brand-grey hover:shadow-md"
                  : "bg-white/50 backdrop-blur-sm border-white/30 text-brand-grey shadow-sm hover:bg-brand-yellow hover:border-brand-yellow hover:text-brand-grey hover:shadow-md"
              }`}
            >
              <Globe className="h-5 w-5" />
              <span className="text-xs">{language === 'en' ? 'EN' : 'አማ'}</span>
            </button>
            {langOpen && (
              <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-xl border border-brand-grey/10 overflow-hidden z-50 min-w-[120px]">
                <button 
                  onClick={() => { setLanguage('en'); setLangOpen(false); }}
                  className={`w-full px-4 py-3 text-sm font-bold text-left hover:bg-brand-yellow/20 transition-colors ${language === 'en' ? 'text-brand-grey bg-brand-yellow/10' : 'text-brand-grey/60'}`}
                >
                  🇬🇧 English
                </button>
                <button 
                  onClick={() => { setLanguage('am'); setLangOpen(false); }}
                  className={`w-full px-4 py-3 text-sm font-bold text-left hover:bg-brand-yellow/20 transition-colors font-['Noto_Sans_Ethiopic'] ${language === 'am' ? 'text-brand-grey bg-brand-yellow/10' : 'text-brand-grey/60'}`}
                >
                  🇪🇹 አማርኛ
                </button>
              </div>
            )}
          </div>
          
          <Link to="/auth">
            <Button variant="ghost" className={`hidden lg:flex text-[11px] md:text-[12px] font-black rounded-full transition-all duration-700 border hover:scale-105 active:scale-95 ${
              isScrolled 
                ? "border-transparent text-brand-grey hover:bg-brand-yellow hover:text-brand-grey hover:shadow-md"
                : "bg-transparent border-brand-grey/20 text-brand-grey hover:bg-brand-yellow hover:border-brand-yellow hover:text-brand-grey hover:shadow-md"
            }`}>{t('nav.login')}</Button>
          </Link>
          <Link to="/courses">
            <Button className={`hidden lg:flex bg-[#2C2C2C] hover:bg-[#1A1A1A] text-[#FFD700] border-none shadow-lg transition-all hover:scale-105 active:scale-95 text-[11px] md:text-[12px] font-black rounded-full ${isScrolled ? "px-5 h-9" : "px-6 md:px-8 h-9 md:h-11"}`}>
              {t('nav.beginJourney')}
            </Button>
          </Link>
          <button 
            className={`lg:hidden p-2 rounded-full transition-all duration-700 border ${isScrolled ? "border-transparent text-brand-grey hover:bg-white/40" : "bg-white/50 backdrop-blur-sm border-white/30 text-brand-grey shadow-sm hover:bg-white/70"}`}
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`lg:hidden bg-white/45 backdrop-blur-lg overflow-hidden border border-white/30 shadow-2xl ${isScrolled ? "rounded-[2rem] mx-4 mt-2" : "rounded-3xl mx-4 mt-2"}`}
          >
            <div className="flex flex-col py-6 gap-6 px-6">
              <div className="flex flex-col gap-3">
                <Link 
                  to="/" 
                  onClick={() => setIsOpen(false)} 
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/50 bg-white/55 backdrop-blur-md text-[11px] font-black leading-none tracking-wide text-brand-grey shadow-sm hover:bg-white hover:text-brand-yellow-dark transition-all"
                >
                  {t('nav.heritage')}
                </Link>
                <Link 
                  to="/courses" 
                  onClick={() => setIsOpen(false)} 
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/50 bg-white/55 backdrop-blur-md text-[11px] font-black leading-none tracking-wide text-brand-grey shadow-sm hover:bg-white hover:text-brand-yellow-dark transition-all"
                >
                  {t('nav.courses')}
                </Link>
                <Link 
                  to="/shop" 
                  onClick={() => setIsOpen(false)} 
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/50 bg-white/55 backdrop-blur-md text-[11px] font-black leading-none tracking-wide text-brand-grey shadow-sm hover:bg-white hover:text-brand-yellow-dark transition-all"
                >
                  {t('nav.shop')}
                </Link>
                <Link 
                  to="/contact" 
                  onClick={() => setIsOpen(false)} 
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/50 bg-white/55 backdrop-blur-md text-[11px] font-black leading-none tracking-wide text-brand-grey shadow-sm hover:bg-white hover:text-brand-yellow-dark transition-all"
                >
                  {t('nav.contact')}
                </Link>
              </div>
              <div className="flex flex-col gap-4 mt-2">
                <Link to="/auth" onClick={() => setIsOpen(false)} className="w-full">
                  <Button className="w-full bg-brand-yellow hover:bg-brand-yellow/80 text-brand-grey text-[11px] font-black py-4 h-auto rounded-full shadow-md border border-brand-yellow/20">
                    {t('nav.login')}
                  </Button>
                </Link>
                <Link to="/courses" onClick={() => setIsOpen(false)} className="w-full">
                  <Button className="w-full bg-brand-yellow hover:bg-brand-yellow/80 text-brand-grey text-[11px] font-black py-4 h-auto rounded-full shadow-md border border-brand-yellow/20">
                    {t('nav.beginJourney')}
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
