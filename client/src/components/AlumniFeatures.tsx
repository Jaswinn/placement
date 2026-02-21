import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { UserPlus, CalendarDays, Search, ArrowLeft } from 'lucide-react'
import { apiRequest } from '../api'
import type { AuthResponse } from '../api'

interface FeatureProps {
    auth: AuthResponse
    overviewOnly?: boolean
    activeFeature?: string | null
    onSelect: (feature: string | null) => void
}

export default function AlumniFeatures({ auth, overviewOnly, activeFeature, onSelect }: FeatureProps) {
    if (overviewOnly) {
        return (
            <>
                <article className="card clickable-card" onClick={() => onSelect('referrals')}>
                    <UserPlus className="mb-4 text-blue-500" size={32} />
                    <h2>Job Referral Board</h2>
                    <p>Post openings from your company so juniors can discover and apply quickly.</p>
                    <p className="card-tag">Click to post jobs →</p>
                </article>
                <article className="card clickable-card" onClick={() => onSelect('mentorship')}>
                    <CalendarDays className="mb-4 text-indigo-500" size={32} />
                    <h2>Mentorship Slots</h2>
                    <p>Open time slots for mock interviews or career chats that students can book.</p>
                    <p className="card-tag">Click to manage slots →</p>
                </article>
                <article className="card clickable-card" onClick={() => onSelect('all-jobs')}>
                    <Search className="mb-4 text-emerald-500" size={32} />
                    <h2>View All Job Referrals</h2>
                    <p>Browse all job openings posted by alumni for students.</p>
                    <p className="card-tag">Click to browse →</p>
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

            {activeFeature === 'referrals' && <JobReferralForm auth={auth} />}
            {activeFeature === 'mentorship' && <MentorshipSlots auth={auth} />}
            {activeFeature === 'all-jobs' && <AllJobReferrals auth={auth} />}
        </div>
    )
}

function JobReferralForm({ }: { auth: AuthResponse }) {
    const [formData, setFormData] = useState({
        companyName: '',
        jobTitle: '',
        description: '',
        location: '',
        ctc: '',
        applyLink: '',
        expiryDate: ''
    })
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setMessage('')
        try {
            await apiRequest('/api/alumni/jobs', {
                method: 'POST',
                body: JSON.stringify(formData)
            })
            setMessage('Job referral posted successfully!')
            setFormData({
                companyName: '', jobTitle: '', description: '',
                location: '', ctc: '', applyLink: '', expiryDate: ''
            })
            setTimeout(() => setMessage(''), 3000)
        } catch (err: any) {
            setError(err.message)
        }
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2>Post Job Referral</h2>
            <p>Share job openings from your company</p>

            <form onSubmit={handleSubmit} className="resume-form mt-6 max-w-2xl">
                <div className="form-section">
                    <h3>Job Details</h3>
                    <div className="form-row">
                        <input
                            className="field" placeholder="Company Name *" required
                            value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                        />
                        <input
                            className="field" placeholder="Job Title *" required
                            value={formData.jobTitle} onChange={e => setFormData({ ...formData, jobTitle: e.target.value })}
                        />
                    </div>
                    <textarea
                        className="field textarea mt-4" placeholder="Job Description"
                        value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                    <div className="form-row mt-4">
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
                        type="url" className="field mt-4" placeholder="Application Link (optional)"
                        value={formData.applyLink} onChange={e => setFormData({ ...formData, applyLink: e.target.value })}
                    />
                </div>

                <button type="submit" className="primary-button mt-6">🚀 Post Job Referral</button>
                {error && <p className="error-text mt-4">{error}</p>}
                {message && <p className="success-text mt-4">{message}</p>}
            </form>
        </motion.div>
    )
}

function MentorshipSlots({ }: { auth: AuthResponse }) {
    const [formData, setFormData] = useState({
        slotStart: '',
        slotEnd: '',
        maxStudents: 1,
        description: ''
    })
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setMessage('')
        try {
            await apiRequest('/api/alumni/mentorship-slots', {
                method: 'POST',
                body: JSON.stringify(formData)
            })
            setMessage('Mentorship slot created successfully!')
            setFormData({
                slotStart: '', slotEnd: '', maxStudents: 1, description: ''
            })
            setTimeout(() => setMessage(''), 3000)
        } catch (err: any) {
            setError(err.message)
        }
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2>Mentorship Slots</h2>
            <p>Create time slots for students to book</p>

            <form onSubmit={handleSubmit} className="resume-form mt-6 max-w-2xl">
                <div className="form-section">
                    <h3>Create New Slot</h3>
                    <div className="form-row">
                        <input
                            type="datetime-local" className="field" required
                            value={formData.slotStart} onChange={e => setFormData({ ...formData, slotStart: e.target.value })}
                        />
                        <input
                            type="datetime-local" className="field" required
                            value={formData.slotEnd} onChange={e => setFormData({ ...formData, slotEnd: e.target.value })}
                        />
                    </div>
                    <input
                        type="number" className="field mt-4" placeholder="Max Students (default 1)" min="1"
                        value={formData.maxStudents} onChange={e => setFormData({ ...formData, maxStudents: parseInt(e.target.value) })}
                    />
                    <textarea
                        className="field textarea mt-4" placeholder="Description / Agenda"
                        value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>

                <button type="submit" className="primary-button mt-6">📅 Create Slot</button>
                {error && <p className="error-text mt-4">{error}</p>}
                {message && <p className="success-text mt-4">{message}</p>}
            </form>
        </motion.div>
    )
}

function AllJobReferrals({ }: { auth: AuthResponse }) {
    const [jobs, setJobs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        apiRequest('/api/jobs')
            .then((data: any) => setJobs(data.jobs || []))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <div>Loading jobs...</div>

    if (jobs.length === 0) {
        return <div className="empty-state">No job referrals available yet.</div>
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2>All Job Referrals</h2>
            <div className="grid mt-6">
                {jobs.map(job => (
                    <article key={job.id} className="drive-card">
                        <div className="drive-header">
                            <h3>{job.companyName}</h3>
                        </div>
                        <p className="role-title">{job.jobTitle}</p>
                        <p className="text-sm opacity-70">Posted by {job.alumniName}</p>

                        <div className="drive-details mt-4 text-sm opacity-80">
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
