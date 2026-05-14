/* ============================================================
   coordinator.js — PapeLESS Coordinator Panel Logic
   Handles adviser account management (CRUD)
   ============================================================ */

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  currentUser = requireAuth('coordinator');
  if (!currentUser) return;

  document.getElementById('sidebarName').textContent = currentUser.name;
  document.getElementById('welcomeMsg').textContent  = `Welcome, ${currentUser.name}`;

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

  const titles = { dashboard: 'Coordinator Panel', advisers: 'Manage Advisers' };
  document.getElementById('navPageTitle').textContent = titles[pageId] || pageId;

  if (pageId === 'advisers') renderAdvisersTable();
}

// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard() {
  const advisers  = JSON.parse(localStorage.getItem('papeless_advisers')        || '[]');
  const students  = JSON.parse(localStorage.getItem('papeless_students')        || '[]');
  const requests  = JSON.parse(localStorage.getItem('papeless_signup_requests') || '[]');
  const documents = JSON.parse(localStorage.getItem('papeless_documents')       || '[]');

  document.getElementById('statAdvisers').textContent = advisers.length;
  document.getElementById('statStudents').textContent = students.length;
  document.getElementById('statPending').textContent  = requests.filter(r => r.status === 'pending').length;
  document.getElementById('statDocs').textContent     = documents.length;

  // Adviser overview table (condensed)
  const overviewEl = document.getElementById('adviserOverview');
  if (advisers.length === 0) {
    overviewEl.innerHTML = `<div class="empty-state"><i class="bi bi-person-badge"></i><p>No advisers created yet. <a href="#" onclick="showPage('advisers',null)" style="color:#7FB3D3">Add one now.</a></p></div>`;
    return;
  }

  overviewEl.innerHTML = `<table class="table-custom">
    <thead>
      <tr><th>Name</th><th>Username</th><th>Department</th><th>Students Supervised</th></tr>
    </thead>
    <tbody>
      ${advisers.map(a => {
        const count = students.filter(s => s.adviserId === a.id).length;
        return `
          <tr>
            <td style="color:var(--text-primary);font-weight:500">
              <i class="bi bi-person-badge me-2" style="color:#7FB3D3"></i>${a.name}
            </td>
            <td style="font-family:'Space Mono',monospace;font-size:0.82rem">${a.username}</td>
            <td>${a.department || '—'}</td>
            <td>
              <span style="color:var(--text-primary)">${count}</span>
              <span style="color:var(--text-muted);font-size:0.78rem"> students</span>
            </td>
          </tr>`;
      }).join('')}
    </tbody>
  </table>`;
}

