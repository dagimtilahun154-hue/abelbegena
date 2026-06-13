import React, { useState } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { Music, GraduationCap, Users, Calendar, ChevronRight, PlayCircle, BookOpen, Quote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/LanguageContext"
import { Link } from "react-router-dom"

const Hero = () => {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const { t } = useLanguage();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white pt-24">
      {/* Immersive Background Image with Parallax */}
      <motion.div 
        style={{ y: y1, opacity }}
        className="absolute -top-[20%] left-0 w-full h-[140%] z-0 flex items-center justify-center"
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
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-brand-grey leading-tight mb-8 tracking-tighter flex flex-col md:flex-row items-center justify-center gap-x-6">
            <span>{t('home.abel')}</span>
            <span className="italic">{t('home.begena')}</span>
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
            <Link to="/courses" className="w-full sm:w-auto">
              <Button size="lg" className="bg-brand-yellow hover:bg-brand-yellow-dark text-brand-grey px-8 sm:px-12 h-14 sm:h-16 text-lg sm:text-xl rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 font-bold uppercase tracking-wider w-full min-w-[200px] sm:min-w-[220px]">
                {t('nav.beginJourney')}
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-brand-grey text-brand-grey px-8 sm:px-12 h-14 sm:h-16 text-lg sm:text-xl rounded-full group hover:bg-brand-grey hover:text-white transition-all w-full sm:w-auto min-w-[200px] sm:min-w-[220px]">
              <PlayCircle className="mr-3 h-5 w-5 sm:h-6 sm:w-6 text-brand-yellow transition-transform group-hover:scale-110" />
              {t('home.listen')}
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
  reverse = false,
  collapsible = false
}: { 
  title: string, 
  subtitle: string, 
  content: string, 
  imageSrc?: string,
  reverse?: boolean,
  collapsible?: boolean
}) => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const displayContent = collapsible && !isExpanded 
    ? content.split('\n\n')[0] + '...' 
    : content;

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
              {displayContent}
            </p>
            {collapsible ? (
              <Button 
                variant="link" 
                className="text-brand-yellow-dark p-0 h-auto text-lg font-bold group"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? t('home.showLess') : t('home.readMore')}
                <ChevronRight className={`ml-1 h-5 w-5 transition-transform ${isExpanded ? '-rotate-90' : 'group-hover:translate-x-1'}`} />
              </Button>
            ) : (
              <Button variant="link" className="text-brand-yellow-dark p-0 h-auto text-lg font-bold group">
                {t('home.readMore')}
                <ChevronRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            )}
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2 }}
            className="flex-1 w-full"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl mb-12 border-8 border-white bg-brand-grey/5">
              {!imageSrc ? (
                <div className="flex items-center justify-center min-h-[500px]">
                  <Music className="h-32 w-32 text-brand-grey/10" />
                </div>
              ) : (
                <img
                  src={imageSrc}
                  alt={title}
                  className="w-full h-auto block hover:scale-105 transition-transform duration-700"
                />
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

const FeatureSection = () => {
  const { t } = useLanguage();
  return (
    <section className="py-32 bg-brand-grey text-white overflow-hidden">
      <div className="container px-4 relative">
        <div className="max-w-3xl mb-24">
          <h2 className="text-4xl md:text-6xl font-serif font-bold mb-8">{t('home.modernManagement')} <br/><span className="text-brand-yellow">{t('home.ancientHeritage')}</span></h2>
          <p className="text-xl text-white/70 font-light leading-relaxed">
            {t('home.modernDesc')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          <FeatureItem 
            icon={<Calendar className="h-8 w-8 text-brand-yellow" />}
            title={t('home.spiritualScheduling')}
            description={t('home.spiritualDesc')}
          />
          <FeatureItem 
            icon={<GraduationCap className="h-8 w-8 text-brand-yellow" />}
            title={t('home.curriculumTracking')}
            description={t('home.curriculumDesc')}
          />
          <FeatureItem 
            icon={<BookOpen className="h-8 w-8 text-brand-yellow" />}
            title={t('home.digitalLibrary')}
            description={t('home.libraryDesc')}
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

const Testimonial = () => {
  const { t } = useLanguage();
  return (
  <section className="py-32 bg-white">
    <div className="container px-4 text-center">
      <Quote className="h-16 w-16 text-brand-grey/5 mx-auto mb-8" />
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
      >
        <p className="text-3xl md:text-5xl font-serif italic text-brand-grey mb-12 max-w-4xl mx-auto leading-tight">
          {t('home.testimonialQuote')}
        </p>
        <div className="flex items-center justify-center gap-4">
          <div className="h-12 w-12 rounded-full bg-brand-yellow/10 flex items-center justify-center">
            <Users className="h-6 w-6 text-brand-yellow-dark" />
          </div>
          <div className="text-left">
            <p className="font-bold text-brand-grey">{t('home.testimonialAuthor')}</p>
            <p className="text-brand-grey/50 text-sm">{t('home.testimonialRole')}</p>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
  )
}

export default function LandingPage() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-white text-brand-grey font-sans selection:bg-brand-yellow/30">
      <main>
        <Hero key="hero" />
        
        <AboutSection 
          key="about-1"
          subtitle={t('home.instrumentOfKings')}
          title={t('home.sacredBegena')}
          imageSrc="/images/Sacred Begena.jpg"
          collapsible={true}
          content={t('home.sacredContent')}
        />

        <FeatureSection key="features" />

        <AboutSection 
          key="about-2"
          reverse
          subtitle={t('home.expertGuidance')}
          title={t('home.learnFromMasters')}
          imageSrc="/images/Masters.jpg"
          collapsible={true}
          content={t('home.mastersContent')}
        />

        <Testimonial key="testimonial" />

        <AboutSection 
          key="about-3"
          subtitle={t('home.philosophySubtitle')}
          title={t('home.philosophyTitle')}
          imageSrc="/images/Silence_Resonance.png"
          collapsible={true}
          content={t('home.philosophyContent')}
        />

        <AboutSection 
          key="about-4"
          reverse
          subtitle={t('home.ancientSubtitle')}
          title={t('home.ancientTitle')}
          imageSrc="/images/Path_of_10_Strings.png"
          collapsible={true}
          content={t('home.ancientContent')}
        />

        <AboutSection 
          key="about-5"
          subtitle={t('home.masinqoSubtitle')}
          title={t('home.masinqoTitle')}
          imageSrc="/images/masinqo.jpg"
          collapsible={true}
          content={t('home.masinqoContent')}
        />

        <AboutSection 
          key="about-6"
          reverse
          subtitle={t('home.washintSubtitle')}
          title={t('home.washintTitle')}
          imageSrc="/images/washint.png"
          collapsible={true}
          content={t('home.washintContent')}
        />

        <section className="py-32 bg-brand-grey text-white relative overflow-hidden">
          <motion.div 
            initial={{ opacity: 0, scale: 1.1 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 2 }}
            className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-10" 
          />
          <div className="container px-4 text-center relative z-10">
            <h2 className="text-3xl sm:text-4xl md:text-7xl font-serif font-bold mb-10 leading-tight">{t('home.beginSpiritual')} <br/><span className="text-brand-yellow">{t('home.masterpiece')}</span></h2>
            <p className="text-lg sm:text-xl md:text-2xl text-white/80 mb-12 max-w-2xl mx-auto font-light px-4">
              {t('home.enrollmentDesc')}
            </p>
            <Link to="/courses">
              <Button size="lg" className="bg-brand-yellow hover:bg-brand-yellow-dark text-brand-grey font-bold px-8 sm:px-12 h-16 sm:h-20 text-lg sm:text-xl rounded-full shadow-2xl transition-transform hover:scale-110 active:scale-95">
                {t('home.applySchool')}
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
