import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import Jobs from "./components/pages/Jobs";
import Auth from "./components/pages/Auth";
import Dashboard from "./components/pages/Dashboard";
import PostJob from "./components/pages/PostJob";
import MyApplications from "./components/pages/MyApplications";
import Profile from "./components/pages/Profile";

export default function App() {
  const location = useLocation();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });

  return (
    <div className="app-shell">
      <motion.div
        style={{ scaleX }}
        className="fixed inset-x-0 top-0 z-[150] h-[3px] origin-left bg-gradient-to-r from-brand-400 via-brand-500 to-brand-300"
      />
      <Navbar />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
        >
          <Routes location={location}>
            <Route path="/" element={<Jobs />} />
            <Route path="/login" element={<Auth mode="login" />} />
            <Route path="/register" element={<Auth mode="register" />} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/applications" element={<ProtectedRoute role="seeker"><MyApplications /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute role="recruiter"><Dashboard /></ProtectedRoute>} />
            <Route path="/post" element={<ProtectedRoute role="recruiter"><PostJob /></ProtectedRoute>} />
            <Route path="*" element={<Jobs />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}