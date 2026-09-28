const mainContent = document.getElementById('mainContent');
const primaryNav = document.getElementById('primaryNav');
const dialog = document.getElementById('dialog');
const toast = document.getElementById('toast');

const state = {
  user: null,
  students: [],
  companies: [],
  jobs: [],
  applications: [],
  stats: {},
  demo: {},
  search: '',
  filter: 'all',
  toastTimer: null
};

const pageNames = {
  home: 'Overview', dashboard: 'Student dashboard', 'admin-dashboard': 'Admin dashboard',
  drives: 'Placement drives', companies: 'Company directory', eligibility: 'Eligibility criteria',
  applications: 'Application status', profile: 'Student profile', 'manage-students': 'Manage students',
  'manage-companies': 'Manage companies', 'manage-jobs': 'Manage placement drives',
  'manage-applications': 'Manage applications', statistics: 'Placement statistics'
};

const iconText = { home: '⌂', dashboard: '▦', drives: '↗', companies: '◇', eligibility: '✓', applications: '≡', profile: '◉', 'admin-dashboard': '▦', 'manage-students': '♙', 'manage-companies': '◇', 'manage-jobs': '↗', 'manage-applications': '≡', statistics: '▥' };
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const initials = value => String(value || '?').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
const formatDate = value => new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const statusClass = status => `status-${String(status || '').toLowerCase().replace(/[^a-z]+/g, '-')}`;
const companyFor = companyId => state.companies.find(company => company.id === companyId) || {};
const jobFor = jobId => state.jobs.find(job => job.id === jobId) || {};
const isAdmin = () => state.user?.role === 'admin';
const isStudent = () => state.user?.role === 'student';
const hasApplied = jobId => state.applications.some(application => application.jobId === jobId);
const eligible = job => isStudent() && Number(state.user.cgpa) >= Number(job.minCgpa) && (job.eligibleCourses || []).includes(state.user.course);

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) },
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Something went wrong. Please try again.');
  return result;
}

async function loadData() {
  const result = await api('/api/bootstrap');
  Object.assign(state, result);
  renderNav();
  renderPage();
  updateUserChip();
}

function updateUserChip() {
  document.getElementById('profileName').textContent = state.user?.name || (isAdmin() ? 'Administrator' : 'Guest');
  document.getElementById('avatar').textContent = initials(state.user?.name || 'Guest');
  document.getElementById('profileChip').setAttribute('aria-label', state.user ? 'Open account' : 'Sign in');
}

function navigationItems() {
  const common = [['home', 'Overview'], ['drives', 'Placement drives'], ['companies', 'Companies']];
  if (isStudent()) return [...common, ['eligibility', 'Eligibility'], ['applications', 'My applications'], ['profile', 'My profile']];
  if (isAdmin()) return [['admin-dashboard', 'Overview'], ['manage-students', 'Students'], ['manage-companies', 'Companies'], ['manage-jobs', 'Placement drives'], ['manage-applications', 'Applications'], ['statistics', 'Statistics']];
  return common;
}

function renderNav() {
  const current = location.hash.slice(1) || (isAdmin() ? 'admin-dashboard' : 'home');
  primaryNav.innerHTML = navigationItems().map(([page, label]) => `
    <a class="nav-link ${current === page ? 'active' : ''}" href="#${page}">
      <span class="nav-icon" aria-hidden="true">${iconText[page]}</span><span>${label}</span>
      ${page === 'applications' && state.applications.length ? `<span class="nav-count">${state.applications.length}</span>` : ''}
    </a>`).join('');
  document.getElementById('accountAction').innerHTML = state.user
    ? `<button class="sidebar-action" data-action="logout"><span class="nav-icon">↪</span>Sign out</button>`
    : `<button class="sidebar-action" data-action="login"><span class="nav-icon">↪</span>Student / admin sign in</button>`;
}

function pageHeading(title, description, action = '') {
  return `<div class="page-heading"><div><p class="eyebrow">MUIT · Placement & Career Services</p><h1>${title}</h1><p>${description}</p></div>${action}</div>`;
}

function metric(label, value, mark, note = '') {
  return `<div class="metric"><div class="metric-top"><span>${label}</span><span class="metric-mark">${mark}</span></div><strong>${value}<small>${note}</small></strong></div>`;
}

function driveCard(job) {
  const company = companyFor(job.companyId);
  const alreadyApplied = hasApplied(job.id);
  const canApply = eligible(job);
  const action = isAdmin()
    ? `<button class="button secondary small" data-action="edit-job" data-id="${escapeHtml(job.id)}">Manage drive</button>`
    : isStudent()
      ? alreadyApplied ? '<span class="tag green">Application sent</span>' : `<button class="button small" data-action="apply" data-id="${escapeHtml(job.id)}" ${canApply ? '' : 'disabled'}>${canApply ? 'Apply now' : 'Not eligible'}</button>`
      : '<button class="button small" data-action="login">Sign in to apply</button>';
  const skills = (job.skills || []).slice(0, 3).map(skill => `<span class="tag">${escapeHtml(skill)}</span>`).join(' ');
  return `<article class="job-card">
    <div class="job-card-top"><div class="job-company"><span class="company-logo">${escapeHtml(initials(company.name))}</span><div><small>${escapeHtml(company.industry || 'Technology')}</small><strong>${escapeHtml(company.name)}</strong></div></div><span class="tag green">${escapeHtml(job.type)}</span></div>
    <h3>${escapeHtml(job.title)}</h3><p class="job-description">${escapeHtml(job.description || 'Explore a new opportunity with this MUIT recruiting partner.')}</p>
    <div class="job-details"><span><strong>${escapeHtml(job.package)}</strong></span><span>${escapeHtml(job.location)}</span><span>CGPA ${escapeHtml(job.minCgpa)}+</span></div>
    <div class="job-card-bottom"><span class="job-deadline">Apply by ${formatDate(job.deadline)}</span><span>${action}</span></div>
    <div class="job-details">${skills}</div>
  </article>`;
}

