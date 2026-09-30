import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import CustomCursor from './components/CustomCursor';
import BackgroundGrid from './components/BackgroundGrid';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Toast from './components/Toast';
import RoleSelectionModal from './components/RoleSelectionModal';
import StudentRoute from './components/StudentRoute';

import LandingPage from './pages/LandingPage';
import CheckResultPage from './pages/CheckResultPage';
import ExplorePage from './pages/ExplorePage';
import CompanyProfilePage from './pages/CompanyProfilePage';
import CompanyRegisterPage from './pages/CompanyRegisterPage';
import ReportPage from './pages/ReportPage';
import ConnectionsPage from './pages/ConnectionsPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboard from './pages/AdminDashboard';
import NotFoundPage from './pages/NotFoundPage';
import StudentLoginPage from './pages/StudentLoginPage';
import StudentRegisterPage from './pages/StudentRegisterPage';
import StudentAccountPage from './pages/StudentAccountPage';

// Scroll to top component on route changes
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <AppProvider>
      <Router>
        <ScrollToTop />
        <div className="relative min-h-screen bg-pitch text-white flex flex-col font-sans selection:bg-neon-yellow selection:text-pitch">
          {/* Interactive Custom Ring Cursor */}
          <CustomCursor />

          {/* Canvas Technical Particle Background */}
          <BackgroundGrid />

          {/* Sticky Navigation Bar */}
          <Navbar />

          {/* Main Content Workspace */}
          <main className="flex-1 relative z-10">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/check" element={<CheckResultPage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/company/:id" element={<CompanyProfilePage />} />
              {/* Public company registration — reached from the first-visit
                  role modal's Company choice. */}
              <Route path="/register" element={<CompanyRegisterPage />} />
              <Route path="/report" element={<ReportPage />} />
              <Route path="/connections" element={<ConnectionsPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin" element={<AdminDashboard />} />
              {/* Optional student account. Public routes above stay ungated. */}
              <Route path="/student/login" element={<StudentLoginPage />} />
              <Route path="/student/register" element={<StudentRegisterPage />} />
              <Route
                path="/student"
                element={
                  <StudentRoute>
                    <StudentAccountPage />
                  </StudentRoute>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>

          {/* Technical Editorial Footer */}
          <Footer />

          {/* Global System Notifications */}
          <Toast />

          {/* First-visit role selection. Rendered here rather than inside a page
              because <main> is `relative z-10`, which would trap it beneath the
              sticky navbar. Self-gates on the landing page + first visit. */}
          <RoleSelectionModal />
        </div>
      </Router>
    </AppProvider>
  );
}
