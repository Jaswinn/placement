import './style.css'

type Role = 'TPO' | 'STUDENT' | 'ALUMNI'

type User = {
  id: number
  name: string
  email: string
  phone: string
  role: Role
}

type AuthResponse = {
  token: string
  user: User
}

const API_BASE = 'http://localhost:4000'

function saveAuth(auth: AuthResponse) {
  localStorage.setItem('placement_auth', JSON.stringify(auth))
}

function loadAuth(): AuthResponse | null {
  const raw = localStorage.getItem('placement_auth')
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthResponse
  } catch {
    return null
  }
}

function clearAuth() {
  localStorage.removeItem('placement_auth')
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const auth = loadAuth()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (auth && auth.token) {
    (headers as any)['Authorization'] = `Bearer ${auth.token}`
  }

  try {
    const url = `${API_BASE}${path}`
    const res = await fetch(url, {
      headers,
      ...options,
    })

    if (!res.ok) {
      // If 404, provide helpful error message
      if (res.status === 404) {
        // Try health check to see if server is running
        try {
          const healthRes = await fetch(`${API_BASE}/api/health`)
          if (!healthRes.ok) {
            throw new Error('Server is not responding correctly. Please restart the backend server.')
          }
        } catch {
          throw new Error('Cannot connect to server. Make sure the backend is running on http://localhost:4000')
        }
        // Server is running but endpoint not found
        const errorBody = await res.json().catch(() => ({}))
        throw new Error(errorBody.message || `Endpoint not found: ${path}`)
      }

      const errorBody = await res.json().catch(() => ({}))
      const message =
        (errorBody && (errorBody.message as string)) ||
        `Request failed with status ${res.status}`
      throw new Error(message)
    }
    return (await res.json()) as T
  } catch (err) {
    if (err instanceof TypeError) {
      if (err.message.includes('fetch') || err.message.includes('Failed to fetch')) {
        throw new Error('Cannot connect to server. Please make sure:\n1. Backend server is running (npm run dev in server folder)\n2. Server is on http://localhost:4000\n3. No firewall is blocking the connection')
      }
    }
    throw err
  }
}

function render() {
  const root = document.querySelector<HTMLDivElement>('#app')
  if (!root) return

  const auth = loadAuth()
  if (!auth) {
    renderAuth(root)
  } else {
    renderDashboard(root, auth)
  }
}

function renderAuth(root: HTMLDivElement) {
  root.innerHTML = `
    <div class="shell">
      <div class="auth-card">
        <h1 class="app-title">Placement Portal</h1>
        <p class="app-subtitle">Login or sign up to continue</p>

        <div class="tab-row">
          <button class="tab-button tab-button--active" data-mode="login">Login</button>
          <button class="tab-button" data-mode="register">Sign Up</button>
        </div>

        <form id="auth-form" class="auth-form">
          <input
            id="name-input"
            class="field"
            type="text"
            placeholder="Full name"
            autocomplete="name"
            style="display: none"
          />
          <input
            id="email-input"
            class="field"
            type="email"
            placeholder="Email"
            autocomplete="email"
            required
          />
          <input
            id="phone-input"
            class="field"
            type="tel"
            placeholder="Phone number (optional)"
            autocomplete="tel"
          />
          <input
            id="password-input"
            class="field"
            type="password"
            placeholder="Password"
            autocomplete="current-password"
            required
          />

          <div class="role-row">
            <label class="role-label">Sign in as:</label>
            <div class="role-options">
              <label class="role-option">
                <input type="radio" name="role" value="TPO" checked />
                <span>Admin (TPO)</span>
              </label>
              <label class="role-option">
                <input type="radio" name="role" value="STUDENT" />
                <span>Student</span>
              </label>
              <label class="role-option">
                <input type="radio" name="role" value="ALUMNI" />
                <span>Alumni</span>
              </label>
            </div>
          </div>

          <button type="submit" class="primary-button">
            Continue
          </button>

          <button type="button" id="forgot-password" class="link-button">
            Forgot password?
          </button>

          <p id="auth-error" class="error-text" aria-live="polite"></p>
        </form>
      </div>
    </div>
  `

  const tabs = Array.from(
    root.querySelectorAll<HTMLButtonElement>('.tab-button')
  )
  const form = root.querySelector<HTMLFormElement>('#auth-form')!
  const nameInput = root.querySelector<HTMLInputElement>('#name-input')!
  const emailInput = root.querySelector<HTMLInputElement>('#email-input')!
  const phoneInput = root.querySelector<HTMLInputElement>('#phone-input')!
  const passwordInput =
    root.querySelector<HTMLInputElement>('#password-input')!
  const forgotPasswordButton = root.querySelector<HTMLButtonElement>(
    '#forgot-password'
  )!
  const errorEl = root.querySelector<HTMLParagraphElement>('#auth-error')!

  let mode: 'login' | 'register' = 'login'

  function setMode(nextMode: 'login' | 'register') {
    mode = nextMode
    tabs.forEach((tab) => {
      const isActive = tab.dataset.mode === mode
      if (isActive) {
        tab.classList.add('tab-button--active')
      } else {
        tab.classList.remove('tab-button--active')
      }
    })

    if (mode === 'register') {
      nameInput.style.display = ''
      forgotPasswordButton.style.display = 'none'
    } else {
      nameInput.style.display = 'none'
      forgotPasswordButton.style.display = ''
    }
    errorEl.textContent = ''
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const nextMode = (tab.dataset.mode as 'login' | 'register') || 'login'
      setMode(nextMode)
    })
  })

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    errorEl.textContent = ''

    const formData = new FormData(form)
    const role = (formData.get('role') as Role | null) || 'STUDENT'

    try {
      if (mode === 'register') {
        const payload = {
          name: nameInput.value.trim(),
          email: emailInput.value.trim(),
          phone: phoneInput.value.trim(),
          password: passwordInput.value,
          role,
        }

        const auth = await apiRequest<AuthResponse>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        saveAuth(auth)
        render()
      } else {
        const payload = {
          email: emailInput.value.trim(),
          password: passwordInput.value,
          role,
        }

        const auth = await apiRequest<AuthResponse>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        saveAuth(auth)
        render()
      }
    } catch (err) {
      errorEl.textContent = err instanceof Error ? err.message : 'Something went wrong'
    }
  })

  forgotPasswordButton.addEventListener('click', async () => {
    errorEl.textContent = ''
    const email = emailInput.value.trim()
    if (!email) {
      errorEl.textContent = 'Enter your email first to request a reset link.'
      return
    }
    try {
      await apiRequest<{ message: string }>('/api/auth/request-password-reset', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      errorEl.textContent =
        'If an account exists for that email, a reset link will be sent.'
    } catch (err) {
      errorEl.textContent =
        err instanceof Error ? err.message : 'Could not request reset.'
    }
  })
}

function renderDashboard(root: HTMLDivElement, auth: AuthResponse) {
  const user = auth.user
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

  root.innerHTML = `
    <div class="shell">
      <header class="topbar">
        <div class="topbar-left">
          <span class="brand">Placement Portal</span>
          <span class="role-pill">${roleTitle}</span>
        </div>
        <div class="topbar-right">
          <span class="user-label">${user.name || user.email}</span>
          <button id="logout-button" class="ghost-button">Logout</button>
        </div>
      </header>
      <main class="dashboard-main">
        <section class="hero">
          <h1>${roleTitle}</h1>
          <p>${roleDescription}</p>
        </section>

        <div id="dashboard-content">
          ${renderRoleCards(user.role)}
        </div>
      </main>
    </div>
  `

  const logoutButton = root.querySelector<HTMLButtonElement>('#logout-button')
  logoutButton?.addEventListener('click', () => {
    clearAuth()
    render()
  })

  // Add click handlers for student dashboard
  if (user.role === 'STUDENT') {
    setupStudentDashboardHandlers(root, auth)
  }

  // Add click handlers for TPO dashboard
  if (user.role === 'TPO') {
    setupTPODashboardHandlers(root, auth)
  }

  // Add click handlers for Alumni dashboard
  if (user.role === 'ALUMNI') {
    setupAlumniDashboardHandlers(root, auth)
  }

  // Add PlacementBot and Analytics for all roles
  setupCommonFeatures(root, auth, user.role)
}

