/* ============================================================
   adviser.js — PapeLESS Adviser Dashboard Logic
   ============================================================ */

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  currentUser = requireAuth('adviser');
  if (!currentUser) return;

  const initials = getInitials(currentUser.name);
  document.getElementById('sidebarAvatar').textContent = initials;
  document.getElementById('navAvatar').textContent = initials;
  document.getElementById('sidebarName').textContent = currentUser.name;
  document.getElementById('welcomeMsg').textContent = `Welcome, ${currentUser.name}`;

  renderDashboard();
});

// ============================================================
// PAGE NAVIGATION
// ============================================================
function showPage(pageId, linkEl) {
  document.querySelectorAll('.page-content').forEach(p => p.classList.add('d-none'));
  document.getElementById(`page-${pageId}`).classList.remove('d-none');
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  if (linkEl) linkEl.classList.add('active');

  const titles = {
    dashboard: 'Dashboard', 'signup-requests': 'Sign Up Requests',
    students: 'My Students', submissions: 'Student Submissions', announcements: 'Announcements'
  };
  document.getElementById('navPageTitle').textContent = titles[pageId] || pageId;

  if (pageId === 'signup-requests') renderSignupRequests();
  if (pageId === 'students') renderStudentsTable();
  if (pageId === 'submissions') renderSubmissionsTable();
  if (pageId === 'announcements') renderAnnouncementsManage();
}

// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard() {
  const students  = getApprovedStudents();
  const requests  = getPendingRequests();
  const allDocs   = getAllStudentDocs();
  const pendingDocs  = allDocs.filter(d => d.status === 'pending');
  const approvedDocs = allDocs.filter(d => d.status === 'approved');

  document.getElementById('statStudents').textContent = students.length;
  document.getElementById('statRequests').textContent = requests.length;
  document.getElementById('statDocs').textContent     = pendingDocs.length;
  document.getElementById('statApproved').textContent = approvedDocs.length;

  // Badges
  updateBadge('badgeRequests', requests.length);
  updateBadge('badgeSubmissions', pendingDocs.length);
  document.getElementById('notifDot').style.display = (requests.length + pendingDocs.length > 0) ? 'block' : 'none';

  // Recent submissions (last 5 pending)
  const recentSub = [...allDocs].filter(d => d.status === 'pending').slice(0, 5);
  const recentSubEl = document.getElementById('recentSubmissions');
  if (recentSub.length === 0) {
    recentSubEl.innerHTML = `<div class="empty-state"><i class="bi bi-inbox"></i><p>No pending submissions.</p></div>`;
  } else {
    recentSubEl.innerHTML = `<table class="table-custom"><thead><tr><th>Student</th><th>Document</th><th>Status</th></tr></thead><tbody>
      ${recentSub.map(d => `
        <tr>
          <td style="color:var(--text-primary)">${d.studentName}</td>
          <td>${d.name}</td>
          <td>${statusBadge(d.status)}</td>
        </tr>`).join('')}
    </tbody></table>`;
  }

  // Pending sign up requests
  const reqEl = document.getElementById('recentRequests');
  if (requests.length === 0) {
    reqEl.innerHTML = `<div class="empty-state"><i class="bi bi-inbox"></i><p>No pending requests.</p></div>`;
  } else {
    reqEl.innerHTML = `<div class="p-2">
      ${requests.slice(0,4).map(r => `
        <div class="d-flex align-items-center justify-content-between py-2" style="border-bottom:1px solid var(--border)">
          <div>
            <div style="font-size:0.88rem;font-weight:600;color:var(--text-primary)">${r.firstName} ${r.lastName}</div>
            <div style="font-size:0.75rem;color:var(--text-muted)">${r.studentNo} · ${r.course}</div>
          </div>
          <div class="d-flex gap-1">
            <button class="btn-sm-green" onclick="quickApprove(${r.id})">✓</button>
            <button class="btn-sm-danger" onclick="quickReject(${r.id})">✗</button>
          </div>
        </div>`).join('')}
    </div>`;
  }
}

