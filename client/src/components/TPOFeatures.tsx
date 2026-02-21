import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings, Briefcase, CalendarClock, ArrowLeft } from 'lucide-react'
import { apiRequest } from '../api'
import type { AuthResponse } from '../api'

interface FeatureProps {
    auth: AuthResponse
    overviewOnly?: boolean
    activeFeature?: string | null
    onSelect: (feature: string | null) => void
}

export default function TPOFeatures({ auth, overviewOnly, activeFeature, onSelect }: FeatureProps) {
    if (overviewOnly) {
        return (
            <>
                <article className="card clickable-card" onClick={() => onSelect('criteria')}>
                    <Settings className="mb-4 text-blue-500" size={32} />
                    <h2>Criteria Engine</h2>
                    <p>Define drives with CGPA, backlog, and branch filters.</p>
                    <p className="card-tag">Click to create drives →</p>
                </article>
                <article className="card clickable-card" onClick={() => onSelect('management')}>
                    <Briefcase className="mb-4 text-indigo-500" size={32} />
                    <h2>Drive Management</h2>
                    <p>View all drives and see eligible student lists.</p>
                    <p className="card-tag">Click to manage drives →</p>
                </article>
                <article className="card clickable-card" onClick={() => onSelect('scheduler')}>
                    <CalendarClock className="mb-4 text-emerald-500" size={32} />
                    <h2>Interview Scheduler</h2>
                    <p>Assign interview slots to students seamlessly.</p>
                    <p className="card-tag">Click to schedule interviews →</p>
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

            {activeFeature === 'criteria' && <CriteriaEngine auth={auth} />}
            {activeFeature === 'management' && <DriveManagement auth={auth} />}
            {activeFeature === 'scheduler' && <InterviewScheduler auth={auth} />}
        </div>
    )
}

function CriteriaEngine({ }: { auth: AuthResponse }) {
    const [formData, setFormData] = useState({
        companyName: '',
        roleTitle: '',
        description: '',
        minCgpa: '',
        maxBacklogs: '',
        allowedBranches: '',
        location: '',
        ctc: '',
        applicationDeadline: ''
    })
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setMessage('')
        try {
            await apiRequest('/api/tpo/drives', {
                method: 'POST',
                body: JSON.stringify({
                    ...formData,
                    allowedBranches: formData.allowedBranches.split(',').map(b => b.trim()).filter(b => b)
                })
            })
            setMessage('Drive created successfully!')
            setFormData({
                companyName: '', roleTitle: '', description: '', minCgpa: '', maxBacklogs: '',
                allowedBranches: '', location: '', ctc: '', applicationDeadline: ''
            })
            setTimeout(() => setMessage(''), 3000)
        } catch (err: any) {
            setError(err.message)
        }
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h2>Criteria Engine</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Create new placement drives with eligibility criteria</p>
            </div>

            <form onSubmit={handleSubmit} className="resume-form" style={{ width: '100%' }}>
                <div className="form-section">
                    <h3>Create New Drive</h3>
                    <div className="form-row">
                        <input
                            className="field" placeholder="Company Name *" required
                            value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                        />
                        <input
                            className="field" placeholder="Role Title"
                            value={formData.roleTitle} onChange={e => setFormData({ ...formData, roleTitle: e.target.value })}
                        />
                    </div>
                    <textarea
                        className="field textarea mt-4" placeholder="Description"
                        value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>

                <div className="form-section">
                    <h3>Eligibility Requirements</h3>
                    <div className="form-row">
                        <input
                            type="number" className="field" step="0.01" min="0" max="10" placeholder="Min CGPA *" required
                            value={formData.minCgpa} onChange={e => setFormData({ ...formData, minCgpa: e.target.value })}
                        />
                        <input
                            type="number" className="field" min="0" placeholder="Max Backlogs *" required
                            value={formData.maxBacklogs} onChange={e => setFormData({ ...formData, maxBacklogs: e.target.value })}
                        />
                    </div>
                    <input
                        className="field mt-4" placeholder="Allowed Branches (comma separated, leave empty for all)"
                        value={formData.allowedBranches} onChange={e => setFormData({ ...formData, allowedBranches: e.target.value })}
                    />
                </div>

                <div className="form-section">
                    <h3>Job Details</h3>
                    <div className="form-row">
                        <input
                            className="field" placeholder="Location"
                            value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })}
                        />
                        <input
                            className="field" placeholder="CTC Package"
                            value={formData.ctc} onChange={e => setFormData({ ...formData, ctc: e.target.value })}
                        />
                    </div>
                    <input
                        type="date" className="field mt-4" placeholder="Deadline"
                        value={formData.applicationDeadline} onChange={e => setFormData({ ...formData, applicationDeadline: e.target.value })}
                    />
                </div>

                <button type="submit" className="primary-button mt-6">✨ Create Drive</button>
                {error && <p className="error-text mt-4">{error}</p>}
                {message && <p className="success-text mt-4">{message}</p>}
            </form>
        </motion.div>
    )
}

