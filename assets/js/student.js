/* ============================================================
   student.js — PapeLESS Student Dashboard Logic
   ============================================================ */

let currentUser = null;

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Auth guard
  currentUser = requireAuth('student');
  if (!currentUser) return;

  // Populate user info in UI
  const initials = getInitials(currentUser.name);
  document.getElementById('sidebarAvatar').textContent = initials;
  document.getElementById('navAvatar').textContent = initials;
  document.getElementById('sidebarName').textContent = currentUser.name;
  document.getElementById('welcomeMsg').textContent = `Welcome back, ${currentUser.name.split(' ')[0]}!`;

  // Profile
  document.getElementById('profileAvatarLarge').textContent = initials;
  document.getElementById('profileFullName').textContent = currentUser.name;
  document.getElementById('profileStudentNo').textContent = currentUser.studentNo;
  document.getElementById('pName').textContent = currentUser.name;
  document.getElementById('pStudentNo').textContent = currentUser.studentNo;
  document.getElementById('pCourse').textContent = currentUser.course || '—';
  document.getElementById('pSection').textContent = currentUser.section || '—';
  document.getElementById('pEmail').textContent = currentUser.email || '—';

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
    dashboard: 'Dashboard', requirements: 'Requirements',
    submissions: 'My Submissions', feedback: 'Feedback',
    announcements: 'Announcements', profile: 'Profile'
  };
  document.getElementById('navPageTitle').textContent = titles[pageId] || pageId;

  // Lazy render per page
  if (pageId === 'requirements') renderRequirementsTable();
  if (pageId === 'submissions') renderSubmissionsTable();
  if (pageId === 'feedback') renderFeedback();
  if (pageId === 'announcements') renderAnnouncements('announcementsList');
}

// ============================================================
// DASHBOARD RENDER
// ============================================================
function renderDashboard() {
  const docs = getMyDocuments();

  const total    = docs.length;
  const approved = docs.filter(d => d.status === 'approved').length;
  const pending  = docs.filter(d => d.status === 'pending').length;
  const rejected = docs.filter(d => d.status === 'rejected').length;

  document.getElementById('statTotal').textContent    = total;
  document.getElementById('statApproved').textContent = approved;
  document.getElementById('statPending').textContent  = pending;
  document.getElementById('statRejected').textContent = rejected;

  // Badges
  updateBadge('badgePending', pending);
  const withFeedback = docs.filter(d => d.adviserNotes && d.status === 'rejected').length;
  updateBadge('badgeFeedback', withFeedback);
  document.getElementById('notifDot').style.display = (withFeedback > 0 || pending > 0) ? 'block' : 'none';

  // Recent Submissions (last 5)
  const recent = [...docs].sort((a,b) => b.submittedAt - a.submittedAt).slice(0, 5);
  const recentEl = document.getElementById('recentSubmissionsList');
  if (recent.length === 0) {
    recentEl.innerHTML = `<div class="empty-state"><i class="bi bi-inbox"></i><p>No submissions yet.</p></div>`;
  } else {
    recentEl.innerHTML = `<table class="table-custom"><thead><tr><th>Document</th><th>Type</th><th>Status</th></tr></thead><tbody>
      ${recent.map(d => `
        <tr>
          <td style="color:var(--text-primary);font-weight:500">${d.name}</td>
          <td>${d.type}</td>
          <td>${statusBadge(d.status)}</td>
        </tr>`).join('')}
    </tbody></table>`;
  }

  // Announcements on dashboard
  renderAnnouncements('dashboardAnnouncements', 3);
}