function setupStudentDashboardHandlers(root: HTMLDivElement, auth: AuthResponse) {
  const resumeCard = root.querySelector('[data-feature="resume-wizard"]')
  const drivesCard = root.querySelector('[data-feature="eligible-drives"]')
  const applicationsCard = root.querySelector('[data-feature="applications"]')

  resumeCard?.addEventListener('click', () => {
    renderResumeWizard(root, auth)
  })

  drivesCard?.addEventListener('click', () => {
    renderEligibleDrives(root, auth)
  })

  applicationsCard?.addEventListener('click', () => {
    renderApplications(root, auth)
  })

  const mentorshipCard = root.querySelector('[data-feature="mentorship-booking"]')
  const jobsViewCard = root.querySelector('[data-feature="job-referrals-view"]')

  mentorshipCard?.addEventListener('click', () => {
    renderMentorshipBooking(root, auth)
  })

  jobsViewCard?.addEventListener('click', () => {
    renderAllJobReferrals(root, auth)
  })
}

function renderRoleCards(role: Role): string {
  if (role === 'TPO') {
    return `
      <article class="card clickable-card" data-feature="criteria-engine">
        <h2>Criteria Engine</h2>
        <p>
          Define drives with CGPA, backlog, and branch filters and instantly see eligible students.
        </p>
        <p class="card-tag">Click to create drives →</p>
      </article>
      <article class="card clickable-card" data-feature="drive-management">
        <h2>Drive Management</h2>
        <p>
          View all drives, manage eligibility criteria, and see eligible student lists.
        </p>
        <p class="card-tag">Click to manage drives →</p>
      </article>
      <article class="card clickable-card" data-feature="interview-scheduler">
        <h2>Interview Scheduler</h2>
        <p>
          Assign interview slots to students and manage scheduling without conflicts.
        </p>
        <p class="card-tag">Click to schedule interviews →</p>
      </article>
    `
  }

  if (role === 'STUDENT') {
    return `
      <article class="card clickable-card" data-feature="resume-wizard">
        <h2>Resume Wizard</h2>
        <p>
          Fill in your projects, skills, and academics to generate a standardized college-branded resume PDF.
        </p>
        <p class="card-tag">Click to build your resume →</p>
      </article>
      <article class="card clickable-card" data-feature="eligible-drives">
        <h2>Live Eligible Drives</h2>
        <p>
          See only the companies and drives where you meet the criteria. No more clutter.
        </p>
        <p class="card-tag">Click to view drives →</p>
      </article>
      <article class="card clickable-card" data-feature="applications">
        <h2>Application Tracker</h2>
        <p>
          Track the status of all your applications - Applied, Interview Scheduled, Selected, etc.
        </p>
        <p class="card-tag">Click to view applications →</p>
      </article>
      <article class="card clickable-card" data-feature="mentorship-booking">
        <h2>Mentorship Sessions</h2>
        <p>
          Book mentorship slots with alumni for mock interviews, resume reviews, and career guidance.
        </p>
        <p class="card-tag">Click to browse slots →</p>
      </article>
      <article class="card clickable-card" data-feature="job-referrals-view">
        <h2>Alumni Job Referrals</h2>
        <p>
          Browse job openings posted by alumni from their companies.
        </p>
        <p class="card-tag">Click to view jobs →</p>
      </article>
    `
  }

  return `
    <article class="card clickable-card" data-feature="job-referrals">
      <h2>Job Referral Board</h2>
      <p>
        Post openings from your company so juniors can discover and apply quickly.
      </p>
      <p class="card-tag">Click to post jobs →</p>
    </article>
    <article class="card clickable-card" data-feature="mentorship">
      <h2>Mentorship Slots</h2>
      <p>
        Open time slots for mock interviews or career chats that students can book.
      </p>
      <p class="card-tag">Click to manage slots →</p>
    </article>
    <article class="card clickable-card" data-feature="alumni-jobs-view">
      <h2>View All Job Referrals</h2>
      <p>
        Browse all job openings posted by alumni for students.
      </p>
      <p class="card-tag">Click to browse →</p>
    </article>
  `
}

// ==================== STUDENT FEATURES ====================

async function renderResumeWizard(root: HTMLDivElement, auth: AuthResponse) {
  try {
    const profile = await apiRequest<any>('/api/students/profile')

    const content = root.querySelector('#dashboard-content')
    if (!content) return

    content.innerHTML = `
      <div class="feature-header">
        <button id="back-to-dashboard" class="back-button">← Back to Dashboard</button>
        <h2>Resume Wizard</h2>
        <p>Complete your profile to generate a professional resume</p>
      </div>

      <form id="resume-form" class="resume-form">
        <div class="form-section">
          <h3>Academic Information</h3>
          <div class="form-row">
            <label>
              Branch
              <input type="text" id="branch" class="field" placeholder="e.g., Computer Science" value="${profile.branch || ''}" required />
            </label>
            <label>
              CGPA
              <input type="number" id="cgpa" class="field" step="0.01" min="0" max="10" placeholder="e.g., 8.5" value="${profile.cgpa || ''}" required />
            </label>
            <label>
              Current Backlogs
              <input type="number" id="backlogs" class="field" min="0" placeholder="0" value="${profile.currentBacklogs || 0}" required />
            </label>
          </div>
        </div>

        <div class="form-section">
          <h3>Education</h3>
          <div id="education-list">
            ${(profile.education || []).map((edu: any, _idx: number) => `
              <div class="education-item">
                <input type="text" class="field" placeholder="Degree (e.g., B.Tech)" value="${edu.degree || ''}" />
                <input type="text" class="field" placeholder="Institution" value="${edu.institution || ''}" />
                <input type="text" class="field" placeholder="Year" value="${edu.year || ''}" />
                <input type="text" class="field" placeholder="Percentage/CGPA" value="${edu.percentage || ''}" />
              </div>
            `).join('') || '<div class="education-item"><input type="text" class="field" placeholder="Degree" /><input type="text" class="field" placeholder="Institution" /><input type="text" class="field" placeholder="Year" /><input type="text" class="field" placeholder="Percentage/CGPA" /></div>'}
          </div>
          <button type="button" id="add-education" class="secondary-button icon-button">➕ Add Education</button>
        </div>

        <div class="form-section">
          <h3>Skills</h3>
          <textarea id="skills" class="field textarea" placeholder="Enter skills separated by commas (e.g., Java, Python, React, SQL)">${(profile.skills || []).join(', ')}</textarea>
        </div>

        <div class="form-section">
          <h3>Projects</h3>
          <div id="projects-list">
            ${(profile.projects || []).map((proj: any, _idx: number) => `
              <div class="project-item">
                <input type="text" class="field" placeholder="Project Title" value="${proj.title || ''}" />
                <textarea class="field textarea" placeholder="Description">${proj.description || ''}</textarea>
                <input type="text" class="field" placeholder="Technologies (comma-separated)" value="${proj.technologies || ''}" />
              </div>
            `).join('') || '<div class="project-item"><input type="text" class="field" placeholder="Project Title" /><textarea class="field textarea" placeholder="Description"></textarea><input type="text" class="field" placeholder="Technologies" /></div>'}
          </div>
          <button type="button" id="add-project" class="secondary-button icon-button">➕ Add Project</button>
        </div>

        <div class="form-section">
          <h3>Personal Information</h3>
          <div class="form-row">
            <label>
              LinkedIn URL
              <input type="url" id="linkedin" class="field" placeholder="https://linkedin.com/in/..." value="${profile.personalInfo?.linkedin || ''}" />
            </label>
            <label>
              GitHub URL
              <input type="url" id="github" class="field" placeholder="https://github.com/..." value="${profile.personalInfo?.github || ''}" />
            </label>
          </div>
        </div>

          <div class="form-actions action-buttons">
            <button type="submit" class="primary-button">💾 Save Profile</button>
            <button type="button" id="generate-resume" class="primary-button" style="background: linear-gradient(135deg, #10b981, #059669);">📄 Generate Resume PDF</button>
          </div>

        <p id="resume-error" class="error-text"></p>
        <p id="resume-success" class="success-text"></p>
      </form>
    `

    setupResumeFormHandlers(root, auth)
  } catch (err) {
    console.error('Error loading profile', err)
  }
}

