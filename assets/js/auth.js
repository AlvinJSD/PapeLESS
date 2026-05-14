/* ============================================================
   auth.js — PapeLESS Authentication Logic
   Handles login, signup, role redirection, validation
   Uses localStorage for frontend simulation (ready for PHP/MySQL)
   ============================================================ */

// ============================================================
// INIT — Seed default data on first load
// ============================================================
(function initStorage() {
  // Default adviser accounts (seeded by coordinator)
  if (!localStorage.getItem('papeless_advisers')) {
    const advisers = [
      { id: 1, username: 'adviser1', password: 'adviser123', name: 'Prof. Maria Santos', email: 'msantos@pup.edu.ph', department: 'BSCS' },
      { id: 2, username: 'adviser2', password: 'adviser123', name: 'Prof. Jose Reyes', email: 'jreyes@pup.edu.ph', department: 'BSIT' }
    ];
    localStorage.setItem('papeless_advisers', JSON.stringify(advisers));
  }

  // Default coordinator account
  if (!localStorage.getItem('papeless_coordinator')) {
    const coordinator = { username: 'coordinator', password: 'coord123', name: 'OJT Coordinator', email: 'ojt@pup.edu.ph' };
    localStorage.setItem('papeless_coordinator', JSON.stringify(coordinator));
  }

  // Student signup requests (starts empty)
  if (!localStorage.getItem('papeless_signup_requests')) {
    localStorage.setItem('papeless_signup_requests', JSON.stringify([]));
  }

  // Approved students (starts empty)
  if (!localStorage.getItem('papeless_students')) {
    localStorage.setItem('papeless_students', JSON.stringify([]));
  }

  // OJT Documents/requirements
  if (!localStorage.getItem('papeless_documents')) {
    localStorage.setItem('papeless_documents', JSON.stringify([]));
  }

  // Announcements
  if (!localStorage.getItem('papeless_announcements')) {
    localStorage.setItem('papeless_announcements', JSON.stringify([]));
  }
})();

// ============================================================
// SECTION NAVIGATION
// ============================================================
function showSection(sectionId) {
  const sections = ['landing', 'login', 'signup', 'coordinator-login'];
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('d-none');
  });

  const target = document.getElementById(sectionId);
  if (target) {
    target.classList.remove('d-none');
    window.scrollTo(0, 0);
  }

  // Clear error messages when switching
  clearErrors();
}

function clearErrors() {
  const errorEls = document.querySelectorAll('#loginError, #adviserLoginError, #coordLoginError, #signupMessage');
  errorEls.forEach(el => el.classList.add('d-none'));
}

// ============================================================
// ROLE TABS (Login page)
// ============================================================
function switchLoginRole(role, tabEl) {
  // Update tab styling
  document.querySelectorAll('.role-tab').forEach(t => t.classList.remove('active'));
  if (tabEl) tabEl.classList.add('active');

  // Show/hide forms
  const studentForm = document.getElementById('studentLoginForm');
  const adviserForm = document.getElementById('adviserLoginForm');

  if (role === 'student') {
    studentForm.classList.remove('d-none');
    adviserForm.classList.add('d-none');
  } else {
    studentForm.classList.add('d-none');
    adviserForm.classList.remove('d-none');
  }
  clearErrors();
}

// ============================================================
// STUDENT LOGIN
// ============================================================
function handleStudentLogin(e) {
  e.preventDefault();
  const studentNumber = document.getElementById('studentNumber').value.trim();
  const birthdate = document.getElementById('birthdate').value;
  const errorEl = document.getElementById('loginError');

  const students = JSON.parse(localStorage.getItem('papeless_students') || '[]');
  const student = students.find(s => s.studentNo === studentNumber && s.birthdate === birthdate);

  if (!student) {
    showError(errorEl, 'Invalid student number or birthdate. Please check your credentials or contact your adviser.');
    return;
  }

  // Set session
  sessionStorage.setItem('papeless_user', JSON.stringify({
    role: 'student',
    id: student.id,
    name: `${student.firstName} ${student.lastName}`,
    studentNo: student.studentNo,
    course: student.course,
    section: student.section,
    email: student.email
  }));

  window.location.href = 'pages/student.html';
}

