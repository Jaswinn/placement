import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, PORT, ALLOWED_ORIGINS } from './config.js';
import { authRequired, requireRole } from './middleware/auth.js';

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// In-memory data stores. Replace with a real database later.
const users = [];
let nextUserId = 1;

// Student profiles: { userId, branch, cgpa, currentBacklogs, skills: [], projects: [], education: [] }
const studentProfiles = [];

// Seed 142 dummy students for testing the "Notify All Eligible" feature
for (let i = 1; i <= 142; i++) {
  const dummyUser = {
    id: nextUserId++,
    name: `Test Student ${i}`,
    email: `student${i}@example.com`,
    phone: '9876543210',
    passwordHash: 'dummy', // Not meant to actually log in for the demo
    role: 'STUDENT',
  };
  users.push(dummyUser);

  studentProfiles.push({
    userId: dummyUser.id,
    branch: i % 3 === 0 ? 'Electronics' : 'Computer Science', // Mix of CS and Electronics
    cgpa: 7.5 + (Math.random() * 2.5), // 7.5 to 10.0
    currentBacklogs: i % 10 === 0 ? 1 : 0, // Occasional backlog
    skills: ['JavaScript', 'React'],
    experience: 'Academic projects',
    projects: 'Built a demo application',
    education: [],
    personalInfo: {}
  });
}

// Drives: { id, companyName, roleTitle, description, minCgpa, maxBacklogs, allowedBranches: [], location, ctc, applicationDeadline, createdBy }
const drives = [];
let nextDriveId = 1;

// Applications: { id, driveId, studentId, status, appliedAt, updatedAt }
const applications = [];
let nextApplicationId = 1;

// Alumni Job Referrals: { id, alumniUserId, companyName, jobTitle, description, location, ctc, applyLink, createdAt, expiryDate, status }
const alumniJobs = [];
let nextJobId = 1;

// Mentorship Slots: { id, alumniUserId, slotStart, slotEnd, maxStudents, currentBookings, description, status }
const mentorshipSlots = [];
let nextSlotId = 1;

// Mentorship Bookings: { id, slotId, studentId, bookedAt, status }
const mentorshipBookings = [];
let nextBookingId = 1;

// FAQ/PlacementBot: { id, question, answer, tags: [], category }
const faqs = [
  { id: 1, question: 'What is the minimum CGPA requirement?', answer: 'The minimum CGPA requirement varies by company. Most companies require a minimum of 7.0 CGPA, but some may accept lower. Check individual drive details for specific requirements.', tags: ['cgpa', 'requirement', 'eligibility'], category: 'eligibility' },
  { id: 2, question: 'Can I apply with backlogs?', answer: 'Some companies allow applications with backlogs, typically up to 2-3 active backlogs. Check the drive details for the maximum allowed backlogs.', tags: ['backlogs', 'eligibility'], category: 'eligibility' },
  { id: 3, question: 'When is the interview scheduled?', answer: 'Interview dates are typically communicated via email/SMS after you apply. Check your Application Tracker for the latest status and interview schedule.', tags: ['interview', 'schedule', 'date'], category: 'application' },
  { id: 4, question: 'Where will the interview be conducted?', answer: 'Interview venues are usually communicated along with the interview schedule. Most interviews are conducted on campus, but some companies may conduct online interviews. Check your application details for venue information.', tags: ['venue', 'location', 'interview'], category: 'application' },
  { id: 5, question: 'How do I check my application status?', answer: 'You can check your application status in the Application Tracker section of your dashboard. It will show whether your application is Applied, Interview Scheduled, Selected, or Rejected.', tags: ['status', 'application', 'tracker'], category: 'application' },
];

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Placement Portal API running' });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Email, password, and role are required' });
    }

    const normalizedRole = String(role).toUpperCase();
    if (!['TPO', 'STUDENT', 'ALUMNI'].includes(normalizedRole)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const existing = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (existing) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = {
      id: nextUserId++,
      name: name || '',
      email,
      phone: phone || '',
      passwordHash,
      role: normalizedRole,
    };
    users.push(user);

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Register error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (role) {
      const normalizedRole = String(role).toUpperCase();
      if (user.role !== normalizedRole) {
        return res.status(403).json({ message: 'You are not registered with this role' });
      }
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Current user profile
app.get('/api/auth/me', authRequired, (req, res) => {
  const user = users.find((u) => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  });
});

// Simple dashboard endpoints to prove role-based access
app.get('/api/tpo/dashboard', authRequired, requireRole('TPO'), (req, res) => {
  res.json({
    role: 'TPO',
    message: 'Welcome to the TPO Admin Dashboard.',
  });
});

app.get('/api/student/dashboard', authRequired, requireRole('STUDENT'), (req, res) => {
  res.json({
    role: 'STUDENT',
    message: 'Welcome to the Student Dashboard.',
  });
});

app.get('/api/alumni/dashboard', authRequired, requireRole('ALUMNI'), (req, res) => {
  res.json({
    role: 'ALUMNI',
    message: 'Welcome to the Alumni Dashboard.',
  });
});

// Placeholder for password reset request
app.post('/api/auth/request-password-reset', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }
  // In a real app, generate a reset token, email it to the user,
  // and store the token with an expiry. For now, just acknowledge.
  res.json({ message: 'If an account with that email exists, a reset link will be sent.' });
});