function setupResumeFormHandlers(root: HTMLDivElement, auth: AuthResponse) {
  const backBtn = root.querySelector('#back-to-dashboard')
  const form = root.querySelector('#resume-form') as HTMLFormElement
  const addEducationBtn = root.querySelector('#add-education')
  const addProjectBtn = root.querySelector('#add-project')
  const generateResumeBtn = root.querySelector('#generate-resume')
  const errorEl = root.querySelector('#resume-error')
  const successEl = root.querySelector('#resume-success')

  backBtn?.addEventListener('click', () => {
    renderDashboard(root, auth)
  })

  addEducationBtn?.addEventListener('click', () => {
    const list = root.querySelector('#education-list')
    if (list) {
      const item = document.createElement('div')
      item.className = 'education-item'
      item.innerHTML = `
        <input type="text" class="field" placeholder="Degree" />
        <input type="text" class="field" placeholder="Institution" />
        <input type="text" class="field" placeholder="Year" />
        <input type="text" class="field" placeholder="Percentage/CGPA" />
        <button type="button" class="remove-btn">×</button>
      `
      item.querySelector('.remove-btn')?.addEventListener('click', () => item.remove())
      list.appendChild(item)
    }
  })

  addProjectBtn?.addEventListener('click', () => {
    const list = root.querySelector('#projects-list')
    if (list) {
      const item = document.createElement('div')
      item.className = 'project-item'
      item.innerHTML = `
        <input type="text" class="field" placeholder="Project Title" />
        <textarea class="field textarea" placeholder="Description"></textarea>
        <input type="text" class="field" placeholder="Technologies" />
        <button type="button" class="remove-btn">×</button>
      `
      item.querySelector('.remove-btn')?.addEventListener('click', () => item.remove())
      list.appendChild(item)
    }
  })

  form?.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (errorEl) errorEl.textContent = ''
    if (successEl) successEl.textContent = ''

    try {
      const skillsText = (root.querySelector('#skills') as HTMLTextAreaElement)?.value || ''
      const skills = skillsText.split(',').map(s => s.trim()).filter(s => s)

      const educationItems = Array.from(root.querySelectorAll('.education-item')).map(item => {
        const inputs = item.querySelectorAll('input')
        return {
          degree: inputs[0]?.value || '',
          institution: inputs[1]?.value || '',
          year: inputs[2]?.value || '',
          percentage: inputs[3]?.value || '',
        }
      }).filter(e => e.degree)

      const projectItems = Array.from(root.querySelectorAll('.project-item')).map(item => {
        const title = item.querySelector('input[placeholder*="Title"]') as HTMLInputElement
        const desc = item.querySelector('textarea') as HTMLTextAreaElement
        const tech = item.querySelector('input[placeholder*="Technologies"]') as HTMLInputElement
        return {
          title: title?.value || '',
          description: desc?.value || '',
          technologies: tech?.value || '',
        }
      }).filter(p => p.title)

      const payload = {
        branch: (root.querySelector('#branch') as HTMLInputElement)?.value || '',
        cgpa: parseFloat((root.querySelector('#cgpa') as HTMLInputElement)?.value || '0'),
        currentBacklogs: parseInt((root.querySelector('#backlogs') as HTMLInputElement)?.value || '0'),
        skills,
        education: educationItems,
        projects: projectItems,
        personalInfo: {
          linkedin: (root.querySelector('#linkedin') as HTMLInputElement)?.value || '',
          github: (root.querySelector('#github') as HTMLInputElement)?.value || '',
        }
      }

      await apiRequest('/api/students/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      })

      if (successEl) successEl.textContent = 'Profile saved successfully!'
      setTimeout(() => {
        if (successEl) successEl.textContent = ''
      }, 3000)
    } catch (err) {
      if (errorEl) errorEl.textContent = err instanceof Error ? err.message : 'Failed to save profile'
    }
  })

  generateResumeBtn?.addEventListener('click', () => {
    if (errorEl) errorEl.textContent = ''
    if (successEl) successEl.textContent = 'PDF generation coming soon! For now, your profile is saved.'
  })
}

// ==================== TPO FEATURES ====================

function setupTPODashboardHandlers(root: HTMLDivElement, auth: AuthResponse) {
  const criteriaCard = root.querySelector('[data-feature="criteria-engine"]')
  const drivesCard = root.querySelector('[data-feature="drive-management"]')
  const schedulerCard = root.querySelector('[data-feature="interview-scheduler"]')

  criteriaCard?.addEventListener('click', () => {
    renderCriteriaEngine(root, auth)
  })

  drivesCard?.addEventListener('click', () => {
    renderDriveManagement(root, auth)
  })

  schedulerCard?.addEventListener('click', () => {
    renderInterviewScheduler(root, auth)
  })
}

async function renderCriteriaEngine(root: HTMLDivElement, auth: AuthResponse) {
  const content = root.querySelector('#dashboard-content')
  if (!content) return

  content.innerHTML = `
    <div class="feature-header">
      <button id="back-to-dashboard" class="back-button">← Back to Dashboard</button>
      <h2>Criteria Engine</h2>
      <p>Create new placement drives with eligibility criteria</p>
    </div>

    <div class="tpo-layout">
      <div class="tpo-form-panel">
        <h3>Create New Drive</h3>
        <form id="create-drive-form" class="resume-form">
          <div class="form-section">
            <label>
              Company Name *
              <input type="text" id="company-name" class="field" placeholder="e.g., TCS Digital" required />
            </label>
            <label>
              Role Title
              <input type="text" id="role-title" class="field" placeholder="e.g., Software Engineer" />
            </label>
            <label>
              Description
              <textarea id="description" class="field textarea" placeholder="Drive description..."></textarea>
            </label>
          </div>

          <div class="form-section">
            <h4>Eligibility Criteria</h4>
            <div class="form-row">
              <label>
                Minimum CGPA *
                <input type="number" id="min-cgpa" class="field" step="0.01" min="0" max="10" placeholder="e.g., 7.0" required />
              </label>
              <label>
                Maximum Backlogs *
                <input type="number" id="max-backlogs" class="field" min="0" placeholder="e.g., 0" required />
              </label>
            </div>
            <label>
              Allowed Branches (comma-separated)
              <input type="text" id="allowed-branches" class="field" placeholder="e.g., CS, IT, MCA (leave empty for all branches)" />
            </label>
          </div>

          <div class="form-section">
            <h4>Job Details</h4>
            <div class="form-row">
              <label>
                Location
                <input type="text" id="location" class="field" placeholder="e.g., Bangalore" />
              </label>
              <label>
                CTC Package
                <input type="text" id="ctc" class="field" placeholder="e.g., 8 LPA" />
              </label>
            </div>
            <label>
              Application Deadline
              <input type="date" id="deadline" class="field" />
            </label>
          </div>

          <div class="form-actions">
            <button type="submit" class="primary-button">✨ Create Drive</button>
          </div>

          <p id="drive-error" class="error-text"></p>
          <p id="drive-success" class="success-text"></p>
        </form>
      </div>

      <div class="tpo-results-panel">
        <h3>Recent Drives</h3>
        <div id="recent-drives-list">Loading...</div>
      </div>
    </div>
  `

  const backBtn = root.querySelector('#back-to-dashboard')
  backBtn?.addEventListener('click', () => {
    renderDashboard(root, auth)
  })

  const form = root.querySelector('#create-drive-form') as HTMLFormElement
  const errorEl = root.querySelector('#drive-error')
  const successEl = root.querySelector('#drive-success')

  form?.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (errorEl) errorEl.textContent = ''
    if (successEl) successEl.textContent = ''

    try {
      const branchesText = (root.querySelector('#allowed-branches') as HTMLInputElement)?.value || ''
      const allowedBranches = branchesText.split(',').map(b => b.trim()).filter(b => b)

      const payload = {
        companyName: (root.querySelector('#company-name') as HTMLInputElement)?.value || '',
        roleTitle: (root.querySelector('#role-title') as HTMLInputElement)?.value || '',
        description: (root.querySelector('#description') as HTMLTextAreaElement)?.value || '',
        minCgpa: parseFloat((root.querySelector('#min-cgpa') as HTMLInputElement)?.value || '0'),
        maxBacklogs: parseInt((root.querySelector('#max-backlogs') as HTMLInputElement)?.value || '0'),
        allowedBranches,
        location: (root.querySelector('#location') as HTMLInputElement)?.value || '',
        ctc: (root.querySelector('#ctc') as HTMLInputElement)?.value || '',
        applicationDeadline: (root.querySelector('#deadline') as HTMLInputElement)?.value || null,
      }

      await apiRequest('/api/tpo/drives', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      if (successEl) successEl.textContent = 'Drive created successfully!'
      form.reset()

      // Refresh recent drives
      loadRecentDrives(root, auth)

      setTimeout(() => {
        if (successEl) successEl.textContent = ''
      }, 3000)
    } catch (err) {
      if (errorEl) errorEl.textContent = err instanceof Error ? err.message : 'Failed to create drive'
    }
  })

  loadRecentDrives(root, auth)
}

