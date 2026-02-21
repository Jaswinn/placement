import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FileText, Briefcase, LayoutList, Calendar, Users, ArrowLeft } from 'lucide-react'
import { apiRequest } from '../api'
import type { AuthResponse } from '../api'

interface FeatureProps {
    auth: AuthResponse
    overviewOnly?: boolean
    activeFeature?: string | null
    onSelect: (feature: string | null) => void
}

export default function StudentFeatures({ auth, overviewOnly, activeFeature, onSelect }: FeatureProps) {
    if (overviewOnly) {
        return (
            <>
                <article className="card clickable-card" onClick={() => onSelect('resume')}>
                    <FileText className="mb-4 text-blue-500" size={32} />
                    <h2>Resume Wizard</h2>
                    <p>Fill in your projects, skills, and academics to generate a standardized resume PDF.</p>
                    <p className="card-tag">Click to build your resume →</p>
                </article>
                <article className="card clickable-card" onClick={() => onSelect('drives')}>
                    <Briefcase className="mb-4 text-indigo-500" size={32} />
                    <h2>Live Eligible Drives</h2>
                    <p>See only the companies and drives where you meet the criteria.</p>
                    <p className="card-tag">Click to view drives →</p>
                </article>
                <article className="card clickable-card" onClick={() => onSelect('applications')}>
                    <LayoutList className="mb-4 text-emerald-500" size={32} />
                    <h2>Application Tracker</h2>
                    <p>Track the status of all your applications and interviews.</p>
                    <p className="card-tag">Click to view applications →</p>
                </article>
                <article className="card clickable-card" onClick={() => onSelect('mentorship')}>
                    <Calendar className="mb-4 text-purple-500" size={32} />
                    <h2>Mentorship Sessions</h2>
                    <p>Book mentorship slots with alumni for mock interviews and guidance.</p>
                    <p className="card-tag">Click to browse slots →</p>
                </article>
                <article className="card clickable-card" onClick={() => onSelect('jobs')}>
                    <Users className="mb-4 text-orange-500" size={32} />
                    <h2>Alumni Job Referrals</h2>
                    <p>Browse job openings posted by alumni from their companies.</p>
                    <p className="card-tag">Click to view jobs →</p>
                </article>
            </>
        )
    }

    return (
        <div className="feature-container">
            <div className="feature-header">
                <button onClick={() => onSelect(null)} className="back-button">
                    <ArrowLeft size={16} /> Back to Dashboard
                </button>
            </div>

            {activeFeature === 'resume' && <ResumeWizard auth={auth} />}
            {activeFeature === 'drives' && <EligibleDrives auth={auth} />}
            {activeFeature === 'applications' && <Applications auth={auth} />}
            {activeFeature === 'mentorship' && <MentorshipBooking auth={auth} />}
            {activeFeature === 'jobs' && <JobReferrals auth={auth} />}
        </div>
    )
}

