const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIRECTORY = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIRECTORY, 'muit-placement.json');
const SESSION_SECRET = process.env.SESSION_SECRET || 'muit-placement-demo-session-secret';

app.use(express.json());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, 'public')));

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, expectedHash] = storedHash.split(':');
  const actualHash = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  return actualHash.length === expected.length && crypto.timingSafeEqual(actualHash, expected);
}

function createSeedData() {
  const students = [
    { id: 'STU-2026-001', name: 'Aarav Sharma', email: 'aarav.sharma@muit.ac.in', phone: '9876543210', course: 'BCA', branch: 'Computer Applications', batch: '2026', cgpa: 8.4, skills: ['JavaScript', 'React', 'SQL'], status: 'Active', passwordHash: hashPassword('Welcome@123') },
    { id: 'STU-2026-002', name: 'Isha Verma', email: 'isha.verma@muit.ac.in', phone: '9876543211', course: 'BCA', branch: 'Computer Applications', batch: '2026', cgpa: 9.1, skills: ['Python', 'Machine Learning', 'SQL'], status: 'Active', passwordHash: hashPassword('Welcome@123') },
    { id: 'STU-2026-003', name: 'Kabir Singh', email: 'kabir.singh@muit.ac.in', phone: '9876543212', course: 'BCA', branch: 'Computer Applications', batch: '2026', cgpa: 7.8, skills: ['Java', 'Spring Boot', 'MySQL'], status: 'Active', passwordHash: hashPassword('Welcome@123') },
    { id: 'STU-2026-004', name: 'Meera Gupta', email: 'meera.gupta@muit.ac.in', phone: '9876543213', course: 'BCA', branch: 'Computer Applications', batch: '2026', cgpa: 8.7, skills: ['UI/UX', 'Figma', 'HTML'], status: 'Active', passwordHash: hashPassword('Welcome@123') },
    { id: 'STU-2026-005', name: 'Rohan Patel', email: 'rohan.patel@muit.ac.in', phone: '9876543214', course: 'BCA', branch: 'Computer Applications', batch: '2026', cgpa: 7.2, skills: ['C++', 'Data Structures', 'Python'], status: 'Active', passwordHash: hashPassword('Welcome@123') },
    { id: 'STU-2026-006', name: 'Ananya Das', email: 'ananya.das@muit.ac.in', phone: '9876543215', course: 'BCA', branch: 'Computer Applications', batch: '2026', cgpa: 8.9, skills: ['Java', 'Cloud', 'AWS'], status: 'Active', passwordHash: hashPassword('Welcome@123') },
    { id: 'STU-2026-007', name: 'Dev Malhotra', email: 'dev.malhotra@muit.ac.in', phone: '9876543216', course: 'BCA', branch: 'Computer Applications', batch: '2026', cgpa: 6.8, skills: ['HTML', 'CSS', 'JavaScript'], status: 'Active', passwordHash: hashPassword('Welcome@123') },
    { id: 'STU-2026-008', name: 'Sara Khan', email: 'sara.khan@muit.ac.in', phone: '9876543217', course: 'BCA', branch: 'Computer Applications', batch: '2026', cgpa: 8.2, skills: ['Testing', 'Selenium', 'Java'], status: 'Active', passwordHash: hashPassword('Welcome@123') }
  ];
  const companies = [
    { id: 'CMP-001', name: 'Infosys', industry: 'IT Services', location: 'Bengaluru, India', website: 'https://www.infosys.com', about: 'Global leader in next-generation digital services and consulting.', hiring: true },
    { id: 'CMP-002', name: 'HCLTech', industry: 'Technology', location: 'Noida, India', website: 'https://www.hcltech.com', about: 'Global technology company helping enterprises reimagine their businesses.', hiring: true },
    { id: 'CMP-003', name: 'Deloitte', industry: 'Consulting', location: 'Gurugram, India', website: 'https://www.deloitte.com', about: 'Professional services firm delivering strategy, consulting, and technology solutions.', hiring: true },
    { id: 'CMP-004', name: 'Tech Mahindra', industry: 'IT Services', location: 'Noida, India', website: 'https://www.techmahindra.com', about: 'Digital transformation and technology consulting for global businesses.', hiring: true },
    { id: 'CMP-005', name: 'Paytm', industry: 'Fintech', location: 'Noida, India', website: 'https://paytm.com', about: 'Digital payments and financial services platform.', hiring: false }
  ];
  const jobs = [
    { id: 'DRV-001', companyId: 'CMP-001', title: 'Systems Engineer', type: 'Full time', location: 'Bengaluru / Hybrid', package: '₹ 6.5 LPA', minCgpa: 7, eligibleCourses: ['BCA', 'B.Tech'], deadline: '2026-10-18', description: 'Build and support enterprise applications with a collaborative engineering team.', skills: ['Java', 'SQL', 'Problem solving'], status: 'Open' },
    { id: 'DRV-002', companyId: 'CMP-002', title: 'Graduate Trainee', type: 'Full time', location: 'Noida', package: '₹ 5.8 LPA', minCgpa: 6.5, eligibleCourses: ['BCA', 'B.Tech', 'MCA'], deadline: '2026-10-24', description: 'Start your technology career through a structured learning and delivery programme.', skills: ['Communication', 'Programming', 'SQL'], status: 'Open' },
    { id: 'DRV-003', companyId: 'CMP-003', title: 'Technology Analyst', type: 'Full time', location: 'Gurugram', package: '₹ 7.2 LPA', minCgpa: 7.5, eligibleCourses: ['BCA', 'B.Tech', 'MCA'], deadline: '2026-11-02', description: 'Help clients solve complex business problems through modern technology.', skills: ['Python', 'Data analysis', 'Communication'], status: 'Open' },
    { id: 'DRV-004', companyId: 'CMP-004', title: 'Associate Software Engineer', type: 'Full time', location: 'Noida / Hybrid', package: '₹ 5.2 LPA', minCgpa: 6, eligibleCourses: ['BCA', 'B.Tech'], deadline: '2026-11-12', description: 'Join a product team delivering digital platforms across industries.', skills: ['JavaScript', 'HTML', 'CSS'], status: 'Open' },
    { id: 'DRV-005', companyId: 'CMP-005', title: 'Quality Assurance Intern', type: 'Internship', location: 'Noida', package: '₹ 25,000 / month', minCgpa: 7, eligibleCourses: ['BCA', 'MCA'], deadline: '2026-10-15', description: 'Work with the quality team to test reliable customer-facing products.', skills: ['Testing', 'Attention to detail'], status: 'Open' }
  ];
  const applications = [
    { id: 'APP-001', studentId: students[0].id, jobId: jobs[0].id, appliedAt: '2026-09-12T10:30:00.000Z', status: 'Under review' },
    { id: 'APP-002', studentId: students[1].id, jobId: jobs[2].id, appliedAt: '2026-09-14T12:15:00.000Z', status: 'Shortlisted' },
    { id: 'APP-003', studentId: students[3].id, jobId: jobs[1].id, appliedAt: '2026-09-16T08:45:00.000Z', status: 'Interview scheduled' },
    { id: 'APP-004', studentId: students[5].id, jobId: jobs[3].id, appliedAt: '2026-09-17T11:20:00.000Z', status: 'Under review' },
    { id: 'APP-005', studentId: students[2].id, jobId: jobs[1].id, appliedAt: '2026-09-19T09:10:00.000Z', status: 'Applied' }
  ];
  return { students, companies, jobs, applications, admin: { email: 'admin@muit.ac.in', passwordHash: hashPassword('Admin@123') } };
}