async function loadRecentDrives(root: HTMLDivElement, auth: AuthResponse) {
  try {
    const drives = await apiRequest<any[]>('/api/tpo/drives')
    const listEl = root.querySelector('#recent-drives-list')

    if (!listEl) return

    if (!drives || drives.length === 0) {
      listEl.innerHTML = '<p class="empty-state">No drives created yet.</p>'
      return
    }

    listEl.innerHTML = drives.slice(0, 5).map(drive => `
      <div class="drive-summary-card">
        <div class="drive-summary-header">
          <strong>${drive.companyName}</strong>
          <span class="drive-status">${drive.status}</span>
        </div>
        ${drive.roleTitle ? `<p class="drive-summary-role">${drive.roleTitle}</p>` : ''}
        <div class="drive-summary-criteria">
          <span>CGPA ≥ ${drive.minCgpa}</span>
          <span>Backlogs ≤ ${drive.maxBacklogs}</span>
        </div>
        <button class="view-eligible-btn" data-drive-id="${drive.id}">View Eligible Students</button>
      </div>
    `).join('')

    // Add click handlers
    listEl.querySelectorAll('.view-eligible-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const driveId = (e.target as HTMLElement).getAttribute('data-drive-id')
        if (!driveId) return
        await showEligibleStudents(root, auth, parseInt(driveId))
      })
    })
  } catch (err) {
    const listEl = root.querySelector('#recent-drives-list')
    if (listEl) {
      listEl.innerHTML = `<p class="error-text">Failed to load drives</p>`
    }
  }
}

async function showEligibleStudents(_root: HTMLDivElement, _auth: AuthResponse, driveId: number) {
  try {
    const data = await apiRequest<any>(`/api/tpo/drives/${driveId}/eligible-students`)

    const modal = document.createElement('div')
    modal.className = 'modal-overlay'
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Eligible Students - ${data.companyName}</h3>
          <button class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <p class="eligible-count">${data.eligibleCount} students eligible</p>
          <div class="eligible-students-list">
            ${data.eligibleStudents.map((student: any) => `
              <div class="eligible-student-item">
                <div>
                  <strong>${student.name || student.email}</strong>
                  <span class="student-branch">${student.branch}</span>
                </div>
                <div class="student-stats">
                  <span>CGPA: ${student.cgpa}</span>
                  <span>Backlogs: ${student.currentBacklogs}</span>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="modal-actions">
            <button class="primary-button notify-all-btn" data-drive-id="${driveId}">📧 Notify All Eligible</button>
          </div>
        </div>
      </div>
    `

    document.body.appendChild(modal)

    modal.querySelector('.modal-close')?.addEventListener('click', () => {
      modal.remove()
    })

    modal.querySelector('.notify-all-btn')?.addEventListener('click', async () => {
      alert(`Notification feature coming soon! Would notify ${data.eligibleCount} students.`)
      modal.remove()
    })

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove()
      }
    })
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to load eligible students')
  }
}

async function renderDriveManagement(root: HTMLDivElement, auth: AuthResponse) {
  const content = root.querySelector('#dashboard-content')
  if (!content) return

  content.innerHTML = `
    <div class="feature-header">
      <button id="back-to-dashboard" class="back-button">← Back to Dashboard</button>
      <h2>Drive Management</h2>
      <p>View and manage all placement drives</p>
    </div>
    <div id="drives-management-loading">Loading drives...</div>
    <div id="drives-management-list"></div>
  `

  const backBtn = root.querySelector('#back-to-dashboard')
  backBtn?.addEventListener('click', () => {
    renderDashboard(root, auth)
  })

  try {
    const drives = await apiRequest<any[]>('/api/tpo/drives')
    const listEl = root.querySelector('#drives-management-list')
    const loading = root.querySelector('#drives-management-loading')

    if (loading) loading.remove()

    if (!drives || drives.length === 0) {
      if (listEl) {
        listEl.innerHTML = `
          <div class="empty-state">
            <p>No drives created yet.</p>
            <button id="create-drive-btn" class="primary-button">➕ Create First Drive</button>
          </div>
        `
        root.querySelector('#create-drive-btn')?.addEventListener('click', () => {
          renderCriteriaEngine(root, auth)
        })
      }
      return
    }

    if (listEl) {
      listEl.innerHTML = drives.map(drive => `
        <article class="drive-card">
          <div class="drive-header">
            <div>
              <h3>${drive.companyName}</h3>
              ${drive.roleTitle ? `<p class="role-title">${drive.roleTitle}</p>` : ''}
            </div>
            <span class="status-badge status-${drive.status?.toLowerCase()}">${drive.status}</span>
          </div>
          ${drive.description ? `<p class="drive-description">${drive.description}</p>` : ''}
          <div class="drive-details">
            <div><strong>Min CGPA:</strong> ${drive.minCgpa}</div>
            <div><strong>Max Backlogs:</strong> ${drive.maxBacklogs}</div>
            ${drive.allowedBranches.length > 0 ? `<div><strong>Branches:</strong> ${drive.allowedBranches.join(', ')}</div>` : '<div><strong>Branches:</strong> All</div>'}
            ${drive.location ? `<div><strong>Location:</strong> ${drive.location}</div>` : ''}
            ${drive.ctc ? `<div><strong>CTC:</strong> ${drive.ctc}</div>` : ''}
            ${drive.applicationDeadline ? `<div><strong>Deadline:</strong> ${new Date(drive.applicationDeadline).toLocaleDateString()}</div>` : ''}
            <div><strong>Created:</strong> ${new Date(drive.createdAt).toLocaleDateString()}</div>
          </div>
          <div class="drive-actions action-buttons">
            <button class="secondary-button view-eligible-btn" data-drive-id="${drive.id}">👥 View Eligible</button>
            <button class="secondary-button notify-btn" data-drive-id="${drive.id}">📧 Notify All</button>
          </div>
        </article>
      `).join('')

      listEl.querySelectorAll('.view-eligible-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const driveId = parseInt((e.target as HTMLElement).getAttribute('data-drive-id') || '0')
          await showEligibleStudents(root, auth, driveId)
        })
      })

      listEl.querySelectorAll('.notify-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const driveId = parseInt((e.target as HTMLElement).getAttribute('data-drive-id') || '0')
          try {
            const data = await apiRequest<any>(`/api/tpo/drives/${driveId}/eligible-students`)
            alert(`Notification feature coming soon! Would notify ${data.eligibleCount} students via email/SMS.`)
          } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to get eligible students')
          }
        })
      })
    }
  } catch (err) {
    const loading = root.querySelector('#drives-management-loading')
    if (loading) {
      loading.innerHTML = `<p class="error-text">${err instanceof Error ? err.message : 'Failed to load drives'}</p>`
    }
  }
}

async function renderInterviewScheduler(root: HTMLDivElement, auth: AuthResponse) {
  const content = root.querySelector('#dashboard-content')
  if (!content) return

  content.innerHTML = `
    <div class="feature-header">
      <button id="back-to-dashboard" class="back-button">← Back to Dashboard</button>
      <h2>Interview Scheduler</h2>
      <p>Schedule interviews for students</p>
    </div>
    <div class="scheduler-placeholder">
      <p>Interview Scheduler coming soon!</p>
      <p class="placeholder-desc">This will include:</p>
      <ul>
        <li>Drag-and-drop calendar interface</li>
        <li>Slot assignment to students</li>
        <li>Conflict detection</li>
        <li>Panel management</li>
      </ul>
    </div>
  `

  const backBtn = root.querySelector('#back-to-dashboard')
  backBtn?.addEventListener('click', () => {
    renderDashboard(root, auth)
  })
}

// ==================== ALUMNI FEATURES ====================