// Placeholder for password reset
app.post('/api/auth/reset-password', (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Token and new password are required' });
  }
  // Real implementation would verify token and update the user password.
  res.json({ message: 'Password reset flow not yet implemented in this demo.' });
});

// ==================== STUDENT PROFILE APIs ====================

// Get or create student profile
app.get('/api/students/profile', authRequired, requireRole('STUDENT'), (req, res) => {
  const profile = studentProfiles.find(p => p.userId === req.user.id);
  if (!profile) {
    // Return empty profile structure
    return res.json({
      userId: req.user.id,
      branch: '',
      cgpa: 0,
      currentBacklogs: 0,
      skills: [],
      experience: '',
      projects: '',
      education: [],
      personalInfo: {
        address: '',
        linkedin: '',
        github: '',
      }
    });
  }
  res.json(profile);
});

// Update student profile
app.put('/api/students/profile', authRequired, requireRole('STUDENT'), (req, res) => {
  try {
    const { branch, cgpa, currentBacklogs, skills, projects, education, personalInfo } = req.body;

    const existingIndex = studentProfiles.findIndex(p => p.userId === req.user.id);
    const profile = {
      userId: req.user.id,
      branch: branch || '',
      cgpa: parseFloat(cgpa) || 0,
      currentBacklogs: parseInt(currentBacklogs) || 0,
      skills: Array.isArray(skills) ? skills : [],
      experience: experience || '',
      projects: typeof projects === 'string' ? projects : (Array.isArray(projects) ? projects.join('\n') : ''),
      education: Array.isArray(education) ? education : [],
      personalInfo: personalInfo || {},
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      studentProfiles[existingIndex] = profile;
    } else {
      profile.createdAt = new Date().toISOString();
      studentProfiles.push(profile);
    }

    res.json(profile);
  } catch (err) {
    console.error('Update profile error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ==================== DRIVE APIs (TPO) ====================

// Create a new drive
app.post('/api/tpo/drives', authRequired, requireRole('TPO'), (req, res) => {
  try {
    const { companyName, roleTitle, description, minCgpa, maxBacklogs, allowedBranches, location, ctc, applicationDeadline } = req.body;

    if (!companyName || minCgpa === undefined) {
      return res.status(400).json({ message: 'Company name and minimum CGPA are required' });
    }

    const drive = {
      id: nextDriveId++,
      companyName,
      roleTitle: roleTitle || '',
      description: description || '',
      minCgpa: parseFloat(minCgpa) || 0,
      maxBacklogs: parseInt(maxBacklogs) || 0,
      allowedBranches: Array.isArray(allowedBranches) ? allowedBranches : [],
      location: location || '',
      ctc: ctc || '',
      applicationDeadline: applicationDeadline || null,
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      status: 'ACTIVE'
    };

    drives.push(drive);
    res.status(201).json(drive);
  } catch (err) {
    console.error('Create drive error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all drives (TPO view)
app.get('/api/tpo/drives', authRequired, requireRole('TPO'), (req, res) => {
  res.json(drives);
});

// Get eligible students for a drive
app.get('/api/tpo/drives/:driveId/eligible-students', authRequired, requireRole('TPO'), (req, res) => {
  try {
    const driveId = parseInt(req.params.driveId);
    const drive = drives.find(d => d.id === driveId);

    if (!drive) {
      return res.status(404).json({ message: 'Drive not found' });
    }

    // Find eligible students
    const eligible = studentProfiles
      .filter(profile => {
        // Check CGPA
        if (profile.cgpa < drive.minCgpa) return false;

        // Check backlogs
        if (profile.currentBacklogs > drive.maxBacklogs) return false;

        // Check branch (if branches are specified)
        if (drive.allowedBranches.length > 0) {
          if (!drive.allowedBranches.includes(profile.branch)) return false;
        }

        return true;
      })
      .map(profile => {
        const user = users.find(u => u.id === profile.userId);
        return {
          userId: profile.userId,
          name: user?.name || '',
          email: user?.email || '',
          branch: profile.branch,
          cgpa: profile.cgpa,
          currentBacklogs: profile.currentBacklogs,
        };
      });

    res.json({
      driveId: drive.id,
      companyName: drive.companyName,
      eligibleCount: eligible.length,
      eligibleStudents: eligible
    });
  } catch (err) {
    console.error('Get eligible students error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Notify eligible students for a drive
app.post('/api/tpo/drives/:driveId/notify', authRequired, requireRole('TPO'), (req, res) => {
  try {
    const driveId = parseInt(req.params.driveId);
    const drive = drives.find(d => d.id === driveId);

    if (!drive) {
      return res.status(404).json({ message: 'Drive not found' });
    }

    // In a real application, you'd recalculate or fetch the list of eligible students
    // and integrate with an email provider (SendGrid, AWS SES) or SMS gateway to notify them.
    const { studentIds } = req.body;

    if (!studentIds || !Array.isArray(studentIds)) {
      return res.status(400).json({ message: 'List of student IDs required' });
    }

    // Simulate sending notifications
    console.log(`[Notification] Sending drive alert for ${drive.companyName} to ${studentIds.length} students...`);

    res.json({
      message: `Successfully notified ${studentIds.length} eligible students about the ${drive.companyName} drive.`,
      notifiedCount: studentIds.length
    });
  } catch (err) {
    console.error('Notify students error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ==================== STUDENT DRIVE APIs ====================

// Get eligible drives for logged-in student
app.get('/api/students/eligible-drives', authRequired, requireRole('STUDENT'), (req, res) => {
  try {
    const profile = studentProfiles.find(p => p.userId === req.user.id);

    if (!profile || !profile.branch) {
      return res.json({
        message: 'Please complete your profile first',
        drives: []
      });
    }

    // Find drives where student is eligible
    const eligibleDrives = drives
      .filter(drive => {
        // Check CGPA
        if (profile.cgpa < drive.minCgpa) return false;

        // Check backlogs
        if (profile.currentBacklogs > drive.maxBacklogs) return false;

        // Check branch
        if (drive.allowedBranches.length > 0) {
          if (!drive.allowedBranches.includes(profile.branch)) return false;
        }

        return drive.status === 'ACTIVE';
      })
      .map(drive => {
        const application = applications.find(
          a => a.driveId === drive.id && a.studentId === req.user.id
        );
        return {
          ...drive,
          hasApplied: !!application,
          applicationStatus: application?.status || null
        };
      });

    res.json({ drives: eligibleDrives });
  } catch (err) {
    console.error('Get eligible drives error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Apply to a drive
app.post('/api/students/drives/:driveId/apply', authRequired, requireRole('STUDENT'), (req, res) => {
  try {
    const driveId = parseInt(req.params.driveId);
    const drive = drives.find(d => d.id === driveId);

    if (!drive) {
      return res.status(404).json({ message: 'Drive not found' });
    }

    // Check if already applied
    const existing = applications.find(
      a => a.driveId === driveId && a.studentId === req.user.id
    );
    if (existing) {
      return res.status(409).json({ message: 'You have already applied to this drive' });
    }

    const application = {
      id: nextApplicationId++,
      driveId,
      studentId: req.user.id,
      status: 'APPLIED',
      appliedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    applications.push(application);
    res.status(201).json(application);
  } catch (err) {
    console.error('Apply to drive error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get student's applications
app.get('/api/students/applications', authRequired, requireRole('STUDENT'), (req, res) => {
  try {
    const studentApplications = applications
      .filter(a => a.studentId === req.user.id)
      .map(app => {
        const drive = drives.find(d => d.id === app.driveId);
        return {
          ...app,
          drive: drive ? {
            id: drive.id,
            companyName: drive.companyName,
            roleTitle: drive.roleTitle,
            location: drive.location,
            ctc: drive.ctc
          } : null
        };
      });

    res.json({ applications: studentApplications });
  } catch (err) {
    console.error('Get applications error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ==================== ALUMNI JOB REFERRAL APIs ====================

// Create a job referral
app.post('/api/alumni/jobs', authRequired, requireRole('ALUMNI'), (req, res) => {
  try {
    const { companyName, jobTitle, description, location, ctc, applyLink, expiryDate } = req.body;

    if (!companyName || !jobTitle) {
      return res.status(400).json({ message: 'Company name and job title are required' });
    }

    const job = {
      id: nextJobId++,
      alumniUserId: req.user.id,
      companyName,
      jobTitle,
      description: description || '',
      location: location || '',
      ctc: ctc || '',
      applyLink: applyLink || '',
      createdAt: new Date().toISOString(),
      expiryDate: expiryDate || null,
      status: 'ACTIVE'
    };

    alumniJobs.push(job);
    res.status(201).json(job);
  } catch (err) {
    console.error('Create job referral error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all job referrals (visible to students and alumni)
app.get('/api/jobs', authRequired, (req, res) => {
  const activeJobs = alumniJobs.filter(job => job.status === 'ACTIVE');
  const jobsWithAlumni = activeJobs.map(job => {
    const alumni = users.find(u => u.id === job.alumniUserId);
    return {
      ...job,
      alumniName: alumni?.name || 'Alumni'
    };
  });
  res.json({ jobs: jobsWithAlumni });
});

// Get alumni's own job referrals
app.get('/api/alumni/jobs', authRequired, requireRole('ALUMNI'), (req, res) => {
  const myJobs = alumniJobs.filter(job => job.alumniUserId === req.user.id);
  res.json({ jobs: myJobs });
});

// Update job referral status
app.patch('/api/alumni/jobs/:jobId', authRequired, requireRole('ALUMNI'), (req, res) => {
  try {
    const jobId = parseInt(req.params.jobId);
    const { status } = req.body;

    const jobIndex = alumniJobs.findIndex(j => j.id === jobId && j.alumniUserId === req.user.id);
    if (jobIndex === -1) {
      return res.status(404).json({ message: 'Job referral not found' });
    }

    if (status) {
      alumniJobs[jobIndex].status = status;
    }

    res.json(alumniJobs[jobIndex]);
  } catch (err) {
    console.error('Update job error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ==================== MENTORSHIP APIs ====================

// Create mentorship slot
app.post('/api/alumni/mentorship-slots', authRequired, requireRole('ALUMNI'), (req, res) => {
  try {
    const { slotStart, slotEnd, maxStudents, description } = req.body;

    if (!slotStart || !slotEnd) {
      return res.status(400).json({ message: 'Slot start and end times are required' });
    }

    const slot = {
      id: nextSlotId++,
      alumniUserId: req.user.id,
      slotStart,
      slotEnd,
      maxStudents: parseInt(maxStudents) || 1,
      currentBookings: 0,
      description: description || '',
      createdAt: new Date().toISOString(),
      status: 'AVAILABLE'
    };

    mentorshipSlots.push(slot);
    res.status(201).json(slot);
  } catch (err) {
    console.error('Create mentorship slot error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get available mentorship slots (for students)
app.get('/api/mentorship/available-slots', authRequired, requireRole('STUDENT'), (req, res) => {
  const available = mentorshipSlots
    .filter(slot => slot.status === 'AVAILABLE' && slot.currentBookings < slot.maxStudents)
    .map(slot => {
      const alumni = users.find(u => u.id === slot.alumniUserId);
      return {
        ...slot,
        alumniName: alumni?.name || 'Alumni'
      };
    });
  res.json({ slots: available });
});

// Get alumni's mentorship slots
app.get('/api/alumni/mentorship-slots', authRequired, requireRole('ALUMNI'), (req, res) => {
  const mySlots = mentorshipSlots
    .filter(slot => slot.alumniUserId === req.user.id)
    .map(slot => {
      const bookings = mentorshipBookings.filter(b => b.slotId === slot.id);
      return {
        ...slot,
        bookings: bookings.map(b => {
          const student = users.find(u => u.id === b.studentId);
          return {
            ...b,
            studentName: student?.name || 'Student',
            studentEmail: student?.email || ''
          };
        })
      };
    });
  res.json({ slots: mySlots });
});

// Book a mentorship slot
app.post('/api/mentorship/slots/:slotId/book', authRequired, requireRole('STUDENT'), (req, res) => {
  try {
    const slotId = parseInt(req.params.slotId);
    const slot = mentorshipSlots.find(s => s.id === slotId);

    if (!slot) {
      return res.status(404).json({ message: 'Mentorship slot not found' });
    }

    if (slot.status !== 'AVAILABLE' || slot.currentBookings >= slot.maxStudents) {
      return res.status(400).json({ message: 'Slot is no longer available' });
    }

    // Check if already booked
    const existing = mentorshipBookings.find(
      b => b.slotId === slotId && b.studentId === req.user.id
    );
    if (existing) {
      return res.status(409).json({ message: 'You have already booked this slot' });
    }

    const booking = {
      id: nextBookingId++,
      slotId,
      studentId: req.user.id,
      bookedAt: new Date().toISOString(),
      status: 'CONFIRMED'
    };

    mentorshipBookings.push(booking);
    slot.currentBookings++;

    if (slot.currentBookings >= slot.maxStudents) {
      slot.status = 'FULL';
    }

    res.status(201).json(booking);
  } catch (err) {
    console.error('Book slot error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ==================== PLACEMENTBOT APIs ====================

// Get all FAQs
app.get('/api/bot/faqs', (req, res) => {
  res.json({ faqs });
});

// Ask PlacementBot
app.post('/api/bot/ask', (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ message: 'Question is required' });
    }

    const query = question.toLowerCase();

    // Simple keyword matching
    const matchedFAQs = faqs
      .map(faq => {
        let score = 0;
        const questionWords = query.split(/\s+/);

        // Check tags
        faq.tags.forEach(tag => {
          if (query.includes(tag.toLowerCase())) {
            score += 2;
          }
        });

        // Check question text
        questionWords.forEach(word => {
          if (faq.question.toLowerCase().includes(word)) {
            score += 1;
          }
        });

        return { ...faq, score };
      })
      .filter(faq => faq.score > 0)
      .sort((a, b) => b.score - a.score);

    if (matchedFAQs.length === 0) {
      return res.json({
        answer: "I couldn't find a specific answer to your question. Please contact the Placement Office for assistance.",
        relatedFAQs: faqs.slice(0, 3)
      });
    }

    const bestMatch = matchedFAQs[0];
    res.json({
      answer: bestMatch.answer,
      relatedFAQs: matchedFAQs.slice(1, 4).map(f => ({
        question: f.question,
        answer: f.answer
      }))
    });
  } catch (err) {
    console.error('Bot ask error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ==================== ANALYTICS APIs ====================

// Get placement statistics (for TPO and students)
app.get('/api/analytics/stats', authRequired, (req, res) => {
  try {
    const totalStudents = studentProfiles.length;
    const totalDrives = drives.length;
    const totalApplications = applications.length;
    const selectedCount = applications.filter(a => a.status === 'SELECTED').length;

    // Branch-wise stats
    const branchStats = {};
    studentProfiles.forEach(profile => {
      const branch = profile.branch || 'Unknown';
      if (!branchStats[branch]) {
        branchStats[branch] = { total: 0, placed: 0 };
      }
      branchStats[branch].total++;

      const studentApps = applications.filter(a => a.studentId === profile.userId && a.status === 'SELECTED');
      if (studentApps.length > 0) {
        branchStats[branch].placed++;
      }
    });

    res.json({
      totalStudents,
      totalDrives,
      totalApplications,
      selectedCount,
      placementRate: totalStudents > 0 ? (selectedCount / totalStudents * 100).toFixed(2) : 0,
      branchStats
    });
  } catch (err) {
    console.error('Analytics error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Skill gap analysis (for students)
app.get('/api/analytics/skill-gap', authRequired, requireRole('STUDENT'), (req, res) => {
  try {
    const profile = studentProfiles.find(p => p.userId === req.user.id);
    if (!profile) {
      return res.json({ recommendations: [] });
    }

    // Simple skill gap analysis based on common skills in placed students
    const placedStudents = applications
      .filter(a => a.status === 'SELECTED')
      .map(a => studentProfiles.find(p => p.userId === a.studentId))
      .filter(p => p);

    const skillFrequency = {};
    placedStudents.forEach(student => {
      (student.skills || []).forEach(skill => {
        skillFrequency[skill.toLowerCase()] = (skillFrequency[skill.toLowerCase()] || 0) + 1;
      });
    });

    const studentSkills = (profile.skills || []).map(s => s.toLowerCase());
    const recommendations = Object.entries(skillFrequency)
      .filter(([skill]) => !studentSkills.includes(skill))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([skill, count]) => ({
        skill,
        frequency: count,
        percentage: ((count / placedStudents.length) * 100).toFixed(1),
        recommendation: `${((count / placedStudents.length) * 100).toFixed(0)}% of placed students have ${skill}. Consider learning this skill.`
      }));

    res.json({ recommendations });
  } catch (err) {
    console.error('Skill gap error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Placement Portal API listening on port ${PORT}`);
  console.log(`CORS enabled for: ${ALLOWED_ORIGINS.join(', ')}`);
});