// ============================================================
// REQUIREMENTS TABLE
// ============================================================
function renderRequirementsTable(filterVal = '') {
  let docs = getMyDocuments();
  if (filterVal || document.getElementById('filterStatus')?.value) {
    const f = filterVal || document.getElementById('filterStatus').value;
    if (f) docs = docs.filter(d => d.status === f);
  }

  const tbody = document.getElementById('requirementsTableBody');
  if (docs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="bi bi-inbox"></i><p>No documents found.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = docs.map(d => `
    <tr>
      <td style="color:var(--text-primary);font-weight:500">
        <i class="bi bi-file-earmark-text me-2" style="color:var(--red-light)"></i>${d.name}
      </td>
      <td>${d.type}</td>
      <td>${formatDate(d.submittedAt)}</td>
      <td>${statusBadge(d.status)}</td>
      <td>
        ${d.status === 'rejected'
          ? `<button class="btn-sm-red" onclick="resubmitDoc(${d.id})">Re-submit</button>`
          : `<button class="btn-sm-outline" onclick="viewDoc(${d.id})">View</button>`}
      </td>
    </tr>`).join('');
}

function filterRequirements() {
  renderRequirementsTable();
}

// ============================================================
// SUBMISSIONS TABLE
// ============================================================
function renderSubmissionsTable() {
  const docs = getMyDocuments().sort((a,b) => b.submittedAt - a.submittedAt);
  const tbody = document.getElementById('submissionsTableBody');

  if (docs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="bi bi-inbox"></i><p>No submissions found.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = docs.map((d, i) => `
    <tr>
      <td style="color:var(--text-muted)">${i+1}</td>
      <td style="color:var(--text-primary);font-weight:500">${d.name}</td>
      <td>${d.type}</td>
      <td>${formatDate(d.submittedAt)}</td>
      <td>${statusBadge(d.status)}</td>
      <td style="font-size:0.82rem;color:var(--text-muted)">${d.adviserNotes || '—'}</td>
    </tr>`).join('');
}

// ============================================================
// FEEDBACK
// ============================================================
function renderFeedback() {
  const docs = getMyDocuments().filter(d => d.adviserNotes);
  const el = document.getElementById('feedbackList');

  if (docs.length === 0) {
    el.innerHTML = `<div class="empty-state"><i class="bi bi-chat-square-dots"></i><p>No feedback received yet.</p></div>`;
    return;
  }

  el.innerHTML = docs.map(d => `
    <div class="section-card mb-3">
      <div class="section-card-header">
        <span class="section-card-title"><i class="bi bi-file-earmark"></i> ${d.name}</span>
        ${statusBadge(d.status)}
      </div>
      <div class="section-card-body">
        <p style="color:var(--text-secondary);font-size:0.88rem;margin:0">
          <strong style="color:var(--text-muted)">Adviser's Note:</strong> ${d.adviserNotes}
        </p>
        <p style="color:var(--text-muted);font-size:0.78rem;margin-top:8px">
          ${d.reviewedAt ? `Reviewed on ${formatDate(d.reviewedAt)}` : ''}
        </p>
      </div>
    </div>`).join('');
}

// ============================================================
// ANNOUNCEMENTS
// ============================================================
function renderAnnouncements(containerId, limit = 0) {
  const ann = JSON.parse(localStorage.getItem('papeless_announcements') || '[]')
    .sort((a,b) => b.createdAt - a.createdAt);
  const list = limit ? ann.slice(0, limit) : ann;
  const el = document.getElementById(containerId);
  if (!el) return;

  if (list.length === 0) {
    el.innerHTML = `<div class="empty-state"><i class="bi bi-megaphone"></i><p>No announcements yet.</p></div>`;
    return;
  }

  el.innerHTML = list.map(a => `
    <div class="mb-3 p-3" style="background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid var(--border)">
      <div style="font-weight:600;font-size:0.9rem;color:var(--text-primary);margin-bottom:4px">${a.title}</div>
      <div style="font-size:0.82rem;color:var(--text-secondary)">${a.content}</div>
      <div style="font-size:0.72rem;color:var(--text-muted);margin-top:6px">${formatDate(a.createdAt)}</div>
    </div>`).join('');
}

// ============================================================
// DOCUMENT UPLOAD
// ============================================================
function submitDocument() {
  const name  = document.getElementById('docName').value.trim();
  const type  = document.getElementById('docType').value;
  const notes = document.getElementById('docNotes').value.trim();

  if (!name || !type) {
    showToast('Please fill in document name and type.', 'error');
    return;
  }

  const docs = JSON.parse(localStorage.getItem('papeless_documents') || '[]');
  const newDoc = {
    id: Date.now(),
    studentId: currentUser.id,
    studentNo: currentUser.studentNo,
    studentName: currentUser.name,
    name, type, notes,
    status: 'pending',
    submittedAt: Date.now(),
    reviewedAt: null,
    adviserNotes: '',
    driveUrl: '#'
  };

  docs.push(newDoc);
  localStorage.setItem('papeless_documents', JSON.stringify(docs));

  // Close modal & reset
  bootstrap.Modal.getInstance(document.getElementById('uploadModal'))?.hide();
  document.getElementById('uploadForm').reset();

  showToast('Document submitted successfully!', 'success');
  renderDashboard();
}

function resubmitDoc(docId) {
  // Open upload modal pre-filled (simplified: just open modal)
  const modal = new bootstrap.Modal(document.getElementById('uploadModal'));
  modal.show();
  showToast('Please re-upload a corrected version.', 'info');
}

function viewDoc(docId) {
  const docs = JSON.parse(localStorage.getItem('papeless_documents') || '[]');
  const doc = docs.find(d => d.id === docId);
  if (!doc) return;
  showToast(`Viewing: ${doc.name} — ${doc.type}`, 'info');
}

// ============================================================
// HELPERS
// ============================================================
function getMyDocuments() {
  const docs = JSON.parse(localStorage.getItem('papeless_documents') || '[]');
  return docs.filter(d => d.studentId === currentUser.id || d.studentNo === currentUser.studentNo);
}

function getInitials(name) {
  return name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
}

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusBadge(status) {
  const map = {
    pending:  'badge-pending',
    approved: 'badge-approved',
    rejected: 'badge-rejected',
    submitted:'badge-submitted',
    reviewed: 'badge-reviewed'
  };
  const labels = { pending:'Pending', approved:'Approved', rejected:'For Revision', submitted:'Submitted', reviewed:'Reviewed' };
  return `<span class="badge-status ${map[status] || 'badge-pending'}">${labels[status] || status}</span>`;
}

function updateBadge(id, count) {
  const el = document.getElementById(id);
  if (!el) return;
  if (count > 0) {
    el.textContent = count;
    el.classList.remove('d-none');
  } else {
    el.classList.add('d-none');
  }
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