function setupAlumniDashboardHandlers(root: HTMLDivElement, auth: AuthResponse) {
  const referralsCard = root.querySelector('[data-feature="job-referrals"]')
  const mentorshipCard = root.querySelector('[data-feature="mentorship"]')
  const jobsViewCard = root.querySelector('[data-feature="alumni-jobs-view"]')

  referralsCard?.addEventListener('click', () => {
    renderJobReferralForm(root, auth)
  })

  mentorshipCard?.addEventListener('click', () => {
    renderMentorshipSlots(root, auth)
  })

  jobsViewCard?.addEventListener('click', () => {
    renderAllJobReferrals(root, auth)
  })
}

async function renderJobReferralForm(root: HTMLDivElement, auth: AuthResponse) {
  const content = root.querySelector('#dashboard-content')
  if (!content) return

  content.innerHTML = `
    <div class="feature-header">
      <button id="back-to-dashboard" class="back-button">← Back to Dashboard</button>
      <h2>Post Job Referral</h2>
      <p>Share job openings from your company</p>
    </div>

    <div class="tpo-layout">
      <div class="tpo-form-panel">
        <form id="job-referral-form" class="resume-form">
          <div class="form-section">
            <label>
              Company Name *
              <input type="text" id="job-company" class="field" placeholder="e.g., Google" required />
            </label>
            <label>
              Job Title *
              <input type="text" id="job-title" class="field" placeholder="e.g., Software Engineer" required />
            </label>
            <label>
              Job Description
              <textarea id="job-description" class="field textarea" placeholder="Describe the role, requirements, etc."></textarea>
            </label>
          </div>

          <div class="form-section">
            <div class="form-row">
              <label>
                Location
                <input type="text" id="job-location" class="field" placeholder="e.g., Bangalore" />
              </label>
              <label>
                CTC Package
                <input type="text" id="job-ctc" class="field" placeholder="e.g., 15 LPA" />
              </label>
            </div>
            <label>
              Application Link
              <input type="url" id="job-link" class="field" placeholder="https://company.com/careers/..." />
            </label>
            <label>
              Expiry Date (optional)
              <input type="date" id="job-expiry" class="field" />
            </label>
          </div>

          <div class="form-actions">
            <button type="submit" class="primary-button">🚀 Post Job Referral</button>
          </div>

          <p id="job-error" class="error-text"></p>
          <p id="job-success" class="success-text"></p>
        </form>
      </div>

      <div class="tpo-results-panel">
        <h3>My Posted Jobs</h3>
        <div id="my-jobs-list">Loading...</div>
      </div>
    </div>
  `

  const backBtn = root.querySelector('#back-to-dashboard')
  backBtn?.addEventListener('click', () => {
    renderDashboard(root, auth)
  })

  const form = root.querySelector('#job-referral-form') as HTMLFormElement
  const errorEl = root.querySelector('#job-error')
  const successEl = root.querySelector('#job-success')

  form?.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (errorEl) errorEl.textContent = ''
    if (successEl) successEl.textContent = ''

    try {
      const payload = {
        companyName: (root.querySelector('#job-company') as HTMLInputElement)?.value || '',
        jobTitle: (root.querySelector('#job-title') as HTMLInputElement)?.value || '',
        description: (root.querySelector('#job-description') as HTMLTextAreaElement)?.value || '',
        location: (root.querySelector('#job-location') as HTMLInputElement)?.value || '',
        ctc: (root.querySelector('#job-ctc') as HTMLInputElement)?.value || '',
        applyLink: (root.querySelector('#job-link') as HTMLInputElement)?.value || '',
        expiryDate: (root.querySelector('#job-expiry') as HTMLInputElement)?.value || null,
      }

      await apiRequest('/api/alumni/jobs', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      if (successEl) successEl.textContent = 'Job referral posted successfully!'
      form.reset()
      loadMyJobs(root, auth)

      setTimeout(() => {
        if (successEl) successEl.textContent = ''
      }, 3000)
    } catch (err) {
      if (errorEl) errorEl.textContent = err instanceof Error ? err.message : 'Failed to post job'
    }
  })

  loadMyJobs(root, auth)
}

async function loadMyJobs(root: HTMLDivElement, _auth: AuthResponse) {
  try {
    const data = await apiRequest<{ jobs: any[] }>('/api/alumni/jobs')
    const listEl = root.querySelector('#my-jobs-list')

    if (!listEl) return

    if (!data.jobs || data.jobs.length === 0) {
      listEl.innerHTML = '<p class="empty-state">No jobs posted yet.</p>'
      return
    }

    listEl.innerHTML = data.jobs.map(job => `
      <div class="drive-summary-card">
        <div class="drive-summary-header">
          <strong>${job.companyName}</strong>
          <span class="drive-status">${job.status}</span>
        </div>
        <p class="drive-summary-role">${job.jobTitle}</p>
        ${job.location ? `<p style="font-size: 0.8rem; color: #9ca3af;">📍 ${job.location}</p>` : ''}
        ${job.ctc ? `<p style="font-size: 0.8rem; color: #9ca3af;">💰 ${job.ctc}</p>` : ''}
      </div>
    `).join('')
  } catch (err) {
    const listEl = root.querySelector('#my-jobs-list')
    if (listEl) {
      listEl.innerHTML = '<p class="error-text">Failed to load jobs</p>'
    }
  }
}

async function renderAllJobReferrals(root: HTMLDivElement, auth: AuthResponse) {
  const content = root.querySelector('#dashboard-content')
  if (!content) return

  content.innerHTML = `
    <div class="feature-header">
      <button id="back-to-dashboard" class="back-button">← Back to Dashboard</button>
      <h2>Job Referrals</h2>
      <p>Browse job openings posted by alumni</p>
    </div>
    <div id="all-jobs-loading">Loading jobs...</div>
    <div id="all-jobs-list"></div>
  `

  const backBtn = root.querySelector('#back-to-dashboard')
  backBtn?.addEventListener('click', () => {
    renderDashboard(root, auth)
  })

  try {
    const data = await apiRequest<{ jobs: any[] }>('/api/jobs')
    const listEl = root.querySelector('#all-jobs-list')
    const loading = root.querySelector('#all-jobs-loading')

    if (loading) loading.remove()

    if (!data.jobs || data.jobs.length === 0) {
      if (listEl) {
        listEl.innerHTML = '<div class="empty-state"><p>No job referrals available yet.</p></div>'
      }
      return
    }

    if (listEl) {
      listEl.innerHTML = data.jobs.map(job => `
        <article class="drive-card">
          <div class="drive-header">
            <div>
              <h3>${job.companyName}</h3>
              <p class="role-title">${job.jobTitle}</p>
              <p style="font-size: 0.8rem; color: #7dd3fc;">Posted by ${job.alumniName}</p>
            </div>
          </div>
          ${job.description ? `<p class="drive-description">${job.description}</p>` : ''}
          <div class="drive-details">
            ${job.location ? `<div><strong>Location:</strong> ${job.location}</div>` : ''}
            ${job.ctc ? `<div><strong>CTC:</strong> ${job.ctc}</div>` : ''}
            ${job.expiryDate ? `<div><strong>Expires:</strong> ${new Date(job.expiryDate).toLocaleDateString()}</div>` : ''}
          </div>
          <div class="drive-actions">
            ${job.applyLink
          ? `<a href="${job.applyLink}" target="_blank" class="apply-button" style="text-decoration: none; display: inline-block;">Apply Now</a>`
          : '<p style="color: #9ca3af; font-size: 0.85rem;">Contact alumni for application details</p>'
        }
          </div>
        </article>
      `).join('')
    }
  } catch (err) {
    const loading = root.querySelector('#all-jobs-loading')
    if (loading) {
      loading.innerHTML = `<p class="error-text">${err instanceof Error ? err.message : 'Failed to load jobs'}</p>`
    }
  }
}