function DriveManagement({ }: { auth: AuthResponse }) {
    const [drives, setDrives] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedDrive, setSelectedDrive] = useState<any | null>(null)
    const [eligibleStudents, setEligibleStudents] = useState<any[]>([])
    const [notifying, setNotifying] = useState(false)
    const [notifyMessage, setNotifyMessage] = useState('')

    useEffect(() => {
        apiRequest('/api/tpo/drives')
            .then((data: any) => setDrives(data || []))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <div>Loading...</div>

    if (drives.length === 0) {
        return <div className="empty-state">No drives created yet.</div>
    }

    const loadEligibleStudents = async (drive: any) => {
        try {
            const data: any = await apiRequest(`/api/tpo/drives/${drive.id}/eligible-students`)
            setEligibleStudents(data.eligibleStudents || [])
            setSelectedDrive(drive)
            setNotifyMessage('')
        } catch (err: any) {
            alert('Failed to load eligible students: ' + err.message)
        }
    }

    const notifyAllEligible = async () => {
        if (!selectedDrive || eligibleStudents.length === 0) return
        setNotifying(true)
        try {
            const data: any = await apiRequest(`/api/tpo/drives/${selectedDrive.id}/notify`, {
                method: 'POST',
                body: JSON.stringify({ studentIds: eligibleStudents.map(s => s.userId) })
            })
            setNotifyMessage(data.message)
        } catch (err: any) {
            alert('Failed to notify: ' + err.message)
        } finally {
            setNotifying(false)
        }
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h2>Drive Management</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Manage active placement drives and view eligible students.</p>
            </div>
            <div className="grid mt-6">
                {drives.map(drive => (
                    <article key={drive.id} className="drive-card">
                        <div className="drive-header">
                            <h3>{drive.companyName}</h3>
                            <span className={`status-badge status-${drive.status?.toLowerCase()}`}>{drive.status}</span>
                        </div>
                        {drive.roleTitle && <p className="role-title">{drive.roleTitle}</p>}

                        < div className="drive-details mt-4 text-sm opacity-80 space-y-2" >
                            <div><strong>Min CGPA:</strong> {drive.minCgpa}</div>
                            <div><strong>Max Backlogs:</strong> {drive.maxBacklogs}</div>
                            {drive.allowedBranches.length > 0 && <div><strong>Branches:</strong> {drive.allowedBranches.join(', ')}</div>}
                        </div>

                        <div className="mt-4 flex gap-2">
                            <button
                                className="secondary-button"
                                onClick={() => loadEligibleStudents(drive)}
                            >👥 View Eligible</button>
                        </div>
                    </article>
                ))}
            </div>

            {selectedDrive && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: '1rem'
                }}>
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        style={{ background: 'white', padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0 }}>{selectedDrive.companyName} Eligibility</h2>
                            <button onClick={() => setSelectedDrive(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-secondary)' }}>✕</button>
                        </div>

                        <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '1.1rem' }}>
                                <span style={{ color: 'var(--accent-color)', fontSize: '1.4rem' }}>{eligibleStudents.length}</span> Students Eligible
                            </p>
                            <button className="primary-button" onClick={notifyAllEligible} disabled={notifying || eligibleStudents.length === 0} style={{ padding: '0.6rem 1rem' }}>
                                {notifying ? 'Sending...' : '📢 Notify All Eligible'}
                            </button>
                        </div>

                        {notifyMessage && (
                            <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', color: '#059669', borderRadius: '0.5rem', marginBottom: '1.5rem', fontWeight: 500, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                ✓ {notifyMessage}
                            </div>
                        )}

                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '0.25rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                <span>Name</span>
                                <span>Branch</span>
                                <span>CGPA</span>
                                <span>Backlogs</span>
                            </div>
                            {eligibleStudents.map((student, idx) => (
                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 500 }}>{student.name}</span>
                                    <span>{student.branch?.substring(0, 15) || 'N/A'}</span>
                                    <span>{student.cgpa.toFixed(2)}</span>
                                    <span>{student.currentBacklogs}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            )}
        </motion.div>
    )
}

function InterviewScheduler({ }: { auth: AuthResponse }) {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h2>Interview Scheduler</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Manage and assign interview time slots.</p>
            </div>
            <div className="scheduler-placeholder p-8 bg-gray-900 border border-gray-800 rounded-xl" style={{ textAlign: 'center' }}>
                <p className="text-lg">Interview Scheduler coming soon!</p>
                <p className="opacity-70 mt-2">This module will include drag-and-drop calendar interface, slot logic, and conflict detection.</p>
            </div>
        </motion.div>
    )
}