// ============================================================
// ADVISERS TABLE (Manage Advisers page)
// ============================================================
function renderAdvisersTable() {
  const advisers = JSON.parse(localStorage.getItem('papeless_advisers') || '[]');
  const students = JSON.parse(localStorage.getItem('papeless_students') || '[]');
  const tbody = document.getElementById('advisersTable');

  if (advisers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="bi bi-person-badge"></i><p>No advisers yet. Click "Add Adviser" to create one.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = advisers.map((a, i) => {
    const count = students.filter(s => s.adviserId === a.id).length;
    return `
      <tr>
        <td style="color:var(--text-muted)">${i + 1}</td>
        <td style="color:var(--text-primary);font-weight:500">${a.name}</td>
        <td style="font-family:'Space Mono',monospace;font-size:0.82rem">${a.username}</td>
        <td>${a.email || '—'}</td>
        <td>${a.department || '—'}</td>
        <td>
          <span class="badge-status badge-approved" style="font-size:0.72rem">${count}</span>
        </td>
        <td>
          <div class="d-flex gap-1 flex-wrap">
            <button class="btn-sm-outline" onclick="openEditAdviser(${a.id})">
              <i class="bi bi-pencil"></i> Edit
            </button>
            <button class="btn-sm-danger" onclick="openDeleteAdviser(${a.id}, '${a.name}')">
              <i class="bi bi-trash"></i> Remove
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

// ============================================================
// ADD / EDIT ADVISER
// ============================================================
function saveAdviser() {
  const editId   = document.getElementById('editAdviserId').value;
  const name     = document.getElementById('adviserName').value.trim();
  const username = document.getElementById('adviserUsername').value.trim();
  const password = document.getElementById('adviserPassword').value;
  const email    = document.getElementById('adviserEmail').value.trim();
  const dept     = document.getElementById('adviserDept').value.trim();

  if (!name || !username) {
    showToast('Please fill in Name and Username.', 'error');
    return;
  }

  let advisers = JSON.parse(localStorage.getItem('papeless_advisers') || '[]');

  if (editId) {
    // Editing existing adviser
    const idx = advisers.findIndex(a => a.id === parseInt(editId));
    if (idx === -1) return;

    advisers[idx].name       = name;
    advisers[idx].username   = username;
    advisers[idx].email      = email;
    advisers[idx].department = dept;
    if (password) advisers[idx].password = password;

    showToast(`Adviser "${name}" updated successfully.`, 'success');
  } else {
    // Adding new adviser
    if (!password) {
      showToast('Password is required for new accounts.', 'error');
      return;
    }

    // Check for duplicate username
    if (advisers.some(a => a.username === username)) {
      showToast('Username already exists. Please choose a different one.', 'error');
      return;
    }

    const newAdviser = {
      id: Date.now(),
      name, username, password, email,
      department: dept
    };

    advisers.push(newAdviser);
    showToast(`Adviser "${name}" added successfully.`, 'success');
  }

  localStorage.setItem('papeless_advisers', JSON.stringify(advisers));
  bootstrap.Modal.getInstance(document.getElementById('addAdviserModal'))?.hide();
  resetAdviserForm();
  renderAdvisersTable();
  renderDashboard();
}

function openEditAdviser(adviserId) {
  const advisers = JSON.parse(localStorage.getItem('papeless_advisers') || '[]');
  const adviser = advisers.find(a => a.id === adviserId);
  if (!adviser) return;

  document.getElementById('editAdviserId').value      = adviser.id;
  document.getElementById('adviserName').value        = adviser.name;
  document.getElementById('adviserUsername').value    = adviser.username;
  document.getElementById('adviserPassword').value    = '';
  document.getElementById('adviserEmail').value       = adviser.email || '';
  document.getElementById('adviserDept').value        = adviser.department || '';
  document.getElementById('adviserModalTitle').innerHTML =
    `<i class="bi bi-pencil-square me-2" style="color:#7FB3D3"></i>Edit Adviser`;
  document.getElementById('passwordHint').textContent = 'Leave blank to keep current password.';

  new bootstrap.Modal(document.getElementById('addAdviserModal')).show();
}

function resetAdviserForm() {
  document.getElementById('editAdviserId').value   = '';
  document.getElementById('adviserName').value     = '';
  document.getElementById('adviserUsername').value = '';
  document.getElementById('adviserPassword').value = '';
  document.getElementById('adviserEmail').value    = '';
  document.getElementById('adviserDept').value     = '';
  document.getElementById('adviserModalTitle').innerHTML =
    `<i class="bi bi-person-plus me-2" style="color:#7FB3D3"></i>Add Adviser`;
  document.getElementById('passwordHint').textContent = 'Required for new accounts.';
}

// Reset form when modal is closed
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('addAdviserModal');
  if (modal) modal.addEventListener('hidden.bs.modal', resetAdviserForm);
});

// ============================================================
// DELETE ADVISER
// ============================================================
function openDeleteAdviser(adviserId, name) {
  document.getElementById('deleteAdviserId').value  = adviserId;
  document.getElementById('deleteAdviserName').textContent = name;
  new bootstrap.Modal(document.getElementById('deleteModal')).show();
}

function confirmDelete() {
  const adviserId = parseInt(document.getElementById('deleteAdviserId').value);
  let advisers = JSON.parse(localStorage.getItem('papeless_advisers') || '[]');
  const adviser = advisers.find(a => a.id === adviserId);
  if (!adviser) return;

  advisers = advisers.filter(a => a.id !== adviserId);
  localStorage.setItem('papeless_advisers', JSON.stringify(advisers));

  bootstrap.Modal.getInstance(document.getElementById('deleteModal'))?.hide();
  showToast(`Adviser "${adviser.name}" removed.`, 'info');
  renderAdvisersTable();
  renderDashboard();
}

// ============================================================
// HELPERS
// ============================================================
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