async function renderMentorshipSlots(root: HTMLDivElement, auth: AuthResponse) {
  const content = root.querySelector('#dashboard-content')
  if (!content) return

  content.innerHTML = `
    <div class="feature-header">
      <button id="back-to-dashboard" class="back-button">← Back to Dashboard</button>
      <h2>Mentorship Slots</h2>
      <p>Create time slots for students to book</p>
    </div>

    <div class="tpo-layout">
      <div class="tpo-form-panel">
        <h3>Create New Slot</h3>
        <form id="mentorship-slot-form" class="resume-form">
          <div class="form-section">
            <div class="form-row">
              <label>
                Start Time *
                <input type="datetime-local" id="slot-start" class="field" required />
              </label>
              <label>
                End Time *
                <input type="datetime-local" id="slot-end" class="field" required />
              </label>
            </div>
            <label>
              Max Students
              <input type="number" id="max-students" class="field" min="1" value="1" />
            </label>
            <label>
              Description
              <textarea id="slot-description" class="field textarea" placeholder="What will you cover? (e.g., Mock interview, Resume review, Career guidance)"></textarea>
            </label>
          </div>

          <div class="form-actions">
            <button type="submit" class="primary-button">📅 Create Slot</button>
          </div>

          <p id="slot-error" class="error-text"></p>
          <p id="slot-success" class="success-text"></p>
        </form>
      </div>

      <div class="tpo-results-panel">
        <h3>My Slots</h3>
        <div id="my-slots-list">Loading...</div>
      </div>
    </div>
  `

  const backBtn = root.querySelector('#back-to-dashboard')
  backBtn?.addEventListener('click', () => {
    renderDashboard(root, auth)
  })

  const form = root.querySelector('#mentorship-slot-form') as HTMLFormElement
  const errorEl = root.querySelector('#slot-error')
  const successEl = root.querySelector('#slot-success')

  form?.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (errorEl) errorEl.textContent = ''
    if (successEl) successEl.textContent = ''

    try {
      const payload = {
        slotStart: (root.querySelector('#slot-start') as HTMLInputElement)?.value || '',
        slotEnd: (root.querySelector('#slot-end') as HTMLInputElement)?.value || '',
        maxStudents: parseInt((root.querySelector('#max-students') as HTMLInputElement)?.value || '1'),
        description: (root.querySelector('#slot-description') as HTMLTextAreaElement)?.value || '',
      }

      await apiRequest('/api/alumni/mentorship-slots', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      if (successEl) successEl.textContent = 'Mentorship slot created successfully!'
      form.reset()
      loadMySlots(root, auth)

      setTimeout(() => {
        if (successEl) successEl.textContent = ''
      }, 3000)
    } catch (err) {
      if (errorEl) errorEl.textContent = err instanceof Error ? err.message : 'Failed to create slot'
    }
  })

  loadMySlots(root, auth)
}

async function loadMySlots(root: HTMLDivElement, _auth: AuthResponse) {
  try {
    const data = await apiRequest<{ slots: any[] }>('/api/alumni/mentorship-slots')
    const listEl = root.querySelector('#my-slots-list')

    if (!listEl) return

    if (!data.slots || data.slots.length === 0) {
      listEl.innerHTML = '<p class="empty-state">No slots created yet.</p>'
      return
    }

    listEl.innerHTML = data.slots.map(slot => `
      <div class="drive-summary-card">
        <div class="drive-summary-header">
          <strong>${new Date(slot.slotStart).toLocaleString()}</strong>
          <span class="drive-status">${slot.status}</span>
        </div>
        <p style="font-size: 0.85rem; color: #9ca3af;">Until ${new Date(slot.slotEnd).toLocaleString()}</p>
        <p style="font-size: 0.8rem; color: #cbd5f5; margin-top: 0.5rem;">${slot.description || 'No description'}</p>
        <p style="font-size: 0.75rem; color: #7dd3fc; margin-top: 0.5rem;">
          ${slot.currentBookings}/${slot.maxStudents} students booked
        </p>
        ${slot.bookings && slot.bookings.length > 0 ? `
          <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid rgba(148,163,184,0.3);">
            <strong style="font-size: 0.8rem;">Booked by:</strong>
            ${slot.bookings.map((b: any) => `<div style="font-size: 0.75rem; color: #9ca3af;">${b.studentName} (${b.studentEmail})</div>`).join('')}
          </div>
        ` : ''}
      </div>
    `).join('')
  } catch (err) {
    const listEl = root.querySelector('#my-slots-list')
    if (listEl) {
      listEl.innerHTML = '<p class="error-text">Failed to load slots</p>'
    }
  }
}

// ==================== COMMON FEATURES (PlacementBot & Analytics) ====================

function setupCommonFeatures(root: HTMLDivElement, auth: AuthResponse, role: Role) {
  // Add PlacementBot button to dashboard
  const dashboardContent = root.querySelector('#dashboard-content')
  if (dashboardContent && role === 'STUDENT') {
    const botCard = document.createElement('article')
    botCard.className = 'card clickable-card'
    botCard.setAttribute('data-feature', 'placementbot')
    botCard.innerHTML = `
      <h2>PlacementBot</h2>
      <p>Ask anything about cutoffs, venues, timelines, and get instant answers.</p>
      <p class="card-tag">Click to chat →</p>
    `
    botCard.addEventListener('click', () => {
      renderPlacementBot(root, auth)
    })

    const grid = dashboardContent.querySelector('.grid')
    if (grid) {
      grid.appendChild(botCard)
    }
  }

  // Add Analytics for TPO
  if (role === 'TPO') {
    const analyticsCard = document.createElement('article')
    analyticsCard.className = 'card clickable-card'
    analyticsCard.setAttribute('data-feature', 'analytics')
    analyticsCard.innerHTML = `
      <h2>Market Intelligence</h2>
      <p>Analyze placement trends and identify skill gaps across branches and roles.</p>
      <p class="card-tag">Click to view analytics →</p>
    `
    analyticsCard.addEventListener('click', () => {
      renderAnalytics(root, auth)
    })

    const grid = root.querySelector('.grid')
    if (grid) {
      grid.appendChild(analyticsCard)
    }
  }

  // Add Skill Gap Analysis for Students
  if (role === 'STUDENT') {
    const skillGapCard = document.createElement('article')
    skillGapCard.className = 'card clickable-card'
    skillGapCard.setAttribute('data-feature', 'skill-gap')
    skillGapCard.innerHTML = `
      <h2>Skill Gap Analysis</h2>
      <p>Compare your skills with placed students and get personalized recommendations.</p>
      <p class="card-tag">Click to analyze →</p>
    `
    skillGapCard.addEventListener('click', () => {
      renderSkillGapAnalysis(root, auth)
    })

    const grid = root.querySelector('.grid')
    if (grid) {
      grid.appendChild(skillGapCard)
    }
  }
}

async function renderPlacementBot(root: HTMLDivElement, auth: AuthResponse) {
  const content = root.querySelector('#dashboard-content')
  if (!content) return

  content.innerHTML = `
    <div class="feature-header">
      <button id="back-to-dashboard" class="back-button">← Back to Dashboard</button>
      <h2>PlacementBot</h2>
      <p>Your 24/7 virtual career assistant</p>
    </div>

    <div class="bot-container">
      <div class="bot-chat">
        <div id="bot-messages" class="bot-messages">
          <div class="bot-message bot-message-bot">
            <strong>PlacementBot:</strong> Hi! I'm here to help. Ask me anything about placements, eligibility, interviews, or applications.
          </div>
        </div>
        <div class="bot-input-area">
          <input type="text" id="bot-input" class="field" placeholder="Type your question..." />
          <button id="bot-send" class="primary-button">💬 Send</button>
        </div>
      </div>
      <div class="bot-faqs">
        <h3>Frequently Asked Questions</h3>
        <div id="faq-list"></div>
      </div>
    </div>
  `

  const backBtn = root.querySelector('#back-to-dashboard')
  backBtn?.addEventListener('click', () => {
    renderDashboard(root, auth)
  })

  const input = root.querySelector('#bot-input') as HTMLInputElement
  const sendBtn = root.querySelector('#bot-send')
  const messagesEl = root.querySelector('#bot-messages')

  const sendMessage = async () => {
    const question = input?.value.trim()
    if (!question || !messagesEl) return

    // Add user message
    const userMsg = document.createElement('div')
    userMsg.className = 'bot-message bot-message-user'
    userMsg.innerHTML = `<strong>You:</strong> ${question}`
    messagesEl.appendChild(userMsg)
    input.value = ''

    // Show loading
    const loadingMsg = document.createElement('div')
    loadingMsg.className = 'bot-message bot-message-bot'
    loadingMsg.innerHTML = '<strong>PlacementBot:</strong> Thinking...'
    messagesEl.appendChild(loadingMsg)
    messagesEl.scrollTop = messagesEl.scrollHeight

    try {
      const response = await apiRequest<{ answer: string; relatedFAQs?: any[] }>('/api/bot/ask', {
        method: 'POST',
        body: JSON.stringify({ question }),
      })

      loadingMsg.innerHTML = `<strong>PlacementBot:</strong> ${response.answer}`

      if (response.relatedFAQs && response.relatedFAQs.length > 0) {
        const related = document.createElement('div')
        related.style.marginTop = '0.5rem'
        related.style.fontSize = '0.85rem'
        related.style.color = '#9ca3af'
        related.innerHTML = '<strong>Related:</strong> ' + response.relatedFAQs.map((f: any) => f.question).join(', ')
        loadingMsg.appendChild(related)
      }
    } catch (err) {
      loadingMsg.innerHTML = `<strong>PlacementBot:</strong> Sorry, I encountered an error. Please try again.`
    }

    messagesEl.scrollTop = messagesEl.scrollHeight
  }

  sendBtn?.addEventListener('click', sendMessage)
  input?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage()
  })

  // Load FAQs
  try {
    const faqData = await apiRequest<{ faqs: any[] }>('/api/bot/faqs')
    const faqList = root.querySelector('#faq-list')
    if (faqList) {
      faqList.innerHTML = faqData.faqs.map(faq => `
        <div class="faq-item" data-question="${faq.question}">
          <strong>${faq.question}</strong>
          <p>${faq.answer}</p>
        </div>
      `).join('')

      faqList.querySelectorAll('.faq-item').forEach(item => {
        item.addEventListener('click', () => {
          const question = item.getAttribute('data-question')
          if (question && input) {
            input.value = question
            sendMessage()
          }
        })
      })
    }
  } catch (err) {
    console.error('Failed to load FAQs', err)
  }
}