// ============================================================
// ADVISER LOGIN
// ============================================================
function handleAdviserLogin(e) {
  e.preventDefault();
  const username = document.getElementById('adviserUsername').value.trim();
  const password = document.getElementById('adviserPassword').value;
  const errorEl = document.getElementById('adviserLoginError');

  const advisers = JSON.parse(localStorage.getItem('papeless_advisers') || '[]');
  const adviser = advisers.find(a => a.username === username && a.password === password);

  if (!adviser) {
    showError(errorEl, 'Invalid adviser credentials. Please try again or contact your coordinator.');
    return;
  }

  sessionStorage.setItem('papeless_user', JSON.stringify({
    role: 'adviser',
    id: adviser.id,
    name: adviser.name,
    username: adviser.username,
    department: adviser.department,
    email: adviser.email
  }));

  window.location.href = 'pages/adviser.html';
}

// ============================================================
// COORDINATOR LOGIN
// ============================================================
function handleCoordinatorLogin(e) {
  e.preventDefault();
  const username = document.getElementById('coordUsername').value.trim();
  const password = document.getElementById('coordPassword').value;
  const errorEl = document.getElementById('coordLoginError');

  const coordinator = JSON.parse(localStorage.getItem('papeless_coordinator') || '{}');

  if (coordinator.username !== username || coordinator.password !== password) {
    showError(errorEl, 'Invalid coordinator credentials.');
    return;
  }

  sessionStorage.setItem('papeless_user', JSON.stringify({
    role: 'coordinator',
    name: coordinator.name,
    email: coordinator.email
  }));

  window.location.href = 'pages/coordinator.html';
}

// ============================================================
// STUDENT SIGN UP REQUEST
// ============================================================
function handleSignup(e) {
  e.preventDefault();
  const msgEl = document.getElementById('signupMessage');

  const firstName = document.getElementById('signupFirstName').value.trim();
  const lastName  = document.getElementById('signupLastName').value.trim();
  const studentNo = document.getElementById('signupStudentNo').value.trim();
  const birthdate = document.getElementById('signupBirthdate').value;
  const course    = document.getElementById('signupCourse').value.trim();
  const section   = document.getElementById('signupSection').value.trim();
  const email     = document.getElementById('signupEmail').value.trim();

  // Check for duplicate requests or existing student
  const requests = JSON.parse(localStorage.getItem('papeless_signup_requests') || '[]');
  const students = JSON.parse(localStorage.getItem('papeless_students') || '[]');

  const alreadyRequested = requests.some(r => r.studentNo === studentNo && r.status === 'pending');
  const alreadyApproved  = students.some(s => s.studentNo === studentNo);

  if (alreadyApproved) {
    showError(msgEl, 'This student number already has an active account. Please log in.', 'danger');
    return;
  }
  if (alreadyRequested) {
    showError(msgEl, 'You already have a pending sign up request. Please wait for your adviser to review it.', 'warning');
    return;
  }

  // Create request object
  const newRequest = {
    id: Date.now(),
    firstName, lastName, studentNo, birthdate, course, section, email,
    status: 'pending',  // pending | approved | rejected
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
    adviserId: null,
    remarks: ''
  };

  requests.push(newRequest);
  localStorage.setItem('papeless_signup_requests', JSON.stringify(requests));

  // Show success
  msgEl.className = 'alert alert-success py-2 small mt-2';
  msgEl.textContent = '✓ Sign up request submitted successfully! Your adviser will review and approve your account.';
  msgEl.classList.remove('d-none');

  // Reset form
  document.getElementById('signupForm').reset();

  // Auto-redirect back to landing after 3s
  setTimeout(() => showSection('landing'), 3500);
}

// ============================================================
// HELPERS
// ============================================================
function showError(el, message, type = 'danger') {
  if (!el) return;
  el.className = `alert alert-${type} py-2 small`;
  el.textContent = message;
  el.classList.remove('d-none');
}

// Guard: redirect to index if no valid session
function requireAuth(expectedRole) {
  const user = sessionStorage.getItem('papeless_user');
  if (!user) {
    window.location.href = '../index.html';
    return null;
  }
  const parsed = JSON.parse(user);
  if (expectedRole && parsed.role !== expectedRole) {
    window.location.href = '../index.html';
    return null;
  }
  return parsed;
}

// Logout
function logout() {
  sessionStorage.removeItem('papeless_user');
  window.location.href = '../index.html';
}