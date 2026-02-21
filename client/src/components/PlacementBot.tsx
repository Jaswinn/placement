import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Bot, HelpCircle, Lightbulb } from 'lucide-react'

// FAQ Data
const faqs = [
    { q: "How do I apply for a placement drive?", a: "Go to 'Live Eligible Drives' and click 'Apply Now' on drives where you meet the criteria." },
    { q: "Can I update my resume after applying?", a: "Yes, you can update your profile in the 'Resume Wizard' anytime. Updates apply to future applications." },
    { q: "What is an ATS-friendly resume and why does it matter?", a: "An ATS (Applicant Tracking System) friendly resume uses clear formatting and keywords matching the job description to pass automated screening. Ensure you use standard section headers and avoid complex tables." },
    { q: "How are the technical rounds usually structured?", a: "Technical rounds often start with an online coding assessment (DSA & Logic), followed by 1-2 technical interviews focusing on Data Structures, algorithms, system design, and core CS subjects (OS, DBMS, CN)." },
    { q: "What is the typical CTC breakdown?", a: "CTC (Cost to Company) includes basic salary, HRA, PF contributions, and sometimes one-time sign-on bonuses or ESOPs. Always look at the Base Pay for a clearer picture of your monthly take-home." },
    { q: "How do I book a mentorship slot?", a: "Navigate to 'Mentorship Sessions' and select an available slot from an alumni." },
    { q: "How can alumni referrals help my application?", a: "Alumni referrals often bypass the initial resume screening phase. Reach out to your seniors via the Alumni Portal politely, and ensure your profile matches the role requirements." },
    { q: "What should I do if my application is rejected?", a: "Don't be discouraged! Review the feedback if provided, focus on improving your technical/soft skills, and consistently apply to other eligible drives." }
]

// Mock Interview Tips
const interviewTips = [
    "Master standard Data Structures (Arrays, Strings, Trees, Graphs) and Algorithm patterns.",
    "Think out loud during technical interviews. Interviewers care about your problem-solving approach as much as the final code.",
    "Practice common behavioral questions using the STAR method (Situation, Task, Action, Result).",
    "Prepare a solid 'Tell me about yourself' pitch covering your education, key projects, and career goals.",
    "Always read the company's recent news, products, or engineering blogs to show genuine interest.",
    "Dress professionally and ensure a quiet background with a stable internet connection if the interview is online.",
    "Review your projects and be ready to comprehensively explain your specific technical contributions."
]

interface Message {
    id: number
    type: 'user' | 'bot'
    text: string
}