// ============================================================
// SIGN UP REQUESTS
// ============================================================
function renderSignupRequests() {
  const filterVal = document.getElementById('filterSignupStatus')?.value || '';
  let requests = JSON.parse(localStorage.getItem('papeless_signup_requests') || '[]');
  if (filterVal) requests = requests.filter(r => r.status === filterVal);

  const tbody = document.getElementById('signupRequestsTable');
  if (requests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="bi bi-inbox"></i><p>No requests found.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = requests.sort((a,b) => b.id - a.id).map(r => `
    <tr>
      <td style="color:var(--text-primary);font-weight:500">${r.firstName} ${r.lastName}</td>
      <td style="font-family:'Space Mono',monospace;font-size:0.82rem">${r.studentNo}</td>
      <td>${r.course}</td>
      <td>${formatDate(r.submittedAt)}</td>
      <td>${statusBadge(r.status)}</td>
      <td>
        ${r.status === 'pending' ? `
          <div class="d-flex gap-1">
            <button class="btn-sm-green" onclick="approveRequest(${r.id})"><i class="bi bi-check-lg"></i> Approve</button>
            <button class="btn-sm-danger" onclick="rejectRequest(${r.id})"><i class="bi bi-x-lg"></i> Reject</button>
          </div>` : `<span style="color:var(--text-muted);font-size:0.8rem">${r.status === 'approved' ? 'Approved' : 'Rejected'}</span>`}
      </td>
    </tr>`).join('');
}

function approveRequest(requestId) {
  const requests = JSON.parse(localStorage.getItem('papeless_signup_requests') || '[]');
  const idx = requests.findIndex(r => r.id === requestId);
  if (idx === -1) return;

  const req = requests[idx];
  requests[idx] = { ...req, status: 'approved', reviewedAt: new Date().toISOString(), adviserId: currentUser.id };
  localStorage.setItem('papeless_signup_requests', JSON.stringify(requests));

  // Create student account
  const students = JSON.parse(localStorage.getItem('papeless_students') || '[]');
  students.push({
    id: req.id,
    firstName: req.firstName,
    lastName: req.lastName,
    studentNo: req.studentNo,
    birthdate: req.birthdate,
    course: req.course,
    section: req.section,
    email: req.email,
    adviserId: currentUser.id,
    approvedAt: Date.now()
  });
  localStorage.setItem('papeless_students', JSON.stringify(students));

  showToast(`${req.firstName} ${req.lastName} approved successfully!`, 'success');
  renderSignupRequests();
  renderDashboard();
}

function rejectRequest(requestId) {
  const requests = JSON.parse(localStorage.getItem('papeless_signup_requests') || '[]');
  const idx = requests.findIndex(r => r.id === requestId);
  if (idx === -1) return;

  requests[idx].status = 'rejected';
  requests[idx].reviewedAt = new Date().toISOString();
  localStorage.setItem('papeless_signup_requests', JSON.stringify(requests));

  showToast('Request rejected.', 'error');
  renderSignupRequests();
  renderDashboard();
}

function quickApprove(id) { approveRequest(id); }
function quickReject(id)  { rejectRequest(id); }

// ============================================================
// STUDENTS TABLE
// ============================================================
function renderStudentsTable() {
  const students = getApprovedStudents();
  const allDocs = JSON.parse(localStorage.getItem('papeless_documents') || '[]');
  const tbody = document.getElementById('studentsTable');

  if (students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="bi bi-people"></i><p>No students approved yet.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = students.map(s => {
    const docs = allDocs.filter(d => d.studentId === s.id || d.studentNo === s.studentNo);
    return `
      <tr>
        <td style="color:var(--text-primary);font-weight:500">${s.firstName} ${s.lastName}</td>
        <td style="font-family:'Space Mono',monospace;font-size:0.82rem">${s.studentNo}</td>
        <td>${s.course}</td>
        <td>${s.section}</td>
        <td>
          <span style="color:var(--text-primary)">${docs.length}</span>
          <span style="color:var(--text-muted);font-size:0.78rem"> total</span>
        </td>
        <td>
          <button class="btn-sm-outline" onclick="viewStudentDocs('${s.studentNo}')">View Docs</button>
        </td>
      </tr>`;
  }).join('');
}

function viewStudentDocs(studentNo) {
  showPage('submissions', null);
  // Filter by student (simplified)
  showToast(`Showing documents for: ${studentNo}`, 'info');
}

// ============================================================
// DOCUMENT SUBMISSIONS
// ============================================================
function renderSubmissionsTable() {
  const filterVal = document.getElementById('filterDocStatus')?.value || '';
  let docs = getAllStudentDocs();
  if (filterVal) docs = docs.filter(d => d.status === filterVal);

  const tbody = document.getElementById('submissionsTable');
  if (docs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="bi bi-inbox"></i><p>No submissions found.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = docs.sort((a,b) => b.submittedAt - a.submittedAt).map(d => `
    <tr>
      <td style="color:var(--text-primary)">${d.studentName}</td>
      <td style="font-weight:500">${d.name}</td>
      <td>${d.type}</td>
      <td>${formatDate(d.submittedAt)}</td>
      <td>${statusBadge(d.status)}</td>
      <td>
        ${d.status === 'pending'
          ? `<button class="btn-sm-red" onclick="openReview(${d.id})">Review</button>`
          : `<button class="btn-sm-outline" onclick="openReview(${d.id})">Edit</button>`}
      </td>
    </tr>`).join('');
}

// ============================================================
// REVIEW MODAL
// ============================================================
function openReview(docId) {
  const docs = JSON.parse(localStorage.getItem('papeless_documents') || '[]');
  const doc = docs.find(d => d.id === docId);
  if (!doc) return;

  document.getElementById('reviewDocId').value = docId;
  document.getElementById('reviewDocName').textContent = doc.name;
  document.getElementById('reviewDocType').textContent = doc.type;
  document.getElementById('reviewDocStudent').textContent = `Submitted by: ${doc.studentName}`;
  document.getElementById('reviewNotes').value = doc.adviserNotes || '';
  document.getElementById('reviewDecision').value = doc.status || '';

  // Update button states
  updateReviewButtons(doc.status);

  new bootstrap.Modal(document.getElementById('reviewModal')).show();
}

function setReviewDecision(decision, btn) {
  document.getElementById('reviewDecision').value = decision;
  updateReviewButtons(decision);
}

function updateReviewButtons(decision) {
  const approveBtn = document.getElementById('reviewBtnApprove');
  const rejectBtn  = document.getElementById('reviewBtnReject');
  if (decision === 'approved') {
    approveBtn.style.opacity = '1';
    approveBtn.style.boxShadow = '0 0 0 2px #27AE60';
    rejectBtn.style.opacity = '0.5';
    rejectBtn.style.boxShadow = 'none';
  } else if (decision === 'rejected') {
    rejectBtn.style.opacity = '1';
    rejectBtn.style.boxShadow = '0 0 0 2px var(--red)';
    approveBtn.style.opacity = '0.5';
    approveBtn.style.boxShadow = 'none';
  } else {
    approveBtn.style.opacity = '1'; rejectBtn.style.opacity = '1';
    approveBtn.style.boxShadow = 'none'; rejectBtn.style.boxShadow = 'none';
  }
}

function submitReview() {
  const docId    = parseInt(document.getElementById('reviewDocId').value);
  const decision = document.getElementById('reviewDecision').value;
  const notes    = document.getElementById('reviewNotes').value.trim();

  if (!decision) {
    showToast('Please select Approve or Reject.', 'error');
    return;
  }

  const docs = JSON.parse(localStorage.getItem('papeless_documents') || '[]');
  const idx = docs.findIndex(d => d.id === docId);
  if (idx === -1) return;

  docs[idx].status = decision;
  docs[idx].adviserNotes = notes;
  docs[idx].reviewedAt = Date.now();
  localStorage.setItem('papeless_documents', JSON.stringify(docs));

  bootstrap.Modal.getInstance(document.getElementById('reviewModal'))?.hide();
  showToast(`Document ${decision === 'approved' ? 'approved' : 'sent back for revision'}.`, decision === 'approved' ? 'success' : 'error');
  renderSubmissionsTable();
  renderDashboard();
}

// ============================================================
// ANNOUNCEMENTS
// ============================================================
function renderAnnouncementsManage() {
  const ann = JSON.parse(localStorage.getItem('papeless_announcements') || '[]').sort((a,b) => b.createdAt - a.createdAt);
  const el = document.getElementById('announcementsManage');
  if (ann.length === 0) {
    el.innerHTML = `<div class="empty-state"><i class="bi bi-megaphone"></i><p>No announcements yet.</p></div>`;
    return;
  }

  el.innerHTML = ann.map(a => `
    <div class="section-card mb-3">
      <div class="section-card-header">
        <span class="section-card-title"><i class="bi bi-megaphone"></i> ${a.title}</span>
        <button class="btn-sm-danger" onclick="deleteAnnouncement(${a.id})"><i class="bi bi-trash"></i> Delete</button>
      </div>
      <div class="section-card-body">
        <p style="color:var(--text-secondary);font-size:0.88rem;margin:0">${a.content}</p>
        <p style="color:var(--text-muted);font-size:0.75rem;margin-top:8px">${formatDate(a.createdAt)}</p>
      </div>
    </div>`).join('');
}

function postAnnouncement() {
  const title   = document.getElementById('annTitle').value.trim();
  const content = document.getElementById('annContent').value.trim();
  if (!title || !content) { showToast('Please fill in title and content.', 'error'); return; }

  const ann = JSON.parse(localStorage.getItem('papeless_announcements') || '[]');
  ann.push({ id: Date.now(), title, content, adviserId: currentUser.id, adviserName: currentUser.name, createdAt: Date.now() });
  localStorage.setItem('papeless_announcements', JSON.stringify(ann));

  bootstrap.Modal.getInstance(document.getElementById('annModal'))?.hide();
  document.getElementById('annTitle').value = '';
  document.getElementById('annContent').value = '';
  showToast('Announcement posted!', 'success');
  renderAnnouncementsManage();
}

function deleteAnnouncement(id) {
  let ann = JSON.parse(localStorage.getItem('papeless_announcements') || '[]');
  ann = ann.filter(a => a.id !== id);
  localStorage.setItem('papeless_announcements', JSON.stringify(ann));
  showToast('Announcement deleted.', 'info');
  renderAnnouncementsManage();
}

// ============================================================
// HELPERS
// ============================================================
function getApprovedStudents() {
  return JSON.parse(localStorage.getItem('papeless_students') || '[]')
    .filter(s => s.adviserId === currentUser.id);
}

function getPendingRequests() {
  return JSON.parse(localStorage.getItem('papeless_signup_requests') || '[]')
    .filter(r => r.status === 'pending');
}

function getAllStudentDocs() {
  const myStudents = getApprovedStudents().map(s => s.studentNo);
  return JSON.parse(localStorage.getItem('papeless_documents') || '[]')
    .filter(d => myStudents.includes(d.studentNo));
}

function getInitials(name) {
  return name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusBadge(status) {
  const map = { pending:'badge-pending', approved:'badge-approved', rejected:'badge-rejected' };
  const labels = { pending:'Pending', approved:'Approved', rejected:'For Revision' };
  return `<span class="badge-status ${map[status] || 'badge-pending'}">${labels[status] || status}</span>`;
}

function updateBadge(id, count) {
  const el = document.getElementById(id);
  if (!el) return;
  if (count > 0) { el.textContent = count; el.classList.remove('d-none'); }
  else { el.classList.add('d-none'); }
}

function showToast(msg, type = 'info') {
  const icons = { success: 'bi-check-circle-fill', error: 'bi-x-circle-fill', info: 'bi-info-circle-fill' };
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast-custom ${type}`;
  toast.innerHTML = `<i class="bi ${icons[type]}"></i><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('active');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
}