function ResumeWizard({ auth }: { auth: AuthResponse }) {
    const [profile, setProfile] = useState<any>(null)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')

    useEffect(() => {
        apiRequest('/api/students/profile').then(data => setProfile(data)).catch(console.error)
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            await apiRequest('/api/students/profile', {
                method: 'PUT',
                body: JSON.stringify(profile)
            })
            setMessage('Profile saved successfully!')
            setTimeout(() => setMessage(''), 3000)
        } catch (err) {
            alert('Failed to save')
        } finally {
            setSaving(false)
        }
    }

    const handleGeneratePDF = () => {
        window.print()
    }

    if (!profile) return <div>Loading...</div>

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="resume-wizard">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h2>Resume Wizard</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Complete your profile to generate a professional, ATS-friendly resume.</p>
                </div>
                <button type="button" className="primary-button" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', padding: '0.6rem 1.2rem' }} onClick={handleGeneratePDF}>
                    📄 Export PDF
                </button>
            </div>

            <form onSubmit={handleSubmit} className="resume-form" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
                <div className="form-section" style={{ margin: 0 }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={18} /> Education Details</h3>
                    <div className="form-row" style={{ flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Branch / Major</label>
                            <input
                                type="text" className="field" placeholder="e.g., Computer Science"
                                value={profile.branch || ''} onChange={e => setProfile({ ...profile, branch: e.target.value })}
                                required
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>CGPA (Out of 10)</label>
                                <input
                                    type="number" className="field" placeholder="0.00" step="0.01" min="0" max="10"
                                    value={profile.cgpa || ''} onChange={e => setProfile({ ...profile, cgpa: parseFloat(e.target.value) })}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Current Backlogs</label>
                                <input
                                    type="number" className="field" placeholder="0" min="0"
                                    value={profile.currentBacklogs ?? ''} onChange={e => setProfile({ ...profile, currentBacklogs: parseInt(e.target.value) })}
                                    required
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="form-section" style={{ margin: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Briefcase size={18} /> Professional Skills</h3>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Core Competencies (Comma separated)</label>
                    <textarea
                        className="field textarea" placeholder="e.g., React, Node.js, Python, System Design, Data Structures" style={{ flex: 1, minHeight: '120px' }}
                        value={(profile.skills || []).join(', ')}
                        onChange={e => setProfile({ ...profile, skills: e.target.value.split(',').map((s: string) => s.trim()) })}
                    />
                </div>

                <div className="form-section" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={18} /> Work Experience</h3>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Summary of internships or part-time roles</label>
                    <textarea
                        className="field textarea" placeholder="Include Company Name, Role, Duration, and Key Achievements..." style={{ flex: 1, minHeight: '160px' }}
                        value={profile.experience || ''}
                        onChange={e => setProfile({ ...profile, experience: e.target.value })}
                    />
                </div>

                <div className="form-section" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><LayoutList size={18} /> Key Projects</h3>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Detail 1-2 significant technical projects</label>
                    <textarea
                        className="field textarea" placeholder="Project Name, Technologies Used, and Your Contribution/Impact..." style={{ flex: 1, minHeight: '160px' }}
                        value={profile.projects || ''}
                        onChange={e => setProfile({ ...profile, projects: e.target.value })}
                    />
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                    {message && <span className="success-text" style={{ margin: 0, fontWeight: 500 }}>{message}</span>}
                    <button type="submit" className="primary-button" disabled={saving}>
                        {saving ? 'Saving...' : '💾 Save Changes'}
                    </button>
                </div>
            </form>

            {/* Hidden printable resume template */}
            <div className="printable-resume-wrapper" style={{ display: 'none' }}>
                <div className="print-document">
                    <h1>{auth.user.name}</h1>
                    <p>{auth.user.email} | Student Role</p>

                    <h3>Academic Information</h3>
                    <p><strong>Branch:</strong> {profile.branch || 'Not specified'}</p>
                    <p><strong>CGPA:</strong> {profile.cgpa ? profile.cgpa.toFixed(2) : 'N/A'}</p>
                    <p><strong>Current Backlogs:</strong> {profile.currentBacklogs ?? '0'}</p>

                    <h3>Skills</h3>
                    <div>
                        {(profile.skills && profile.skills.length > 0) ? profile.skills.map((skill: string, index: number) => (
                            <span key={index} className="skill-pill">{skill}</span>
                        )) : <p>No skills listed.</p>}
                    </div>

                    <h3>Work Experience</h3>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{profile.experience || 'No work experience listed.'}</p>

                    <h3>Projects</h3>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{profile.projects || 'No projects listed.'}</p>
                </div>
            </div>
        </motion.div>
    )
}

function EligibleDrives(_props: { auth: AuthResponse }) {
    const [drives, setDrives] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const loadDrives = () => {
        apiRequest('/api/students/eligible-drives')
            .then((data: any) => setDrives(data.drives || []))
            .catch(console.error)
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        loadDrives()
    }, [])

    const apply = async (id: number) => {
        try {
            await apiRequest(`/api/students/drives/${id}/apply`, { method: 'POST' })
            loadDrives()
        } catch (err: any) {
            alert(err.message)
        }
    }

    if (loading) return <div>Loading...</div>
    if (drives.length === 0) return <div className="empty-state">No eligible drives. Ensure profile is complete.</div>

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2>Live Eligible Drives</h2>
            <div className="grid mt-6">
                {drives.map(drive => (
                    <article key={drive.id} className="drive-card">
                        <h3>{drive.companyName}</h3>
                        {drive.roleTitle && <span className="role-badge">{drive.roleTitle}</span>}
                        <div className="drive-details mt-4">
                            {drive.ctc && <div><strong>CTC:</strong> {drive.ctc}</div>}
                            <div><strong>Min CGPA:</strong> {drive.minCgpa}</div>
                        </div>
                        <div className="mt-4">
                            {drive.hasApplied ? (
                                <span className={`status-badge status-${drive.applicationStatus?.toLowerCase()}`}>{drive.applicationStatus}</span>
                            ) : (
                                <button className="apply-button" onClick={() => apply(drive.id)}>✨ Apply Now</button>
                            )}
                        </div>
                    </article>
                ))}
            </div>
        </motion.div>
    )
}

function Applications(_props: { auth: AuthResponse }) {
    const [apps, setApps] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        apiRequest('/api/students/applications')
            .then((data: any) => setApps(data.applications || []))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <div>Loading...</div>
    if (apps.length === 0) return <div className="empty-state">You haven't applied to any drives.</div>

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2>Application Tracker</h2>
            <div className="grid mt-6">
                {apps.map(app => (
                    <article key={app.id} className="application-card">
                        <div className="application-header">
                            <h3>{app.drive?.companyName}</h3>
                            <span className={`status-badge status-${app.status?.toLowerCase()}`}>{app.status}</span>
                        </div>
                        <p className="role-title">{app.drive?.roleTitle}</p>
                        <div className="application-details mt-4">
                            <div><strong>Applied:</strong> {new Date(app.appliedAt).toLocaleDateString()}</div>
                        </div>
                    </article>
                ))}
            </div>
        </motion.div>
    )
}

function MentorshipBooking(_props: { auth: AuthResponse }) {
    const [slots, setSlots] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const loadSlots = () => {
        apiRequest('/api/mentorship/available-slots')
            .then((data: any) => setSlots(data.slots || []))
            .catch(console.error)
            .finally(() => setLoading(false))
    }

    useEffect(() => loadSlots(), [])

    const book = async (id: number) => {
        try {
            await apiRequest(`/api/mentorship/slots/${id}/book`, { method: 'POST' })
            loadSlots()
        } catch (err: any) {
            alert(err.message)
        }
    }

    if (loading) return <div>Loading...</div>
    if (slots.length === 0) return <div className="empty-state">No mentorship slots available.</div>

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2>Mentorship Sessions</h2>
            <div className="grid mt-6">
                {slots.map(slot => (
                    <article key={slot.id} className="drive-card">
                        <div className="drive-header">
                            <h3>{slot.alumniName}</h3>
                        </div>
                        <p className="drive-description">{slot.description}</p>
                        <div className="drive-details mt-4">
                            <div><strong>Start:</strong> {new Date(slot.slotStart).toLocaleString()}</div>
                            <div><strong>Available Spots:</strong> {slot.maxStudents - slot.currentBookings}</div>
                        </div>
                        <div className="mt-4">
                            <button className="apply-button" onClick={() => book(slot.id)}>📅 Book Slot</button>
                        </div>
                    </article>
                ))}
            </div>
        </motion.div>
    )
}

function JobReferrals(_props: { auth: AuthResponse }) {
    const [jobs, setJobs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        apiRequest('/api/jobs')
            .then((data: any) => setJobs(data.jobs || []))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <div>Loading...</div>
    if (jobs.length === 0) return <div className="empty-state">No job referrals available.</div>

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2>Job Referrals</h2>
            <div className="grid mt-6">
                {jobs.map(job => (
                    <article key={job.id} className="drive-card">
                        <h3>{job.companyName}</h3>
                        <p className="role-title">{job.jobTitle}</p>
                        <p className="text-sm opacity-70">Posted by {job.alumniName}</p>

                        <div className="drive-details mt-4">
                            {job.location && <div><strong>Location:</strong> {job.location}</div>}
                            {job.ctc && <div><strong>CTC:</strong> {job.ctc}</div>}
                        </div>
                        <div className="mt-4">
                            {job.applyLink ? (
                                <a href={job.applyLink} target="_blank" rel="noreferrer" className="apply-button inline-block text-center" style={{ textDecoration: 'none' }}>Apply Now</a>
                            ) : (
                                <span className="text-sm opacity-50">Contact alumni for details</span>
                            )}
                        </div>
                    </article>
                ))}
            </div>
        </motion.div>
    )
}