fs.mkdirSync(DATA_DIRECTORY, { recursive: true });
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(createSeedData(), null, 2));
}

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function publicStudent(student) {
  const { passwordHash, ...safeStudent } = student;
  return safeStudent;
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.user || (role && req.session.user.role !== role)) {
      return res.status(401).json({ error: 'Please sign in with an authorized account.' });
    }
    next();
  };
}

function requireAdmin(req, res, next) {
  return requireRole('admin')(req, res, next);
}

function makeId(prefix, records) {
  const nextNumber = records.reduce((max, record) => {
    const number = Number(record.id.split('-').pop());
    return Number.isFinite(number) ? Math.max(max, number) : max;
  }, 0) + 1;
  return `${prefix}-${String(nextNumber).padStart(3, '0')}`;
}

app.get('/api/bootstrap', (req, res) => {
  const data = readData();
  const user = req.session.user || null;
  const isAdmin = user?.role === 'admin';
  const jobs = data.jobs.map(job => ({ ...job, company: data.companies.find(company => company.id === job.companyId)?.name || 'Company' }));
  const applications = (isAdmin ? data.applications : data.applications.filter(application => application.studentId === user?.id))
    .map(application => ({
      ...application,
      student: data.students.find(student => student.id === application.studentId)?.name || 'Student',
      job: data.jobs.find(job => job.id === application.jobId)?.title || 'Placement drive',
      company: data.companies.find(company => company.id === data.jobs.find(job => job.id === application.jobId)?.companyId)?.name || 'Company'
    }));
  const placed = data.applications.filter(application => application.status === 'Selected').length;
  res.json({
    user: user?.role === 'student' ? { ...user, ...publicStudent(data.students.find(student => student.id === user.id)) } : user,
    students: isAdmin ? data.students.map(publicStudent) : [],
    companies: data.companies,
    jobs,
    applications,
    stats: { students: data.students.length, companies: data.companies.length, openDrives: data.jobs.filter(job => job.status === 'Open').length, applications: data.applications.length, placed, placementRate: data.students.length ? Math.round(placed / data.students.length * 100) : 0 },
    demo: { studentEmail: 'aarav.sharma@muit.ac.in', studentPassword: 'Welcome@123', adminEmail: 'admin@muit.ac.in', adminPassword: 'Admin@123' }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !['student', 'admin'].includes(role)) return res.status(400).json({ error: 'Enter your email, password, and account type.' });
  const data = readData();
  const account = role === 'admin' ? data.admin : data.students.find(student => student.email.toLowerCase() === email.trim().toLowerCase());
  if (!account || account.email.toLowerCase() !== email.trim().toLowerCase() || !verifyPassword(password, account.passwordHash)) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }
  req.session.user = role === 'admin' ? { role: 'admin', email: account.email, name: 'Placement Administrator' } : { role: 'student', id: account.id, email: account.email, name: account.name };
  res.json({ user: req.session.user });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.post('/api/students/register', (req, res) => {
  const { name, email, phone, course, batch, cgpa, password } = req.body;
  if (!name || !email || !phone || !course || !batch || !password) return res.status(400).json({ error: 'Complete all required fields.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must contain at least 8 characters.' });
  const grade = Number(cgpa);
  if (!Number.isFinite(grade) || grade < 0 || grade > 10) return res.status(400).json({ error: 'CGPA must be between 0 and 10.' });
  const data = readData();
  if (data.students.some(student => student.email.toLowerCase() === email.trim().toLowerCase())) return res.status(409).json({ error: 'An account already exists for this email.' });
  const student = { id: `STU-${batch}-${String(data.students.length + 1).padStart(3, '0')}`, name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), course, branch: 'Computer Applications', batch: String(batch), cgpa: grade, skills: [], status: 'Active', passwordHash: hashPassword(password) };
  data.students.push(student);
  writeData(data);
  req.session.user = { role: 'student', id: student.id, email: student.email, name: student.name };
  res.status(201).json({ user: req.session.user });
});

app.put('/api/students/:id', requireRole(), (req, res) => {
  const data = readData();
  const student = data.students.find(record => record.id === req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found.' });
  if (req.session.user.role !== 'admin' && req.session.user.id !== student.id) return res.status(403).json({ error: 'You can only update your own profile.' });
  const fields = ['name', 'phone', 'course', 'batch', 'cgpa', 'skills'];
  fields.forEach(field => { if (req.body[field] !== undefined) student[field] = field === 'cgpa' ? Number(req.body[field]) : req.body[field]; });
  writeData(data);
  if (req.session.user.role === 'student') req.session.user.name = student.name;
  res.json({ student: publicStudent(student) });
});

app.delete('/api/students/:id', requireAdmin, (req, res) => {
  const data = readData();
  data.students = data.students.filter(student => student.id !== req.params.id);
  data.applications = data.applications.filter(application => application.studentId !== req.params.id);
  writeData(data);
  res.json({ success: true });
});

app.post('/api/companies', requireAdmin, (req, res) => {
  const { name, industry, location, website, about } = req.body;
  if (!name || !industry || !location) return res.status(400).json({ error: 'Company name, industry, and location are required.' });
  const data = readData();
  const company = { id: makeId('CMP', data.companies), name: name.trim(), industry, location, website: website || '', about: about || '', hiring: true };
  data.companies.push(company);
  writeData(data);
  res.status(201).json({ company });
});

app.put('/api/companies/:id', requireAdmin, (req, res) => {
  const data = readData();
  const company = data.companies.find(record => record.id === req.params.id);
  if (!company) return res.status(404).json({ error: 'Company not found.' });
  ['name', 'industry', 'location', 'website', 'about', 'hiring'].forEach(field => { if (req.body[field] !== undefined) company[field] = req.body[field]; });
  writeData(data);
  res.json({ company });
});

app.delete('/api/companies/:id', requireAdmin, (req, res) => {
  const data = readData();
  const linkedJobs = data.jobs.filter(job => job.companyId === req.params.id).map(job => job.id);
  data.companies = data.companies.filter(company => company.id !== req.params.id);
  data.jobs = data.jobs.filter(job => job.companyId !== req.params.id);
  data.applications = data.applications.filter(application => !linkedJobs.includes(application.jobId));
  writeData(data);
  res.json({ success: true });
});

app.post('/api/jobs', requireAdmin, (req, res) => {
  const { companyId, title, type, location, package: salary, minCgpa, eligibleCourses, deadline, description, skills } = req.body;
  const data = readData();
  if (!companyId || !data.companies.some(company => company.id === companyId) || !title || !deadline) return res.status(400).json({ error: 'Choose a company and enter a role and deadline.' });
  const job = { id: makeId('DRV', data.jobs), companyId, title: title.trim(), type: type || 'Full time', location: location || 'To be announced', package: salary || 'Competitive', minCgpa: Number(minCgpa) || 0, eligibleCourses: Array.isArray(eligibleCourses) ? eligibleCourses : ['BCA'], deadline, description: description || '', skills: Array.isArray(skills) ? skills : [], status: 'Open' };
  data.jobs.push(job);
  writeData(data);
  res.status(201).json({ job });
});

app.put('/api/jobs/:id', requireAdmin, (req, res) => {
  const data = readData();
  const job = data.jobs.find(record => record.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'Placement drive not found.' });
  ['companyId', 'title', 'type', 'location', 'package', 'minCgpa', 'eligibleCourses', 'deadline', 'description', 'skills', 'status'].forEach(field => { if (req.body[field] !== undefined) job[field] = req.body[field]; });
  writeData(data);
  res.json({ job });
});

app.delete('/api/jobs/:id', requireAdmin, (req, res) => {
  const data = readData();
  data.jobs = data.jobs.filter(job => job.id !== req.params.id);
  data.applications = data.applications.filter(application => application.jobId !== req.params.id);
  writeData(data);
  res.json({ success: true });
});

app.post('/api/applications', requireRole('student'), (req, res) => {
  const data = readData();
  const student = data.students.find(record => record.id === req.session.user.id);
  const job = data.jobs.find(record => record.id === req.body.jobId);
  if (!job || job.status !== 'Open') return res.status(404).json({ error: 'This placement drive is no longer open.' });
  if (data.applications.some(application => application.studentId === student.id && application.jobId === job.id)) return res.status(409).json({ error: 'You have already applied for this drive.' });
  if (Number(student.cgpa) < Number(job.minCgpa) || !job.eligibleCourses.includes(student.course)) return res.status(403).json({ error: 'Your profile does not meet this drive’s eligibility criteria.' });
  if (new Date(`${job.deadline}T23:59:59`) < new Date()) return res.status(400).json({ error: 'The application deadline has passed.' });
  const application = { id: makeId('APP', data.applications), studentId: student.id, jobId: job.id, appliedAt: new Date().toISOString(), status: 'Applied' };
  data.applications.push(application);
  writeData(data);
  res.status(201).json({ application });
});

app.patch('/api/applications/:id', requireAdmin, (req, res) => {
  const validStatuses = ['Applied', 'Under review', 'Shortlisted', 'Interview scheduled', 'Selected', 'Not selected'];
  if (!validStatuses.includes(req.body.status)) return res.status(400).json({ error: 'Choose a valid application status.' });
  const data = readData();
  const application = data.applications.find(record => record.id === req.params.id);
  if (!application) return res.status(404).json({ error: 'Application not found.' });
  application.status = req.body.status;
  writeData(data);
  res.json({ application });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`MUIT Placement Portal is running on http://localhost:${PORT}`);
});
