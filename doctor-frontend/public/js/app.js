/* HealthBot — WhatsApp Healthcare Dashboard v2.0 */
const API = '';
const DOCTOR_PROFILE_STORAGE_KEY = 'meditracker.doctor.profile';

const App = {
  patients: [], appointments: [], prescriptions: [], doctors: [], chats: [],
  inventory: [], expenses: [],
  authToken: (function() {
    try {
      const session = JSON.parse(localStorage.getItem('meditracker.auth.session') || '{}');
      return session.role === 'doctor' ? session.token : '';
    } catch { return ''; }
  })(),
  currentDoctor: null,
  currentPage: 'dashboard',
  activeChatPatientId: null,
  editingPatientId: null,
  chatLanguageSelections: {},
  slots: [],
  appointmentActionContext: null,
  appointmentActionSlots: [],
  calendarWeekOffset: 0,
  selectedCalendarDoctorId: 'all',
  reportsPeriod: '30',
  chatPollInterval: null,
  statsPollInterval: null,
  statsApiFailureCount: 0,
  statsPollingPaused: false,
  navSetupDone: false,
  menuSetupDone: false,
  businessModulesSetupDone: false,
  profileMenuSetupDone: false,
  doctorProfilePrefs: null,

  async init() {
    const authenticated = await this.restoreDoctorSession();
    if (!authenticated) {
      this.showAuthShell();
      return;
    }

    await this.bootAuthenticatedApp();
  },

  showAuthShell() {
    const authShell = document.getElementById('authShell');
    const appShell = document.getElementById('appShell');
    if (authShell) authShell.style.display = 'grid';
    if (appShell) appShell.style.display = 'none';
    this.showAuthView('login');
  },

  showAppShell() {
    const authShell = document.getElementById('authShell');
    const appShell = document.getElementById('appShell');
    if (authShell) authShell.style.display = 'none';
    if (appShell) appShell.style.display = 'block';
    this.updateDoctorSessionUi();
    this.updateClinicIdSidebar();
  },

  resetPatientForm() {
    this.editingPatientId = null;
    const fields = {
      'pt-name': '',
      'pt-phone': '',
      'pt-age': '',
      'pt-email': '',
      'pt-blood': '',
      'pt-conditions': '',
      'pt-notes': '',
    };
    Object.entries(fields).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.value = value;
    });
    const title = document.querySelector('#addPatientModal .modal-header h3');
    const submit = document.querySelector('#addPatientModal .modal-footer .btn-primary');
    if (title) title.textContent = 'Add Patient';
    if (submit) submit.textContent = 'Add Patient & Send Welcome WA';
  },

  openAddPatientModal() {
    this.resetPatientForm();
    this.openModal('addPatientModal');
  },

  editPatient(id) {
    const patient = this.patients.find(p => p.id === id);
    if (!patient) return this.toast('Patient not found', 'error');
    this.editingPatientId = id;
    const fieldValues = {
      'pt-name': patient.name || '',
      'pt-phone': patient.phone || '',
      'pt-age': patient.age || '',
      'pt-email': patient.email || '',
      'pt-blood': patient.bloodGroup || '',
      'pt-conditions': Array.isArray(patient.conditions) ? patient.conditions.join(', ') : '',
      'pt-notes': patient.notes || '',
    };
    Object.entries(fieldValues).forEach(([fieldId, value]) => {
      const el = document.getElementById(fieldId);
      if (el) el.value = value;
    });
    const title = document.querySelector('#addPatientModal .modal-header h3');
    const submit = document.querySelector('#addPatientModal .modal-footer .btn-primary');
    if (title) title.textContent = 'Edit Patient';
    if (submit) submit.textContent = 'Save Changes';
    this.openModal('addPatientModal');
  },

  showAuthView(view) {
    const target = document.getElementById('authLoginCard');
    if (target) target.style.display = 'block';
    this.setAuthStatus('');
  },

  setAuthStatus(message, type = '') {
    const status = document.getElementById('authStatus');
    if (!status) return;
    status.textContent = message || '';
    status.className = `auth-status${type ? ` ${type}` : ''}`;
  },

  async loginDoctor() {
    const email = document.getElementById('login-email')?.value?.trim() || '';
    const password = document.getElementById('login-password')?.value || '';
    if (!email || !password) {
      this.setAuthStatus('Please enter both email and password.', 'error');
      return;
    }

    this.setAuthStatus('Signing you in...', 'info');

    try {
      const result = await this.publicApi('/api/auth/doctor/login', 'POST', { email, password });
      this.authToken = result.token || '';
      this.currentDoctor = result.doctor || null;
      localStorage.setItem('doctorAuthToken', this.authToken);
      this.showAppShell();
      this.setAuthStatus('');
      await this.bootAuthenticatedApp();
      this.toast('Signed in successfully', 'success');
    } catch (error) {
      this.setAuthStatus(error.message || 'Unable to sign in', 'error');
    }
  },

  async restoreDoctorSession() {
    if (!this.authToken) return false;
    try {
      const result = await this.publicApi('/api/auth/doctor/me', 'GET', null, true);
      this.currentDoctor = result.doctor || null;
      this.hydrateDoctorIdentity();
      return true;
    } catch {
      localStorage.removeItem('doctorAuthToken');
      this.authToken = '';
      this.currentDoctor = null;
      return false;
    }
  },

  async logoutDoctor(showAuth = true) {
    try {
      if (this.authToken) await this.publicApi('/api/auth/doctor/logout', 'POST', null, true);
    } catch {}

    this.authToken = '';
    this.currentDoctor = null;
    localStorage.removeItem('doctorAuthToken');
    if (this.statsPollInterval) clearInterval(this.statsPollInterval);
    this.statsPollInterval = null;
    if (showAuth) this.showAuthShell();
  },

  decodeJwtPayload(token) {
    try {
      const [, payload] = String(token || '').split('.');
      if (!payload) return {};
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(normalized));
    } catch {
      return {};
    }
  },

  getDoctorProfileStorageKey() {
    const payload = this.decodeJwtPayload(this.authToken);
    const email = this.currentDoctor?.email || payload.email || this.currentDoctor?.id || 'doctor';
    return `${DOCTOR_PROFILE_STORAGE_KEY}.${String(email).toLowerCase()}`;
  },

  hydrateDoctorIdentity() {
    const payload = this.decodeJwtPayload(this.authToken);
    const session = (() => {
      try {
        return JSON.parse(localStorage.getItem('meditracker.auth.session') || '{}');
      } catch {
        return {};
      }
    })();
    const saved = (() => {
      try {
        return JSON.parse(localStorage.getItem(this.getDoctorProfileStorageKey()) || '{}');
      } catch {
        return {};
      }
    })();

    this.currentDoctor = {
      ...(this.currentDoctor || {}),
      id: this.currentDoctor?.id || session.userId || null,
      name: this.currentDoctor?.name || session.name || 'Doctor',
      email: this.currentDoctor?.email || payload.email || session.email || '',
    };
    this.doctorProfilePrefs = {
      registrationNumber: saved.registrationNumber || session.registrationNumber || '',
      council: saved.council || session.council || '',
      profileImage: saved.profileImage || '',
    };
  },

  getDoctorAccessState() {
    try {
      return JSON.parse(localStorage.getItem('meditracker.doctor.accessState') || '{}');
    } catch {
      return {};
    }
  },

  updateClinicIdSidebar() {
    const clinicIdEl = document.getElementById('clinicIdSidebarValue');
    if (!clinicIdEl) return;
    const access = this.getDoctorAccessState();
    const clinicId = String(access?.clinicId || '').trim();
    clinicIdEl.textContent = clinicId || 'Not assigned';
  },

  resolveDoctorApprovalStatus() {
    const access = this.getDoctorAccessState();
    const doctorApproval = String(this.currentDoctor?.approvalStatus || '').toLowerCase();
    const accessApproval = String(access?.approvalStatus || '').toLowerCase();
    const accessState = String(access?.accessState || '').toLowerCase();
    if (doctorApproval === 'approved' || accessApproval === 'approved' || accessState === 'full_access') {
      return 'approved';
    }
    return 'pending';
  },

  saveDoctorProfilePrefs() {
    localStorage.setItem(this.getDoctorProfileStorageKey(), JSON.stringify(this.doctorProfilePrefs || {}));
  },

  async buildDoctorProfileImage(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        resolve('');
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Unable to read image file.'));
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          const size = 512;
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const context = canvas.getContext('2d');

          if (!context) {
            resolve(String(reader.result || ''));
            return;
          }

          const width = image.naturalWidth || image.width;
          const height = image.naturalHeight || image.height;
          const scale = Math.max(size / width, size / height);
          const drawWidth = width * scale;
          const drawHeight = height * scale;
          const offsetX = (size - drawWidth) / 2;
          const offsetY = (size - drawHeight) / 2;

          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = 'high';
          context.clearRect(0, 0, size, size);
          context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
          resolve(canvas.toDataURL('image/jpeg', 0.92));
        };
        image.onerror = () => reject(new Error('Unable to process image file.'));
        image.src = String(reader.result || '');
      };
      reader.readAsDataURL(file);
    });
  },

  syncDoctorAvatar(node, imageNode, fallbackNode, initials, profileImage) {
    if (!node || !imageNode || !fallbackNode) return;

    fallbackNode.textContent = initials;
    if (profileImage) {
      imageNode.src = profileImage;
      imageNode.hidden = false;
      fallbackNode.hidden = true;
      return;
    }

    imageNode.removeAttribute('src');
    imageNode.hidden = true;
    fallbackNode.hidden = false;
  },

  updateDoctorSessionUi() {
    const avatar = document.getElementById('doctorAvatar');
    const profileAvatar = document.getElementById('doctorProfileAvatar');
    const avatarImage = document.getElementById('doctorAvatarImage');
    const avatarFallback = document.getElementById('doctorAvatarFallback');
    const profileAvatarImage = document.getElementById('doctorProfileAvatarImage');
    const profileAvatarFallback = document.getElementById('doctorProfileAvatarFallback');
    if (!avatar) return;
    this.hydrateDoctorIdentity();
    const initials = String(this.currentDoctor?.name || 'DR')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() || '')
      .join('') || 'DR';
    const profileImage = this.doctorProfilePrefs?.profileImage || '';
    this.syncDoctorAvatar(avatar, avatarImage, avatarFallback, initials, profileImage);
    this.syncDoctorAvatar(profileAvatar, profileAvatarImage, profileAvatarFallback, initials, profileImage);
    avatar.title = this.currentDoctor?.name || 'Doctor';
    const nameEl = document.getElementById('doctorProfileName');
    const emailEl = document.getElementById('doctorProfileEmail');
    const emailInput = document.getElementById('doctorProfileEmailInput');
    const regInput = document.getElementById('doctorProfileRegistrationInput');
    const councilInput = document.getElementById('doctorProfileCouncilInput');
    const approvalBadge = document.getElementById('doctorApprovalBadge');
    if (nameEl) nameEl.textContent = this.currentDoctor?.name || 'Doctor';
    if (emailEl) emailEl.textContent = this.currentDoctor?.email || 'No email available';
    if (emailInput) emailInput.value = this.currentDoctor?.email || '';
    if (regInput) regInput.value = this.doctorProfilePrefs?.registrationNumber || '';
    if (councilInput) councilInput.value = this.doctorProfilePrefs?.council || '';
    if (regInput) { regInput.readOnly = true; regInput.disabled = true; }
    if (councilInput) { councilInput.readOnly = true; councilInput.disabled = true; }
    if (approvalBadge) {
      const approvalStatus = this.resolveDoctorApprovalStatus();
      const isActive = approvalStatus === 'approved';
      approvalBadge.textContent = isActive ? 'Active' : 'In Active';
      approvalBadge.classList.toggle('is-active', isActive);
      approvalBadge.classList.toggle('is-inactive', !isActive);
    }
  },

  setupDoctorProfileMenu() {
    if (this.profileMenuSetupDone) return;
    this.profileMenuSetupDone = true;
    const trigger = document.getElementById('doctorProfileTrigger');
    const menu = document.getElementById('doctorProfileMenu');
    const imageInput = document.getElementById('doctorProfileImageInput');
    const signOutBtn = document.getElementById('doctorProfileSignOutBtn');
    if (!trigger || !menu) return;

    trigger.addEventListener('click', (event) => {
      event.stopPropagation();
      menu.classList.toggle('open');
      this.updateDoctorSessionUi();
    });
    document.addEventListener('click', (event) => {
      if (!menu.classList.contains('open')) return;
      if (menu.contains(event.target) || trigger.contains(event.target)) return;
      menu.classList.remove('open');
    });
    imageInput?.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        this.doctorProfilePrefs.profileImage = await this.buildDoctorProfileImage(file);
        this.saveDoctorProfilePrefs();
        this.updateDoctorSessionUi();
        this.toast('Profile image updated', 'success');
      } catch (error) {
        this.toast(error.message || 'Unable to update profile image', 'error');
      } finally {
        event.target.value = '';
      }
    });
    signOutBtn?.addEventListener('click', () => this.logoutDoctor());
  },

  async bootAuthenticatedApp() {
    this.showAppShell();
    this.hydrateDoctorIdentity();
    this.updateClinicIdSidebar();
    this.setupBusinessModules();
    this.setupNav();
    this.setupMenuToggle();
    this.setupDoctorProfileMenu();
    await this.loadDoctors();
    await this.loadStats();
    await this.loadRecentActivity();
    await this.loadPendingChats();
    await this.loadTodayAppts();
    if (!document.querySelector('#rxMedicines .rx-med-row')) this.addMedicineRow();
    this.statsApiFailureCount = 0;
    this.statsPollingPaused = false;
    if (this.statsPollInterval) clearInterval(this.statsPollInterval);
    this.statsPollInterval = setInterval(() => this.refreshDashboard(), 15000);
  },

  setupNav() {
    if (this.navSetupDone) return;
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault(); this.navigate(link.dataset.page);
        if (window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open');
      });
    });
    this.navSetupDone = true;
  },
  setupMenuToggle() {
    if (this.menuSetupDone) return;
    document.getElementById('menuToggle').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
    this.menuSetupDone = true;
  },

  setupBusinessModules() {
    if (this.businessModulesSetupDone) return;
    const navList = document.querySelector('.nav-links');
    const dashboardLink = navList?.querySelector('[data-page="dashboard"]')?.closest('li');
    const appointmentsLink = navList?.querySelector('[data-page="appointments"]')?.closest('li');
    const automationLink = navList?.querySelector('[data-page="automation"]')?.closest('li');

    if (navList && dashboardLink && !navList.querySelector('[data-page="reports"]')) {
      dashboardLink.insertAdjacentHTML('afterend', '<li><a href="#" class="nav-link" data-page="reports"><i class="icon">R</i><span>Reports</span></a></li>');
    }

    if (navList && appointmentsLink && !navList.querySelector('[data-page="calendar"]')) {
      appointmentsLink.insertAdjacentHTML('afterend', '<li><a href="#" class="nav-link" data-page="calendar"><i class="icon">C</i><span>Calendar</span></a></li>');
    }

    if (navList && automationLink && !navList.querySelector('[data-page="inventory"]')) {
      automationLink.insertAdjacentHTML('beforebegin', `
        <li class="nav-section-label">Management</li>
        <li><a href="#" class="nav-link" data-page="inventory"><i class="icon">I</i><span>Inventory Mgmt</span></a></li>
        <li><a href="#" class="nav-link" data-page="expenses"><i class="icon">E</i><span>Activities & Expenses</span></a></li>
      `);
    }

    document.querySelector('[data-page="whatsapp"]')?.closest('li')?.remove();
    document.querySelector('[data-page="setup"]')?.closest('li')?.remove();

    const pageAppointments = document.getElementById('page-appointments');
    if (pageAppointments && !document.getElementById('page-calendar')) {
      pageAppointments.insertAdjacentHTML('afterend', `
        <div id="page-calendar" class="page">
          <div class="calendar-shell calendar-shell-pro">
            <div class="calendar-topbar">
              <div class="calendar-topbar-left">
                <input id="calendarPatientSearch" class="search-input calendar-search" placeholder="Search patients" oninput="App.filterCalendarPatients(this.value)" />
                <button class="btn btn-ghost" onclick="App.openModal('addPatientModal')">Add Patient</button>
              </div>
              <div class="calendar-topbar-right">
                <button class="btn btn-ghost" onclick="App.shiftCalendar(-1)">Previous</button>
                <div class="calendar-range-pill">
                  <span id="calendarTitle" class="calendar-range-text">Appointments Calendar</span>
                </div>
                <button class="btn btn-primary" onclick="App.jumpCalendarToCurrentWeek()">Today</button>
                <button class="btn btn-ghost" onclick="App.shiftCalendar(1)">Next</button>
              </div>
            </div>
            <div class="calendar-layout calendar-layout-pro">
              <aside class="calendar-leftpanel">
                <div class="calendar-panel-block">
                  <div class="calendar-panel-title">Doctors</div>
                  <div id="calendarDoctorList" class="calendar-doctor-list"></div>
                </div>
                <div class="calendar-panel-block">
                  <div class="calendar-panel-title">Quick Slots</div>
                  <div id="calendarQuickSlots" class="calendar-quick-slots"></div>
                </div>
              </aside>
              <section class="calendar-grid-panel">
                <div class="calendar-grid-header">
                  <div class="calendar-time-head">Time</div>
                  <div id="calendarWeekdays" class="calendar-weekdays-pro"></div>
                </div>
                <div id="calendarBoard" class="calendar-board-pro"></div>
              </section>
              <aside class="calendar-rightpanel">
                <div class="calendar-panel-block">
                  <div class="calendar-panel-title">Today's Schedule</div>
                  <div id="calendarTodayStats" class="calendar-stat-strip"></div>
                  <div id="calendarTodayList" class="calendar-today-list"></div>
                </div>
                <div class="calendar-panel-block">
                  <div class="calendar-panel-title">Add Walk-in Appointment</div>
                  <div class="auto-form">
                    <select id="calendar-book-patient" class="form-select"><option value="">Select patient...</option></select>
                    <select id="calendar-book-doctor" class="form-select"><option value="">Select doctor...</option></select>
                    <select id="calendar-book-day" class="form-select">
                      <option value="">Select day...</option>
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                    </select>
                    <select id="calendar-book-time" class="form-select"><option value="">Select time...</option></select>
                    <textarea id="calendar-book-notes" class="form-textarea" rows="3" placeholder="Notes (optional)"></textarea>
                    <button class="btn btn-green btn-full" onclick="App.bookFromCalendar()">Book Appointment</button>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      `);
    }

    const pageDashboard = document.getElementById('page-dashboard');
    if (pageDashboard && !document.getElementById('page-reports')) {
      pageDashboard.insertAdjacentHTML('afterend', `
        <div id="page-reports" class="page">
          <div class="reports-shell">
            <div class="page-actions reports-toolbar">
              <div class="reports-toolbar-copy">
                <h3>Patient Reports</h3>
                <p>Track patient volume, appointments, revenue, and follow-up details by period.</p>
              </div>
              <div class="reports-toolbar-actions">
                <select id="reportsPeriod" class="form-select reports-period-select" onchange="App.changeReportsPeriod(this.value)">
                  <option value="7">Last 7 days</option>
                  <option value="30" selected>Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="365">Last 12 months</option>
                  <option value="all">All time</option>
                </select>
                <button class="btn btn-ghost" onclick="App.exportReports()">Export CSV</button>
              </div>
            </div>
            <div id="reportsStats" class="reports-stat-grid"></div>
            <div class="table-wrap reports-table-wrap">
              <div class="reports-table-header">
                <div>
                  <h3>Customer Details</h3>
                  <p id="reportsRangeLabel">All patient and appointment details for the selected period.</p>
                </div>
              </div>
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Phone</th>
                    <th>Appointments</th>
                    <th>Last Visit</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody id="reportsTable"></tbody>
              </table>
            </div>
          </div>
        </div>
      `);
    }

    const pageAutomation = document.getElementById('page-automation');
    if (pageAutomation && !document.getElementById('page-inventory')) {
      pageAutomation.insertAdjacentHTML('beforebegin', `
        <div id="page-inventory" class="page">
          <div class="page-actions">
            <button class="btn btn-primary" onclick="App.openModal('inventoryModal')">+ Add Inventory</button>
            <button class="btn btn-ghost" onclick="App.exportInventory()">Export CSV</button>
          </div>
          <div id="inventorySummary" class="reports-stat-grid reports-stat-grid-compact"></div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Reorder Level</th>
                  <th>Unit Cost</th>
                  <th>Vendor</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="inventoryTable"></tbody>
            </table>
          </div>
        </div>
        <div id="page-expenses" class="page">
          <div class="page-actions">
            <button class="btn btn-primary" onclick="App.openModal('expenseModal')">+ Add Activity / Expense</button>
            <button class="btn btn-ghost" onclick="App.exportExpenses()">Export CSV</button>
          </div>
          <div id="expenseSummary" class="reports-stat-grid reports-stat-grid-compact"></div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="expensesTable"></tbody>
            </table>
          </div>
        </div>
      `);
    }

    const toastContainer = document.getElementById('toastContainer');
    if (toastContainer && !document.getElementById('inventoryModal')) {
      toastContainer.insertAdjacentHTML('beforebegin', `
        <div class="modal-overlay" id="inventoryModal">
          <div class="modal">
            <div class="modal-header"><h3>Add Inventory Item</h3><button class="modal-close" onclick="App.closeModal('inventoryModal')">×</button></div>
            <div class="modal-body">
              <div class="form-row"><input id="inv-name" class="form-input" placeholder="Item name *" /></div>
              <div class="form-row two-col">
                <input id="inv-category" class="form-input" placeholder="Category" />
                <input id="inv-vendor" class="form-input" placeholder="Vendor" />
              </div>
              <div class="form-row two-col">
                <input id="inv-quantity" class="form-input" type="number" placeholder="Quantity *" />
                <input id="inv-unit" class="form-input" placeholder="Unit (pcs, box, pairs)" />
              </div>
              <div class="form-row two-col">
                <input id="inv-reorder" class="form-input" type="number" placeholder="Reorder level" />
                <input id="inv-cost" class="form-input" type="number" placeholder="Unit cost" />
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-ghost" onclick="App.closeModal('inventoryModal')">Cancel</button>
              <button class="btn btn-primary" onclick="App.addInventoryItem()">Save Item</button>
            </div>
          </div>
        </div>
        <div class="modal-overlay" id="expenseModal">
          <div class="modal">
            <div class="modal-header"><h3>Add Activity / Expense</h3><button class="modal-close" onclick="App.closeModal('expenseModal')">×</button></div>
            <div class="modal-body">
              <div class="form-row"><input id="exp-title" class="form-input" placeholder="Title *" /></div>
              <div class="form-row two-col">
                <input id="exp-category" class="form-input" placeholder="Category" />
                <input id="exp-amount" class="form-input" type="number" placeholder="Amount *" />
              </div>
              <div class="form-row"><input id="exp-date" class="form-input" type="date" /></div>
              <div class="form-row"><textarea id="exp-notes" class="form-textarea" rows="3" placeholder="Notes / activity details"></textarea></div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-ghost" onclick="App.closeModal('expenseModal')">Cancel</button>
              <button class="btn btn-primary" onclick="App.addExpenseItem()">Save Entry</button>
            </div>
          </div>
        </div>
      `);
    }

    const recentActivityButton = document.querySelector('.dash-card .btn-link');
    if (recentActivityButton) {
      recentActivityButton.textContent = 'View all ->';
      recentActivityButton.onclick = () => this.navigate('appointments');
    }
    this.businessModulesSetupDone = true;
  },

  navigate(page) {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const link = document.querySelector(`[data-page="${page}"]`); if (link) link.classList.add('active');
    const pageEl = document.getElementById(`page-${page}`); if (pageEl) pageEl.classList.add('active');
    document.getElementById('pageTitle').textContent = {
      dashboard:'Dashboard',
      reports:'Reports',
      patients:'Patients',
      appointments:'Appointments',
      calendar:'Calendar',
      prescriptions:'Prescriptions',
      inventory:'Inventory Management',
      expenses:'Activities & Expenses',
      chat:'Patient Chat',
      automation:'Doctor Automation',
      whatsapp:'Message Log',
      setup:'API Setup'
    }[page] || page;
    this.currentPage = page;
    if (page === 'reports') this.loadReports();
    if (page === 'patients') this.loadPatients();
    if (page === 'appointments') this.loadAppointments();
    if (page === 'calendar') this.loadCalendarPage();
    if (page === 'prescriptions') this.loadPrescriptions();
    if (page === 'inventory') this.loadInventory();
    if (page === 'expenses') this.loadExpenses();
    if (page === 'chat') this.loadChatList();
    if (page === 'automation') this.populateAutomationSelects();
    if (page === 'dashboard') this.refreshDashboard();
  },

  async refreshDashboard() {
    if (this.statsPollingPaused) return;
    await this.loadStats();
    if (this.currentPage === 'dashboard') { await this.loadRecentActivity(); await this.loadPendingChats(); await this.loadTodayAppts(); }
    if (this.currentPage === 'chat') await this.loadChatList();
    if (this.currentPage === 'calendar') await this.loadCalendarPage(true);
    if (this.currentPage === 'reports') await this.loadReports(true);
    if (this.currentPage === 'inventory') await this.loadInventory(true);
    if (this.currentPage === 'expenses') await this.loadExpenses(true);
  },

  normalizeAppointmentRecord(item) {
    if (!item) return null;
    return {
      ...item,
      id: item.id || item.appointmentId || '',
      appointmentId: item.appointmentId || item.id || '',
      patientId: item.patientId || '',
      patientName: item.patientName || 'Patient',
      doctorId: item.doctorId || this.currentDoctor?.id || '',
      doctorName: item.doctorName || this.currentDoctor?.name || 'Doctor',
      slotDay: item.slotDay || item.day || item.date || '',
      slotTime: item.slotTime || item.time || '',
      status: item.status || 'scheduled',
      fee: item.fee || item.billingAmount || 0,
      createdAt: item.createdAt || '',
    };
  },

  // ── STATS ────────────────────────────────────────────────────────
  async loadStats() {
    try {
      const dashboard = await this.api('/api/doctor/dashboard');
      this.statsApiFailureCount = 0;
      const s = dashboard?.summary || {};
      const unreadChats = Number(s.unreadPatientChatsCount || 0);
      document.getElementById('stat-patients').textContent = s.totalPatients || 0;
      document.getElementById('stat-verified').textContent = s.waVerifiedCount || 0;
      document.getElementById('stat-appts').textContent = s.appointmentsCount || 0;
      document.getElementById('stat-rx').textContent = s.prescriptionsCount || 0;
      document.getElementById('stat-msgs').textContent = s.waMessagesSentCount || 0;
      document.getElementById('stat-chats').textContent = unreadChats;
      if (dashboard?.currentDoctor) {
        this.currentDoctor = {
          ...(this.currentDoctor || {}),
          id: dashboard.currentDoctor.doctorId || this.currentDoctor?.id || null,
          name: dashboard.currentDoctor.doctorName || this.currentDoctor?.name || 'Doctor',
          approvalStatus: dashboard.currentDoctor.approvalStatus || this.currentDoctor?.approvalStatus || '',
        };
        this.updateDoctorSessionUi();
      }
      if (unreadChats > 0) {
        document.getElementById('delta-chats').textContent = `${unreadChats} unread`;
        document.getElementById('delta-chats').style.color = 'var(--red)';
        const badge = document.getElementById('chatBadge');
        badge.style.display = 'inline'; badge.textContent = unreadChats;
      } else {
        document.getElementById('delta-chats').textContent = '0 unread';
        document.getElementById('delta-chats').style.color = 'var(--text3)';
        document.getElementById('chatBadge').style.display = 'none';
      }
    } catch (e) {
      this.statsApiFailureCount += 1;
      console.error('Stats error', e);
      if (this.statsApiFailureCount >= 3 && !this.statsPollingPaused) {
        this.statsPollingPaused = true;
        if (this.statsPollInterval) {
          clearInterval(this.statsPollInterval);
          this.statsPollInterval = null;
        }
        this.toast('Backend unreachable. Paused auto-refresh. Start backend and refresh this page.', 'error');
      }
    }
  },

  // ── DOCTORS ──────────────────────────────────────────────────────
  async loadDoctors() {
    this.hydrateDoctorIdentity();
    this.doctors = this.currentDoctor?.id
      ? [{
          id: this.currentDoctor.id,
          name: this.currentDoctor.name || 'Doctor',
          consultationFee: this.currentDoctor.consultationFee || 500,
          specialty: this.currentDoctor.specialty || this.currentDoctor.specialization || 'Consultation',
        }]
      : [];
  },

  // ── PATIENTS ─────────────────────────────────────────────────────
  async loadPatients() {
    try {
      this.patients = await this.api('/api/patients');
      const tb = document.getElementById('patientsTable'); tb.innerHTML = '';
      if (!this.patients.length) { tb.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:24px">No patients yet. Add your first patient!</td></tr>'; return; }
      this.patients.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><strong>${p.name}</strong>${p.notes?`<br><span style="font-size:11px;color:var(--text3)">${p.notes.substring(0,40)}</span>`:''}</td>
          <td style="font-family:'Space Mono',monospace;font-size:12px">${p.phone}</td>
          <td>${p.age||'—'}</td>
          <td><span class="tag ${p.verified?'tag-green':'tag-red'}">${p.verified?'✓ Verified':'○ Pending'}</span></td>
          <td><div class="action-btns">
            ${!p.verified?`<button class="btn btn-ghost btn-sm" onclick="App.sendOTP('${p.id}')">📤 OTP</button>`:''}
            <button class="btn btn-ghost btn-sm" onclick="App.viewDashboard('${p.id}')">📋 Dash</button>
            <button class="btn btn-ghost btn-sm" onclick="App.openSendSlot('${p.id}')">📅 Slots</button>
            <button class="btn btn-ghost btn-sm" onclick="App.openChatFor('${p.id}')">💬 Chat</button>
            <button class="btn btn-red btn-sm" onclick="App.deletePatient('${p.id}')">✕</button>
          </div></td>`;
        tb.appendChild(tr);
      });
    } catch (e) { this.toast('Failed to load patients', 'error'); }
  },

  filterPatients(q) {
    const rows = document.querySelectorAll('#patientsTable tr');
    rows.forEach(r => { r.style.display = r.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none'; });
  },

  async addPatient() {
    const name=document.getElementById('pt-name').value.trim(), phone=document.getElementById('pt-phone').value.trim();
    if (!name||!phone) return this.toast('Name and phone are required','error');
    const conditionsStr = document.getElementById('pt-conditions')?.value || '';
    const conditions = conditionsStr.split(',').map(s=>s.trim()).filter(Boolean);
    try {
      await this.api('/api/patients','POST',{name,phone,age:document.getElementById('pt-age').value,email:document.getElementById('pt-email').value,bloodGroup:document.getElementById('pt-blood').value,notes:document.getElementById('pt-notes').value, conditions});
      this.toast('Patient added! Welcome WhatsApp sent 📱','success'); this.closeModal('addPatientModal'); this.loadPatients(); this.loadStats();
    } catch(e){this.toast('Error: '+e.message,'error');}
  },

  async deletePatient(id) {
    if(!confirm('Delete this patient?')) return;
    await this.api(`/api/patients/${id}`,'DELETE'); this.toast('Patient deleted','info'); this.loadPatients(); this.loadStats();
  },

  async sendOTP(patientId) {
    await this.api('/api/verify/send-otp','POST',{patientId}); this.toast('OTP sent via WhatsApp 🔐','success');
  },

  openSendSlot(patientId) {
    this._slotPatientId = patientId;
    const sel = document.getElementById('slot-doctor'); sel.innerHTML = '<option value="">Select Doctor</option>';
    this.doctors.forEach(d => sel.innerHTML += `<option value="${d.id}" data-name="${d.name}">${d.name} — ${d.specialty}</option>`);
    this.openModal('sendSlotModal');
  },

  async confirmSendSlots() {
    const doctorSel = document.getElementById('slot-doctor');
    const doctorId = doctorSel.value, doctorName = doctorSel.options[doctorSel.selectedIndex]?.dataset.name || '';
    const message = document.getElementById('slot-msg').value;
    try {
      const res = await this.api(`/api/slots/send-to-patient/${this._slotPatientId}`,'POST',{doctorId,doctorName,message});
      this.toast(`Slot picker sent! ${res.slots?.length} slots shown 📅`,'success'); this.closeModal('sendSlotModal');
    } catch(e){this.toast('Error: '+e.message,'error');}
  },

  openChatFor(patientId) {
    this.navigate('chat'); setTimeout(() => this.openChat(patientId), 100);
  },

  async viewDashboard(patientId) {
    try {
      const res = await this.api(`/api/patients/${patientId}/dashboard`);
      const { patient, appointments, prescriptions, chats } = res.data;
      document.getElementById('dash-patient-name').textContent = patient.name + ' - Dashboard';
      const detailEl = document.getElementById('dash-patient-details');
      if (detailEl) {
        const detailItems = [
          ['Patient No', patient.patientCode || '-'],
          ['Phone', patient.phone || '-'],
          ['Age', patient.age || '-'],
          ['Email', patient.email || '-'],
          ['Blood Group', patient.bloodGroup || '-'],
          ['Verified', (patient.whatsappVerified ?? patient.verified) ? 'Yes' : 'No'],
          ['Conditions', Array.isArray(patient.conditions) ? (patient.conditions.join(', ') || '-') : (patient.conditions || '-')],
          ['Notes', patient.notes || '-'],
        ];
        detailEl.innerHTML = detailItems.map(([label, value]) => `<div style="min-width:0"><div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">${label}</div><div style="margin-top:4px;color:var(--text);word-break:break-word">${value}</div></div>`).join('');
      }

      const apptEl = document.getElementById('dash-appts');
      apptEl.innerHTML = appointments.length ? appointments.map(a => `<div style="padding:4px 0;border-bottom:1px solid #eee">📅 ${a.slotDay||a.date} at ${a.slotTime||a.time} - ${a.status}</div>`).join('') : 'No appointments.';
      
      const rxEl = document.getElementById('dash-rx');
      rxEl.innerHTML = prescriptions.length ? prescriptions.map(r => `<div style="padding:4px 0;border-bottom:1px solid #eee">💊 ${r.diagnosis} - ${new Date(r.createdAt).toLocaleDateString()}</div>`).join('') : 'No prescriptions.';
      
      const chatEl = document.getElementById('dash-chat');
      chatEl.innerHTML = chats.length ? chats.map(c => `<div style="padding:4px 0;border-bottom:1px solid #eee"><strong>${c.direction === 'doctor' ? 'Doc' : 'Patient'}</strong>: ${c.text} <span style="color:#888;font-size:10px">(${new Date(c.timestamp).toLocaleDateString()})</span></div>`).join('') : 'No recent chats.';
      
      this.openModal('patientDashboardModal');
    } catch(e) {
      this.toast('Failed to load dashboard: ' + e.message, 'error');
    }
  },

  // ── APPOINTMENTS ─────────────────────────────────────────────────
  async loadAppointments() {
    try {
      const appointmentData = await this.api('/api/doctor/appointments');
      this.appointments = (Array.isArray(appointmentData) ? appointmentData : (appointmentData?.items || []))
        .map(item => this.normalizeAppointmentRecord(item))
        .filter(Boolean);
      const tb = document.getElementById('appointmentsTable'); tb.innerHTML = '';
      const visibleAppointments = this.appointments.filter(a => a.status !== 'cancelled');
      if (!visibleAppointments.length) { tb.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:24px">No appointments yet.</td></tr>'; return; }
      visibleAppointments.forEach(a => {
        const statusColors = {scheduled:'tag-green',cancelled:'tag-red',rescheduled:'tag-amber',completed:'tag-indigo',waiting:'tag-amber',engaged:'tag-indigo',done:'tag-green'};
        const appointmentId = a.id || a.appointmentId;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><strong>${a.patientName||'—'}</strong></td><td>${a.doctorName||'—'}</td><td>${a.slotDay||a.date||'—'}</td><td>${a.slotTime||a.time||'—'}</td>
          <td><span class="tag ${statusColors[a.status]||'tag-indigo'}">${a.status}</span></td>
          <td><div class="action-btns">
            <button class="btn btn-ghost btn-sm" onclick="App.rescheduleAppt('${appointmentId}')">⟳</button>
            <button class="btn btn-ghost btn-sm" onclick="App.cancelAppt('${appointmentId}')">✕ Cancel</button>
          </div></td>`;
        tb.appendChild(tr);
      });
    } catch(e){this.toast('Failed to load appointments','error');}
  },

  async loadTodayAppts() {
    try {
      const dashboard = await this.api('/api/doctor/dashboard');
      const appts = (dashboard?.todaysAppointments || [])
        .map(item => this.normalizeAppointmentRecord(item))
        .filter(Boolean);
      const wrap = document.getElementById('todayAppts'); wrap.innerHTML = '';
      if (!appts.length) { wrap.innerHTML = '<p style="font-size:12px;color:var(--text3);text-align:center;padding:12px">No appointments scheduled</p>'; return; }
      appts.slice(0,5).forEach(a => {
        const div = document.createElement('div'); div.className = 'appt-mini';
        div.innerHTML = `<div class="appt-mini-name">${a.patientName||'Patient'}</div><div class="appt-mini-time">👨‍⚕️ ${a.doctorName||'Doctor'} · ${a.slotDay||''} ${a.slotTime||''}</div>`;
        wrap.appendChild(div);
      });
    } catch{}
  },

  async loadSlots() {
    try { this.slots = await this.api('/api/slots'); }
    catch { this.slots = []; }
  },

  async loadCalendarPage(silent = false) {
    try {
      if (!this.patients.length) this.patients = await this.api('/api/patients');
      if (!this.doctors.length) this.doctors = await this.api('/api/doctors');
      this.appointments = (await this.api('/api/doctor/appointments')).items || [];
      await this.loadSlots();
      this.populateCalendarBookingControls();
      this.renderCalendarDoctorList();
      this.renderCalendarBoard();
      this.renderCalendarTodaySchedule();
    } catch (e) {
      if (!silent) this.toast('Failed to load calendar', 'error');
    }
  },

  populateCalendarBookingControls() {
    const patientSel = document.getElementById('calendar-book-patient');
    const doctorSel = document.getElementById('calendar-book-doctor');
    const timeSel = document.getElementById('calendar-book-time');
    const quickSlots = document.getElementById('calendarQuickSlots');
    if (!patientSel || !doctorSel || !timeSel || !quickSlots) return;

    patientSel.innerHTML = '<option value="">Select patient...</option>';
    this.patients.forEach(p => { patientSel.innerHTML += `<option value="${p.id}">${p.name}</option>`; });

    doctorSel.innerHTML = '<option value="">Select doctor...</option>';
    this.doctors.forEach(d => { doctorSel.innerHTML += `<option value="${d.id}">${d.name}</option>`; });

    const uniqueTimes = [...new Set(this.slots.map(s => s.time))];
    timeSel.innerHTML = '<option value="">Select time...</option>';
    uniqueTimes.forEach(time => { timeSel.innerHTML += `<option value="${time}">${time}</option>`; });

    const freeSlots = this.slots.filter(s => !s.booked).slice(0, 12);
    quickSlots.innerHTML = freeSlots.length ? freeSlots.map(slot => `
      <button class="calendar-slot-pill" onclick="App.prefillCalendarBooking('${slot.day}','${slot.time}','${slot.doctorId || 'doc1'}')">${slot.day} · ${slot.time}</button>
    `).join('') : '<div class="calendar-empty-note">No free slots available right now.</div>';
  },

  renderCalendarDoctorList() {
    const wrap = document.getElementById('calendarDoctorList');
    if (!wrap) return;

    const allCount = this.getCalendarFilteredAppointments('all').length;
    const cards = [
      { id: 'all', name: 'All doctors', specialty: `${allCount} appointments` },
      ...this.doctors.map(doctor => ({
        id: doctor.id,
        name: doctor.name,
        specialty: `${this.getCalendarFilteredAppointments(doctor.id).length} appointments`
      }))
    ];

    wrap.innerHTML = cards.map(card => `
      <button class="calendar-doctor-card ${this.selectedCalendarDoctorId === card.id ? 'active' : ''}" onclick="App.selectCalendarDoctor('${card.id}')">
        <span class="calendar-doctor-dot"></span>
        <span class="calendar-doctor-info">
          <span class="calendar-doctor-name">${card.name}</span>
          <span class="calendar-doctor-meta">${card.specialty}</span>
        </span>
      </button>
    `).join('');
  },

  selectCalendarDoctor(doctorId) {
    this.selectedCalendarDoctorId = doctorId || 'all';
    const bookDoctor = document.getElementById('calendar-book-doctor');
    if (bookDoctor && doctorId && doctorId !== 'all') bookDoctor.value = doctorId;
    this.renderCalendarDoctorList();
    this.renderCalendarBoard();
    this.renderCalendarTodaySchedule();
  },

  filterCalendarPatients(query) {
    const normalized = String(query || '').toLowerCase().trim();
    const patientSel = document.getElementById('calendar-book-patient');
    if (!patientSel) return;
    patientSel.innerHTML = '<option value="">Select patient...</option>';
    this.patients
      .filter(p => !normalized || `${p.name} ${p.phone}`.toLowerCase().includes(normalized))
      .forEach(p => { patientSel.innerHTML += `<option value="${p.id}">${p.name}</option>`; });
  },

  getCalendarFilteredAppointments(doctorId = this.selectedCalendarDoctorId) {
    return this.appointments.filter(appt => appt.status !== 'cancelled' && (doctorId === 'all' || !doctorId || appt.doctorId === doctorId));
  },

  getCalendarFilteredSlots(doctorId = this.selectedCalendarDoctorId) {
    return this.slots.filter(slot => !slot.booked && (doctorId === 'all' || !doctorId || slot.doctorId === doctorId));
  },

  prefillCalendarBooking(day, time, doctorId = 'doc1') {
    const daySel = document.getElementById('calendar-book-day');
    const timeSel = document.getElementById('calendar-book-time');
    const doctorSel = document.getElementById('calendar-book-doctor');
    if (daySel) daySel.value = day;
    if (timeSel) timeSel.value = time;
    if (doctorSel) doctorSel.value = doctorId;
  },

  jumpCalendarToCurrentWeek() {
    this.calendarWeekOffset = 0;
    this.renderCalendarBoard();
  },

  shiftCalendar(direction) {
    this.calendarWeekOffset += direction;
    this.renderCalendarBoard();
  },

  getCalendarWeekDates() {
    const now = new Date();
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(now.getDate() + mondayOffset + this.calendarWeekOffset * 7);
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      return { date, dayName };
    });
  },

  renderCalendarBoard() {
    const board = document.getElementById('calendarBoard');
    const title = document.getElementById('calendarTitle');
    const weekdays = document.getElementById('calendarWeekdays');
    if (!board || !title || !weekdays) return;

    const weekDates = this.getCalendarWeekDates();
    title.textContent = `${weekDates[0].date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${weekDates[weekDates.length - 1].date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    weekdays.innerHTML = weekDates.map(({ date, dayName }) => {
      const bookedCount = this.getCalendarFilteredAppointments().filter(appt => (appt.slotDay || '').toLowerCase() === dayName.toLowerCase()).length;
      return `<div class="calendar-weekday-card">
        <div class="calendar-weekday-name">${dayName.slice(0, 3)}</div>
        <div class="calendar-weekday-date">${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
        <div class="calendar-weekday-badge">${bookedCount}</div>
      </div>`;
    }).join('');

    const timeRows = [...new Set(this.slots.map(slot => slot.time))];
    const filteredAppointments = this.getCalendarFilteredAppointments();

    board.innerHTML = timeRows.map(time => `
      <div class="calendar-time-row">
        <div class="calendar-time-label">${time}</div>
        ${weekDates.map(({ dayName }) => {
          const cellAppointments = filteredAppointments.filter(appt => (appt.slotDay || '').toLowerCase() === dayName.toLowerCase() && (appt.slotTime || '') === time);
          const freeSlot = this.getCalendarFilteredSlots().find(slot => slot.day === dayName && slot.time === time);
          return `<div class="calendar-grid-cell ${cellAppointments.length ? 'booked' : ''}">
            <div class="calendar-cell-stack">
              ${cellAppointments.length ? cellAppointments.map(appt => `
                <button class="calendar-event-chip" onclick="App.prefillCalendarBooking('${appt.slotDay}','${appt.slotTime}','${appt.doctorId || 'doc1'}')">
                  <span class="calendar-event-patient">${appt.patientName || 'Patient'}</span>
                  <span class="calendar-event-doctor">${appt.doctorName || 'Doctor'} · ${this.formatCurrency(appt.fee || this.getDoctorFee(appt.doctorId))}</span>
                </button>
              `).join('') : freeSlot ? `<button class="calendar-open-slot" onclick="App.prefillCalendarBooking('${freeSlot.day}','${freeSlot.time}','${freeSlot.doctorId || 'doc1'}')">+</button>` : '<span class="calendar-empty-slot">-</span>'}
            </div>
          </div>`;
        }).join('')}
      </div>
    `).join('');
  },

  renderCalendarTodaySchedule() {
    const todayStats = document.getElementById('calendarTodayStats');
    const todayList = document.getElementById('calendarTodayList');
    if (!todayStats || !todayList) return;

    const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const todayAppointments = this.getCalendarFilteredAppointments()
      .filter(appt => (appt.slotDay || '').toLowerCase() === todayName.toLowerCase())
      .sort((a, b) => String(a.slotTime || '').localeCompare(String(b.slotTime || '')));

    const statItems = [
      { label: 'Today', value: todayAppointments.length, tone: 'slate' },
      { label: 'Waiting', value: todayAppointments.length, tone: 'amber' },
      { label: 'Engaged', value: Math.min(1, todayAppointments.length), tone: 'cyan' },
      { label: 'Done', value: todayAppointments.filter(appt => appt.status === 'completed').length, tone: 'green' }
    ];

    todayStats.innerHTML = statItems.map(item => `
      <div class="calendar-stat-card ${item.tone}">
        <div class="calendar-stat-label">${item.label}</div>
        <div class="calendar-stat-value">${item.value}</div>
      </div>
    `).join('');

    todayList.innerHTML = todayAppointments.length ? todayAppointments.map(appt => `
      <article class="calendar-today-item">
        <div class="calendar-today-time">${appt.slotTime || '--'}</div>
        <div class="calendar-today-info">
          <div class="calendar-today-patient">${appt.patientName || 'Patient'}</div>
          <div class="calendar-today-meta">${appt.doctorName || 'Doctor'} · ${appt.status}</div>
        </div>
      </article>
    `).join('') : '<div class="calendar-empty-note">No appointments today.</div>';
  },

  async bookFromCalendar() {
    const patientId = document.getElementById('calendar-book-patient')?.value;
    const doctorId = document.getElementById('calendar-book-doctor')?.value;
    const slotDay = document.getElementById('calendar-book-day')?.value;
    const slotTime = document.getElementById('calendar-book-time')?.value;
    const notes = document.getElementById('calendar-book-notes')?.value || '';
    if (!patientId || !doctorId || !slotDay || !slotTime) return this.toast('Select patient, doctor, day, and time', 'error');

    const patient = this.patients.find(p => p.id === patientId);
    const doctor = this.doctors.find(d => d.id === doctorId);
    try {
      await this.api('/api/appointments', 'POST', { patientId, patientName: patient?.name, doctorId, doctorName: doctor?.name, slotDay, slotTime, fee: this.getDoctorFee(doctorId), notes });
      this.toast('Appointment booked and added to calendar', 'success');
      const notesEl = document.getElementById('calendar-book-notes');
      if (notesEl) notesEl.value = '';
      await this.loadAppointments();
      await this.loadCalendarPage(true);
      await this.loadTodayAppts();
      await this.loadStats();
    } catch (e) { this.toast('Booking failed: ' + e.message, 'error'); }
  },

  async addAppointment() {
    const patSel=document.getElementById('appt-patient'), docSel=document.getElementById('appt-doctor');
    const patientId=patSel.value, doctorId=docSel.value;
    if(!patientId||!doctorId) return this.toast('Select patient and doctor','error');
    const slotDay=document.getElementById('appt-day').value, slotTime=document.getElementById('appt-time').value;
    if(!slotDay||!slotTime) return this.toast('Select day and time','error');
    const patient=this.patients.find(p=>p.id===patientId), doctor=this.doctors.find(d=>d.id===doctorId);
    try {
      await this.api('/api/appointments','POST',{patientId,patientName:patient?.name,doctorId,doctorName:doctor?.name,slotDay,slotTime,fee:this.getDoctorFee(doctorId),notes:document.getElementById('appt-notes').value});
      this.toast('Appointment booked! Patient notified 📅','success'); this.closeModal('addApptModal'); this.loadAppointments(); this.loadStats();
    } catch(e){this.toast('Error: '+e.message,'error');}
  },

  getDoctorFee(doctorId) {
    return Number(this.doctors.find(d => d.id === doctorId)?.consultationFee || 500);
  },

  async loadReports(silent = false) {
    try {
      await Promise.all([
        this.patients.length ? Promise.resolve() : this.api('/api/patients').then(data => { this.patients = data; }),
        this.doctors.length ? Promise.resolve() : this.api('/api/doctors').then(data => { this.doctors = data; }),
        this.api('/api/doctor/appointments').then(data => { this.appointments = data?.items || []; }),
        this.api('/api/prescriptions').then(data => { this.prescriptions = data; }),
        this.api('/api/expenses').then(data => { this.expenses = data; })
      ]);
      this.renderReports();
    } catch (e) {
      if (!silent) this.toast('Failed to load reports', 'error');
    }
  },

  changeReportsPeriod(period) {
    this.reportsPeriod = period || '30';
    this.renderReports();
  },

  renderReports() {
    const statsWrap = document.getElementById('reportsStats');
    const tableBody = document.getElementById('reportsTable');
    const rangeLabel = document.getElementById('reportsRangeLabel');
    if (!statsWrap || !tableBody) return;

    const filteredAppointments = this.filterByPeriod(this.appointments, item => item.createdAt || item.updatedAt);
    const filteredPrescriptions = this.filterByPeriod(this.prescriptions, item => item.createdAt);
    const filteredPatients = this.filterByPeriod(this.patients, item => item.createdAt);
    const filteredExpenses = this.filterByPeriod(this.expenses, item => item.incurredOn || item.createdAt);
    const totalRevenue = filteredAppointments.reduce((sum, appt) => sum + Number(appt.fee || this.getDoctorFee(appt.doctorId)), 0);
    const totalExpenses = filteredExpenses.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const averageBilling = filteredAppointments.length ? totalRevenue / filteredAppointments.length : 0;

    const cards = [
      { label: 'New Patients', value: filteredPatients.length, tone: 'teal', meta: 'Registered in selected period' },
      { label: 'Appointments', value: filteredAppointments.length, tone: 'indigo', meta: 'Booked consultations' },
      { label: 'Revenue', value: this.formatCurrency(totalRevenue), tone: 'green', meta: 'Estimated consultation value' },
      { label: 'Expenses', value: this.formatCurrency(totalExpenses), tone: 'amber', meta: 'Activities and operating cost' },
      { label: 'Net', value: this.formatCurrency(totalRevenue - totalExpenses), tone: 'slate', meta: 'Revenue minus expenses' },
      { label: 'Avg Billing', value: this.formatCurrency(averageBilling), tone: 'cyan', meta: 'Per appointment average' }
    ];

    statsWrap.innerHTML = cards.map(card => `
      <article class="report-stat-card ${card.tone}">
        <div class="report-stat-label">${card.label}</div>
        <div class="report-stat-value">${card.value}</div>
        <div class="report-stat-meta">${card.meta}</div>
      </article>
    `).join('');

    const rows = this.patients.map(patient => {
      const patientAppointments = filteredAppointments.filter(appt => appt.patientId === patient.id);
      const lastVisit = patientAppointments
        .map(appt => appt.createdAt)
        .filter(Boolean)
        .sort((a, b) => new Date(b) - new Date(a))[0];
      return {
        patient,
        appointmentCount: patientAppointments.length,
        lastVisit
      };
    }).filter(row => this.reportsPeriod === 'all' || row.appointmentCount || this.isDateInPeriod(row.patient.createdAt))
      .sort((a, b) => b.appointmentCount - a.appointmentCount || a.patient.name.localeCompare(b.patient.name));

    rangeLabel.textContent = `${rows.length} patients shown for ${this.describePeriod()}.`;
    tableBody.innerHTML = rows.length ? rows.map(row => `
      <tr>
        <td><strong>${row.patient.name}</strong>${row.patient.notes ? `<br><span style="font-size:11px;color:var(--text3)">${row.patient.notes.substring(0, 50)}</span>` : ''}</td>
        <td style="font-family:'Space Mono',monospace;font-size:12px">${row.patient.phone || '—'}</td>
        <td>${row.appointmentCount}</td>
        <td>${row.prescriptionCount}</td>
        <td>${this.formatCurrency(row.revenue)}</td>
        <td>${row.lastVisit ? this.formatDate(row.lastVisit) : '—'}</td>
        <td><span class="tag ${row.patient.verified ? 'tag-green' : 'tag-amber'}">${row.patient.verified ? 'Verified' : 'Pending'}</span></td>
      </tr>
    `).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:24px">No patient data found for this period.</td></tr>';
  },

  async loadInventory(silent = false) {
    try {
      this.inventory = await this.api('/api/inventory');
      this.renderInventory();
    } catch (e) {
      if (!silent) this.toast('Failed to load inventory', 'error');
    }
  },

  renderInventory() {
    const tableBody = document.getElementById('inventoryTable');
    const summary = document.getElementById('inventorySummary');
    if (!tableBody || !summary) return;

    const totalUnits = this.inventory.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const lowStock = this.inventory.filter(item => Number(item.quantity || 0) <= Number(item.reorderLevel || 0)).length;
    const stockValue = this.inventory.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitCost || 0), 0);

    summary.innerHTML = [
      { label: 'Items', value: this.inventory.length, tone: 'teal', meta: 'Tracked stock entries' },
      { label: 'Total Units', value: totalUnits, tone: 'indigo', meta: 'Available quantity' },
      { label: 'Low Stock', value: lowStock, tone: 'amber', meta: 'Needs reorder soon' },
      { label: 'Stock Value', value: this.formatCurrency(stockValue), tone: 'green', meta: 'Estimated on-hand value' }
    ].map(card => `
      <article class="report-stat-card ${card.tone}">
        <div class="report-stat-label">${card.label}</div>
        <div class="report-stat-value">${card.value}</div>
        <div class="report-stat-meta">${card.meta}</div>
      </article>
    `).join('');

    tableBody.innerHTML = this.inventory.length ? this.inventory.map(item => `
      <tr>
        <td><strong>${item.name}</strong></td>
        <td>${item.category || '—'}</td>
        <td>${item.quantity} ${item.unit || ''}</td>
        <td>${item.reorderLevel || 0}</td>
        <td>${this.formatCurrency(item.unitCost || 0)}</td>
        <td>${item.vendor || '—'}</td>
        <td><button class="btn btn-red btn-sm" onclick="App.deleteInventoryItem('${item.id}')">Delete</button></td>
      </tr>
    `).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:24px">No inventory items yet.</td></tr>';
  },

  async addInventoryItem() {
    const name = document.getElementById('inv-name')?.value.trim();
    const quantity = document.getElementById('inv-quantity')?.value;
    if (!name || !quantity) return this.toast('Item name and quantity are required', 'error');
    try {
      await this.api('/api/inventory', 'POST', {
        name,
        category: document.getElementById('inv-category')?.value,
        vendor: document.getElementById('inv-vendor')?.value,
        quantity,
        unit: document.getElementById('inv-unit')?.value,
        reorderLevel: document.getElementById('inv-reorder')?.value,
        unitCost: document.getElementById('inv-cost')?.value
      });
      this.toast('Inventory item added', 'success');
      this.closeModal('inventoryModal');
      this.loadInventory();
      if (this.currentPage === 'reports') this.loadReports(true);
    } catch (e) { this.toast('Error: ' + e.message, 'error'); }
  },

  async deleteInventoryItem(id) {
    if (!confirm('Delete this inventory item?')) return;
    await this.api(`/api/inventory/${id}`, 'DELETE');
    this.toast('Inventory item deleted', 'info');
    this.loadInventory();
    if (this.currentPage === 'reports') this.loadReports(true);
  },

  async loadExpenses(silent = false) {
    try {
      this.expenses = await this.api('/api/expenses');
      this.renderExpenses();
    } catch (e) {
      if (!silent) this.toast('Failed to load expenses', 'error');
    }
  },

  renderExpenses() {
    const tableBody = document.getElementById('expensesTable');
    const summary = document.getElementById('expenseSummary');
    if (!tableBody || !summary) return;

    const filtered = this.expenses;
    const total = filtered.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const average = filtered.length ? total / filtered.length : 0;
    const categories = new Set(filtered.map(item => item.category || 'General')).size;

    summary.innerHTML = [
      { label: 'Entries', value: filtered.length, tone: 'teal', meta: 'All recorded entries' },
      { label: 'Spend', value: this.formatCurrency(total), tone: 'amber', meta: 'Total activities + expenses' },
      { label: 'Average', value: this.formatCurrency(average), tone: 'indigo', meta: 'Average per entry' },
      { label: 'Categories', value: categories, tone: 'slate', meta: 'Unique expense buckets' }
    ].map(card => `
      <article class="report-stat-card ${card.tone}">
        <div class="report-stat-label">${card.label}</div>
        <div class="report-stat-value">${card.value}</div>
        <div class="report-stat-meta">${card.meta}</div>
      </article>
    `).join('');

    tableBody.innerHTML = filtered.length ? filtered.map(item => `
      <tr>
        <td><strong>${item.title}</strong></td>
        <td>${item.category || '—'}</td>
        <td>${this.formatCurrency(item.amount || 0)}</td>
        <td>${this.formatDate(item.incurredOn || item.createdAt)}</td>
        <td>${item.notes || '—'}</td>
        <td><button class="btn btn-red btn-sm" onclick="App.deleteExpenseItem('${item.id}')">Delete</button></td>
      </tr>
    `).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:24px">No expense entries yet.</td></tr>';
  },

  async addExpenseItem() {
    const title = document.getElementById('exp-title')?.value.trim();
    const amount = document.getElementById('exp-amount')?.value;
    if (!title || !amount) return this.toast('Title and amount are required', 'error');
    try {
      await this.api('/api/expenses', 'POST', {
        title,
        category: document.getElementById('exp-category')?.value,
        amount,
        incurredOn: document.getElementById('exp-date')?.value || new Date().toISOString(),
        notes: document.getElementById('exp-notes')?.value
      });
      this.toast('Expense entry added', 'success');
      this.closeModal('expenseModal');
      this.loadExpenses();
      if (this.currentPage === 'reports') this.loadReports(true);
    } catch (e) { this.toast('Error: ' + e.message, 'error'); }
  },

  async deleteExpenseItem(id) {
    if (!confirm('Delete this expense entry?')) return;
    await this.api(`/api/expenses/${id}`, 'DELETE');
    this.toast('Expense entry deleted', 'info');
    this.loadExpenses();
    if (this.currentPage === 'reports') this.loadReports(true);
  },

  getAppointmentById(id) {
    return this.appointments.find(a => (a.id || a.appointmentId) === id);
  },

  formatAppointmentSlotLabel(slot) {
    const dateText = slot.date ? new Date(`${slot.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : (slot.day || 'Date');
    const dayText = slot.day ? ` (${slot.day})` : '';
    return `${dateText}${dayText}`;
  },

  async openAppointmentActionModal(id, action = 'reschedule') {
    const appt = this.getAppointmentById(id);
    if (!appt) return this.toast('Appointment not found', 'error');

    await this.loadSlots();
    this.appointmentActionContext = { appointmentId: id, appointment: appt };
    this.appointmentActionSlots = this.getAppointmentFreeSlots(appt);
    this.populateAppointmentActionModal(action);
    this.openModal('appointmentActionModal');
  },

  getAppointmentFreeSlots(appt) {
    const doctorId = appt.doctorId || 'doc1';
    return this.slots
      .filter(slot => !slot.booked && (slot.doctorId || 'doc1') === doctorId)
      .sort((a, b) => {
        const dateA = String(a.date || '');
        const dateB = String(b.date || '');
        if (dateA && dateB && dateA !== dateB) return dateA.localeCompare(dateB);
        if ((a.day || '') !== (b.day || '')) return String(a.day || '').localeCompare(String(b.day || ''));
        return String(a.time || '').localeCompare(String(b.time || ''));
      });
  },

  populateAppointmentActionModal(action = 'reschedule') {
    const ctx = this.appointmentActionContext;
    if (!ctx) return;

    const appt = ctx.appointment;
    const summary = document.getElementById('appointmentActionSummary');
    const typeSel = document.getElementById('appointment-action-type');
    if (summary) {
      summary.innerHTML = `<strong>${appt.patientName || 'Patient'}</strong><br>${appt.doctorName || 'Doctor'} · ${appt.slotDay || appt.day || appt.date || '-'} · ${appt.slotTime || appt.time || '-'}`;
    }
    if (typeSel) typeSel.value = action;
    this.handleAppointmentActionChange();
  },

  handleAppointmentActionChange() {
    const type = document.getElementById('appointment-action-type')?.value || 'reschedule';
    const slotFields = document.getElementById('appointmentActionSlotFields');
    const cancelNote = document.getElementById('appointmentActionCancelNote');
    const submit = document.getElementById('appointmentActionSubmit');

    if (slotFields) slotFields.style.display = type === 'reschedule' ? 'block' : 'none';
    if (cancelNote) cancelNote.style.display = type === 'cancel' ? 'block' : 'none';
    if (submit) submit.textContent = type === 'cancel' ? 'Cancel Appointment' : 'Reschedule Appointment';

    if (type === 'reschedule') {
      this.populateAppointmentActionDates();
    }
  },

  populateAppointmentActionDates() {
    const dateSel = document.getElementById('appointment-action-date');
    const hint = document.getElementById('appointmentActionHint');
    if (!dateSel) return;

    const uniqueDates = [];
    this.appointmentActionSlots.forEach(slot => {
      const key = `${slot.date || ''}__${slot.day || ''}`;
      if (!uniqueDates.some(item => item.key === key)) {
        uniqueDates.push({ key, date: slot.date || '', day: slot.day || '', label: this.formatAppointmentSlotLabel(slot) });
      }
    });

    if (!uniqueDates.length) {
      dateSel.innerHTML = '<option value="">No free dates available</option>';
      const timeSel = document.getElementById('appointment-action-time');
      if (timeSel) timeSel.innerHTML = '<option value="">No free time available</option>';
      if (hint) hint.textContent = 'No open slots are available for this doctor right now.';
      return;
    }

    dateSel.innerHTML = uniqueDates.map(item => `<option value="${item.key}">${item.label}</option>`).join('');
    if (hint) hint.textContent = `Showing ${this.appointmentActionSlots.length} free slot${this.appointmentActionSlots.length === 1 ? '' : 's'} for selection.`;
    this.handleAppointmentDateChange();
  },

  handleAppointmentDateChange() {
    const dateKey = document.getElementById('appointment-action-date')?.value || '';
    const timeSel = document.getElementById('appointment-action-time');
    if (!timeSel) return;

    const matchingSlots = this.appointmentActionSlots.filter(slot => `${slot.date || ''}__${slot.day || ''}` === dateKey);
    if (!matchingSlots.length) {
      timeSel.innerHTML = '<option value="">No free time available</option>';
      return;
    }

    timeSel.innerHTML = matchingSlots.map(slot => `<option value="${slot.time}">${slot.time}</option>`).join('');
  },

  async submitAppointmentAction() {
    const ctx = this.appointmentActionContext;
    if (!ctx) return;

    const action = document.getElementById('appointment-action-type')?.value || 'reschedule';
    const appointmentId = ctx.appointmentId;

    try {
      if (action === 'cancel') {
        await this.cancelAppointmentRequest(appointmentId);
        this.toast('Appointment cancelled. Patient kept in records.', 'info');
      } else {
        const dateKey = document.getElementById('appointment-action-date')?.value || '';
        const time = document.getElementById('appointment-action-time')?.value || '';
        const selectedSlot = this.appointmentActionSlots.find(slot => `${slot.date || ''}__${slot.day || ''}` === dateKey && String(slot.time || '') === time);
        if (!selectedSlot) return this.toast('Select an available date and time', 'error');

        await this.rescheduleAppointmentRequest(appointmentId, selectedSlot);
        this.toast('Appointment rescheduled. Patient notified.', 'success');
      }

      this.closeModal('appointmentActionModal');
      await this.loadAppointments();
      await this.loadCalendarPage(true);
    } catch (e) {
      this.toast(`Error: ${e.message}`, 'error');
    }
  },

  async cancelAppointmentRequest(id) {
    try {
      return await this.api(`/api/appointments/${id}/cancel`, 'PATCH');
    } catch (error) {
      return this.api(`/api/appointments/${id}`, 'PUT', { status: 'cancelled' });
    }
  },

  async rescheduleAppointmentRequest(id, slot) {
    return this.api(`/api/appointments/${id}`, 'PUT', {
      status: 'rescheduled',
      slotDay: slot.day,
      slotTime: slot.time,
      date: slot.date,
    });
  },

  async cancelAppt(id) {
    await this.openAppointmentActionModal(id, 'cancel');
  },

  async rescheduleAppt(id) {
    await this.openAppointmentActionModal(id, 'reschedule');
  },

  // ── PRESCRIPTIONS ────────────────────────────────────────────────
  async loadPrescriptions() {
    try {
      this.prescriptions = await this.api('/api/prescriptions');
      const tb = document.getElementById('rxTable'); tb.innerHTML = '';
      if (!this.prescriptions.length) { tb.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:24px">No prescriptions yet.</td></tr>'; return; }
      this.prescriptions.forEach(rx => {
        const patient=this.patients.find(p=>p.id===rx.patientId)||{name:rx.patientId};
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><strong>${patient.name}</strong></td><td>${rx.doctorName||'—'}</td>
          <td>${rx.diagnosis||'—'}</td>
          <td>${(rx.medicines||[]).map(m=>`<span style="font-size:11px;display:block">${m.name} ${m.dosage}</span>`).join('')}</td>
          <td style="font-size:11px;color:var(--text2)">${new Date(rx.createdAt).toLocaleDateString('en-IN')}</td>
          <td><div class="action-btns"><button class="btn btn-ghost btn-sm" onclick="App.resendRx('${rx.id}')">📤 Resend</button></div></td>`;
        tb.appendChild(tr);
      });
    } catch(e){this.toast('Failed to load prescriptions','error');}
  },

  addMedicineRow() {
    const wrap = document.getElementById('rxMedicines');
    const row = document.createElement('div'); row.className = 'rx-med-row';
    row.innerHTML = `<input class="form-input rx-name" placeholder="Medicine Name" />
      <input class="form-input rx-dosage" placeholder="Dosage (e.g. 500mg)" />
      <select class="form-select rx-timing"><option value="">Timing</option><option>Morning before food</option><option>Morning after food</option><option>Afternoon after food</option><option>Evening after food</option><option>Night before bed</option><option>Twice daily</option><option>Thrice daily</option><option>As directed</option></select>
      <button class="btn-icon-del" onclick="this.parentElement.remove()">✕</button>`;
    wrap.appendChild(row);
  },

  async addPrescription() {
    const patSel=document.getElementById('rx-patient'), docSel=document.getElementById('rx-doctor');
    const patientId=patSel.value, doctorId=docSel.value;
    if(!patientId||!doctorId) return this.toast('Select patient and doctor','error');
    const diagnosis=document.getElementById('rx-diagnosis').value.trim(); if(!diagnosis) return this.toast('Diagnosis required','error');
    const medicines=[]; document.querySelectorAll('.rx-med-row').forEach(r=>{const name=r.querySelector('.rx-name')?.value.trim();if(name) medicines.push({name,dosage:r.querySelector('.rx-dosage')?.value.trim(),timing:r.querySelector('.rx-timing')?.value});});
    if(!medicines.length) return this.toast('Add at least one medicine','error');
    const doctor=this.doctors.find(d=>d.id===doctorId);
    try {
      await this.api('/api/prescriptions','POST',{patientId,doctorId,doctorName:doctor?.name,diagnosis,medicines,notes:document.getElementById('rx-notes').value});
      this.toast('Prescription saved & sent to patient 💊','success'); this.closeModal('addRxModal'); this.loadPrescriptions(); this.loadStats();
    } catch(e){this.toast('Error: '+e.message,'error');}
  },

  async resendRx(id) { await this.api(`/api/prescriptions/send-whatsapp/${id}`,'POST'); this.toast('Prescription resent via WhatsApp 📤','success'); },

  // ── CHAT ─────────────────────────────────────────────────────────
  async loadChatList() {
    try {
      if (!this.patients.length) {
        try { this.patients = await this.api('/api/patients'); } catch {}
      }
      this.chats = await this.api('/api/chat');
      const list = document.getElementById('chatList'); list.innerHTML = '';
      if (!this.chats.length) {
        list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text3);font-size:12px">No patient messages yet</div>';
        if (!this.activeChatPatientId) this.renderChatLanding();
        return;
      }
      this.chats.forEach(c => {
        const item = document.createElement('div'); item.className = `chat-list-item${c.patientId===this.activeChatPatientId?' active':''}`;
        item.onclick = () => this.openChat(c.patientId);
        const initials = c.patientName.split(' ').map(w=>w[0]).join('').toUpperCase().substring(0,2);
        const lastMsg = c.lastMessage; const timeStr = lastMsg ? this.formatTime(lastMsg.timestamp) : '';
        const preview = lastMsg ? (lastMsg.text||'').substring(0,35) : '';
        item.innerHTML = `<div class="cli-avatar">${initials}</div>
          <div class="cli-info"><div class="cli-name">${c.patientName}</div><div class="cli-preview">${preview}</div></div>
          <div class="cli-meta"><div class="cli-time">${timeStr}</div>${c.unread>0?`<div class="cli-unread">${c.unread}</div>`:''}</div>`;
        list.appendChild(item);
      });
      if (!this.activeChatPatientId) this.renderChatLanding();
    } catch(e) { console.error('Chat list error', e); }
  },

  filterChats(q) {
    document.querySelectorAll('.chat-list-item').forEach(item => { item.style.display = item.textContent.toLowerCase().includes(q.toLowerCase())?'':'none'; });
  },

  async openChat(patientId) {
    this.activeChatPatientId = patientId;
    if (this.chatPollInterval) clearInterval(this.chatPollInterval);
    await this.renderChat(patientId);
    this.chatPollInterval = setInterval(() => this.renderChat(patientId, true), 4000);
    await this.api(`/api/chat/${patientId}/read`,'POST');
    this.loadChatList();
  },

  renderChatLanding() {
    const selectedPatientId = this.activeChatPatientId || this.patients[0]?.id || '';
    const selectedDoctorId = this.doctors[0]?.id || 'doc1';
    const selectedLanguage = this.chatLanguageSelections[selectedPatientId] || 'en';
    const mainEl = document.getElementById('chatMain');
    if (!mainEl) return;

    mainEl.innerHTML = `<div class="chat-empty chat-empty-compose">
      <div class="chat-empty-icon">💬</div>
      <div class="chat-empty-title">Send a WhatsApp message</div>
      <p class="chat-empty-copy">Choose a patient, pick a doctor, then send directly from this main section.</p>
      <div class="chat-quick-compose">
        <select id="chatPatientSel" class="form-select" onchange="App.changeMainChatPatient(this.value)">
          <option value="">Select patient...</option>
          ${this.patients.map(p=>`<option value="${p.id}" ${p.id===selectedPatientId?'selected':''}>${p.name}</option>`).join('')}
        </select>
        <div class="chat-input-bar chat-input-bar-stack">
          <select id="chatDoctorSel" class="form-select" style="width:180px;flex-shrink:0">
            ${this.doctors.map(d=>`<option value="${d.id}" ${d.id===selectedDoctorId?'selected':''}>${d.name}</option>`).join('')}
          </select>
          <select id="chatLanguageSel" class="form-select chat-language-select" onchange="App.setChatLanguage(document.getElementById('chatPatientSel')?.value || '${selectedPatientId}', this.value)">
            <option value="en" ${selectedLanguage==='en'?'selected':''}>English</option>
            <option value="ta" ${selectedLanguage==='ta'?'selected':''}>Tamil</option>
            <option value="hi" ${selectedLanguage==='hi'?'selected':''}>Hindi</option>
          </select>
          <div class="chat-compose-field">
            <textarea class="chat-input chat-input-large chat-input-with-actions" id="chatTextInput" placeholder="${this.getChatPlaceholder(selectedLanguage)}" rows="4" onkeydown="App.chatKeyDown(event,'${selectedPatientId}')"></textarea>
            <div class="chat-compose-actions">
              <button class="chat-compose-icon-btn" id="chatMicBtn" title="Voice to text" type="button" aria-label="Voice to text">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 15a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"/>
                  <path d="M17 11a1 1 0 1 1 2 0a7 7 0 1 1-14 0a1 1 0 1 1 2 0a5 5 0 0 0 10 0Z"/>
                  <path d="M12 18a1 1 0 0 1 1 1v3h-2v-3a1 1 0 0 1 1-1Z"/>
                </svg>
              </button>
              <button class="chat-compose-send-btn" onclick="App.sendMainChatMessage()" type="button" aria-label="Send message">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3.4 20.6 21 12 3.4 3.4l2 6.7L14 12l-8.6 1.9-2 6.7Z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div class="chat-compose-meta" id="chatLanguageHint">${this.getChatLanguageHint(selectedLanguage)}</div>
      </div>
    </div>`;

    this.updateChatComposerState(selectedPatientId);
    this.initVoiceToText('chatTextInput', 'chatMicBtn');
  },

  changeMainChatPatient(patientId) {
    this.activeChatPatientId = patientId || null;
    const language = this.chatLanguageSelections[patientId] || 'en';
    const langSel = document.getElementById('chatLanguageSel');
    if (langSel) langSel.value = language;
    this.updateChatComposerState(patientId);
  },

  async renderChat(patientId, silent = false) {
    try {
      const msgs = await this.api(`/api/chat/${patientId}`);
      const patient = this.patients.find(p=>p.id===patientId) || await this.api(`/api/patients`).then(arr=>arr.find(p=>p.id===patientId));
      const chatGroup = this.chats.find(c=>c.patientId===patientId);
      const patientName = patient?.name || chatGroup?.patientName || 'Patient';
      const doctor = this.doctors.find(d=>d.id===(msgs[0]?.doctorId)) || this.doctors[0] || {id:'doc1',name:'Doctor'};
      const selectedLanguage = this.chatLanguageSelections[patientId] || 'en';

      const mainEl = document.getElementById('chatMain');
      const wasAtBottom = mainEl.scrollTop + mainEl.clientHeight >= mainEl.scrollHeight - 30;

      const msgsHtml = msgs.length === 0 ? '<div style="text-align:center;color:var(--text3);padding:24px;font-size:13px">No messages yet. Send a message below or use the Automation tab.</div>' : msgs.map(m => {
        const isDoc = m.direction === 'doctor';
        const typeLabel = {chat:'&#128172; Chat',appointment:'&#128197; Appt',prescription:'&#128138; Rx',slot_picker:'&#128197; Slots',booking_invite:'&#128197; Booking',prescription_enquiry:'&#128138; Enquiry',follow_up:'&#128222; Follow-up',enquiry:'&#10067; Enquiry',status:'&#128202; Status',follow_up_response:'&#128202; Follow-up'}[m.type]||'';
        return `<div class="chat-msg ${isDoc?'doctor':'patient'}">
          ${typeLabel?`<div class="chat-msg-type">${typeLabel}</div>`:''}
          <div>${m.text||''}</div>
          <div class="chat-msg-time">${this.formatTime(m.timestamp)}</div>
        </div>`;
      }).join('');

      // On silent polls, only update the messages area — preserve input, mic, and transcript
      if (silent && mainEl.querySelector('.chat-active') && this.activeChatPatientId === patientId) {
        const msgsEl = document.getElementById('chatMsgs');
        if (msgsEl) {
          msgsEl.innerHTML = msgsHtml;
          if (wasAtBottom) msgsEl.scrollTop = msgsEl.scrollHeight;
        }
        return;
      }

      // Preserve any text the user has typed/dictated before we rebuild the DOM
      const existingInput = document.getElementById('chatTextInput');
      const savedText = existingInput ? existingInput.value : '';

      // Track which patient is active so silent polls take the fast path above
      this.activeChatPatientId = patientId;

      mainEl.innerHTML = `<div class="chat-active">
        <div class="chat-header">
          <div class="chat-header-info">
            <div class="cli-avatar" style="width:36px;height:36px;font-size:12px">${patientName.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase()}</div>
            <div><div class="chat-header-name">${patientName}</div><div class="chat-header-sub">${patient?.phone||''}</div></div>
          </div>
          <div class="action-btns">
            <button class="btn btn-ghost btn-sm chat-action-btn" onclick="App.openSendSlot('${patientId}')">
              <span class="chat-action-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v11a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Z"/>
                  <path d="M4 10h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8Z" fill="none"/>
                </svg>
              </span>
              <span>Send Slots</span>
            </button>
            <button class="btn btn-ghost btn-sm chat-action-btn" onclick="App.quickFollowUp('${patientId}','${doctor.id}','${doctor.name}')">
              <span class="chat-action-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M12 2a10 10 0 1 0 6.7 17.4L22 22l-2.6-3.3A10 10 0 0 0 12 2Zm1 5v5h4a1 1 0 1 1 0 2h-5a1 1 0 0 1-1-1V7a1 1 0 1 1 2 0Z"/>
                </svg>
              </span>
              <span>Follow-Up</span>
            </button>
          </div>
        </div>
        <div class="chat-messages" id="chatMsgs">
          ${msgsHtml}
        </div>
        <div class="chat-input-bar chat-input-bar-stack">
          <select id="chatDoctorSel" class="form-select" style="width:180px;flex-shrink:0">
            ${this.doctors.map(d=>`<option value="${d.id}" ${d.id===doctor.id?'selected':''}>${d.name}</option>`).join('')}
          </select>
          <select id="chatLanguageSel" class="form-select chat-language-select" onchange="App.setChatLanguage('${patientId}', this.value)">
            <option value="en" ${selectedLanguage==='en'?'selected':''}>English</option>
            <option value="ta" ${selectedLanguage==='ta'?'selected':''}>Tamil</option>
            <option value="hi" ${selectedLanguage==='hi'?'selected':''}>Hindi</option>
          </select>
          <div class="chat-compose-field">
            <textarea class="chat-input chat-input-large chat-input-with-actions" id="chatTextInput" placeholder="${this.getChatPlaceholder(selectedLanguage)}" rows="4" onkeydown="App.chatKeyDown(event,'${patientId}')">${savedText}</textarea>
            <div class="chat-compose-actions">
              <button class="chat-compose-icon-btn" id="chatMicBtn" title="Voice to text" type="button" aria-label="Voice to text">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 15a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"/>
                  <path d="M17 11a1 1 0 1 1 2 0a7 7 0 1 1-14 0a1 1 0 1 1 2 0a5 5 0 0 0 10 0Z"/>
                  <path d="M12 18a1 1 0 0 1 1 1v3h-2v-3a1 1 0 0 1 1-1Z"/>
                </svg>
              </button>
              <button class="chat-compose-send-btn" onclick="App.sendChatMessage('${patientId}')" type="button" aria-label="Send message">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3.4 20.6 21 12 3.4 3.4l2 6.7L14 12l-8.6 1.9-2 6.7Z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div class="chat-compose-meta" id="chatLanguageHint">${this.getChatLanguageHint(selectedLanguage)}</div>
      </div>`;

      if (wasAtBottom || !silent) {
        const msgsEl = document.getElementById('chatMsgs'); if (msgsEl) msgsEl.scrollTop = msgsEl.scrollHeight;
      }
      this.updateChatComposerState(patientId);
      this.initVoiceToText('chatTextInput', 'chatMicBtn');
      document.querySelectorAll('.chat-list-item').forEach(i => i.classList.remove('active'));
      document.querySelectorAll('.chat-list-item').forEach(i => { if (i.onclick?.toString().includes(patientId)) i.classList.add('active'); });
    } catch(e) { if (!silent) console.error('Render chat error', e); }
  },

  setChatLanguage(patientId, language) {
    this.chatLanguageSelections[patientId] = language || 'en';
    this.updateChatComposerState(patientId);
  },

  getChatPlaceholder(language) {
    const placeholders = {
      en: 'Type a message to send via WhatsApp...',
      ta: 'Type your message in English. It will be translated to Tamil before sending...',
      hi: 'Type your message in English. It will be translated to Hindi before sending...'
    };
    return placeholders[language] || placeholders.en;
  },

  getChatLanguageHint(language) {
    const hints = {
      en: 'Message will be sent exactly as written.',
      ta: 'English text will be translated to Tamil before it is sent to the patient.',
      hi: 'English text will be translated to Hindi before it is sent to the patient.'
    };
    return hints[language] || hints.en;
  },

  updateChatComposerState(patientId) {
    const language = document.getElementById('chatLanguageSel')?.value || this.chatLanguageSelections[patientId] || 'en';
    this.chatLanguageSelections[patientId] = language;

    const input = document.getElementById('chatTextInput');
    if (input) input.placeholder = this.getChatPlaceholder(language);

    const hint = document.getElementById('chatLanguageHint');
    if (hint) hint.textContent = this.getChatLanguageHint(language);
  },

  chatKeyDown(e, patientId) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const resolvedPatientId = patientId || document.getElementById('chatPatientSel')?.value || this.activeChatPatientId;
      if (document.getElementById('chatPatientSel')) return this.sendMainChatMessage();
      this.sendChatMessage(resolvedPatientId);
    }
  },

  async sendChatMessage(patientId) {
    const input = document.getElementById('chatTextInput'); const originalValue = input?.value || ''; const message = originalValue.trim(); if (!message) return;
    const doctorId = document.getElementById('chatDoctorSel')?.value || 'doc1';
    const targetLanguage = document.getElementById('chatLanguageSel')?.value || this.chatLanguageSelections[patientId] || 'en';
    this.chatLanguageSelections[patientId] = targetLanguage;
    try {
      const res = await this.api('/api/chat/send','POST',{patientId,doctorId,message,targetLanguage,sourceLanguage:'en'});
      if (input) input.value = '';
      if (res.notification?.success === false) this.toast(res.notification.message || 'Message saved, but WhatsApp delivery failed.','error');
      else if (res.simulated) this.toast('Message was logged only. WhatsApp is still in simulation mode.','info');
      else
      this.toast(res.translated ? 'Message translated and sent via WhatsApp' : 'Message sent via WhatsApp 📤','success');
      await this.renderChat(patientId); await this.loadChatList();
    } catch(e){ if (input) input.value = originalValue; this.toast('Send failed: '+e.message,'error'); }
  },

  async sendMainChatMessage() {
    const patientId = document.getElementById('chatPatientSel')?.value || this.activeChatPatientId;
    if (!patientId) return this.toast('Please select a patient','error');

    await this.sendChatMessage(patientId);
    this.activeChatPatientId = patientId;
  },

  initVoiceToText(inputElementId, micButtonId) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (typeof App !== 'undefined' && App.toast) App.toast("Speech Recognition API not supported in this browser.", "error");
      return;
    }

    // Store recognition instance on the App so we can reuse/cleanup
    if (this._voiceRecognition) {
      try { this._voiceRecognition.stop(); } catch(e) {}
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    this._voiceRecognition = recognition;
    this._voiceInputId = inputElementId;
    this._voiceFinalTranscript = '';
    
    const micBtn = document.getElementById(micButtonId);
    if (!micBtn) return;
    
    const newMicBtn = micBtn.cloneNode(true);
    micBtn.parentNode.replaceChild(newMicBtn, micBtn);
    
    const stopRecording = () => {
      newMicBtn.classList.remove('recording-pulse');
      newMicBtn.style.background = '';
      newMicBtn.textContent = '\u{1F3A4}';
    };
    
    newMicBtn.addEventListener('click', () => {
      const currentInput = document.getElementById(this._voiceInputId);
      if (!currentInput) {
        if (typeof App !== 'undefined' && App.toast) App.toast('Text input not found', 'error');
        return;
      }
      if (newMicBtn.classList.contains('recording-pulse')) {
        recognition.stop();
        stopRecording();
        if (typeof App !== 'undefined' && App.toast) App.toast('Microphone stopped.', 'info');
        return;
      }
      this._voiceFinalTranscript = currentInput.value;
      newMicBtn.classList.add('recording-pulse');
      newMicBtn.style.background = '#ef4444';
      newMicBtn.style.color = '#fff';
      newMicBtn.style.borderRadius = '50%';
      newMicBtn.textContent = '\u23F9';
      try {
        recognition.start();
        if (typeof App !== 'undefined' && App.toast) App.toast('Microphone active. Start speaking...', 'info');
      } catch(e) {
        console.error('Mic start error:', e);
        stopRecording();
      }
    });
    
    recognition.onresult = (event) => {
      // Always get the CURRENT input element from the DOM (not a stale reference)
      const currentInput = document.getElementById(this._voiceInputId);
      if (!currentInput) return;
      
      let interimTranscript = '';
      let newFinal = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          newFinal += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      if (newFinal) {
        this._voiceFinalTranscript += (this._voiceFinalTranscript ? ' ' : '') + newFinal;
      }
      currentInput.value = this._voiceFinalTranscript + (interimTranscript ? ' ' + interimTranscript : '');
    };
    recognition.onend = () => { stopRecording(); };
    recognition.onerror = (e) => { 
      stopRecording(); 
      if (e.error !== 'no-speech' && e.error !== 'aborted' && typeof App !== 'undefined' && App.toast) {
        App.toast('Mic error: ' + e.error, 'error');
      }
    };
  },

  async loadPendingChats() {
    try {
      const chats = await this.api('/api/chat');
      const wrap = document.getElementById('pendingChats'); wrap.innerHTML = '';
      const unread = chats.filter(c=>c.unread>0);
      if (!unread.length) { wrap.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text3);font-size:12px">No pending messages 🎉</div>'; return; }
      unread.slice(0,5).forEach(c => {
        const div = document.createElement('div'); div.className = 'pending-chat-item'; div.onclick=()=>this.openChatFor(c.patientId);
        const preview = c.lastMessage?.text?.substring(0,35)||'...';
        div.innerHTML = `<div class="pci-info"><div class="pci-name">${c.patientName}</div><div class="pci-msg">${preview}</div></div><div class="pci-badge">${c.unread}</div>`;
        wrap.appendChild(div);
      });
    } catch{}
  },

  // ── AUTOMATION ───────────────────────────────────────────────────
  populateAutomationSelects() {
    if (!this.patients.length || !this.doctors.length) {
      Promise.all([
        this.patients.length ? Promise.resolve(this.patients) : this.api('/api/patients'),
        this.doctors.length ? Promise.resolve(this.doctors) : this.api('/api/doctors')
      ]).then(([patients, doctors]) => {
        this.patients = patients;
        this.doctors = doctors;
        this.populateAutomationSelects();
      }).catch(() => {});
      return;
    }
    const types=['booking','rx','fu','custom'];
    const fields={booking:{p:'auto-booking-patient',d:'auto-booking-doctor'},rx:{p:'auto-rx-patient',d:'auto-rx-doctor'},fu:{p:'auto-fu-patient',d:'auto-fu-doctor'},custom:{p:'auto-custom-patient',d:'auto-custom-doctor'}};
    types.forEach(t=>{
      const pSel=document.getElementById(fields[t].p); const dSel=document.getElementById(fields[t].d);
      if(pSel){pSel.innerHTML='<option value="">Select patient...</option>';this.patients.forEach(p=>pSel.innerHTML+=`<option value="${p.id}">${p.name}</option>`);}
      if(dSel){dSel.innerHTML='<option value="">Select doctor...</option>';this.doctors.forEach(d=>dSel.innerHTML+=`<option value="${d.id}" data-name="${d.name}">${d.name}</option>`);}
    });
  },

  async sendAutomation(type) {
    const map={booking_invite:{p:'auto-booking-patient',d:'auto-booking-doctor',m:'auto-booking-msg'},prescription_enquiry:{p:'auto-rx-patient',d:'auto-rx-doctor',m:'auto-rx-msg'},follow_up:{p:'auto-fu-patient',d:'auto-fu-doctor',m:'auto-fu-msg'},custom:{p:'auto-custom-patient',d:'auto-custom-doctor',m:'auto-custom-msg'}};
    const ids=map[type]; const patientId=document.getElementById(ids.p)?.value; const docSel=document.getElementById(ids.d);
    const doctorId=docSel?.value; const doctorName=docSel?.options[docSel.selectedIndex]?.dataset.name||'Your Doctor';
    const targetLanguage=type==='custom'?(document.getElementById('auto-custom-language')?.value||'en'):'en';
    const message=document.getElementById(ids.m)?.value;
    if(!patientId) return this.toast('Please select a patient','error');
    if(!doctorId) return this.toast('Please select a doctor','error');
    if(type==='custom'&&!message) return this.toast('Please enter a message','error');
    try {
      const res=await this.api(`/api/doctor/send-automation/${patientId}`,'POST',{type,doctorId,doctorName,message,targetLanguage,sourceLanguage:'en'});
      this.toast(res.notification?.message || 'Message sent via WhatsApp ✅','success');
      const preview=document.getElementById('autoPreview'); const previewText=document.getElementById('autoPreviewText');
      if(preview&&previewText){preview.style.display='block';previewText.textContent=res.preview||'';}
    } catch(e){this.toast('Error: '+e.message,'error');}
  },

  async quickFollowUp(patientId, doctorId, doctorName) {
    const msg=prompt('Follow-up message (or leave blank for default):');
    try {
      await this.api(`/api/doctor/send-automation/${patientId}`,'POST',{type:'follow_up',doctorId,doctorName,message:msg||''});
      this.toast('Follow-up sent 📞','success');
    } catch(e){this.toast('Error: '+e.message,'error');}
  },

  // ── MESSAGES ─────────────────────────────────────────────────────
  async loadMessages() {
    try {
      const msgs = await this.api('/api/messages?limit=50');
      const wrap = document.getElementById('messageLog'); wrap.innerHTML = '';
      if (!msgs.length) { wrap.innerHTML = '<div style="text-align:center;color:var(--text3);padding:24px;font-size:13px">No messages yet.</div>'; return; }
      msgs.forEach(m => {
        const div = document.createElement('div'); div.className = 'msg-item';
        const isOut = m.direction==='outbound';
        div.innerHTML = `<div class="msg-item-header">
          <span><span class="tag ${isOut?'tag-green':'tag-indigo'}" style="margin-right:8px">${isOut?'↑ OUT':'↓ IN'}</span><span class="msg-item-phone">${m.to}</span></span>
          <span class="msg-item-time">${this.formatTime(m.timestamp)}</span></div>
          <div class="msg-item-body">${(m.message||'').substring(0,200)}</div>`;
        wrap.appendChild(div);
      });
    } catch(e){this.toast('Error loading messages','error');}
  },

  async loadRecentActivity() {
    try {
      const msgs = await this.api('/api/messages?limit=8');
      const wrap = document.getElementById('recentActivity'); wrap.innerHTML = '';
      if (!msgs.length) { wrap.innerHTML = '<div style="color:var(--text3);font-size:12px;text-align:center;padding:12px">No activity yet</div>'; return; }
      msgs.forEach(m => {
        const div = document.createElement('div'); div.className = 'activity-item';
        const isOut = m.direction==='outbound';
        div.innerHTML = `<span class="activity-dir ${isOut?'out':'in'}">${isOut?'OUT':'IN'}</span>
          <span class="activity-text">${(m.message||'').substring(0,60)}</span>
          <span class="activity-time">${this.formatTime(m.timestamp)}</span>`;
        wrap.appendChild(div);
      });
    } catch{}
  },

  // ── MISC ─────────────────────────────────────────────────────────
  filterByPeriod(items, getDate) {
    const list = Array.isArray(items) ? items : [];
    if (this.reportsPeriod === 'all') return list;
    const days = Number(this.reportsPeriod || 30);
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - days);
    return list.filter(item => {
      const value = getDate(item);
      return value ? new Date(value) >= cutoff : false;
    });
  },

  isDateInPeriod(value) {
    if (this.reportsPeriod === 'all') return true;
    if (!value) return false;
    const days = Number(this.reportsPeriod || 30);
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - days);
    return new Date(value) >= cutoff;
  },

  describePeriod() {
    return {
      '7': 'the last 7 days',
      '30': 'the last 30 days',
      '90': 'the last 90 days',
      '365': 'the last 12 months',
      all: 'all time'
    }[this.reportsPeriod] || 'the selected period';
  },

  formatCurrency(value) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  },

  formatDate(value) {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  },

  downloadCsv(filename, rows) {
    const csv = rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },

  exportReports() {
    const filteredAppointments = this.filterByPeriod(this.appointments, item => item.createdAt || item.updatedAt);
    const rows = [['Patient', 'Phone', 'Appointments', 'Last Visit', 'Verified']];
    this.patients.forEach(patient => {
      const patientAppointments = filteredAppointments.filter(appt => appt.patientId === patient.id);
      const lastVisit = patientAppointments.map(appt => appt.createdAt).filter(Boolean).sort((a, b) => new Date(b) - new Date(a))[0];
      if (this.reportsPeriod !== 'all' && !patientAppointments.length && !this.isDateInPeriod(patient.createdAt)) return;
      rows.push([patient.name, patient.phone || '', patientAppointments.length, lastVisit ? this.formatDate(lastVisit) : '', patient.verified ? 'Yes' : 'No']);
    });
    this.downloadCsv(`patient-reports-${this.reportsPeriod}.csv`, rows);
    this.toast('Reports exported as CSV', 'success');
  },

  exportInventory() {
    const rows = [['Item', 'Category', 'Quantity', 'Unit', 'Reorder Level', 'Unit Cost', 'Vendor']]
      .concat(this.inventory.map(item => [item.name, item.category || '', item.quantity || 0, item.unit || '', item.reorderLevel || 0, item.unitCost || 0, item.vendor || '']));
    this.downloadCsv('inventory.csv', rows);
    this.toast('Inventory exported as CSV', 'success');
  },

  exportExpenses() {
    const rows = [['Title', 'Category', 'Amount', 'Date', 'Notes']]
      .concat(this.expenses.map(item => [item.title, item.category || '', item.amount || 0, this.formatDate(item.incurredOn || item.createdAt), item.notes || '']));
    this.downloadCsv('expenses.csv', rows);
    this.toast('Expenses exported as CSV', 'success');
  },

  async testWhatsApp() {
    this.toast('Test message sent to simulation log 📱','info');
  },

  showSetupTab(tab, btn) {
    document.querySelectorAll('.setup-tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.setup-tab-content').forEach(c=>c.classList.remove('active'));
    btn.classList.add('active'); document.getElementById(`setup-${tab}`).classList.add('active');
  },

  openModal(id) {
    const m = document.getElementById(id); m.classList.add('open');
    // Populate selects inside modals
    if (id==='addApptModal'||id==='addRxModal') {
      ['appt-patient','rx-patient'].forEach(selId=>{const el=document.getElementById(selId);if(el){el.innerHTML='<option value="">Select Patient *</option>';this.patients.forEach(p=>el.innerHTML+=`<option value="${p.id}">${p.name}</option>`);}});
      ['appt-doctor','rx-doctor'].forEach(selId=>{const el=document.getElementById(selId);if(el){el.innerHTML='<option value="">Select Doctor *</option>';this.doctors.forEach(d=>el.innerHTML+=`<option value="${d.id}">${d.name} — ${d.specialty}</option>`);}});
    }
    m.addEventListener('click', e => { if (e.target === m) this.closeModal(id); }, { once: true });
  },
  closeModal(id) { document.getElementById(id).classList.remove('open'); },

  toast(msg, type='info') {
    const el = document.createElement('div'); el.className = `toast ${type}`; el.textContent = msg;
    document.getElementById('toastContainer').appendChild(el);
    setTimeout(() => el.remove(), 3500);
  },

  formatTime(ts) {
    if (!ts) return ''; const d = new Date(ts); const now = new Date();
    const diffMs = now - d; const diffMins = Math.floor(diffMs/60000); const diffHours = Math.floor(diffMs/3600000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString('en-IN',{day:'numeric',month:'short'});
  },

  async loadPatients() {
    try {
      this.patients = await this.api('/api/patients');
      const tb = document.getElementById('patientsTable'); tb.innerHTML = '';
      if (!this.patients.length) { tb.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:24px">No patients yet. Add your first patient!</td></tr>'; return; }
      this.patients.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><strong>${p.name}</strong>${p.notes?`<br><span style="font-size:11px;color:var(--text3)">${p.notes.substring(0,40)}</span>`:''}</td>
          <td style="font-family:'Space Mono',monospace;font-size:12px">${p.phone}</td>
          <td>${p.age||'â€”'}</td>
          <td><span class="tag ${p.verified?'tag-green':'tag-red'}">${p.verified?'âœ“ Verified':'â—‹ Pending'}</span></td>
          <td><div class="action-btns">
            ${!p.verified?`<button class="btn btn-ghost btn-sm" onclick="App.sendOTP('${p.id}')">ðŸ“¤ OTP</button>`:''}
            <button class="btn btn-ghost btn-sm" onclick="App.editPatient('${p.id}')">Edit</button>
            <button class="btn btn-ghost btn-sm" onclick="App.viewDashboard('${p.id}')">ðŸ“‹ Dash</button>
            <button class="btn btn-ghost btn-sm" onclick="App.openSendSlot('${p.id}')">ðŸ“… Slots</button>
            <button class="btn btn-ghost btn-sm" onclick="App.openChatFor('${p.id}')">ðŸ’¬ Chat</button>
            <button class="btn btn-red btn-sm" onclick="App.deletePatient('${p.id}')">âœ•</button>
          </div></td>`;
        tb.appendChild(tr);
      });
    } catch (e) { this.toast('Failed to load patients', 'error'); }
  },

  async addPatient() {
    const name=document.getElementById('pt-name').value.trim(), phone=document.getElementById('pt-phone').value.trim();
    if (!name||!phone) return this.toast('Name and phone are required','error');
    const conditionsStr = document.getElementById('pt-conditions')?.value || '';
    const conditions = conditionsStr.split(',').map(s=>s.trim()).filter(Boolean);
    const payload = {name,phone,age:document.getElementById('pt-age').value,email:document.getElementById('pt-email').value,bloodGroup:document.getElementById('pt-blood').value,notes:document.getElementById('pt-notes').value, conditions};
    try {
      if (this.editingPatientId) {
        await this.api(`/api/patients/${this.editingPatientId}`,'PUT',payload);
        this.toast('Patient updated successfully','success');
      } else {
        await this.api('/api/patients','POST',payload);
        this.toast('Patient added! Welcome WhatsApp sent ðŸ“±','success');
      }
      this.resetPatientForm();
      this.closeModal('addPatientModal');
      this.loadPatients();
      this.loadStats();
    } catch(e){this.toast('Error: '+e.message,'error');}
  },

  openModal(id) {
    const m = document.getElementById(id); m.classList.add('open');
    if (id === 'addPatientModal' && !this.editingPatientId) {
      this.resetPatientForm();
    }
    if (id==='addApptModal'||id==='addRxModal') {
      ['appt-patient','rx-patient'].forEach(selId=>{const el=document.getElementById(selId);if(el){el.innerHTML='<option value="">Select Patient *</option>';this.patients.forEach(p=>el.innerHTML+=`<option value="${p.id}">${p.name}</option>`);}});
      ['appt-doctor','rx-doctor'].forEach(selId=>{const el=document.getElementById(selId);if(el){el.innerHTML='<option value="">Select Doctor *</option>';this.doctors.forEach(d=>el.innerHTML+=`<option value="${d.id}">${d.name} â€” ${d.specialty}</option>`);}});
    }
    m.addEventListener('click', e => { if (e.target === m) this.closeModal(id); }, { once: true });
  },

  closeModal(id) {
    document.getElementById(id).classList.remove('open');
    if (id === 'addPatientModal') {
      this.resetPatientForm();
    }
    if (id === 'appointmentActionModal') {
      this.appointmentActionContext = null;
      this.appointmentActionSlots = [];
    }
  },

  async loadPatients() {
    try {
      const patientData = await this.api('/api/patients');
      this.patients = Array.isArray(patientData) ? patientData : (patientData?.items || []);
      const tb = document.getElementById('patientsTable');
      tb.innerHTML = '';
      if (!this.patients.length) {
        tb.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:24px">No patients yet. Add your first patient!</td></tr>';
        return;
      }
      this.patients.forEach((p) => {
        const patientId = p.id || p.patientId;
        const verified = Boolean(p.whatsappVerified ?? p.verified);
        const patientCode = p.patientCode || '';
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.innerHTML = `<td style="font-family:'Space Mono',monospace;font-size:12px;color:var(--indigo)">${patientCode || '-'}</td>
          <td><strong>${p.name}</strong>${p.notes ? `<br><span style="font-size:11px;color:var(--text3)">${p.notes.substring(0,40)}</span>` : ''}</td>
          <td style="font-family:'Space Mono',monospace;font-size:12px">${p.phone}</td>
          <td>${p.age || '-'}</td>
          <td><span class="tag ${verified ? 'tag-green' : 'tag-red'}">${verified ? 'Verified' : 'Pending'}</span></td>
          <td><div class="action-btns">
            ${!verified ? `<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();App.sendOTP('${patientId}')">OTP</button>` : ''}
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();App.editPatient('${patientId}')">Edit</button>
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();App.viewDashboard('${patientId}')">Dashboard</button>
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();App.openPatientDocs('${patientId}')">Docs</button>
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();App.openSendSlot('${patientId}')">Slots</button>
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();App.openChatFor('${patientId}')">Chat</button>
            <button class="btn btn-red btn-sm" onclick="event.stopPropagation();App.deletePatient('${patientId}')">Delete</button>
          </div></td>`;
        tr.addEventListener('click', () => this.openPatientDocs(patientId));
        tb.appendChild(tr);
      });
    } catch (e) {
      this.toast('Failed to load patients', 'error');
    }
    } catch (e) {
      this.toast('Failed to load patients', 'error');
    }
  },

  async openPatientDocs(patientId) {
    this.activePatientDocsId = patientId;
    const patient = this.patients.find(p => (p.id || p.patientId) === patientId);
    if (!patient) return this.toast('Patient not found', 'error');
    
    document.getElementById('docs-patient-name').textContent = `Documents - ${patient.name}`;
    document.getElementById('doc-name').value = '';
    document.getElementById('doc-link').value = '';
    document.getElementById('doc-file').value = '';
    
    this.openModal('patientDocsModal');
    await this.loadPatientDocs();
  },

  async loadPatientDocs() {
    if (!this.activePatientDocsId) return;
    try {
      const docs = await this.api(`/api/patients/${this.activePatientDocsId}/documents`);
      const list = document.getElementById('patient-docs-list');
      list.innerHTML = '';
      if (!docs.length) {
        list.innerHTML = '<div style="color:var(--text3);text-align:center;padding:20px">No documents found.</div>';
        return;
      }
      
      docs.forEach(doc => {
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.justifyContent = 'space-between';
        item.style.padding = '10px';
        item.style.borderBottom = '1px solid var(--border)';
        
        const isLocal = doc.url.startsWith('/');
        const downloadUrl = isLocal ? API + doc.url : doc.url;
        const target = isLocal ? 'download' : 'target="_blank"';
        
        item.innerHTML = `
          <div>
            <strong>${doc.name}</strong> <span class="tag tag-indigo" style="font-size:10px">${doc.type}</span><br>
            <span style="font-size:11px;color:var(--text3)">${new Date(doc.createdAt).toLocaleDateString('en-IN')}</span>
          </div>
          <div class="action-btns">
            <button class="btn btn-ghost btn-sm" onclick="App.sharePatientDoc('${doc.id}')" title="Share via WhatsApp" style="display:flex;align-items:center;justify-content:center;padding:4px">
              <svg style="color:#25d366" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12.031 0C5.385 0 .013 5.372.013 12.018c0 2.12.553 4.195 1.597 6.015L0 24l6.113-1.605c1.763.957 3.738 1.463 5.918 1.463h.005C18.672 23.858 24 18.486 24 11.84 24 5.216 18.653 0 12.031 0zm0 21.84c-1.782 0-3.535-.478-5.064-1.385l-.363-.215-3.766.988.997-3.673-.236-.375c-.997-1.585-1.523-3.415-1.523-5.322 0-5.541 4.512-10.053 10.06-10.053 5.546 0 10.057 4.512 10.057 10.057 0 5.545-4.511 10.057-10.057 10.057zm5.518-7.538c-.302-.152-1.788-.883-2.065-.984-.277-.101-.478-.152-.68.151-.201.303-.781.984-.958 1.185-.176.202-.353.227-.655.076-1.32-.613-2.42-1.282-3.373-2.527-.246-.321-.137-.478.014-.629.136-.136.303-.353.453-.53.152-.176.202-.303.303-.504.101-.202.05-.379-.025-.53-.076-.152-.68-1.64-.932-2.247-.246-.593-.497-.511-.68-.521-.176-.01-.378-.01-.58-.01-.202 0-.53.076-.807.379-.277.303-1.059 1.034-1.059 2.522 0 1.488 1.084 2.926 1.235 3.128.151.202 2.128 3.254 5.155 4.558 1.761.758 2.651.815 3.447.669.878-.163 1.788-.731 2.04-1.437.252-.706.252-1.312.176-1.438-.075-.126-.277-.202-.579-.353z"/></svg>
            </button>
            <a class="btn btn-ghost btn-sm" href="${downloadUrl}" ${target} title="Download/View" style="display:flex;align-items:center;justify-content:center;padding:4px">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </a>
            <button class="btn btn-red btn-sm" onclick="App.deletePatientDoc('${doc.id}')" title="Delete" style="display:flex;align-items:center;justify-content:center;padding:4px">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </div>
        `;
        list.appendChild(item);
      });
    } catch (e) {
      this.toast('Failed to load documents', 'error');
    }
  },

  async addPatientDoc() {
    if (!this.activePatientDocsId) return;
    const name = document.getElementById('doc-name').value.trim();
    if (!name) return this.toast('Please enter a document name', 'error');
    
    const type = document.querySelector('input[name="doc_type"]:checked').value;
    let payload = { name, type };
    
    if (type === 'link') {
      const url = document.getElementById('doc-link').value.trim();
      if (!url) return this.toast('Please enter a URL', 'error');
      payload.url = url;
      this._submitDocPayload(payload);
    } else {
      const fileInput = document.getElementById('doc-file');
      if (!fileInput.files.length) return this.toast('Please select a file', 'error');
      const file = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        payload.base64 = e.target.result;
        this._submitDocPayload(payload);
      };
      reader.onerror = () => this.toast('Error reading file', 'error');
      reader.readAsDataURL(file);
    }
  },

  async _submitDocPayload(payload) {
    try {
      const btn = document.querySelector('#patientDocsModal .btn-primary');
      const origText = btn.textContent;
      btn.textContent = 'Uploading...';
      btn.disabled = true;
      
      await this.api(`/api/patients/${this.activePatientDocsId}/documents`, 'POST', payload);
      this.toast('Document added successfully', 'success');
      
      document.getElementById('doc-name').value = '';
      document.getElementById('doc-link').value = '';
      document.getElementById('doc-file').value = '';
      
      btn.textContent = origText;
      btn.disabled = false;
      
      await this.loadPatientDocs();
    } catch (e) {
      this.toast('Upload failed: ' + e.message, 'error');
      const btn = document.querySelector('#patientDocsModal .btn-primary');
      btn.textContent = 'Upload Document';
      btn.disabled = false;
    }
  },

  async sharePatientDoc(docId) {
    if (!this.activePatientDocsId) return;
    if (!confirm('Send this document link to the patient via WhatsApp?')) return;
    try {
      await this.api(`/api/patients/${this.activePatientDocsId}/documents/${docId}/share`, 'POST');
      this.toast('Document shared via WhatsApp 📤', 'success');
    } catch (e) {
      this.toast('Share failed: ' + e.message, 'error');
    }
  },

  async deletePatientDoc(docId) {
    if (!this.activePatientDocsId) return;
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await this.api(`/api/patients/${this.activePatientDocsId}/documents/${docId}`, 'DELETE');
      this.toast('Document deleted', 'success');
      await this.loadPatientDocs();
    } catch (e) {
      this.toast('Delete failed: ' + e.message, 'error');
    }
  },

  async api(url, method='GET', body=null) {
    return this.publicApi(url, method, body, true);
  },

  async publicApi(url, method='GET', body=null, includeAuth=false) {
    const headers = { 'Content-Type': 'application/json' };
    if (includeAuth && this.authToken) headers.Authorization = `Bearer ${this.authToken}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(API + url, opts);
    let data = null;
    try { data = await res.json(); } catch {}

    if (!res.ok) {
      if (res.status === 401 && includeAuth) {
        await this.logoutDoctor(false);
        this.showAuthShell();
      }
      const error = new Error(data?.error || `HTTP ${res.status}`);
      if (data?.verification) error.verification = data.verification;
      throw error;
    }

    return data;
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
