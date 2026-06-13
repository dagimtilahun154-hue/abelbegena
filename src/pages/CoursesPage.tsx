import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Music, Clock, BookOpen, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { backendApi } from "@/lib/backend"

type Course = {
  id: string
  title: string
  instrument: string
  level: string
  duration: string
  description: string
  lessons: number
}

const CourseCard = ({ course }: { course: Course }) => (
  <motion.div 
    whileHover={{ y: -10 }}
    className="bg-white rounded-3xl p-8 shadow-[0_20px_50px_rgba(44,44,44,0.05)] border border-brand-grey/5 hover:border-brand-yellow/50 transition-all group flex flex-col h-full"
  >
    <div className="flex justify-between items-start mb-6">
      <div className="p-4 bg-brand-yellow/10 rounded-2xl">
        <Music className="h-8 w-8 text-brand-yellow-dark" />
      </div>
      <span className="px-4 py-1 bg-brand-grey text-brand-yellow text-xs font-bold rounded-full uppercase tracking-widest">
        {course.level}
      </span>
    </div>
    <h3 className="text-2xl font-serif font-bold text-brand-grey mb-4">{course.title}</h3>
    <p className="text-brand-grey/60 mb-8 line-clamp-3 flex-grow">
      {course.description}
    </p>
    <div className="flex items-center gap-6 text-sm text-brand-grey/40 mb-8">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        {course.duration}
      </div>
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4" />
        {course.lessons} Lessons
      </div>
    </div>
    <Link to={`/register?instrument=${encodeURIComponent(course.instrument)}&level=${encodeURIComponent(course.level.toLowerCase())}`} className="w-full mt-auto block">
      <Button className="w-full bg-brand-grey hover:bg-brand-grey-dark text-brand-yellow rounded-xl py-6 font-bold group-hover:scale-105 transition-transform">
        Register Now
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </Link>
  </motion.div>
)

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const { programs } = await backendApi.listPublicTrainingPrograms()
        setCourses((programs || []).map((program: any) => ({
          id: String(program.id),
          title: program.name,
          instrument: program.instrumentFocus || "Begena",
          level: (program.skillLevel || "ALL_LEVELS").replace("_", " ").toLowerCase(),
          duration: `${program.durationMonths} months`,
          description: program.description || "A structured short-term music training path.",
          lessons: Math.max(1, Number(program.durationMonths || 3) * 4),
        })))
      } finally {
        setLoading(false)
      }
    }

    loadCourses()
  }, [])

  return (
    <div className="min-h-screen bg-white pt-32 pb-24">
      <div className="container px-4">
        <div className="max-w-3xl mb-24">
          <motion.span 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-brand-yellow-dark font-bold uppercase tracking-[0.3em] text-sm mb-4 block"
          >
            Our Curriculum
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl md:text-7xl font-serif font-bold text-brand-grey leading-tight mb-8"
          >
            A Path to <span className="italic text-brand-yellow-dark underline decoration-brand-yellow decoration-4 underline-offset-8">Mastery</span>
          </motion.h1>
          <p className="text-xl text-brand-grey/60 leading-relaxed font-light">
            From the foundational strings to the spiritual heights of Mezmur, our courses are designed to guide you through the 3,000-year-old tradition of the Begena.
          </p>
        </div>

        {loading ? (
          <div className="py-20 text-center text-brand-grey/40 font-medium">Loading courses...</div>
        ) : courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {courses.map((course) => <CourseCard key={course.id} course={course} />)}
          </div>
        ) : (
          <div className="py-20 text-center bg-slate-50 rounded-3xl border border-brand-grey/5">
            <h2 className="text-2xl font-serif font-bold text-brand-grey mb-2">No courses published yet</h2>
            <p className="text-brand-grey/50">Add active 3, 6, or 9 month programs in the backend admin panel to publish them here.</p>
          </div>
        )}
      </div>
    </div>
  )
}