async function renderAnalytics(root: HTMLDivElement, auth: AuthResponse) {
  const content = root.querySelector('#dashboard-content')
  if (!content) return

  content.innerHTML = `
    <div class="feature-header">
      <button id="back-to-dashboard" class="back-button">← Back to Dashboard</button>
      <h2>Market Intelligence & Analytics</h2>
      <p>Data-driven insights for placement management</p>
    </div>
    <div id="analytics-loading">Loading analytics...</div>
    <div id="analytics-content"></div>
  `

  const backBtn = root.querySelector('#back-to-dashboard')
  backBtn?.addEventListener('click', () => {
    renderDashboard(root, auth)
  })

  try {
    const stats = await apiRequest<any>('/api/analytics/stats')
    const contentEl = root.querySelector('#analytics-content')
    const loading = root.querySelector('#analytics-loading')

    if (loading) loading.remove()

    if (contentEl) {
      contentEl.innerHTML = `
        <div class="analytics-grid">
          <div class="stat-card">
            <h3>${stats.totalStudents}</h3>
            <p>Total Students</p>
          </div>
          <div class="stat-card">
            <h3>${stats.totalDrives}</h3>
            <p>Total Drives</p>
          </div>
          <div class="stat-card">
            <h3>${stats.totalApplications}</h3>
            <p>Total Applications</p>
          </div>
          <div class="stat-card">
            <h3>${stats.selectedCount}</h3>
            <p>Selected Students</p>
          </div>
          <div class="stat-card stat-card-highlight">
            <h3>${stats.placementRate}%</h3>
            <p>Placement Rate</p>
          </div>
        </div>

        <div class="analytics-section">
          <h3>Branch-wise Statistics</h3>
          <div class="branch-stats">
            ${Object.entries(stats.branchStats).map(([branch, data]: [string, any]) => `
              <div class="branch-stat-item">
                <div class="branch-header">
                  <strong>${branch}</strong>
                  <span>${data.placed}/${data.total} placed</span>
                </div>
                <div class="branch-bar">
                  <div class="branch-bar-fill" style="width: ${(data.placed / data.total * 100)}%"></div>
                </div>
                <div class="branch-rate">${((data.placed / data.total) * 100).toFixed(1)}% placement rate</div>
              </div>
            `).join('')}
          </div>
        </div>
      `
    }
  } catch (err) {
    const loading = root.querySelector('#analytics-loading')
    if (loading) {
      loading.innerHTML = `<p class="error-text">${err instanceof Error ? err.message : 'Failed to load analytics'}</p>`
    }
  }
}

async function renderMentorshipBooking(root: HTMLDivElement, auth: AuthResponse) {
  const content = root.querySelector('#dashboard-content')
  if (!content) return

  content.innerHTML = `
    <div class="feature-header">
      <button id="back-to-dashboard" class="back-button">← Back to Dashboard</button>
      <h2>Mentorship Sessions</h2>
      <p>Book mentorship slots with alumni</p>
    </div>
    <div id="mentorship-loading">Loading available slots...</div>
    <div id="mentorship-list"></div>
  `

  const backBtn = root.querySelector('#back-to-dashboard')
  backBtn?.addEventListener('click', () => {
    renderDashboard(root, auth)
  })

  try {
    const data = await apiRequest<{ slots: any[] }>('/api/mentorship/available-slots')
    const listEl = root.querySelector('#mentorship-list')
    const loading = root.querySelector('#mentorship-loading')

    if (loading) loading.remove()

    if (!data.slots || data.slots.length === 0) {
      if (listEl) {
        listEl.innerHTML = `
          <div class="empty-state">
            <p>No mentorship slots available at the moment.</p>
            <p>Check back later or contact alumni directly.</p>
          </div>
        `
      }
      return
    }

    if (listEl) {
      listEl.innerHTML = data.slots.map(slot => `
        <article class="drive-card">
          <div class="drive-header">
            <div>
              <h3>${slot.alumniName}</h3>
              <p class="role-title">Mentorship Session</p>
            </div>
            <span class="status-badge status-applied">Available</span>
          </div>
          ${slot.description ? `<p class="drive-description">${slot.description}</p>` : ''}
          <div class="drive-details">
            <div><strong>Start:</strong> ${new Date(slot.slotStart).toLocaleString()}</div>
            <div><strong>End:</strong> ${new Date(slot.slotEnd).toLocaleString()}</div>
            <div><strong>Available Spots:</strong> ${slot.maxStudents - slot.currentBookings} / ${slot.maxStudents}</div>
          </div>
          <div class="drive-actions">
            ${slot.currentBookings < slot.maxStudents
          ? `<button class="apply-button book-slot-btn" data-slot-id="${slot.id}">📅 Book Slot</button>`
          : '<span class="status-badge status-rejected">Full</span>'
        }
          </div>
        </article>
      `).join('')

      listEl.querySelectorAll('.book-slot-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const slotId = parseInt((e.target as HTMLElement).getAttribute('data-slot-id') || '0')
          try {
            await apiRequest(`/api/mentorship/slots/${slotId}/book`, {
              method: 'POST',
            })
            alert('Slot booked successfully!')
            renderMentorshipBooking(root, auth) // Refresh
          } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to book slot')
          }
        })
      })
    }
  } catch (err) {
    const loading = root.querySelector('#mentorship-loading')
    if (loading) {
      loading.innerHTML = `<p class="error-text">${err instanceof Error ? err.message : 'Failed to load slots'}</p>`
    }
  }
}

async function renderSkillGapAnalysis(root: HTMLDivElement, auth: AuthResponse) {
  const content = root.querySelector('#dashboard-content')
  if (!content) return

  content.innerHTML = `
    <div class="feature-header">
      <button id="back-to-dashboard" class="back-button">← Back to Dashboard</button>
      <h2>Skill Gap Analysis</h2>
      <p>Compare your skills with placed students</p>
    </div>
    <div id="skill-gap-loading">Analyzing your skills...</div>
    <div id="skill-gap-content"></div>
  `

  const backBtn = root.querySelector('#back-to-dashboard')
  backBtn?.addEventListener('click', () => {
    renderDashboard(root, auth)
  })

  try {
    const data = await apiRequest<{ recommendations: any[] }>('/api/analytics/skill-gap')
    const contentEl = root.querySelector('#skill-gap-content')
    const loading = root.querySelector('#skill-gap-loading')

    if (loading) loading.remove()

    if (!data.recommendations || data.recommendations.length === 0) {
      if (contentEl) {
        contentEl.innerHTML = `
          <div class="empty-state">
            <p>Not enough data yet for skill gap analysis.</p>
            <p>Complete your profile and check back after more students get placed!</p>
          </div>
        `
      }
      return
    }

    if (contentEl) {
      contentEl.innerHTML = `
        <div class="skill-gap-intro">
          <p>Based on analysis of placed students, here are skills you might want to learn:</p>
        </div>
        <div class="recommendations-list">
          ${data.recommendations.map(rec => `
            <div class="recommendation-card">
              <div class="recommendation-header">
                <strong>${rec.skill}</strong>
                <span class="recommendation-percentage">${rec.percentage}%</span>
              </div>
              <p class="recommendation-text">${rec.recommendation}</p>
              <div class="recommendation-bar">
                <div class="recommendation-bar-fill" style="width: ${rec.percentage}%"></div>
              </div>
            </div>
          `).join('')}
        </div>
      `
    }
  } catch (err) {
    const loading = root.querySelector('#skill-gap-loading')
    if (loading) {
      loading.innerHTML = `<p class="error-text">${err instanceof Error ? err.message : 'Failed to analyze skills'}</p>`
    }
  }
}