export default function PlacementBot() {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([
        { id: 1, type: 'bot', text: 'Hi there! I am your Placement Bot. How can I help you today?' }
    ])
    const [inputValue, setInputValue] = useState('')
    const [activeTab, setActiveTab] = useState<'chat' | 'faq' | 'tips'>('chat')
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        if (isOpen && activeTab === 'chat') {
            scrollToBottom()
        }
    }, [messages, isOpen, activeTab])

    const handleSend = () => {
        if (!inputValue.trim()) return

        const userMsg: Message = { id: Date.now(), type: 'user', text: inputValue }
        setMessages(prev => [...prev, userMsg])
        setInputValue('')

        // Simple bot response logic
        setTimeout(() => {
            let botReply = "I'm a simple Placement bot. Try checking the FAQ or Tips tab manually if I can't understand!"
            const lowerInput = inputValue.toLowerCase()

            if (lowerInput.includes('resume') || lowerInput.includes('ats')) {
                botReply = "You can build an ATS-friendly resume using the 'Resume Wizard'. Keep it clean and highlight your key skills!"
            } else if (lowerInput.includes('drive') || lowerInput.includes('apply') || lowerInput.includes('job')) {
                botReply = "Check 'Live Eligible Drives' to see where you can apply based on your criteria. Make sure your profile is 100% complete."
            } else if (lowerInput.includes('interview') || lowerInput.includes('technical')) {
                botReply = "For interviews, prioritize DSA and core subjects. Check our Tips tab for actionable advice, or book an alumni mentorship session!"
            } else if (lowerInput.includes('salary') || lowerInput.includes('ctc') || lowerInput.includes('package')) {
                botReply = "CTC includes fixed and variable components. Always evaluate the base pay to understand your monthly earnings."
            } else if (lowerInput.includes('alumni') || lowerInput.includes('referral') || lowerInput.includes('mentor')) {
                botReply = "Our Alumni Portal lets you request internal referrals and book 1-on-1 mentorship slots for mock interviews."
            } else if (lowerInput.includes('hello') || lowerInput.includes('hi') || lowerInput.includes('hey')) {
                botReply = "Hello! I'm your virtual placement assistant! You can ask me about resumes, interviews, CTCs, or alumni networking."
            } else if (lowerInput.includes('thank')) {
                botReply = "You're very welcome! Keep pushing forward - you've got this!"
            }

            setMessages(prev => [...prev, { id: Date.now(), type: 'bot', text: botReply }])
        }, 800)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSend()
        }
    }

    return (
        <>
            {/* Floating Button */}
            <motion.button
                onClick={() => setIsOpen(true)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.5)',
                    border: 'none',
                    cursor: 'pointer',
                    zIndex: 1000,
                    opacity: isOpen ? 0 : 1,
                    pointerEvents: isOpen ? 'none' : 'auto'
                }}
            >
                <MessageCircle size={28} />
            </motion.button>

            {/* Chatbot Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        key="chatbot-window"
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            position: 'fixed',
                            bottom: '2rem',
                            right: '2rem',
                            width: '350px',
                            height: '500px',
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                            border: '1px solid rgba(0,0,0,0.1)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            zIndex: 1001,
                            fontFamily: 'inherit'
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                            padding: '1rem',
                            color: 'white',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Bot size={24} />
                                <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>Placement Bot</span>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '0.25rem', display: 'flex' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                            <button
                                onClick={() => setActiveTab('chat')}
                                style={{ flex: 1, padding: '0.75rem', border: 'none', outline: 'none', background: activeTab === 'chat' ? 'white' : 'transparent', fontWeight: activeTab === 'chat' ? 600 : 400, color: activeTab === 'chat' ? '#3b82f6' : '#6b7280', borderBottom: activeTab === 'chat' ? '2px solid #3b82f6' : '2px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
                            >
                                <MessageCircle size={16} /> Chat
                            </button>
                            <button
                                onClick={() => setActiveTab('faq')}
                                style={{ flex: 1, padding: '0.75rem', border: 'none', outline: 'none', background: activeTab === 'faq' ? 'white' : 'transparent', fontWeight: activeTab === 'faq' ? 600 : 400, color: activeTab === 'faq' ? '#3b82f6' : '#6b7280', borderBottom: activeTab === 'faq' ? '2px solid #3b82f6' : '2px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
                            >
                                <HelpCircle size={16} /> FAQ
                            </button>
                            <button
                                onClick={() => setActiveTab('tips')}
                                style={{ flex: 1, padding: '0.75rem', border: 'none', outline: 'none', background: activeTab === 'tips' ? 'white' : 'transparent', fontWeight: activeTab === 'tips' ? 600 : 400, color: activeTab === 'tips' ? '#3b82f6' : '#6b7280', borderBottom: activeTab === 'tips' ? '2px solid #3b82f6' : '2px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
                            >
                                <Lightbulb size={16} /> Tips
                            </button>
                        </div>

                        {/* Content Area */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', backgroundColor: '#f9fafb', color: '#1f2937' }}>
                            {activeTab === 'chat' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {messages.map(msg => (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            key={msg.id}
                                            style={{
                                                alignSelf: msg.type === 'user' ? 'flex-end' : 'flex-start',
                                                maxWidth: '85%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: msg.type === 'user' ? 'flex-end' : 'flex-start'
                                            }}
                                        >
                                            <div style={{
                                                padding: '0.75rem 1rem',
                                                borderRadius: '16px',
                                                borderBottomRightRadius: msg.type === 'user' ? 0 : '16px',
                                                borderBottomLeftRadius: msg.type === 'bot' ? 0 : '16px',
                                                backgroundColor: msg.type === 'user' ? '#3b82f6' : '#ffffff',
                                                color: msg.type === 'user' ? 'white' : '#1f2937',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                border: msg.type === 'bot' ? '1px solid #e5e7eb' : 'none'
                                            }}>
                                                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.4' }}>{msg.text}</p>
                                            </div>
                                            <span style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.25rem', padding: '0 0.25rem' }}>
                                                {msg.type === 'user' ? 'You' : 'Bot'}
                                            </span>
                                        </motion.div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}

                            {activeTab === 'faq' && (
                                <motion.div
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
                                >
                                    {faqs.map((faq, idx) => (
                                        <div key={idx} style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                            <h4 style={{ margin: '0 0 0.5rem 0', color: '#3b82f6', fontSize: '0.95rem' }}>{faq.q}</h4>
                                            <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: '1.4', color: '#4b5563' }}>{faq.a}</p>
                                        </div>
                                    ))}
                                </motion.div>
                            )}

                            {activeTab === 'tips' && (
                                <motion.div
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
                                >
                                    <div style={{ background: 'linear-gradient(to bottom right, #eff6ff, #dbeafe)', padding: '1.25rem', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                                        <h3 style={{ margin: '0 0 1rem 0', color: '#1e3a8a', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Lightbulb size={20} className="text-blue-600" /> Mock Interview Tips
                                        </h3>
                                        <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.9rem', color: '#1e3a8a', lineHeight: '1.6' }}>
                                            {interviewTips.map((tip, idx) => (
                                                <li key={idx} style={{ marginBottom: '0.75rem' }}>{tip}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Input Area */}
                        {activeTab === 'chat' && (
                            <div style={{ padding: '1rem', borderTop: '1px solid #e5e7eb', backgroundColor: 'white', display: 'flex', gap: '0.5rem' }}>
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={e => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask anything..."
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem 1rem',
                                        borderRadius: '9999px',
                                        border: '1px solid #d1d5db',
                                        outline: 'none',
                                        fontSize: '0.9rem',
                                        fontFamily: 'inherit'
                                    }}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!inputValue.trim()}
                                    style={{
                                        width: '42px',
                                        height: '42px',
                                        borderRadius: '50%',
                                        backgroundColor: inputValue.trim() ? '#3b82f6' : '#9ca3af',
                                        color: 'white',
                                        border: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: inputValue.trim() ? 'pointer' : 'default',
                                        boxShadow: inputValue.trim() ? '0 2px 4px rgba(59, 130, 246, 0.3)' : 'none',
                                        transition: 'background-color 0.2s'
                                    }}
                                >
                                    <Send size={18} style={{ marginLeft: '-2px' }} />
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