function filteredJobs() {
  const query = state.search.toLowerCase();
  return state.jobs.filter(job => {
    const company = companyFor(job.companyId);
    const text = `${job.title} ${company.name} ${job.location} ${job.skills?.join(' ')}`.toLowerCase();
    const matchesQuery = !query || text.includes(query);
    const matchesType = state.filter === 'all' || job.type === state.filter;
    const matchesStatus = !isAdmin() || state.filter === 'all' || job.status === state.filter;
    return matchesQuery && matchesType && matchesStatus;
  });
}

function homePage() {
  const drives = state.jobs.filter(job => job.status === 'Open').slice(0, 3);
  const companies = state.companies.slice(0, 4);
  const studentName = isStudent() ? state.user.name.split(' ')[0] : '';
  return `<section class="hero"><div class="hero-content"><p class="eyebrow">Your next chapter starts here</p><h1>${studentName ? `Good to have you back, <span>${escapeHtml(studentName)}.</span>` : 'Make your learning<br />work for <span>what comes next.</span>'}</h1><p>Explore opportunities, connect with leading employers, and take your next step with the MUIT placement community.</p><div class="hero-actions"><a class="button" href="#drives">Explore open drives <span aria-hidden="true">↗</span></a>${state.user ? '<a class="button secondary" href="#applications">View my applications</a>' : '<button class="button secondary" data-action="register">Create student account</button>'}</div></div><div class="hero-aside"><span class="hero-number">${state.stats.openDrives || 0}</span><span>active placement drives</span></div></section>
    <div class="metric-grid">${metric('Partner companies', state.stats.companies || 0, '◇')}${metric('Active drives', state.stats.openDrives || 0, '↗')}${metric('Student applications', state.stats.applications || 0, '≡')}${metric('Placement rate', `${state.stats.placementRate || 0}%`, '↑', 'this season')}</div>
    <div class="content-grid"><section class="panel"><div class="section-heading"><h2>Open placement drives</h2><a class="text-link" href="#drives">Browse all →</a></div><div class="drive-list">${drives.length ? drives.map(job => `<div class="drive-row"><div><div class="drive-company">${escapeHtml(companyFor(job.companyId).name)}</div><h3>${escapeHtml(job.title)}</h3><div class="drive-meta"><span>${escapeHtml(job.location)}</span><span>CGPA ${escapeHtml(job.minCgpa)}+</span><span>Closes ${formatDate(job.deadline)}</span></div></div><div class="drive-side"><span class="salary">${escapeHtml(job.package)}</span><a class="text-link" href="#drives">Details ↗</a></div></div>`).join('') : '<div class="empty-state">No open placement drives at the moment.</div>'}</div></section>
    <section class="panel"><div class="section-heading"><h2>Hiring partners</h2><a class="text-link" href="#companies">View all →</a></div><div class="company-mini-list">${companies.map(company => `<div class="company-mini"><span class="company-logo">${escapeHtml(initials(company.name))}</span><span><strong>${escapeHtml(company.name)}</strong><small>${escapeHtml(company.industry)} · ${escapeHtml(company.location)}</small></span></div>`).join('')}</div></section></div>`;
}

