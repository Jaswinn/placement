import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AuthResponse } from '../api'
import { LogOut } from 'lucide-react'

import StudentFeatures from './StudentFeatures'
import TPOFeatures from './TPOFeatures'
import AlumniFeatures from './AlumniFeatures'

interface DashboardProps {
    auth: AuthResponse
    onLogout: () => void
}

export default function Dashboard({ auth, onLogout }: DashboardProps) {
    const { user } = auth
    const [activeFeature, setActiveFeature] = useState<string | null>(null)

    const roleTitle =
        user.role === 'TPO'
            ? 'TPO Admin Dashboard'
            : user.role === 'STUDENT'
                ? 'Student Dashboard'
                : 'Alumni Portal'

    const roleDescription =
        user.role === 'TPO'
            ? 'Control center for placement drives, eligibility criteria, and interview scheduling.'
            : user.role === 'STUDENT'
                ? 'View eligible drives, track your applications, and build your resume.'
                : 'Share job referrals and offer mentorship to your juniors.'

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="shell"
        >
            <header className="topbar">
                <div className="topbar-left">
                    <span className="brand">Placement Portal</span>
                    <span className="role-pill">{roleTitle}</span>
                </div>
                <div className="topbar-right">
                    <span className="user-label">{user.name || user.email}</span>
                    <button onClick={onLogout} className="ghost-button">
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </header>

            <main className="dashboard-main">
                <AnimatePresence mode="wait">
                    {!activeFeature ? (
                        <motion.div
                            key="overview"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <section className="hero">
                                <h1>{roleTitle}</h1>
                                <p>{roleDescription}</p>
                            </section>

                            <div id="dashboard-content" className="grid">
                                {user.role === 'STUDENT' && <StudentFeatures auth={auth} onSelect={setActiveFeature} overviewOnly />}
                                {user.role === 'TPO' && <TPOFeatures auth={auth} onSelect={setActiveFeature} overviewOnly />}
                                {user.role === 'ALUMNI' && <AlumniFeatures auth={auth} onSelect={setActiveFeature} overviewOnly />}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="feature"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            {user.role === 'STUDENT' && <StudentFeatures auth={auth} onSelect={setActiveFeature} activeFeature={activeFeature} />}
                            {user.role === 'TPO' && <TPOFeatures auth={auth} onSelect={setActiveFeature} activeFeature={activeFeature} />}
                            {user.role === 'ALUMNI' && <AlumniFeatures auth={auth} onSelect={setActiveFeature} activeFeature={activeFeature} />}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </motion.div>
    )
}
