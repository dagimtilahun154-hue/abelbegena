import { Link } from "react-router-dom"
import { useLanguage } from "@/contexts/LanguageContext"

export default function Footer() {
  const { t } = useLanguage()
  return (
    <footer className="bg-brand-grey text-white py-24 border-t border-brand-yellow/20">
      <div className="container px-4 grid grid-cols-1 md:grid-cols-4 gap-16">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-4 mb-8">
            <div className="h-14 w-14 rounded-full bg-brand-yellow flex items-center justify-center shrink-0">
              <img src="/images/logo.png" alt="Logo" className="h-10 w-10 object-contain" />
            </div>
            <span className="text-3xl md:text-4xl font-serif font-bold tracking-tight text-brand-yellow">Abel Begena</span>
          </div>
          <p className="text-white/60 text-lg max-w-md leading-relaxed">
            {t('footer.description')}
          </p>
        </div>
        <div>
          <h4 className="text-brand-yellow font-bold mb-8 uppercase tracking-widest text-sm">{t('footer.navigation')}</h4>
          <ul className="space-y-4 text-white/70">
            <li><Link to="/" className="hover:text-brand-yellow transition-colors">The Legend</Link></li>
            <li><Link to="/courses" className="hover:text-brand-yellow transition-colors">Course Levels</Link></li>
            <li><Link to="/auth" className="hover:text-brand-yellow transition-colors">Student Portal</Link></li>
            <li><Link to="/contact" className="hover:text-brand-yellow transition-colors">Connect</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-brand-yellow font-bold mb-8 uppercase tracking-widest text-sm">{t('footer.connect')}</h4>
          <ul className="space-y-4 text-white/70">
            <li className="hover:text-brand-yellow transition-colors cursor-pointer">Instagram</li>
            <li className="hover:text-brand-yellow transition-colors cursor-pointer">YouTube</li>
            <li><Link to="/contact" className="hover:text-brand-yellow transition-colors">Email Us</Link></li>
          </ul>
        </div>
      </div>
      <div className="container px-4 mt-24 pt-8 border-t border-white/5 text-center text-white/40 text-sm">
        {t('footer.rights')}
      </div>
    </footer>
  )
}
