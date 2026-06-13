import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom"
import { LanguageProvider } from "./contexts/LanguageContext"
import { AnimatePresence } from "framer-motion"
import LandingPage from "./pages/LandingPage"
import CoursesPage from "./pages/CoursesPage"
import ContactPage from "./pages/ContactPage"
import AuthPage from "./pages/AuthPage"
import Dashboard from "./pages/Dashboard"
import AdminDashboard from "./pages/AdminDashboard"
import AdminAttendancePage from "./pages/AdminAttendancePage"
import AdminCoursesPage from "./pages/AdminCoursesPage"
import AdminFinancePage from "./pages/AdminFinancePage"
import AdminNotificationsPage from "./pages/AdminNotificationsPage"
import AdminInPersonRegistrationPage from "./pages/AdminInPersonRegistrationPage"
import AdminRegistrationsPage from "./pages/AdminRegistrationsPage"
import AdminShopPage from "./pages/AdminShopPage"
import AdminStudentsPage from "./pages/AdminStudentsPage"
import AdminStockPage from "./pages/AdminStockPage"
import AdminCurriculumPage from "./pages/AdminCurriculumPage"
import AdminReportsPage from "./pages/AdminReportsPage"
import AdminSettingsPage from "./pages/AdminSettingsPage"
import AdminUsersPage from "./pages/AdminUsersPage"
import EnrollmentPage from "./pages/EnrollmentPage"
import AttendanceTest from "./pages/AttendanceTest"
import RegistrationPage from "./pages/RegistrationPage"
import ShopPage from "./pages/ShopPage"
import NotificationsPage from "./pages/NotificationsPage"
import PasswordSetupPage from "./pages/PasswordSetupPage"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"

function AppContent() {
  const location = useLocation()
  const isDashboard = location.pathname.startsWith("/dashboard") || 
                      location.pathname.startsWith("/admin") ||
                      location.pathname.startsWith("/testattend")
  const isAuth = ["/auth", "/register", "/setup-password", "/reset-password"].includes(location.pathname)

  return (
    <div className="min-h-screen bg-white">
      {!isDashboard && !isAuth && <Navbar />}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/attendance" element={<AdminAttendancePage />} />
          <Route path="/admin/courses" element={<AdminCoursesPage />} />
          <Route path="/admin/finance" element={<AdminFinancePage />} />
          <Route path="/admin/shop" element={<AdminShopPage />} />
          <Route path="/admin/stock" element={<AdminStockPage />} />
          <Route path="/admin/curriculum" element={<AdminCurriculumPage />} />
          <Route path="/admin/reports" element={<AdminReportsPage />} />
          <Route path="/admin/settings" element={<AdminSettingsPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
          <Route path="/admin/in-person-registration" element={<AdminInPersonRegistrationPage />} />
          <Route path="/admin/registrations" element={<AdminRegistrationsPage />} />
          <Route path="/admin/students" element={<AdminStudentsPage />} />
          <Route path="/admin/enroll" element={<EnrollmentPage />} />
          <Route path="/testattend" element={<AttendanceTest />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/setup-password" element={<PasswordSetupPage />} />
          <Route path="/reset-password" element={<PasswordSetupPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Routes>
      </AnimatePresence>
      {!isDashboard && !isAuth && <Footer />}
    </div>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <Router>
        <AppContent />
      </Router>
    </LanguageProvider>
  )
}