async function renderEligibleDrives(root: HTMLDivElement, auth: AuthResponse) {
  const content = root.querySelector('#dashboard-content')
  if (!content) return

  content.innerHTML = `
    <div class="feature-header">
      <button id="back-to-dashboard" class="back-button">← Back to Dashboard</button>
      <h2>Live Eligible Drives</h2>
      <p>Companies and roles you're eligible for based on your profile</p>
    </div>
    <div id="drives-loading">Loading drives...</div>
    <div id="drives-list"></div>
  `

  const backBtn = root.querySelector('#back-to-dashboard')
  backBtn?.addEventListener('click', () => {
    renderDashboard(root, auth)
  })

  try {
    const data = await apiRequest<{ drives: any[] }>('/api/students/eligible-drives')
    const drivesList = root.querySelector('#drives-list')
    const loading = root.querySelector('#drives-loading')

    if (loading) loading.remove()

    if (!data.drives || data.drives.length === 0) {
      if (drivesList) {
        drivesList.innerHTML = `
          <div class="empty-state">
            <p>No eligible drives found. Make sure your profile is complete with CGPA and branch.</p>
            <button id="go-to-profile" class="primary-button">📝 Complete Profile</button>
          </div>
        `
        root.querySelector('#go-to-profile')?.addEventListener('click', () => {
          renderResumeWizard(root, auth)
        })
      }
      return
    }

    if (drivesList) {
      drivesList.innerHTML = data.drives.map(drive => `
        <article class="drive-card">
          <div class="drive-header">
            <h3>${drive.companyName}</h3>
            ${drive.roleTitle ? `<span class="role-badge">${drive.roleTitle}</span>` : ''}
          </div>
          ${drive.description ? `<p class="drive-description">${drive.description}</p>` : ''}
          <div class="drive-details">
            ${drive.location ? `<div><strong>Location:</strong> ${drive.location}</div>` : ''}
            ${drive.ctc ? `<div><strong>CTC:</strong> ${drive.ctc}</div>` : ''}
            <div><strong>Min CGPA:</strong> ${drive.minCgpa}</div>
            <div><strong>Max Backlogs:</strong> ${drive.maxBacklogs}</div>
            ${drive.allowedBranches.length > 0 ? `<div><strong>Branches:</strong> ${drive.allowedBranches.join(', ')}</div>` : ''}
            ${drive.applicationDeadline ? `<div><strong>Deadline:</strong> ${new Date(drive.applicationDeadline).toLocaleDateString()}</div>` : ''}
          </div>
          <div class="drive-actions">
            ${drive.hasApplied
          ? `<span class="status-badge status-${drive.applicationStatus?.toLowerCase()}">${drive.applicationStatus}</span>`
          : `<button class="apply-button" data-drive-id="${drive.id}">✨ Apply Now</button>`
        }
          </div>
        </article>
      `).join('')

      // Add apply button handlers
      drivesList.querySelectorAll('.apply-button').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const driveId = (e.target as HTMLElement).getAttribute('data-drive-id')
          if (!driveId) return

          try {
            await apiRequest(`/api/students/drives/${driveId}/apply`, {
              method: 'POST',
            })
            renderEligibleDrives(root, auth) // Refresh
          } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to apply')
          }
        })
      })
    }
  } catch (err) {
    const loading = root.querySelector('#drives-loading')
    if (loading) {
      const msg = err instanceof Error ? err.message : 'Failed to load drives'
      loading.innerHTML = `
        <div class="error-card" role="alert" aria-live="polite">
          <h3>Cannot connect to server</h3>
          <p class="error-text">${msg}</p>
          <p class="notice-text">Make sure the backend is running on <strong>http://localhost:4000</strong></p>

          <div class="form-actions">
            <button id="drives-retry" class="secondary-button">Retry</button>
            <button id="drives-help" class="ghost-button">Help</button>
          </div>

          <div id="backend-commands" class="cmd-block" style="display:none; margin-top:1rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:1rem;">
              <strong>Start backend (PowerShell)</strong>
              <button id="copy-commands" class="icon-button" title="Copy commands">Copy</button>
            </div>
            <pre>
cd server
npm install
npm run dev
            </pre>
            <p class="notice-text" style="margin-top:0.5rem;">Run these commands in a separate terminal to start the backend, then click Retry.</p>
          </div>
        </div>
      `

      const retryBtn = root.querySelector('#drives-retry') as HTMLButtonElement | null
      const helpBtn = root.querySelector('#drives-help') as HTMLButtonElement | null
      const commandsEl = root.querySelector('#backend-commands') as HTMLDivElement | null
      const copyBtn = root.querySelector('#copy-commands') as HTMLButtonElement | null

      retryBtn?.addEventListener('click', () => {
        renderEligibleDrives(root, auth)
      })

      helpBtn?.addEventListener('click', () => {
        if (!commandsEl) return
        commandsEl.style.display = commandsEl.style.display === 'none' ? 'block' : 'none'
      })

      copyBtn?.addEventListener('click', async () => {
        const pre = commandsEl?.querySelector('pre')
        const text = pre ? pre.textContent || '' : ''
        try {
          await navigator.clipboard.writeText(text)
          alert('Commands copied to clipboard')
        } catch {
          alert('Copy failed — select and copy manually:\n' + text)
        }
      })
    }
  }
}

async function renderApplications(root: HTMLDivElement, auth: AuthResponse) {
  const content = root.querySelector('#dashboard-content')
  if (!content) return

  content.innerHTML = `
    <div class="feature-header">
      <button id="back-to-dashboard" class="back-button">← Back to Dashboard</button>
      <h2>Application Tracker</h2>
      <p>Track the status of all your job applications</p>
    </div>
    <div id="applications-loading">Loading applications...</div>
    <div id="applications-list"></div>
  `

  const backBtn = root.querySelector('#back-to-dashboard')
  backBtn?.addEventListener('click', () => {
    renderDashboard(root, auth)
  })

  try {
    const data = await apiRequest<{ applications: any[] }>('/api/students/applications')
    const appsList = root.querySelector('#applications-list')
    const loading = root.querySelector('#applications-loading')

    if (loading) loading.remove()

    if (!data.applications || data.applications.length === 0) {
      if (appsList) {
        appsList.innerHTML = `
          <div class="empty-state">
            <p>You haven't applied to any drives yet.</p>
            <button id="view-drives" class="primary-button">🔍 Browse Eligible Drives</button>
          </div>
        `
        root.querySelector('#view-drives')?.addEventListener('click', () => {
          renderEligibleDrives(root, auth)
        })
      }
      return
    }

    if (appsList) {
      appsList.innerHTML = data.applications.map(app => `
        <article class="application-card">
          <div class="application-header">
            <h3>${app.drive?.companyName || 'Unknown Company'}</h3>
            <span class="status-badge status-${app.status?.toLowerCase()}">${app.status}</span>
          </div>
          ${app.drive?.roleTitle ? `<p class="role-title">${app.drive.roleTitle}</p>` : ''}
          <div class="application-details">
            ${app.drive?.location ? `<div><strong>Location:</strong> ${app.drive.location}</div>` : ''}
            ${app.drive?.ctc ? `<div><strong>CTC:</strong> ${app.drive.ctc}</div>` : ''}
            <div><strong>Applied:</strong> ${new Date(app.appliedAt).toLocaleDateString()}</div>
          </div>
        </article>
      `).join('')
    }
  } catch (err) {
    const loading = root.querySelector('#applications-loading')
    if (loading) {
      loading.innerHTML = `<p class="error-text">${err instanceof Error ? err.message : 'Failed to load applications'}</p>`
    }
  }
}

render()