function studentDashboard() {
  const studentApps = state.applications;
  const openJobs = state.jobs.filter(job => job.status === 'Open' && !hasApplied(job.id)).slice(0, 3);
  const selectedCount = studentApps.filter(application => application.status === 'Selected').length;
  return `${pageHeading(`Welcome back, ${escapeHtml(state.user.name.split(' ')[0])}`, 'A clear view of your placement journey and next opportunities.')}
    <div class="metric-grid">${metric('Applications', studentApps.length, '≡')}${metric('Shortlisted', studentApps.filter(application => ['Shortlisted', 'Interview scheduled'].includes(application.status)).length, '✓')}${metric('Interviews', studentApps.filter(application => application.status === 'Interview scheduled').length, '◷')}${metric('Offers', selectedCount, '✦')}</div>
    <div class="content-grid"><section class="panel"><div class="section-heading"><h2>Recent applications</h2><a class="text-link" href="#applications">View all →</a></div>${studentApps.length ? `<div class="table-wrap"><table><thead><tr><th>Role</th><th>Company</th><th>Applied</th><th>Status</th></tr></thead><tbody>${studentApps.slice(0, 5).map(application => `<tr><td><strong>${escapeHtml(application.job)}</strong></td><td>${escapeHtml(application.company)}</td><td>${new Date(application.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td><td><span class="status-pill ${statusClass(application.status)}">${escapeHtml(application.status)}</span></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state">Your applications will appear here once you apply to a drive.</div>'}</section>
    <section class="panel"><div class="section-heading"><h2>Profile snapshot</h2><a class="text-link" href="#profile">Edit profile →</a></div><div class="stat-line"><span>Course</span><strong>${escapeHtml(state.user.course)}</strong></div><div class="stat-line"><span>Graduating batch</span><strong>${escapeHtml(state.user.batch)}</strong></div><div class="stat-line"><span>Current CGPA</span><strong>${escapeHtml(state.user.cgpa)} / 10</strong></div><div class="stat-line"><span>Skills added</span><strong>${state.user.skills?.length || 0}</strong></div><div class="notice" style="margin-top:14px">Keep your profile up to date so recruiters can see your latest skills.</div></section></div>
    <div class="section-heading" style="margin-top:25px"><h2>Recommended drives</h2><a class="text-link" href="#drives">Explore all →</a></div><div class="job-grid">${openJobs.length ? openJobs.map(driveCard).join('') : '<div class="empty-state">You are all caught up on current drives.</div>'}</div>`;
}

function drivesPage() {
  const options = isAdmin() ? '<option value="all">All drive statuses</option><option>Open</option><option>Closed</option>' : '<option value="all">All opportunities</option><option>Full time</option><option>Internship</option>';
  const jobs = filteredJobs();
  return `${pageHeading('Placement drives', 'Find a role that matches your skills, goals, and eligibility.', isAdmin() ? '<button class="button" data-action="new-job">＋ Add placement drive</button>' : '')}
    ${isStudent() ? `<div class="notice" style="margin-bottom:14px">Your profile: <strong>${escapeHtml(state.user.course)}</strong> · CGPA <strong>${escapeHtml(state.user.cgpa)}</strong> · <a class="text-link" href="#profile">Update profile</a></div>` : ''}
    <div class="filter-bar"><label class="search-field"><span class="search-symbol">⌕</span><input id="searchInput" type="search" placeholder="Search role, company, or skill" value="${escapeHtml(state.search)}" /></label><select id="filterSelect" aria-label="Filter placement drives">${options}</select></div>
    <div class="job-grid">${jobs.length ? jobs.map(driveCard).join('') : '<div class="empty-state">No matching placement drives. Try a different search.</div>'}</div>`;
}

function companiesPage(manage = false) {
  const query = state.search.toLowerCase();
  const companies = state.companies.filter(company => `${company.name} ${company.industry} ${company.location}`.toLowerCase().includes(query));
  const action = manage ? '<button class="button" data-action="new-company">＋ Add company</button>' : '';
  const cards = companies.map(company => {
    const jobs = state.jobs.filter(job => job.companyId === company.id);
    const tools = manage ? `<div class="table-actions"><button class="button secondary small" data-action="edit-company" data-id="${escapeHtml(company.id)}">Edit</button><button class="button danger small" data-action="delete-company" data-id="${escapeHtml(company.id)}">Delete</button></div>` : `<a class="text-link" href="#drives">${jobs.length} ${jobs.length === 1 ? 'drive' : 'drives'} →</a>`;
    return `<article class="company-card"><div class="company-card-header"><span class="company-logo">${escapeHtml(initials(company.name))}</span><span><h3>${escapeHtml(company.name)}</h3><small>${escapeHtml(company.industry)}</small></span></div><p>${escapeHtml(company.about || 'MUIT placement partner')}</p><div class="company-foot"><span>${escapeHtml(company.location)}</span>${tools}</div></article>`;
  }).join('');
  return `${pageHeading(manage ? 'Manage companies' : 'Company directory', manage ? 'Maintain employer profiles and recruiting partnerships.' : 'Meet the organizations building their next teams with MUIT talent.', action)}
    <div class="filter-bar"><label class="search-field"><span class="search-symbol">⌕</span><input id="searchInput" type="search" placeholder="Search companies or industries" value="${escapeHtml(state.search)}" /></label></div>
    <div class="company-grid">${cards || '<div class="empty-state">No matching companies found.</div>'}</div>`;
}

function applicationTable(applications, admin = false) {
  if (!applications.length) return '<div class="empty-state">No applications to show yet.</div>';
  return `<div class="table-wrap"><table><thead><tr>${admin ? '<th>Student</th>' : ''}<th>Role</th><th>Company</th><th>Applied on</th><th>Status</th></tr></thead><tbody>${applications.map(application => `<tr>${admin ? `<td><span class="table-primary"><strong>${escapeHtml(application.student)}</strong><small>${escapeHtml(application.studentId)}</small></span></td>` : ''}<td><strong>${escapeHtml(application.job)}</strong><small style="display:block;margin-top:4px;color:#89938d">${escapeHtml(application.id)}</small></td><td>${escapeHtml(application.company)}</td><td>${new Date(application.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td><td>${admin ? `<select class="inline-select" data-application-status="${escapeHtml(application.id)}"><option ${application.status === 'Applied' ? 'selected' : ''}>Applied</option><option ${application.status === 'Under review' ? 'selected' : ''}>Under review</option><option ${application.status === 'Shortlisted' ? 'selected' : ''}>Shortlisted</option><option ${application.status === 'Interview scheduled' ? 'selected' : ''}>Interview scheduled</option><option ${application.status === 'Selected' ? 'selected' : ''}>Selected</option><option ${application.status === 'Not selected' ? 'selected' : ''}>Not selected</option></select>` : `<span class="status-pill ${statusClass(application.status)}">${escapeHtml(application.status)}</span>`}</td></tr>`).join('')}</tbody></table></div>`;
}

function applicationsPage(admin = false) {
  const apps = admin ? state.applications : state.applications;
  return `${pageHeading(admin ? 'Manage applications' : 'Application status', admin ? 'Review candidates and update each application as it moves forward.' : 'Follow every application from submission through to outcome.')}
    <div class="filter-bar"><label class="search-field"><span class="search-symbol">⌕</span><input id="searchInput" type="search" placeholder="Search role or company" value="${escapeHtml(state.search)}" /></label><select id="filterSelect" aria-label="Filter applications"><option value="all">All statuses</option>${['Applied', 'Under review', 'Shortlisted', 'Interview scheduled', 'Selected', 'Not selected'].map(status => `<option ${state.filter === status ? 'selected' : ''}>${status}</option>`).join('')}</select></div>
    <div id="applicationTable">${applicationTable(apps.filter(application => {
      const queryMatch = `${application.job} ${application.company} ${application.student || ''}`.toLowerCase().includes(state.search.toLowerCase());
      return queryMatch && (state.filter === 'all' || application.status === state.filter);
    }), admin)}</div>`;
}

function profilePage() {
  const student = state.user;
  const completion = Math.min(100, Math.round(30 + (student.phone ? 15 : 0) + (student.course ? 15 : 0) + (student.cgpa ? 20 : 0) + ((student.skills || []).length ? 20 : 0)));
  return `${pageHeading('Your student profile', 'Keep your academic details and skills current for recruiters.')}
    <div class="profile-layout"><aside class="profile-summary"><div class="profile-avatar">${escapeHtml(initials(student.name))}</div><h2>${escapeHtml(student.name)}</h2><p>${escapeHtml(student.course)} · Class of ${escapeHtml(student.batch)}</p><p class="profile-id">Student ID · ${escapeHtml(student.id)}</p><div style="margin-top:18px;text-align:left"><div class="stat-line" style="padding:0;border:0"><span>Profile completeness</span><strong>${completion}%</strong></div><div class="progress-track"><span style="width:${completion}%"></span></div></div></aside>
    <form class="form-panel" data-form="profile"><div class="section-heading"><h2>Academic & contact information</h2></div><div class="form-grid">
      <div class="form-field"><label for="profileNameField">Full name</label><input id="profileNameField" name="name" required value="${escapeHtml(student.name)}" /></div>
      <div class="form-field"><label for="profileEmail">University email</label><input id="profileEmail" value="${escapeHtml(student.email)}" disabled /></div>
      <div class="form-field"><label for="profilePhone">Phone number</label><input id="profilePhone" name="phone" required value="${escapeHtml(student.phone)}" /></div>
      <div class="form-field"><label for="profileCourse">Course</label><select id="profileCourse" name="course"><option ${student.course === 'BCA' ? 'selected' : ''}>BCA</option><option ${student.course === 'B.Tech' ? 'selected' : ''}>B.Tech</option><option ${student.course === 'MCA' ? 'selected' : ''}>MCA</option></select></div>
      <div class="form-field"><label for="profileBatch">Graduating batch</label><input id="profileBatch" name="batch" type="number" min="2024" max="2035" required value="${escapeHtml(student.batch)}" /></div>
      <div class="form-field"><label for="profileCgpa">Current CGPA (out of 10)</label><input id="profileCgpa" name="cgpa" type="number" min="0" max="10" step="0.01" required value="${escapeHtml(student.cgpa)}" /></div>
      <div class="form-field full"><label for="profileSkills">Skills</label><input id="profileSkills" name="skills" value="${escapeHtml((student.skills || []).join(', '))}" placeholder="JavaScript, SQL, Communication" /><small>Separate each skill with a comma.</small></div>
    </div><div class="form-actions"><button class="button" type="submit">Save profile</button></div></form></div>`;
}

function eligibilityPage() {
  const jobs = state.jobs.filter(job => job.status === 'Open');
  return `${pageHeading('Eligibility criteria', 'Review each drive’s requirements against your student profile.')}
    ${!isStudent() ? '<div class="notice warning" style="margin-bottom:15px">Sign in with a student account to see your personal eligibility.</div>' : ''}
    <div class="criteria-list">${jobs.map(job => {
      const company = companyFor(job.companyId);
      const cgpaOk = !isStudent() || Number(state.user.cgpa) >= Number(job.minCgpa);
      const courseOk = !isStudent() || job.eligibleCourses.includes(state.user.course);
      const passes = cgpaOk && courseOk;
      return `<article class="panel"><div class="section-heading"><div><h2>${escapeHtml(job.title)}</h2><p style="margin:5px 0 0;color:#849088;font-size:10px">${escapeHtml(company.name)} · ${escapeHtml(job.package)}</p></div><span class="tag ${passes ? 'green' : ''}">${isStudent() ? passes ? 'You are eligible' : 'Requirements not met' : 'Open drive'}</span></div><div class="criteria-item"><span class="criteria-check ${cgpaOk ? '' : 'no'}">${cgpaOk ? '✓' : '×'}</span><div><strong>Minimum CGPA: ${escapeHtml(job.minCgpa)} / 10 ${isStudent() ? `· Your CGPA: ${escapeHtml(state.user.cgpa)}` : ''}</strong><p>${cgpaOk ? 'Academic score requirement is met.' : 'Your current academic score is below the minimum.'}</p></div></div><div class="criteria-item" style="margin-top:8px"><span class="criteria-check ${courseOk ? '' : 'no'}">${courseOk ? '✓' : '×'}</span><div><strong>Eligible courses: ${escapeHtml(job.eligibleCourses.join(', '))} ${isStudent() ? `· Your course: ${escapeHtml(state.user.course)}` : ''}</strong><p>${courseOk ? 'Your course is included in this drive.' : 'Your course is not included in this drive.'}</p></div></div></article>`;
    }).join('') || '<div class="empty-state">There are no active drives to review.</div>'}</div>`;
}

function studentsPage() {
  const query = state.search.toLowerCase();
  const students = state.students.filter(student => `${student.name} ${student.email} ${student.id} ${student.course}`.toLowerCase().includes(query));
  return `${pageHeading('Manage students', 'Search student profiles and review placement readiness.')}
    <div class="metric-grid">${metric('Registered students', state.stats.students || 0, '♙')}${metric('Active applicants', new Set(state.applications.map(application => application.studentId)).size, '≡')}${metric('Placed this season', state.stats.placed || 0, '✦')}${metric('Open drives', state.stats.openDrives || 0, '↗')}</div>
    <div class="filter-bar"><label class="search-field"><span class="search-symbol">⌕</span><input id="searchInput" type="search" placeholder="Search name, email, ID, or course" value="${escapeHtml(state.search)}" /></label></div>
    <div class="table-wrap"><table><thead><tr><th>Student</th><th>Course / Batch</th><th>CGPA</th><th>Skills</th><th>Applications</th><th>Actions</th></tr></thead><tbody>${students.map(student => `<tr><td><span class="table-primary"><strong>${escapeHtml(student.name)}</strong><small>${escapeHtml(student.email)} · ${escapeHtml(student.id)}</small></span></td><td>${escapeHtml(student.course)} · ${escapeHtml(student.batch)}</td><td><span class="tag ${Number(student.cgpa) >= 7 ? 'green' : ''}">${escapeHtml(student.cgpa)}</span></td><td>${escapeHtml((student.skills || []).slice(0, 3).join(', ') || '—')}</td><td>${state.applications.filter(application => application.studentId === student.id).length}</td><td><button class="button danger small" data-action="delete-student" data-id="${escapeHtml(student.id)}">Remove</button></td></tr>`).join('')}</tbody></table>${students.length ? '' : '<div class="empty-state">No matching students found.</div>'}</div>`;
}

function jobsAdminPage() {
  const jobs = filteredJobs();
  return `${pageHeading('Manage placement drives', 'Create opportunities and keep drive details current.', '<button class="button" data-action="new-job">＋ Add placement drive</button>')}
    <div class="filter-bar"><label class="search-field"><span class="search-symbol">⌕</span><input id="searchInput" type="search" placeholder="Search role, company, or skill" value="${escapeHtml(state.search)}" /></label><select id="filterSelect"><option value="all">All statuses</option><option ${state.filter === 'Open' ? 'selected' : ''}>Open</option><option ${state.filter === 'Closed' ? 'selected' : ''}>Closed</option></select></div>
    <div class="table-wrap"><table><thead><tr><th>Role / Company</th><th>Package</th><th>Eligibility</th><th>Deadline</th><th>Status</th><th>Actions</th></tr></thead><tbody>${jobs.map(job => `<tr><td><span class="table-primary"><strong>${escapeHtml(job.title)}</strong><small>${escapeHtml(companyFor(job.companyId).name)} · ${escapeHtml(job.location)}</small></span></td><td>${escapeHtml(job.package)}</td><td>${escapeHtml(job.eligibleCourses.join(', '))} · ${escapeHtml(job.minCgpa)} CGPA</td><td>${formatDate(job.deadline)}</td><td><span class="status-pill ${job.status === 'Open' ? 'status-selected' : ''}">${escapeHtml(job.status)}</span></td><td><div class="table-actions"><button class="button secondary small" data-action="edit-job" data-id="${escapeHtml(job.id)}">Edit</button><button class="button danger small" data-action="delete-job" data-id="${escapeHtml(job.id)}">Delete</button></div></td></tr>`).join('')}</tbody></table>${jobs.length ? '' : '<div class="empty-state">No matching placement drives found.</div>'}</div>`;
}

function statisticsPage() {
  const statuses = ['Applied', 'Under review', 'Shortlisted', 'Interview scheduled', 'Selected', 'Not selected'];
  const counts = statuses.map(status => state.applications.filter(application => application.status === status).length);
  const max = Math.max(1, ...counts);
  const placedByCompany = state.companies.map(company => ({ name: company.name, count: state.applications.filter(application => application.status === 'Selected' && jobFor(application.jobId).companyId === company.id).length })).filter(company => company.count).sort((a, b) => b.count - a.count);
  const barLabels = ['Applied', 'Review', 'Shortlist', 'Interview', 'Selected', 'Declined'];
  return `${pageHeading('Placement statistics', 'A live snapshot of this season’s student and employer activity.')}
    <div class="metric-grid">${metric('Students registered', state.stats.students || 0, '♙')}${metric('Recruiting partners', state.stats.companies || 0, '◇')}${metric('Open drives', state.stats.openDrives || 0, '↗')}${metric('Placement rate', `${state.stats.placementRate || 0}%`, '↑')}</div>
    <div class="stats-layout"><section class="panel"><h2 class="chart-title">Applications by status</h2><div class="bar-chart" role="img" aria-label="Application count by status">${counts.map((count, index) => `<div class="bar-group"><span class="bar-value">${count}</span><div class="bar" style="height:${Math.max(3, count / max * 145)}px"></div><span class="bar-label">${barLabels[index]}</span></div>`).join('')}</div></section>
    <section class="panel"><h2 class="chart-title">Season overview</h2><div class="stat-line"><span>Total applications</span><strong>${state.stats.applications || 0}</strong></div><div class="stat-line"><span>Students with applications</span><strong>${new Set(state.applications.map(application => application.studentId)).size}</strong></div><div class="stat-line"><span>Offers recorded</span><strong>${state.stats.placed || 0}</strong></div><div class="stat-line"><span>Offer rate</span><strong>${state.stats.placementRate || 0}%</strong></div></section>
    <section class="panel"><h2 class="chart-title">Offers by employer</h2>${placedByCompany.length ? placedByCompany.map(company => `<div class="stat-line"><span>${escapeHtml(company.name)}</span><strong>${company.count}</strong></div>`).join('') : '<p style="margin:0;color:#869189;font-size:10px">Offers will be shown here once applications are marked selected.</p>'}</section>
    <section class="panel"><h2 class="chart-title">About these figures</h2><p style="margin:0;color:#7d8981;font-size:10px;line-height:1.7">Statistics are calculated from the current MUIT placement records. The placement rate reflects selected offers as a share of registered student profiles.</p></section></div>`;
}

function adminDashboard() {
  const recent = [...state.applications].sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt)).slice(0, 5);
  return `<div class="admin-banner"><span><strong>Placement office</strong> · Administrator workspace</span><span>Season 2025–26 · Live records</span></div>
    ${pageHeading('Placement overview', 'Monitor student activity and keep recruiting operations moving.', '<button class="button" data-action="new-job">＋ Create a drive</button>')}
    <div class="metric-grid">${metric('Registered students', state.stats.students || 0, '♙')}${metric('Recruiting companies', state.stats.companies || 0, '◇')}${metric('Open placement drives', state.stats.openDrives || 0, '↗')}${metric('Applications received', state.stats.applications || 0, '≡')}</div>
    <div class="content-grid"><section class="panel"><div class="section-heading"><h2>Recent applications</h2><a class="text-link" href="#manage-applications">Manage →</a></div>${applicationTable(recent, true)}</section>
    <section class="panel"><div class="section-heading"><h2>Quick actions</h2></div><div class="criteria-list"><button class="criteria-item" data-action="new-company" style="width:100%;text-align:left"><span class="criteria-check">＋</span><span><strong>Add a recruiting partner</strong><p>Create a company profile in the directory.</p></span></button><button class="criteria-item" data-action="new-job" style="width:100%;text-align:left"><span class="criteria-check">↗</span><span><strong>Publish a placement drive</strong><p>Set eligibility and application deadlines.</p></span></button><a class="criteria-item" href="#manage-students"><span class="criteria-check">♙</span><span><strong>Review student profiles</strong><p>Search batch, course, CGPA, and skills.</p></span></a></div></section></div>`;
}

function authPrompt() {
  return `<div class="auth-prompt"><div class="profile-avatar">M</div><h2>Sign in to your MUIT portal</h2><p>This workspace is available to registered students and placement administrators. Your public drive and company directories remain open to browse.</p><button class="button" data-action="login">Continue to sign in</button></div>`;
}

function renderPage() {
  const current = location.hash.slice(1) || (isAdmin() ? 'admin-dashboard' : 'home');
  const protectedPages = ['dashboard', 'admin-dashboard', 'eligibility', 'applications', 'profile', 'manage-students', 'manage-companies', 'manage-jobs', 'manage-applications', 'statistics'];
  const studentPages = ['dashboard', 'eligibility', 'applications', 'profile'];
  const adminPages = ['admin-dashboard', 'manage-students', 'manage-companies', 'manage-jobs', 'manage-applications', 'statistics'];
  let html;
  if (protectedPages.includes(current) && !state.user) html = authPrompt();
  else if (studentPages.includes(current) && !isStudent()) html = authPrompt();
  else if (adminPages.includes(current) && !isAdmin()) html = authPrompt();
  else {
    const pages = {
      home: homePage,
      dashboard: studentDashboard,
      'admin-dashboard': adminDashboard,
      drives: drivesPage,
      companies: () => companiesPage(false),
      eligibility: eligibilityPage,
      applications: () => applicationsPage(false),
      profile: profilePage,
      'manage-students': studentsPage,
      'manage-companies': () => companiesPage(true),
      'manage-jobs': jobsAdminPage,
      'manage-applications': () => applicationsPage(true),
      statistics: statisticsPage
    };
    html = (pages[current] || homePage)();
  }
  document.getElementById('currentSection').textContent = pageNames[current] || 'Overview';
  mainContent.innerHTML = html;
  primaryNav.querySelectorAll('.nav-link').forEach(link => link.classList.toggle('active', link.hash === `#${current}`));
  if (document.getElementById('filterSelect') && ['manage-jobs', 'manage-applications', 'applications', 'drives'].includes(current)) {
    const filterSelect = document.getElementById('filterSelect');
    const expected = state.filter === 'all' ? 'all' : state.filter;
    if ([...filterSelect.options].some(option => option.value === expected || option.text === expected)) filterSelect.value = expected;
  }
}

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

function openDialog(content) {
  dialog.className = 'modal-form';
  dialog.innerHTML = `<div class="modal-inner">${content}</div>`;
  dialog.showModal();
}

function authDialog(mode = 'login') {
  const register = mode === 'register';
  openDialog(`<div class="modal-top"><div><p class="eyebrow">Maharishi University of Information Technology</p><h2 id="dialogTitle">${register ? 'Create your student account' : 'Welcome to MUIT'}</h2><p>${register ? 'Register to explore and apply for placement drives.' : 'Sign in to continue to your placement workspace.'}</p></div><button class="close-button" type="button" data-action="close-dialog" aria-label="Close">×</button></div>
    <form data-form="${register ? 'register' : 'login'}" class="modal-fields">${register ? `<div class="form-field"><label for="regName">Full name</label><input id="regName" name="name" autocomplete="name" required /></div><div class="form-field"><label for="regEmail">University email</label><input id="regEmail" name="email" type="email" autocomplete="email" required /></div><div class="form-field"><label for="regPhone">Phone number</label><input id="regPhone" name="phone" type="tel" pattern="[0-9+() -]{8,16}" required /></div><div class="form-field"><label for="regCourse">Course</label><select id="regCourse" name="course"><option>BCA</option><option>B.Tech</option><option>MCA</option></select></div><div class="form-field"><label for="regBatch">Graduating batch</label><input id="regBatch" name="batch" type="number" min="2024" max="2035" value="2026" required /></div><div class="form-field"><label for="regCgpa">Current CGPA</label><input id="regCgpa" name="cgpa" type="number" min="0" max="10" step="0.01" value="7" required /></div><div class="form-field"><label for="regPassword">Password</label><input id="regPassword" name="password" type="password" minlength="8" autocomplete="new-password" required /></div>` : `<div class="form-field"><label for="loginRole">Account type</label><select id="loginRole" name="role"><option value="student">Student</option><option value="admin">Placement administrator</option></select></div><div class="form-field"><label for="loginEmail">Email address</label><input id="loginEmail" name="email" type="email" autocomplete="username" required /></div><div class="form-field"><label for="loginPassword">Password</label><input id="loginPassword" name="password" type="password" autocomplete="current-password" required /></div><div class="demo-note"><strong>Sample student:</strong> aarav.sharma@muit.ac.in / Welcome@123<br /><strong>Admin:</strong> admin@muit.ac.in / Admin@123</div>`}<div class="modal-footer"><button class="modal-switch" type="button" data-action="${register ? 'login' : 'register'}">${register ? 'Already registered? Sign in' : 'New student? Create account'}</button><button class="button" type="submit">${register ? 'Create account' : 'Sign in'}</button></div></form>`);
}

function companyDialog(company = null) {
  const editing = Boolean(company);
  openDialog(`<div class="modal-top"><div><p class="eyebrow">Employer directory</p><h2 id="dialogTitle">${editing ? 'Edit company' : 'Add a company'}</h2><p>Maintain a helpful profile for MUIT students and recruiters.</p></div><button class="close-button" type="button" data-action="close-dialog">×</button></div>
    <form data-form="company" data-id="${editing ? escapeHtml(company.id) : ''}" class="modal-fields"><div class="form-field"><label>Company name</label><input name="name" required value="${escapeHtml(company?.name)}" /></div><div class="form-field"><label>Industry</label><input name="industry" required value="${escapeHtml(company?.industry)}" /></div><div class="form-field"><label>Location</label><input name="location" required value="${escapeHtml(company?.location)}" /></div><div class="form-field"><label>Website</label><input name="website" type="url" placeholder="https://example.com" value="${escapeHtml(company?.website)}" /></div><div class="form-field"><label>About</label><textarea name="about">${escapeHtml(company?.about)}</textarea></div><div class="modal-footer"><span></span><button class="button" type="submit">${editing ? 'Save changes' : 'Add company'}</button></div></form>`);
}

function jobDialog(job = null) {
  const editing = Boolean(job);
  const eligibleCourses = job?.eligibleCourses || ['BCA'];
  openDialog(`<div class="modal-top"><div><p class="eyebrow">Placement drive</p><h2 id="dialogTitle">${editing ? 'Edit placement drive' : 'Create placement drive'}</h2><p>Set clear eligibility and application details for students.</p></div><button class="close-button" type="button" data-action="close-dialog">×</button></div>
    <form data-form="job" data-id="${editing ? escapeHtml(job.id) : ''}" class="modal-fields"><div class="form-field"><label>Company</label><select name="companyId" required>${state.companies.map(company => `<option value="${escapeHtml(company.id)}" ${job?.companyId === company.id ? 'selected' : ''}>${escapeHtml(company.name)}</option>`).join('')}</select></div><div class="form-field"><label>Job title</label><input name="title" required value="${escapeHtml(job?.title)}" /></div><div class="form-field"><label>Type</label><select name="type"><option ${job?.type === 'Full time' ? 'selected' : ''}>Full time</option><option ${job?.type === 'Internship' ? 'selected' : ''}>Internship</option><option ${job?.type === 'Part time' ? 'selected' : ''}>Part time</option></select></div><div class="form-field"><label>Location</label><input name="location" required value="${escapeHtml(job?.location)}" /></div><div class="form-field"><label>Package / stipend</label><input name="package" required value="${escapeHtml(job?.package)}" placeholder="₹ 6.0 LPA" /></div><div class="form-field"><label>Minimum CGPA</label><input name="minCgpa" type="number" min="0" max="10" step="0.1" value="${escapeHtml(job?.minCgpa ?? 6)}" required /></div><div class="form-field"><label>Eligible courses</label><select name="eligibleCourses" multiple size="3" aria-label="Select eligible courses">${['BCA', 'B.Tech', 'MCA'].map(course => `<option value="${course}" ${eligibleCourses.includes(course) ? 'selected' : ''}>${course}</option>`).join('')}</select><small>Use Ctrl or Command to select multiple.</small></div><div class="form-field"><label>Application deadline</label><input name="deadline" type="date" required value="${escapeHtml(job?.deadline)}" /></div><div class="form-field"><label>Status</label><select name="status"><option ${!job || job.status === 'Open' ? 'selected' : ''}>Open</option><option ${job?.status === 'Closed' ? 'selected' : ''}>Closed</option></select></div><div class="form-field"><label>Required skills (comma separated)</label><input name="skills" value="${escapeHtml((job?.skills || []).join(', '))}" /></div><div class="form-field"><label>Role description</label><textarea name="description">${escapeHtml(job?.description)}</textarea></div><div class="modal-footer"><span></span><button class="button" type="submit">${editing ? 'Save changes' : 'Publish drive'}</button></div></form>`);
}

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

async function finishAuth() {
  dialog.close();
  state.search = '';
  state.filter = 'all';
  await loadData();
  location.hash = isAdmin() ? 'admin-dashboard' : 'dashboard';
  renderNav();
  renderPage();
  showToast(`Signed in to the MUIT portal as ${isAdmin() ? 'administrator' : 'student'}.`);
}

document.addEventListener('click', async event => {
  const actionElement = event.target.closest('[data-action]');
  if (actionElement) {
    const { action, id } = actionElement.dataset;
    try {
      if (action === 'login') authDialog('login');
      if (action === 'register') authDialog('register');
      if (action === 'close-dialog') dialog.close();
      if (action === 'new-company') companyDialog();
      if (action === 'edit-company') companyDialog(state.companies.find(company => company.id === id));
      if (action === 'new-job') {
        if (!state.companies.length) return showToast('Add a company before creating a placement drive.', true);
        jobDialog();
      }
      if (action === 'edit-job') jobDialog(state.jobs.find(job => job.id === id));
      if (action === 'apply') {
        await api('/api/applications', { method: 'POST', body: { jobId: id } });
        await loadData();
        showToast('Your application was submitted successfully.');
      }
      if (action === 'delete-student' && confirm('Remove this student and their applications?')) {
        await api(`/api/students/${encodeURIComponent(id)}`, { method: 'DELETE' });
        await loadData();
        showToast('Student record removed.');
      }
      if (action === 'delete-company' && confirm('Delete this company, its drives, and linked applications?')) {
        await api(`/api/companies/${encodeURIComponent(id)}`, { method: 'DELETE' });
        await loadData();
        showToast('Company and linked records removed.');
      }
      if (action === 'delete-job' && confirm('Delete this placement drive and its applications?')) {
        await api(`/api/jobs/${encodeURIComponent(id)}`, { method: 'DELETE' });
        await loadData();
        showToast('Placement drive removed.');
      }
      if (action === 'logout') {
        await api('/api/auth/logout', { method: 'POST' });
        state.user = null;
        state.search = '';
        state.filter = 'all';
        await loadData();
        location.hash = 'home';
        renderNav();
        renderPage();
        showToast('You have signed out.');
      }
    } catch (error) { showToast(error.message, true); }
  }
  if (event.target.id === 'profileChip') {
    if (!state.user) authDialog('login');
    else location.hash = isAdmin() ? 'admin-dashboard' : 'profile';
  }
});

document.addEventListener('submit', async event => {
  const form = event.target.closest('form[data-form]');
  if (!form) return;
  event.preventDefault();
  const type = form.dataset.form;
  const values = formValues(form);
  const submitButton = form.querySelector('[type="submit"]');
  if (submitButton) submitButton.disabled = true;
  try {
    if (type === 'login') {
      await api('/api/auth/login', { method: 'POST', body: values });
      await finishAuth();
    }
    if (type === 'register') {
      await api('/api/students/register', { method: 'POST', body: values });
      await finishAuth();
    }
    if (type === 'profile') {
      values.skills = values.skills.split(',').map(skill => skill.trim()).filter(Boolean);
      await api(`/api/students/${encodeURIComponent(state.user.id)}`, { method: 'PUT', body: values });
      await loadData();
      showToast('Your student profile has been updated.');
    }
    if (type === 'company') {
      const editing = Boolean(form.dataset.id);
      await api(editing ? `/api/companies/${encodeURIComponent(form.dataset.id)}` : '/api/companies', { method: editing ? 'PUT' : 'POST', body: values });
      dialog.close();
      await loadData();
      showToast(editing ? 'Company details updated.' : 'Company added to the directory.');
    }
    if (type === 'job') {
      const selectedCourses = [...form.elements.eligibleCourses.selectedOptions].map(option => option.value);
      const body = { ...values, eligibleCourses: selectedCourses.length ? selectedCourses : ['BCA'], minCgpa: Number(values.minCgpa), skills: values.skills.split(',').map(skill => skill.trim()).filter(Boolean) };
      const editing = Boolean(form.dataset.id);
      await api(editing ? `/api/jobs/${encodeURIComponent(form.dataset.id)}` : '/api/jobs', { method: editing ? 'PUT' : 'POST', body });
      dialog.close();
      await loadData();
      showToast(editing ? 'Placement drive updated.' : 'Placement drive published.');
    }
  } catch (error) {
    showToast(error.message, true);
    if (submitButton) submitButton.disabled = false;
  }
});

document.addEventListener('input', event => {
  if (event.target.id !== 'searchInput') return;
  state.search = event.target.value;
  const position = event.target.selectionStart;
  renderPage();
  const replacement = document.getElementById('searchInput');
  replacement?.focus();
  replacement?.setSelectionRange(position, position);
});

document.addEventListener('change', async event => {
  if (event.target.id === 'filterSelect') {
    state.filter = event.target.value;
    renderPage();
  }
  if (event.target.matches('[data-application-status]')) {
    try {
      await api(`/api/applications/${encodeURIComponent(event.target.dataset.applicationStatus)}`, { method: 'PATCH', body: { status: event.target.value } });
      await loadData();
      showToast('Application status updated.');
    } catch (error) { showToast(error.message, true); }
  }
});

document.getElementById('menuToggle').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
document.addEventListener('click', event => {
  if (event.target.closest('.nav-link')) document.getElementById('sidebar').classList.remove('open');
});
window.addEventListener('hashchange', () => { state.search = ''; renderNav(); renderPage(); mainContent.focus({ preventScroll: true }); });

loadData().catch(error => {
  mainContent.innerHTML = `<div class="auth-prompt"><div class="profile-avatar">!</div><h2>Could not connect to the placement portal</h2><p>${escapeHtml(error.message)} Check that the Express server is running, then refresh this page.</p><button class="button" onclick="location.reload()">Retry connection</button></div>`;
});
