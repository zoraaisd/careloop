/* HealthBot — WhatsApp Healthcare Dashboard v2.0 */
const API = '';
const AUTH_APP_URL = (() => {
  const storedUrl = localStorage.getItem('meditracker.auth.appUrl');
  if (storedUrl) return storedUrl.replace(/\/+$/, '');
  if (document.referrer) {
    try {
      return new URL(document.referrer).origin;
    } catch {}
  }
  return window.location.origin;
})();
const DOCTOR_PROFILE_STORAGE_KEY = 'meditracker.doctor.profile';
const OTP_VERIFICATION_PHONE = '9000000000';

const App = {
  patients: [], appointments: [], prescriptions: [], doctors: [], doctorDirectory: [], chats: [],
  inventory: [], expenses: [], supportRequests: [],
  redirectToUpgrade() {
    window.parent.postMessage({ type: 'REQUEST_UPGRADE' }, '*');
  },
  renderSubscriptions() {
    const banner = document.getElementById('activePlanBanner');
    if (!banner) return;
    const access = this.getDoctorAccessState();
    const plan = access.subscribedPlan;
    if (!plan) {
      banner.innerHTML = `
        <div class="active-plan-card">
          <div class="plan-info">
            <h4>No Active Plan</h4>
            <p>You are currently on a limited access mode. Please upgrade to a premium plan.</p>
          </div>
        </div>
      `;
      return;
    }
    const limits = {
      'plan-free-trial': { patients: 3, doctors: 1 },
      'plan-starter': { patients: 500, doctors: 5 },
      'plan-pro': { patients: 5000, doctors: 20 },
      'plan-enterprise': { patients: 50000, doctors: 100 }
    };
    const limit = limits[plan.id] || { patients: 'Unlimited', doctors: 'Unlimited' };
    banner.innerHTML = `
      <div class="active-plan-card">
        <div class="plan-info">
          <h4>${plan.name}</h4>
          <p>Active Subscription (${plan.amount === 0 ? 'Free' : `₹${plan.amount}/mo` || 'Free'})</p>
        </div>
        <div class="plan-limits">
          <div class="limit-item">
            <span class="limit-val">${limit.patients}</span>
            <span class="limit-lbl">Patients Limit</span>
          </div>
          <div class="limit-item">
            <span class="limit-val">${limit.doctors}</span>
            <span class="limit-lbl">Doctors Limit</span>
          </div>
        </div>
      </div>
    `;
  },
  authToken: (() => { try { const s = JSON.parse(localStorage.getItem('meditracker.auth.session')); return s && s.role === 'doctor' ? s.token : ''; } catch { return ''; } })(),
  currentUserId: (() => { try { const s = JSON.parse(localStorage.getItem('meditracker.auth.session')); return s && s.role === 'doctor' ? s.userId : null; } catch { return null; } })(),
  currentDoctor: null,
  currentPage: 'dashboard',
  activeChatPatientId: null,
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
  addDoctorSelectedDays: [],
  addDoctorTimeSlots: [],
  addDoctorEmailOtpRequested: false,
  addDoctorEmailVerified: false,
  addDoctorEmailOtpRetryAt: 0,
  addDoctorEmailVerificationBusy: false,
  addDoctorImageState: {
    profileDataUrl: '',
    profileFileName: '',
    profileFromFile: false,
    clinicDataUrl: '',
    clinicFileName: '',
    clinicFromFile: false,
  },
  subscriptionPlans: [],
  activeSubscription: null,
  selectedSubscriptionPlanId: null,

  async init() {
    const authenticated = await this.restoreDoctorSession();
    if (!authenticated) {
      this.showAuthShell();
      return;
    }

    await this.bootAuthenticatedApp();
  },

  navigate(page) {
    this.currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) pageEl.classList.add('active');
    
    document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === page));
    
    const titleMap = { 
      dashboard: 'Dashboard', 
      patients: 'Patients', 
      doctors: 'Doctors', 
      appointments: 'Appointments', 
      prescriptions: 'Prescriptions', 
      chat: 'Chat', 
      automation: 'Automation', 
      whatsapp: 'Message Log', 
      setup: 'API Setup', 
      support: 'Raise Ticket', 
      inventory: 'Inventory Mgmt', 
      expenses: 'Expenses', 
      reports: 'Business Reports', 
      subscription: 'Subscriptions' 
    };
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = titleMap[page] || page;

    if (page === 'inventory') this.loadInventory();
    if (page === 'patients') this.loadPatients();
    if (page === 'appointments') this.loadAppointments();
    if (page === 'prescriptions') this.loadPrescriptions();
    if (page === 'chat') this.loadConversations();
    if (page === 'whatsapp') this.loadMessages();
    if (page === 'expenses') this.loadExpenses();
    if (page === 'reports') this.loadReports();
    if (page === 'subscription') this.loadSubscriptionPlans();
  },

  async loadInventory() {
    try {
      const data = await this.api('/api/inventory');
      this.inventory = data.items || [];
      this.renderInventory();
    } catch (e) { this.toast('Failed to load inventory', 'error'); }
  },

  filterInventory(q) {
    const query = q.toLowerCase();
    const filtered = this.inventory.filter(item => 
      item.itemName.toLowerCase().includes(query) || 
      (item.sku && item.sku.toLowerCase().includes(query)) ||
      (item.category && item.category.toLowerCase().includes(query))
    );
    const original = this.inventory;
    this.inventory = filtered;
    this.renderInventory();
    this.inventory = original;
  },

  async loadReports() {
    // Placeholder or implement if needed for the summary cards
    console.log('Loading reports...');
  },

  async loadExpenses() {
    try {
      const data = await this.api('/api/expenses');
      this.expenses = data.items || [];
      this.renderExpenses();
    } catch (e) { this.toast('Failed to load expenses', 'error'); }
  },

  async loadPatients() {
    try {
      const data = await this.api('/api/patients');
      this.patients = data.items || [];
      this.renderPatients();
    } catch (e) { this.toast('Failed to load patients', 'error'); }
  },

  renderExpenses() {
    const table = document.getElementById('expensesTable');
    const summary = document.getElementById('expenseSummary');
    if (!table || !summary) return;

    summary.innerHTML = `
      <div class="report-stat-card">
        <div class="stat-label">Total Expenses</div>
        <div class="stat-value">₹${this.expenses.reduce((acc, e) => acc + (e.amount || 0), 0).toLocaleString()}</div>
      </div>
    `;

    table.innerHTML = this.expenses.map(e => `
      <tr>
        <td>${e.title}</td>
        <td><span class="badge-category">${e.category || 'General'}</span></td>
        <td>₹${e.amount}</td>
        <td>${new Date(e.date).toLocaleDateString()}</td>
        <td>${e.notes || '-'}</td>
        <td>
          <button class="btn-icon text-error" onclick="App.deleteExpenseItem('${e.id}')">✕</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text3)">No entries found.</td></tr>';
  },

  async addExpenseItem() {
    const payload = {
      title: document.getElementById('exp-title').value.trim(),
      category: document.getElementById('exp-category').value.trim(),
      amount: parseFloat(document.getElementById('exp-amount').value) || 0,
      date: document.getElementById('exp-date').value,
      notes: document.getElementById('exp-notes').value.trim()
    };
    if (!payload.title || !payload.amount) return this.toast('Title and amount are required', 'error');
    try {
      await this.api('/api/expenses', 'POST', payload);
      this.toast('Expense saved', 'success');
      this.closeModal('expenseModal');
      this.loadExpenses();
    } catch (e) { this.toast('Error: ' + e.message, 'error'); }
  },

  exportInventory() {
    this.toast('Exporting inventory...', 'info');
    // Implement CSV export if needed
  },

  exportExpenses() {
    this.toast('Exporting expenses...', 'info');
    // Implement CSV export if needed
  },

  async editInventoryItem(id) {
    const item = this.inventory.find(i => i.id === id);
    if (!item) return;
    this.openModal('inventoryModal');
    // Fill form with item data
    document.getElementById('inv-name').value = item.itemName || '';
    // ... other fields
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
  },

  showAuthView(view) {
    const target = document.getElementById('authLoginCard');
    const forgot = document.getElementById('authForgotCard');
    if (target) target.style.display = 'block';
    if (forgot) forgot.style.display = 'none';
    this.setAuthStatus('');
  },

  showForgotPassword() {
    const loginEmail = document.getElementById('login-email')?.value?.trim() || '';
    const forgotEmail = document.getElementById('forgot-email');
    const target = document.getElementById('authLoginCard');
    const forgot = document.getElementById('authForgotCard');
    if (forgotEmail && loginEmail) forgotEmail.value = loginEmail;
    if (target) target.style.display = 'none';
    if (forgot) forgot.style.display = 'block';
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

  async requestPasswordResetOtp() {
    const email = document.getElementById('forgot-email')?.value?.trim() || '';
    if (!email) {
      this.setAuthStatus('Please enter your email address.', 'error');
      return;
    }

    this.setAuthStatus('Sending OTP...', 'info');

    try {
      const result = await this.publicApi('/api/auth/password/request-otp', 'POST', { email });
      this.setAuthStatus(result?.otp ? `${result.message} OTP: ${result.otp}` : (result?.message || 'OTP sent to your email.'), 'success');
    } catch (error) {
      this.setAuthStatus(error.message || 'Unable to send OTP', 'error');
    }
  },

  async resetPasswordWithOtp() {
    const email = document.getElementById('forgot-email')?.value?.trim() || '';
    const otp = document.getElementById('forgot-otp')?.value?.trim() || '';
    const newPassword = document.getElementById('forgot-password')?.value || '';
    const confirmPassword = document.getElementById('forgot-confirm-password')?.value || '';

    if (!email || !otp || !newPassword || !confirmPassword) {
      this.setAuthStatus('Email, OTP, and new password are required.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      this.setAuthStatus('Passwords do not match.', 'error');
      return;
    }

    this.setAuthStatus('Resetting password...', 'info');

    try {
      const result = await this.publicApi('/api/auth/password/reset', 'POST', { email, otp, newPassword, confirmPassword });
      this.setAuthStatus(result?.message || 'Password reset successfully. Please sign in.', 'success');
      const loginEmail = document.getElementById('login-email');
      const loginPassword = document.getElementById('login-password');
      if (loginEmail) loginEmail.value = email;
      if (loginPassword) loginPassword.value = '';
      this.showAuthView('login');
      this.setAuthStatus(result?.message || 'Password reset successfully. Please sign in.', 'success');
    } catch (error) {
      this.setAuthStatus(error.message || 'Unable to reset password', 'error');
    }
  },

  async restoreDoctorSession() {
    if (!this.authToken) return false;
    this.hydrateDoctorIdentity();
    return true;
  },

  async logoutDoctor(showAuth = true) {
    this.authToken = '';
    this.currentDoctor = null;
    localStorage.removeItem('meditracker.auth.session');
    if (this.statsPollInterval) clearInterval(this.statsPollInterval);
    this.statsPollInterval = null;
    const loginUrl = `${AUTH_APP_URL}/login`;
    if (window.top && window.top !== window) {
      try {
        window.top.location.assign(loginUrl);
        return;
      } catch {}
    }
    window.location.assign(loginUrl);
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
    const email = this.currentDoctor?.email || payload.email || this.currentUserId || 'doctor';
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
      id: this.currentDoctor?.id || this.currentUserId || session.userId || null,
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
    const doctorNameEl = document.getElementById('doctorProfileDoctorName');
    const emailEl = document.getElementById('doctorProfileEmail');
    const emailValue = document.getElementById('doctorProfileEmailValue');
    const regValue = document.getElementById('doctorProfileRegistrationValue');
    const councilValue = document.getElementById('doctorProfileCouncilValue');
    const approvalBadge = document.getElementById('doctorApprovalBadge');
    if (nameEl) nameEl.textContent = 'Doctor';
    if (doctorNameEl) doctorNameEl.textContent = this.currentDoctor?.name || 'Doctor';
    if (emailEl) emailEl.textContent = this.currentDoctor?.email || 'No email available';
    if (emailValue) emailValue.textContent = this.currentDoctor?.email || '-';
    if (regValue) regValue.textContent = this.doctorProfilePrefs?.registrationNumber || '-';
    if (councilValue) councilValue.textContent = this.doctorProfilePrefs?.council || '-';
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
    this.applyPremiumBranding();
    this.setupBusinessModules();
    this.setupNav();
    this.setupMenuToggle();
    this.setupDoctorProfileMenu();
    this.applyNavIcons();
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

  applyPremiumBranding() {
    document.title = 'Careloop - Care Delivery Dashboard';
    const logoMark = document.querySelector('.logo-mark');
    const logoText = document.querySelector('.logo-text');
    const chatEmptyIcon = document.querySelector('#page-chat .chat-empty-icon');
    const previewTitle = document.querySelector('#autoPreview h3');

    if (logoMark) logoMark.setAttribute('aria-label', 'CareLoop logo');
    if (logoText) logoText.setAttribute('aria-label', 'CareLoop');
    if (chatEmptyIcon) chatEmptyIcon.textContent = 'CL';
    if (previewTitle) previewTitle.textContent = 'Message Preview';

    document.querySelectorAll('.auto-card-icon').forEach((element, index) => {
      const labels = ['BI', 'PE', 'FU', 'CM'];
      const classNames = [
        'auto-card-mark-booking',
        'auto-card-mark-rx',
        'auto-card-mark-followup',
        'auto-card-mark-custom',
      ];
      element.className = `auto-card-icon auto-card-mark ${classNames[index] || ''}`.trim();
      element.textContent = labels[index] || 'CL';
      element.removeAttribute('style');
    });

    ['auto-booking-msg', 'auto-rx-msg', 'auto-fu-msg', 'auto-custom-msg'].forEach((id) => {
      const textarea = document.getElementById(id);
      if (textarea) textarea.classList.add('auto-message-box');
    });

    const automationButtons = [
      ['button[onclick="App.sendAutomation(\'booking_invite\')"]', 'Send Booking Invite'],
      ['button[onclick="App.sendAutomation(\'prescription_enquiry\')"]', 'Send Enquiry'],
      ['button[onclick="App.sendAutomation(\'follow_up\')"]', 'Send Follow-Up'],
      ['button[onclick="App.sendAutomation(\'custom\')"]', 'Send Message'],
      ['button[onclick="App.confirmSendSlots()"]', 'Send Slot Picker'],
    ];

    automationButtons.forEach(([selector, label]) => {
      const button = document.querySelector(selector);
      if (button) button.textContent = label;
    });
  },

  getNavIconMarkup(page) {
    const icons = {
      dashboard: `
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <rect x="3" y="3" width="5" height="5" rx="1.2"></rect>
          <rect x="12" y="3" width="5" height="5" rx="1.2"></rect>
          <rect x="3" y="12" width="5" height="5" rx="1.2"></rect>
          <rect x="12" y="12" width="5" height="5" rx="1.2"></rect>
        </svg>
      `,
      reports: `
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M4 15.5h12"></path>
          <path d="M6.5 13V9.5"></path>
          <path d="M10 13V6.5"></path>
          <path d="M13.5 13V8"></path>
        </svg>
      `,
      patients: `
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="7" r="3"></circle>
          <path d="M4.5 16c1.2-2.6 3-4 5.5-4s4.3 1.4 5.5 4"></path>
        </svg>
      `,
      doctors: `
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="6.8" r="2.6"></circle>
          <path d="M4 15c1-2.4 2.9-3.6 6-3.6s5 1.2 6 3.6"></path>
          <path d="M15.5 4.5h2"></path>
        </svg>
      `,
      support: `
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 16.5a6.5 6.5 0 1 0-6.5-6.5A6.5 6.5 0 0 0 10 16.5Z"></path>
          <path d="M8.4 8.1a1.8 1.8 0 1 1 2.9 1.4c-.6.5-1.1.8-1.1 1.6"></path>
          <circle cx="10" cy="13.3" r=".7"></circle>
        </svg>
      `,
      appointments: `
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <rect x="3" y="5" width="14" height="12" rx="2"></rect>
          <path d="M6 3.5v3"></path>
          <path d="M14 3.5v3"></path>
          <path d="M3 8.5h14"></path>
        </svg>
      `,
      calendar: `
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <rect x="3" y="4" width="14" height="13" rx="2"></rect>
          <path d="M6 2.8v3"></path>
          <path d="M14 2.8v3"></path>
          <path d="M3 8h14"></path>
          <path d="M7 11h2"></path>
          <path d="M11 11h2"></path>
          <path d="M7 14h2"></path>
        </svg>
      `,
      prescriptions: `
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <rect x="5" y="3" width="10" height="14" rx="2"></rect>
          <path d="M7.5 7h5"></path>
          <path d="M7.5 10h5"></path>
          <path d="M7.5 13h3.5"></path>
        </svg>
      `,
      chat: `
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M5 5.5h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2Z"></path>
        </svg>
      `,
      subscription: `
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <rect x="3" y="5" width="14" height="10" rx="2"></rect>
          <path d="M3 8.5h14"></path>
          <path d="M7 12h2.5"></path>
        </svg>
      `,
      inventory: `
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M4 7.2 10 4l6 3.2"></path>
          <path d="M4 7.2V14l6 3 6-3V7.2"></path>
          <path d="M10 10v7"></path>
        </svg>
      `,
      expenses: `
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M6 4.5h8"></path>
          <path d="M6 8h8"></path>
          <path d="M6 11.5h5"></path>
          <path d="M4.5 3.5h11a1.5 1.5 0 0 1 1.5 1.5v10A1.5 1.5 0 0 1 15.5 16.5h-11A1.5 1.5 0 0 1 3 15V5a1.5 1.5 0 0 1 1.5-1.5Z"></path>
        </svg>
      `,
      automation: `
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 3.5v3"></path>
          <path d="M10 13.5v3"></path>
          <path d="M3.5 10h3"></path>
          <path d="M13.5 10h3"></path>
          <circle cx="10" cy="10" r="3"></circle>
        </svg>
      `,
    };

    return icons[page] || icons.dashboard;
  },

  applyNavIcons() {
    document.querySelectorAll('.nav-link').forEach((link) => {
      const icon = link.querySelector('.icon');
      if (!icon) return;
      icon.innerHTML = this.getNavIconMarkup(link.dataset.page);
    });
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
    const patientsLink = navList?.querySelector('[data-page="patients"]')?.closest('li');
    const appointmentsLink = navList?.querySelector('[data-page="appointments"]')?.closest('li');
    const chatLink = navList?.querySelector('[data-page="chat"]')?.closest('li');
    const automationLink = navList?.querySelector('[data-page="automation"]')?.closest('li');

    this.applyNavIcons();

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
            <div class="calendar-layout calendar-layout-modern">
              <aside class="calendar-leftpanel">
                <div class="calendar-panel-block">
                  <div class="calendar-panel-title">Doctors</div>
                  <div id="calendarDoctorList" class="calendar-doctor-list"></div>
                </div>
                <div class="calendar-panel-block">
                  <div class="calendar-panel-title">Quick Stats</div>
                  <div id="calendarQuickStats" class="calendar-quick-stats">
                    <div class="cal-mini-stat">
                      <span class="cal-mini-label">Total Appointments</span>
                      <span class="cal-mini-value" id="calStatTotal">0</span>
                    </div>
                    <div class="cal-mini-stat">
                      <span class="cal-mini-label">Available Slots</span>
                      <span class="cal-mini-value" id="calStatAvailable">0</span>
                    </div>
                  </div>
                </div>
              </aside>
              <section class="calendar-grid-panel">
                <div class="calendar-grid-header">
                  <div class="calendar-time-head">Time</div>
                  <div id="calendarWeekdays" class="calendar-weekdays-modern"></div>
                </div>
                <div id="calendarBoard" class="calendar-board-modern"></div>
              </section>
            </div>
          </div>
        </div>
      `);
    }
    this.applyNavIcons();

    const recentActivityButton = document.querySelector('.dash-card .btn-link');
    if (recentActivityButton) {
      recentActivityButton.textContent = 'View all ->';
      recentActivityButton.onclick = () => this.navigate('appointments');
    }

    const patientCard = document.getElementById('stat-patients')?.closest('.stat-card');
    if (patientCard) {
      patientCard.style.cursor = 'pointer';
      patientCard.title = 'Open patients';
      patientCard.onclick = () => this.navigate('patients');
    }

    const verifiedCard = document.getElementById('stat-verified')?.closest('.stat-card');
    if (verifiedCard) {
      verifiedCard.style.cursor = 'pointer';
      verifiedCard.title = 'Open verified patients';
      verifiedCard.onclick = () => this.navigate('patients');
    }

    const appointmentCard = document.getElementById('stat-appts')?.closest('.stat-card');
    if (appointmentCard) {
      appointmentCard.style.cursor = 'pointer';
      appointmentCard.title = 'Open appointments';
      appointmentCard.onclick = () => this.navigate('appointments');
    }

    const prescriptionCard = document.getElementById('stat-rx')?.closest('.stat-card');
    if (prescriptionCard) {
      prescriptionCard.style.cursor = 'pointer';
      prescriptionCard.title = 'Open prescriptions';
      prescriptionCard.onclick = () => this.navigate('prescriptions');
    }

    const messageCard = document.getElementById('stat-msgs')?.closest('.stat-card');
    if (messageCard) {
      messageCard.style.cursor = 'pointer';
      messageCard.title = 'Open message log';
      messageCard.onclick = () => this.navigate('whatsapp');
    }

    const chatStatCard = document.getElementById('stat-chats')?.closest('.stat-card');
    if (chatStatCard) {
      chatStatCard.remove();
    }
    this.businessModulesSetupDone = true;
  },



  async refreshDashboard() {
    if (this.statsPollingPaused) return;
    await this.loadStats();
    if (this.currentPage === 'dashboard') { await this.loadRecentActivity(); await this.loadPendingChats(); }
    if (this.currentPage === 'chat') await this.loadChatList();
    if (this.currentPage === 'calendar') await this.loadCalendarPage(true);
    if (this.currentPage === 'reports') await this.loadReports(true);
    if (this.currentPage === 'inventory') await this.loadInventory(true);
    if (this.currentPage === 'expenses') await this.loadExpenses(true);
    if (this.currentPage === 'subscription') await this.loadSubscriptionPlans(true);
  },

  // ── STATS ────────────────────────────────────────────────────────
  async loadStats() {
    try {
      const s = await this.api('/api/stats');
      this.statsApiFailureCount = 0;
      const patientValue = document.getElementById('stat-patients');
      const verifiedValue = document.getElementById('stat-verified');
      const appointmentValue = document.getElementById('stat-appts');
      const prescriptionValue = document.getElementById('stat-rx');
      const messageValue = document.getElementById('stat-msgs');
      const chatValue = document.getElementById('stat-chats');
      const chatDelta = document.getElementById('delta-chats');
      const badge = document.getElementById('chatBadge');

      if (patientValue) patientValue.textContent = s.totalPatients || 0;
      if (verifiedValue) verifiedValue.textContent = s.verifiedPatients || 0;
      if (appointmentValue) appointmentValue.textContent = s.scheduledAppointments || 0;
      if (prescriptionValue) prescriptionValue.textContent = s.activePrescriptions || 0;
      if (messageValue) messageValue.textContent = s.messagesSent || 0;
      if (chatValue) chatValue.textContent = s.unreadChats || 0;

      if (s.unreadChats > 0) {
        if (chatDelta) {
          chatDelta.textContent = `${s.unreadChats} unread`;
          chatDelta.style.color = 'var(--red)';
        }
        if (badge) {
          badge.style.display = 'inline';
          badge.textContent = s.unreadChats;
        }
      } else {
        if (chatDelta) {
          chatDelta.textContent = '0 unread';
          chatDelta.style.color = 'var(--text3)';
        }
        if (badge) badge.style.display = 'none';
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
  async loadSubscriptionPlans(silent = false) {
    try {
      const response = await this.api('/api/doctor/subscription/plans');
      const fallbackPlans = [
        {
          id: 'starter-plan',
          name: 'Starter',
          description: 'Basic plan for small clinics',
          price: 999,
          billingCycle: 'month',
          status: 'Active',
          features: [
            'Doctors Limit: 2 doctors',
            'Patients Limit: 500 patients',
            'WhatsApp Limit: 5,000 messages',
          ],
        },
        {
          id: 'growth-plan',
          name: 'Growth',
          description: 'Best for growing clinics',
          price: 1999,
          billingCycle: 'month',
          status: 'Active',
          features: [
            'Doctors Limit: 5 doctors',
            'Patients Limit: 2,000 patients',
            'WhatsApp Limit: 10,000 messages',
          ],
        },
        {
          id: 'pro-plan',
          name: 'Pro',
          description: 'Advanced plan for scaling clinics',
          price: 3999,
          billingCycle: 'month',
          status: 'Active',
          features: [
            'Doctors Limit: 10 doctors',
            'Patients Limit: 5,000 patients',
            'WhatsApp Limit: 20,000 messages',
          ],
        },
      ];

      this.subscriptionPlans = Array.isArray(response?.plans) && response.plans.length
        ? response.plans
        : fallbackPlans;
      this.activeSubscription = response?.currentSubscription || null;
      this.renderSubscriptionPlans();
    } catch (e) {
      this.subscriptionPlans = [
        {
          id: 'starter-plan',
          name: 'Starter',
          description: 'Basic plan for small clinics',
          price: 999,
          billingCycle: 'month',
          status: 'Active',
          features: [
            'Doctors Limit: 2 doctors',
            'Patients Limit: 500 patients',
            'WhatsApp Limit: 5,000 messages',
          ],
        },
        {
          id: 'growth-plan',
          name: 'Growth',
          description: 'Best for growing clinics',
          price: 1999,
          billingCycle: 'month',
          status: 'Active',
          features: [
            'Doctors Limit: 5 doctors',
            'Patients Limit: 2,000 patients',
            'WhatsApp Limit: 10,000 messages',
          ],
        },
        {
          id: 'pro-plan',
          name: 'Pro',
          description: 'Advanced plan for scaling clinics',
          price: 3999,
          billingCycle: 'month',
          status: 'Active',
          features: [
            'Doctors Limit: 10 doctors',
            'Patients Limit: 5,000 patients',
            'WhatsApp Limit: 20,000 messages',
          ],
        },
      ];
      this.activeSubscription = null;
      this.renderSubscriptionPlans();
      if (!silent) this.toast('Showing sample subscription plans', 'info');
    }
  },

  renderSubscriptionPlans() {
    const plansWrap = document.getElementById('subscriptionPlans');
    const currentWrap = document.getElementById('subscriptionCurrent');
    if (!plansWrap || !currentWrap) return;

    // Current Plan Section
    if (this.activeSubscription) {
      const isTrial = this.activeSubscription.planId === 'plan-free-trial';
      currentWrap.innerHTML = `
        <div class="subscription-status-banner">
          <div class="subscription-current-label">CURRENT PLAN</div>
          <div class="subscription-current-header">
            <h4>${this.activeSubscription.planName} (${this.activeSubscription.amount > 0 ? '₹' + this.activeSubscription.amount.toLocaleString('en-IN') : 'Free Trial'})</h4>
            <p>Your ${isTrial ? 'free trial' : 'premium'} plan is active until <strong>${this.formatDate(this.activeSubscription.endDate)}</strong>.</p>
          </div>
        </div>
      `;
    } else {
      currentWrap.innerHTML = `
        <div class="subscription-status-banner">
          <div class="subscription-current-label">CURRENT PLAN</div>
          <div class="subscription-current-header">
            <h4>No active subscription</h4>
            <p>Select one of the plans below to activate billing for this clinic.</p>
          </div>
        </div>
      `;
    }

    // Plans Grid
    plansWrap.className = 'subscription-plans-grid';
    plansWrap.innerHTML = this.subscriptionPlans.length
      ? this.subscriptionPlans.map((plan) => {
          const isActive = this.activeSubscription?.planId === plan.id;
          return `
            <article class="subscription-plan-card ${isActive ? 'active' : ''}" onclick="App.startSubscriptionCheckout('${plan.id}')">
              <div class="plan-card-top">
                <span class="plan-status-badge">${isActive ? 'CURRENT PLAN' : 'ACTIVE'}</span>
                <div class="plan-price-block">
                  <span class="price">₹${plan.price.toLocaleString('en-IN')}</span>
                  <span class="cycle">/ month</span>
                </div>
              </div>
              <div class="plan-card-body">
                <h4>${plan.name}</h4>
                <p class="plan-desc">${plan.description}</p>
                <div class="plan-features-list">
                  ${plan.features.map(f => `<div class="feature-item">${f}</div>`).join('')}
                  <div class="feature-item">Billed every month</div>
                </div>
              </div>
            </article>
          `;
        }).join('')
      : '<div class="subscription-empty-card">No subscription plans available at this moment.</div>';
  },

  async ensureRazorpayLoaded() {
    if (window.Razorpay) return true;

    await new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-razorpay-checkout="true"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(true), { once: true });
        existing.addEventListener('error', () => reject(new Error('Unable to load Razorpay')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.dataset.razorpayCheckout = 'true';
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error('Unable to load Razorpay'));
      document.head.appendChild(script);
    });

    return Boolean(window.Razorpay);
  },

  async startSubscriptionCheckout(planId) {
    try {
      this.selectedSubscriptionPlanId = planId;
      this.renderSubscriptionPlans();
      const plan = this.subscriptionPlans.find(p => p.id === planId);
      if (!plan) return;
      
      const amountLabel = document.getElementById('subPaymentAmountLabel');
      if (amountLabel) {
        amountLabel.innerHTML = `Amount to pay: <strong>${this.formatCurrency(plan.price)}</strong>`;
      }
      
      const submitBtn = document.getElementById('subPaymentSubmitBtn');
      if (submitBtn) {
        submitBtn.onclick = async () => {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Processing...';
          try {
            // Instant subscription (demo mode)
            await this.api('/api/doctor/subscribe', 'POST', {
              planId: planId
            });
            this.toast(`${plan.name} plan activated successfully`, 'success');
            this.closeModal('subscriptionPaymentModal');
            await this.loadSubscriptionPlans(true);
            // Sync with parent window if in iframe
            if (window.parent && window.parent.postMessage) {
              window.parent.postMessage({ type: 'SUBSCRIPTION_UPDATED', planId }, '*');
            }
          } catch (e) {
            this.toast(`Payment failed: ${e.message}`, 'error');
          } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Pay Now';
          }
        };
      }
      this.openModal('subscriptionPaymentModal');
    } catch (e) {
      this.toast(`Subscription checkout failed: ${e.message}`, 'error');
    }
  },

  async loadDoctors() {
    try {
      const scopedDoctors = await this.api('/api/doctor/doctors');
      this.doctors = Array.isArray(scopedDoctors)
        ? scopedDoctors.map((doctor) => ({
            id: doctor.userId || doctor.id,
            name: doctor.name,
            specialty: doctor.specialty || 'General',
            consultationFee: doctor.consultationFee || doctor.consultationFees || 500,
            phone: doctor.mobile || doctor.phone || '',
            email: doctor.email || '',
            clinicName: doctor.clinicName || '',
            medicalRegistrationNumber: doctor.medicalRegistrationNumber || '',
            medicalCouncilBoard: doctor.medicalCouncilBoard || '',
            profileImageUrl: doctor.profileImageUrl || '',
          }))
        : [];
      const currentDoctorId = String(this.currentDoctor?.id || this.currentUserId || '');
      const selfDoctor = this.doctors.find((doctor) => String(doctor.id) === currentDoctorId);
      if (selfDoctor) {
        this.currentDoctor = {
          ...(this.currentDoctor || {}),
          name: selfDoctor.name || this.currentDoctor?.name || 'Doctor',
          phone: selfDoctor.phone || this.currentDoctor?.phone || '',
          email: selfDoctor.email || this.currentDoctor?.email || '',
          clinicName: selfDoctor.clinicName || this.currentDoctor?.clinicName || '',
        };
        this.doctorProfilePrefs = {
          ...(this.doctorProfilePrefs || {}),
          registrationNumber: selfDoctor.medicalRegistrationNumber || this.doctorProfilePrefs?.registrationNumber || '',
          council: selfDoctor.medicalCouncilBoard || this.doctorProfilePrefs?.council || '',
          profileImage: selfDoctor.profileImageUrl || this.doctorProfilePrefs?.profileImage || '',
        };
        this.saveDoctorProfilePrefs();
        this.updateDoctorSessionUi();
      }
    } catch {
      try { this.doctors = await this.api('/api/doctors'); } catch {}
    }
  },

  getScopedDoctors() {
    return Array.isArray(this.doctors) ? this.doctors : [];
  },

  resolveDoctorName(doctorId, fallbackName = '') {
    const directName = String(fallbackName || '').trim();
    if (directName) return directName;
    const match = (this.doctors || []).find((doctor) => String(doctor.id) === String(doctorId));
    return match?.name || this.currentDoctor?.name || 'Doctor';
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
            ${!p.verified?`<button class="btn btn-ghost btn-sm" onclick="App.sendOTP('${p.id}')">OTP</button>`:''}
            <button class="btn btn-ghost btn-sm" onclick="App.viewDashboard('${p.id}')">📋 Dash</button>
            <button class="btn btn-ghost btn-sm" onclick="App.openSendSlot('${p.id}')">Slots</button>
            <button class="btn btn-ghost btn-sm" onclick="App.openChatFor('${p.id}')">Chat</button>
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
      this.toast('Patient added and welcome message queued.','success'); this.closeModal('addPatientModal'); this.loadPatients(); this.loadStats();
    } catch(e){this.toast('Error: '+e.message,'error');}
  },

  getPatientAssignedDoctorId(patientId) {
    const patient = this.patients.find((p) => String(p.id || p.patientId) === String(patientId));
    return String(patient?.primaryDoctorId || patient?.doctorId || '').trim();
  },

  syncDoctorForPatient(patientSelectId, doctorSelectId) {
    const patientEl = document.getElementById(patientSelectId);
    const doctorEl = document.getElementById(doctorSelectId);
    if (!patientEl || !doctorEl) return;
    const assignedDoctorId = this.getPatientAssignedDoctorId(patientEl.value);
    doctorEl.value = assignedDoctorId || '';
  },

  async deletePatient(id) {
    if(!confirm('Delete this patient?')) return;
    await this.api(`/api/patients/${id}`,'DELETE'); this.toast('Patient deleted','info'); this.loadPatients(); this.loadStats();
  },

  async sendOTP(patientId) {
    const patient = this.patients.find((entry) => (entry.id || entry.patientId) === patientId);
    await this.api('/api/verify/send-otp', 'POST', { patientId });
    this._otpPatientId = patientId;
    const summary = document.getElementById('verifyOtpSummary');
    if (summary) {
      summary.textContent = patient?.phone
        ? `Enter the 4-digit OTP sent to ${patient.phone}.`
        : 'Enter the 4-digit OTP sent to the patient WhatsApp number.';
    }
    const input = document.getElementById('verify-otp-input');
    if (input) input.value = '';
    this.openModal('verifyOtpModal');
    this.toast('4-digit OTP sent via WhatsApp.','success');
  },

  async confirmPatientOtp() {
    const otp = document.getElementById('verify-otp-input')?.value?.trim() || '';
    if (!this._otpPatientId) return this.toast('Send OTP first before verifying.','error');
    if (!/^\d{4}$/.test(otp)) return this.toast('Enter a valid 4-digit OTP.','error');
    try {
      await this.api('/api/verify/confirm-otp', 'POST', { patientId: this._otpPatientId, otp });
      this._otpPatientId = null;
      this.closeModal('verifyOtpModal');
      this.toast('Patient verification completed.','success');
      this.loadPatients();
      this.loadStats();
    } catch (e) {
      this.toast(`Error: ${e.message}`,'error');
    }
  },

  openSendSlot(patientId) {
    if (!patientId) {
      this.toast('Please select a patient first.', 'error');
      return;
    }
    this._slotPatientId = patientId;
    const sel = document.getElementById('slot-doctor'); sel.innerHTML = '<option value="">Select Doctor</option>';
    this.getScopedDoctors().forEach(d => sel.innerHTML += `<option value="${d.id}" data-name="${d.name}">${d.name} - ${d.specialty}</option>`);
    this.openModal('sendSlotModal');
  },

  async confirmSendSlots() {
    const doctorSel = document.getElementById('slot-doctor');
    const doctorId = doctorSel.value, doctorName = doctorSel.options[doctorSel.selectedIndex]?.dataset.name || '';
    const message = document.getElementById('slot-msg').value;
    try {
      const res = await this.api(`/api/slots/send-to-patient/${this._slotPatientId}`,'POST',{doctorId,doctorName,message});
      this.toast(`Slot picker sent. ${res.slots?.length} slots were shared.`,'success'); this.closeModal('sendSlotModal');
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
      apptEl.innerHTML = appointments.length ? appointments.map(a => `<div style="padding:4px 0;border-bottom:1px solid #eee">${a.slotDay||a.date} at ${a.slotTime||a.time} - ${a.status}</div>`).join('') : 'No appointments.';
      
      const rxEl = document.getElementById('dash-rx');
      rxEl.innerHTML = prescriptions.length ? prescriptions.map(r => `<div style="padding:4px 0;border-bottom:1px solid #eee">${r.diagnosis} - ${new Date(r.createdAt).toLocaleDateString()}</div>`).join('') : 'No prescriptions.';
      
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
      const appointmentData = await this.api('/api/appointments');
      this.appointments = Array.isArray(appointmentData) ? appointmentData : (appointmentData?.items || []);
      const tb = document.getElementById('appointmentsTable'); tb.innerHTML = '';
      const visibleAppointments = this.appointments.filter(a => a.status !== 'cancelled');
      if (!visibleAppointments.length) { tb.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:24px">No appointments yet.</td></tr>'; return; }
      visibleAppointments.forEach(a => {
        const statusColors = {scheduled:'tag-green',cancelled:'tag-red',rescheduled:'tag-amber',completed:'tag-indigo'};
        const appointmentId = a.id || a.appointmentId;
        a.doctorName = this.resolveDoctorName(a.doctorId, a.doctorName);
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
      const appts = await this.api('/api/appointments');
      const wrap = document.getElementById('todayAppts'); wrap.innerHTML = '';
      const scheduled = appts.filter(a=>a.status==='scheduled').slice(0,5);
      if (!scheduled.length) { wrap.innerHTML = '<p style="font-size:12px;color:var(--text3);text-align:center;padding:12px">No appointments scheduled</p>'; return; }
      scheduled.forEach(a => {
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
      this.appointments = await this.api('/api/appointments');
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
    const patientSel = document.getElementById('appt-patient');
    const doctorSel = document.getElementById('appt-doctor');
    const timeSel = document.getElementById('appt-time');
    if (!patientSel || !doctorSel || !timeSel) return;

    patientSel.innerHTML = '<option value="">Select patient...</option>';
    this.patients.forEach(p => { patientSel.innerHTML += `<option value="${p.id}">${p.name}</option>`; });

    doctorSel.innerHTML = '<option value="">Select doctor...</option>';
    this.doctors.forEach(d => { doctorSel.innerHTML += `<option value="${d.id}">${d.name}</option>`; });

    const uniqueTimes = [...new Set(this.slots.map(s => s.time))];
    timeSel.innerHTML = '<option value="">Select time...</option>';
    uniqueTimes.forEach(time => { timeSel.innerHTML += `<option value="${time}">${time}</option>`; });
  },

  renderCalendarDoctorList() {
    const wrap = document.getElementById('calendarDoctorList');
    if (!wrap) return;

    const allCount = this.getCalendarFilteredAppointments('all').length;
    const cards = [
      { id: 'all', name: 'All doctors', specialty: `${allCount}` },
      ...this.doctors.map(doctor => ({
        id: doctor.id,
        name: doctor.name,
        specialty: `${this.getCalendarFilteredAppointments(doctor.id).length}`
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

  openQuickInviteModal(day, time, doctorId) {
    const dayEl = document.getElementById('cal-invite-day');
    const timeEl = document.getElementById('cal-invite-time');
    const displayEl = document.getElementById('cal-invite-slot-display');
    const doctorSel = document.getElementById('cal-invite-doctor');
    const patientSel = document.getElementById('cal-invite-patient');
    
    if (dayEl) dayEl.value = day;
    if (timeEl) timeEl.value = time;
    if (displayEl) displayEl.textContent = `${day} · ${time}`;
    
    if (doctorSel) {
      doctorSel.innerHTML = '<option value="">Select Doctor *</option>';
      this.doctors.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = d.name;
        doctorSel.appendChild(opt);
      });
      doctorSel.value = doctorId || (this.selectedCalendarDoctorId !== 'all' ? this.selectedCalendarDoctorId : '');
    }

    if (patientSel) {
      this.filterInvitePatients('');
    }

    this.openModal('calendarInviteModal');
  },

  filterInvitePatients(query) {
    const sel = document.getElementById('cal-invite-patient');
    if (!sel) return;
    const normalized = query.toLowerCase().trim();
    sel.innerHTML = '<option value="">Select Patient *</option>';
    this.patients
      .filter(p => !normalized || `${p.name} ${p.phone}`.toLowerCase().includes(normalized))
      .forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} (${p.phone})`;
        sel.appendChild(opt);
      });
  },

  async sendQuickInvite() {
    const patientId = document.getElementById('cal-invite-patient')?.value;
    const doctorId = document.getElementById('cal-invite-doctor')?.value;
    const slotDay = document.getElementById('cal-invite-day')?.value;
    const slotTime = document.getElementById('cal-invite-time')?.value;

    if (!patientId || !doctorId) return this.toast('Please select patient and doctor', 'error');

    const patient = this.patients.find(p => p.id === patientId);
    const doctor = this.doctors.find(d => d.id === doctorId);

    try {
      await this.api('/api/appointments', 'POST', {
        patientId,
        patientName: patient?.name,
        doctorId,
        doctorName: doctor?.name,
        slotDay,
        slotTime,
        fee: this.getDoctorFee(doctorId),
        notes: 'Quick invite from calendar'
      });
      this.toast('Invite sent and appointment booked!', 'success');
      this.closeModal('calendarInviteModal');
      await this.loadCalendarPage(true);
    } catch (e) {
      this.toast('Failed: ' + e.message, 'error');
    }
  },

  prefillCalendarBooking(day, time, doctorId = 'doc1') {
    const daySel = document.getElementById('appt-day');
    const timeSel = document.getElementById('appt-time');
    const doctorSel = document.getElementById('appt-doctor');
    
    if (daySel) {
      if (!Array.from(daySel.options).some(opt => opt.value === day)) {
        daySel.innerHTML += `<option value="${day}">${day}</option>`;
      }
      daySel.value = day;
    }
    
    if (timeSel) {
      if (!Array.from(timeSel.options).some(opt => opt.value === time)) {
        timeSel.innerHTML += `<option value="${time}">${time}</option>`;
      }
      timeSel.value = time;
    }
    
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

    const defaultTimes = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'];
    let timeRows = [...new Set([...defaultTimes, ...this.slots.map(slot => slot.time)])];
    timeRows.sort((a, b) => {
      const parseTime = (t) => {
        if (!t) return 0;
        const parts = t.trim().split(' ');
        const time = parts[0];
        const mod = parts[1] || 'AM';
        let [h, m] = time.split(':');
        h = parseInt(h, 10);
        m = parseInt(m || '0', 10);
        if (h === 12 && mod.toUpperCase() === 'AM') h = 0;
        if (h !== 12 && mod.toUpperCase() === 'PM') h += 12;
        return h * 60 + m;
      };
      return parseTime(a) - parseTime(b);
    });

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
                <button class="calendar-event-chip confirmed" onclick="App.openQuickInviteModal('${appt.slotDay}','${appt.slotTime}','${appt.doctorId || 'doc1'}')">
                  <span class="calendar-event-patient">${appt.patientName || 'Patient'}</span>
                  <span class="calendar-event-doctor">${appt.doctorName || 'Doctor'}</span>
                </button>
              `).join('') : `<button class="calendar-open-slot" onclick="App.openQuickInviteModal('${dayName}','${time}','${freeSlot ? (freeSlot.doctorId || '') : ''}')"></button>`}
            </div>
          </div>`;
        }).join('')}
      </div>
    `).join('');
  },

  renderCalendarTodaySchedule() {
    const totalEl = document.getElementById('calStatTotal');
    const availableEl = document.getElementById('calStatAvailable');
    if (!totalEl || !availableEl) return;

    const filteredAppointments = this.getCalendarFilteredAppointments();
    const availableSlots = this.getCalendarFilteredSlots().length;

    totalEl.textContent = filteredAppointments.length;
    availableEl.textContent = availableSlots;
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
    const patientId=patSel.value;
    const doctorId=this.getPatientAssignedDoctorId(patientId) || docSel.value;
    if(!patientId) return this.toast('Select patient','error');
    if(!doctorId) return this.toast('Selected patient has no assigned doctor. Update patient doctor first.','error');
    if (docSel) docSel.value = doctorId;
    const slotDay=document.getElementById('appt-day').value, slotTime=document.getElementById('appt-time').value;
    if(!slotDay||!slotTime) return this.toast('Select day and time','error');
    const patient=this.patients.find(p=>p.id===patientId), doctor=this.doctors.find(d=>d.id===doctorId);
    try {
      await this.api('/api/appointments','POST',{patientId,patientName:patient?.name,doctorId,doctorName:doctor?.name,slotDay,slotTime,fee:this.getDoctorFee(doctorId),notes:document.getElementById('appt-notes').value});
      this.toast('Appointment booked and patient notified.','success'); this.closeModal('addApptModal'); this.loadAppointments(); this.loadStats();
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
        this.api('/api/appointments').then(data => { this.appointments = data; }),
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

    const totalUnits = this.inventory.reduce((sum, item) => sum + Number(item.stockQuantity || 0), 0);
    const lowStock = this.inventory.filter(item => Number(item.stockQuantity || 0) <= Number(item.reorderLevel || 0)).length;
    const stockValue = this.inventory.reduce((sum, item) => sum + Number(item.stockQuantity || 0) * Number(item.sellingPrice || 0), 0);

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
        <td>
          <div style="font-weight: 700; color: var(--text);">${item.itemName}</div>
          <div style="font-size: 11px; color: var(--text3); margin-top: 2px;">
            ${item.sku ? `<span style="background: var(--surface2); padding: 1px 4px; border-radius: 4px; border: 1px solid var(--border);">${item.sku}</span>` : ''}
            ${item.medicineType ? `<span style="margin-left: 4px;">${item.medicineType}</span>` : ''}
          </div>
        </td>
        <td><span class="tag tag-indigo">${item.category || 'General'}</span></td>
        <td>
          <div style="font-weight: 600;">${item.stockQuantity} ${item.stockUnit || ''}</div>
          ${Number(item.stockQuantity) <= Number(item.reorderLevel) ? '<div style="font-size: 10px; color: var(--red); font-weight: 700;">LOW STOCK</div>' : ''}
        </td>
        <td>${item.reorderLevel || 0}</td>
        <td>
          <div style="font-weight: 700; color: var(--indigo);">${this.formatCurrency(item.sellingPrice || 0)}</div>
          <div style="font-size: 10px; color: var(--text3);">Buy: ${this.formatCurrency(item.purchasePrice || 0)}</div>
        </td>
        <td>
          <div style="font-size: 12px; color: var(--text2);">${item.storageArea || '—'}</div>
          <div style="font-size: 10px; color: var(--text3);">${item.rackShelf || ''} ${item.boxBinNumber || ''}</div>
        </td>
        <td>
          <div class="action-btns">
            <button class="btn btn-red btn-sm" onclick="App.deleteInventoryItem('${item.inventoryItemId}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:24px">No inventory items yet.</td></tr>';
  },

  async addInventoryItem() {
    const name = document.getElementById('inv-name')?.value.trim();
    const quantity = document.getElementById('inv-quantity')?.value;
    const unit = document.getElementById('inv-unit')?.value;
    if (!name || !quantity) return this.toast('Item name and quantity are required', 'error');

    try {
      await this.api('/api/inventory', 'POST', {
        itemName: name,
        sku: document.getElementById('inv-sku')?.value.trim(),
        medicineType: document.getElementById('inv-medicine-type')?.value,
        category: document.getElementById('inv-category')?.value.trim() || 'General',
        unit: unit,
        strengthComposition: document.getElementById('inv-strength')?.value.trim(),
        barcodeQrCode: document.getElementById('inv-barcode')?.value.trim(),
        storageType: document.getElementById('inv-storage-type')?.value,
        prescriptionRequired: document.getElementById('inv-rx-required')?.checked,
        gstTax: Number(document.getElementById('inv-gst')?.value || 0),
        purchasePrice: Number(document.getElementById('inv-purchase-price')?.value || 0),
        sellingPrice: Number(document.getElementById('inv-selling-price')?.value || 0),
        quantity: Number(quantity),
        minimumStockLevel: Number(document.getElementById('inv-min-stock')?.value || 0),
        reorderLevel: Number(document.getElementById('inv-reorder')?.value || 0),
        isActive: document.getElementById('inv-is-active')?.checked,
        storageArea: document.getElementById('inv-area')?.value.trim(),
        rackShelf: document.getElementById('inv-rack')?.value.trim(),
        row: document.getElementById('inv-row')?.value.trim(),
        column: document.getElementById('inv-col')?.value.trim(),
        boxBinNumber: document.getElementById('inv-box')?.value.trim(),
        slotPosition: document.getElementById('inv-slot')?.value.trim(),
        notes: document.getElementById('inv-notes')?.value.trim(),
        vendor: document.getElementById('inv-vendor')?.value.trim()
      });
      this.toast('Inventory item added successfully', 'success');
      this.closeModal('inventoryModal');
      this.loadInventory();
      if (this.currentPage === 'reports') this.loadReports(true);
    } catch (e) { this.toast('Error: ' + e.message, 'error'); }
  },

  switchInventoryTab(tab) {
    document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.inventory-tab-content').forEach(c => c.classList.remove('active'));
    
    document.getElementById(`tab-inv-${tab}`).classList.add('active');
    document.getElementById(`inv-tab-${tab}`).classList.add('active');
  },

  updateInventoryLocationPreview() {
    const area = document.getElementById('inv-area')?.value.trim();
    const rack = document.getElementById('inv-rack')?.value.trim();
    const row = document.getElementById('inv-row')?.value.trim();
    const col = document.getElementById('inv-col')?.value.trim();
    const box = document.getElementById('inv-box')?.value.trim();
    const slot = document.getElementById('inv-slot')?.value.trim();
    
    const parts = [area, rack, row, col, box, slot].filter(Boolean);
    const previewEl = document.getElementById('inv-location-preview');
    if (!previewEl) return;

    if (parts.length === 0) {
      previewEl.innerHTML = '<span>Not set</span>';
      return;
    }

    previewEl.innerHTML = parts.map((p, i) => `
      <span>${p}</span>
      ${i < parts.length - 1 ? '<span class="location-path-sep">/</span>' : ''}
    `).join('');
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
          <td><div class="action-btns"><button class="btn btn-ghost btn-sm" onclick="App.resendRx('${rx.id}')">Resend</button></div></td>`;
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
    const patientId=patSel.value;
    const doctorId=this.getPatientAssignedDoctorId(patientId) || docSel.value;
    if(!patientId) return this.toast('Select patient','error');
    if(!doctorId) return this.toast('Selected patient has no assigned doctor. Update patient doctor first.','error');
    if (docSel) docSel.value = doctorId;
    const diagnosis=document.getElementById('rx-diagnosis').value.trim(); if(!diagnosis) return this.toast('Diagnosis required','error');
    const medicines=[]; document.querySelectorAll('.rx-med-row').forEach(r=>{const name=r.querySelector('.rx-name')?.value.trim();if(name) medicines.push({name,dosage:r.querySelector('.rx-dosage')?.value.trim(),timing:r.querySelector('.rx-timing')?.value});});
    if(!medicines.length) return this.toast('Add at least one medicine','error');
    const doctor=this.doctors.find(d=>d.id===doctorId);
    try {
      await this.api('/api/prescriptions','POST',{patientId,doctorId,doctorName:doctor?.name,diagnosis,medicines,notes:document.getElementById('rx-notes').value});
      this.toast('Prescription saved and sent to patient.','success'); this.closeModal('addRxModal'); this.loadPrescriptions(); this.loadStats();
    } catch(e){this.toast('Error: '+e.message,'error');}
  },

  async resendRx(id) { await this.api(`/api/prescriptions/send-whatsapp/${id}`,'POST'); this.toast('Prescription resent via WhatsApp.','success'); },

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
      <div class="chat-empty-icon">CL</div>
      <div class="chat-empty-title">Send a patient message</div>
      <p class="chat-empty-copy">Choose a patient, pick a doctor, then send directly from this main section.</p>
      <div class="chat-quick-compose">
        <select id="chatPatientSel" class="form-select" onchange="App.changeMainChatPatient(this.value)">
          <option value="">Select patient...</option>
          ${this.patients.map(p=>`<option value="${p.id}" ${p.id===selectedPatientId?'selected':''}>${p.name}</option>`).join('')}
        </select>
        <div class="action-btns" style="margin-top: 12px; margin-bottom: 12px; display: flex; gap: 8px;">
          <button class="btn btn-ghost btn-sm chat-action-btn" onclick="App.openSendSlot(document.getElementById('chatPatientSel').value)">
            <span class="chat-action-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v11a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Z"/>
                <path d="M4 10h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8Z" fill="none"/>
              </svg>
            </span>
            <span>Send Slots</span>
          </button>
          <button class="btn btn-ghost btn-sm chat-action-btn" onclick="const p=document.getElementById('chatPatientSel').value; const ds=document.getElementById('chatDoctorSel'); if(!p){App.toast('Select a patient','error');return;} App.quickFollowUp(p, ds.value, ds.options[ds.selectedIndex].text)">
            <span class="chat-action-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 2a10 10 0 1 0 6.7 17.4L22 22l-2.6-3.3A10 10 0 0 0 12 2Zm1 5v5h4a1 1 0 1 1 0 2h-5a1 1 0 0 1-1-1V7a1 1 0 1 1 2 0Z"/>
              </svg>
            </span>
            <span>Follow-Up</span>
          </button>
        </div>
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
      this.toast(res.translated ? 'Message translated and sent via WhatsApp' : 'Message sent via WhatsApp.','success');
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

    const micBtn = document.getElementById(micButtonId);
    if (!micBtn) return;
    
    // Remove old listeners by cloning
    const newMicBtn = micBtn.cloneNode(true);
    micBtn.parentNode.replaceChild(newMicBtn, micBtn);
    
    const stopRecordingUI = () => {
      newMicBtn.classList.remove('recording-pulse');
      newMicBtn.title = "Voice to text";
    };
    
    newMicBtn.addEventListener('click', () => {
      const currentInput = document.getElementById(inputElementId);
      if (!currentInput) {
        if (typeof App !== 'undefined' && App.toast) App.toast('Text input not found', 'error');
        return;
      }

      if (this._voiceRecognition && newMicBtn.classList.contains('recording-pulse')) {
        this._voiceRecognition.stop();
        stopRecordingUI();
        return;
      }

      // Cleanup existing
      if (this._voiceRecognition) {
        try { this._voiceRecognition.stop(); } catch(e) {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      // Map UI language to recognition language
      const langSel = document.getElementById('chatLanguageSel');
      const selectedLang = langSel ? langSel.value : 'en';
      recognition.lang = selectedLang === 'ta' ? 'ta-IN' : (selectedLang === 'hi' ? 'hi-IN' : 'en-US');
      
      this._voiceRecognition = recognition;
      this._voiceInputId = inputElementId;
      this._voiceFinalTranscript = currentInput.value;
      
      newMicBtn.classList.add('recording-pulse');
      newMicBtn.title = "Stop Recording";
      
      recognition.onresult = (event) => {
        const input = document.getElementById(this._voiceInputId);
        if (!input) return;
        
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
        input.value = this._voiceFinalTranscript + (interimTranscript ? ' ' + interimTranscript : '');
        
        // Dispatch event so any listeners know the value changed
        input.dispatchEvent(new Event('input', { bubbles: true }));
      };

      recognition.onend = () => { stopRecordingUI(); };
      recognition.onerror = (e) => { 
        stopRecordingUI(); 
        if (e.error !== 'no-speech' && e.error !== 'aborted' && typeof App !== 'undefined' && App.toast) {
          App.toast('Mic error: ' + e.error, 'error');
        }
      };

      try {
        recognition.start();
        if (typeof App !== 'undefined' && App.toast) App.toast('Listening...', 'info');
      } catch(e) {
        console.error('Mic start error:', e);
        stopRecordingUI();
      }
    });
  },

  async loadPendingChats() {
    try {
      const chats = await this.api('/api/chat');
      const wrap = document.getElementById('pendingChats'); wrap.innerHTML = '';
      const unread = chats.filter(c=>c.unread>0);
      if (!unread.length) { wrap.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text3);font-size:12px">No pending messages</div>'; return; }
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
      if(dSel){dSel.innerHTML='<option value="">Select doctor...</option>';this.getScopedDoctors().forEach(d=>dSel.innerHTML+=`<option value="${d.id}" data-name="${d.name}">${d.name}</option>`);}
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
      this.toast(res.notification?.message || 'Message sent via WhatsApp.','success');
      const preview=document.getElementById('autoPreview'); const previewText=document.getElementById('autoPreviewText');
      if(preview&&previewText){preview.style.display='block';previewText.textContent=res.preview||'';}
    } catch(e){this.toast('Error: '+e.message,'error');}
  },

  async quickFollowUp(patientId, doctorId, doctorName) {
    const msg=prompt('Follow-up message (or leave blank for default):');
    try {
      await this.api(`/api/doctor/send-automation/${patientId}`,'POST',{type:'follow_up',doctorId,doctorName,message:msg||''});
      this.toast('Follow-up sent successfully.','success');
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
    this.toast('Test message sent to simulation log.','info');
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
      ['appt-doctor','rx-doctor'].forEach(selId=>{const el=document.getElementById(selId);if(el){el.innerHTML='<option value="">Select Doctor *</option>';this.getScopedDoctors().forEach(d=>el.innerHTML+=`<option value="${d.id}">${d.name} - ${d.specialty}</option>`);}});
      this.syncDoctorForPatient('appt-patient', 'appt-doctor');
      this.syncDoctorForPatient('rx-patient', 'rx-doctor');
      const apptPatientEl = document.getElementById('appt-patient');
      if (apptPatientEl) apptPatientEl.onchange = () => this.syncDoctorForPatient('appt-patient', 'appt-doctor');
      const rxPatientEl = document.getElementById('rx-patient');
      if (rxPatientEl) rxPatientEl.onchange = () => this.syncDoctorForPatient('rx-patient', 'rx-doctor');
      const apptDoctorEl = document.getElementById('appt-doctor');
      if (apptDoctorEl?.parentElement) apptDoctorEl.parentElement.style.display = 'none';
      const rxDoctorEl = document.getElementById('rx-doctor');
      if (rxDoctorEl?.parentElement) rxDoctorEl.parentElement.style.display = 'none';
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

  editingPatientId: null,

  normalizeIndianPhone(phone) {
    const raw = String(phone || '').trim();
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    if (raw.startsWith('+')) return `+${digits}`;
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    return `+${digits}`;
  },

  resetAddDoctorForm() {
    const fields = {
      'doc-form-name': '',
      'doc-form-email': '',
      'doc-form-phone': '',
      'doc-form-date-of-birth': '',
      'doc-form-specialization': '',
      'doc-form-experience': '',
      'doc-form-qualification': '',
      'doc-form-council-board': '',
      'doc-form-council-code': '',
      'doc-form-clinic-name': '',
      'doc-form-clinic-address': '',
      'doc-form-city': '',
      'doc-form-fees': '',
      'doc-form-start-time': '',
      'doc-form-end-time': '',
      'doc-form-about': '',
      'doc-form-profile-image-url': '',
      'doc-form-clinic-image-url': '',
      'doc-form-certificate-url': '',
    };
    Object.entries(fields).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.value = value;
    });
    this.addDoctorSelectedDays = [];
    this.addDoctorTimeSlots = [];
    this.addDoctorEmailOtpRequested = false;
    this.addDoctorEmailVerified = false;
    this.addDoctorEmailOtpRetryAt = 0;
    this.addDoctorEmailVerificationBusy = false;
    this.toggleDoctorEmailOtpInput(false);
    this.addDoctorImageState = {
      profileDataUrl: '',
      profileFileName: '',
      profileFromFile: false,
      clinicDataUrl: '',
      clinicFileName: '',
      clinicFromFile: false,
    };
    this.updateDoctorDaysSummary();
    const slotsList = document.getElementById('doc-form-time-slots-list');
    if (slotsList) slotsList.innerHTML = '';
    const daysDropdown = document.getElementById('doc-form-days-dropdown');
    if (daysDropdown) daysDropdown.style.display = 'none';
    document.querySelectorAll('#doc-form-days-dropdown input[type="checkbox"]').forEach((checkbox) => {
      checkbox.checked = false;
    });
    const verifyStatus = document.getElementById('doc-form-email-verify-status');
    if (verifyStatus) {
      verifyStatus.textContent = '';
      verifyStatus.className = 'doctor-email-verify-status';
    }
    this.setDoctorEmailVerifyButtonState(false);
  },

  onAddDoctorIdentityChange() {
    this.addDoctorEmailVerified = false;
    this.addDoctorEmailOtpRequested = false;
    this.addDoctorEmailOtpRetryAt = 0;
    this.toggleDoctorEmailOtpInput(false);
    const verifyStatus = document.getElementById('doc-form-email-verify-status');
    if (verifyStatus) {
      verifyStatus.textContent = '';
      verifyStatus.className = 'doctor-email-verify-status';
    }
    this.setDoctorEmailVerifyButtonState(false);
  },

  setDoctorEmailVerifyStatus(text, type = '') {
    const status = document.getElementById('doc-form-email-verify-status');
    if (!status) return;
    status.textContent = text || '';
    status.className = `doctor-email-verify-status${type ? ` ${type}` : ''}`;
  },

  setDoctorEmailVerifyButtonState(busy) {
    const verifyButton = document.getElementById('doc-form-email-verify-btn');
    if (!verifyButton) return;
    verifyButton.disabled = Boolean(busy);
    verifyButton.textContent = busy
      ? 'Verifying...'
      : (this.addDoctorEmailVerified ? 'Verified' : (this.addDoctorEmailOtpRequested ? 'Submit OTP' : 'Verify'));
  },

  toggleDoctorEmailOtpInput(visible) {
    const wrap = document.getElementById('doc-form-email-otp-wrap');
    const input = document.getElementById('doc-form-email-otp-input');
    if (!wrap || !input) return;
    wrap.style.display = visible ? 'block' : 'none';
    if (!visible) {
      input.value = '';
    }
  },

  parseOtpRetrySeconds(message) {
    const value = String(message || '').match(/wait\s+(\d+)\s+seconds/i);
    return value ? Number(value[1]) : 0;
  },

  async handleAddDoctorEmailVerification() {
    if (this.addDoctorEmailVerificationBusy) return;
    if (this.addDoctorEmailVerified) {
      this.toast('Email is already verified', 'success');
      return;
    }

    const name = document.getElementById('doc-form-name')?.value?.trim() || '';
    const email = document.getElementById('doc-form-email')?.value?.trim() || '';
    if (!name || !email) {
      this.setDoctorEmailVerifyStatus('Enter name and email first.', 'error');
      this.toast('Enter name and email first', 'error');
      return;
    }

    this.addDoctorEmailVerificationBusy = true;
    this.setDoctorEmailVerifyButtonState(true);
    try {
      if (!this.addDoctorEmailOtpRequested) {
        if (this.addDoctorEmailOtpRetryAt && Date.now() < this.addDoctorEmailOtpRetryAt) {
          const secondsLeft = Math.ceil((this.addDoctorEmailOtpRetryAt - Date.now()) / 1000);
          this.setDoctorEmailVerifyStatus(`Please wait ${secondsLeft} seconds before requesting another OTP.`, 'error');
          this.toast(`Please wait ${secondsLeft} seconds`, 'error');
          return;
        }

        const otpResponse = await this.publicApi('/api/auth/signup/request-otp-email', 'POST', {
          name,
          email,
          phone: OTP_VERIFICATION_PHONE,
          role: 'doctor',
        });

        this.addDoctorEmailOtpRequested = true;
        this.addDoctorEmailVerified = false;
        this.toggleDoctorEmailOtpInput(true);
        if (otpResponse?.emailDelivered === false) {
          const deliveryError = String(otpResponse?.emailDeliveryError || '').trim();
          const suffix = deliveryError ? ` (${deliveryError})` : '';
          this.setDoctorEmailVerifyStatus(`Email not sent${suffix}. Use OTP below and click Submit OTP.`, 'error');
          this.toast('Email delivery failed. Using OTP fallback.', 'error');
        } else {
          this.setDoctorEmailVerifyStatus(`OTP sent to ${email}. Enter OTP below and click Submit OTP.`, 'success');
          this.toast('OTP sent to email', 'success');
        }
        return;
      }

      const otp = document.getElementById('doc-form-email-otp-input')?.value?.trim() || '';
      if (!otp) {
        this.setDoctorEmailVerifyStatus('Enter OTP to complete verification.', 'error');
        return;
      }

      await this.publicApi('/api/auth/signup/verify-otp', 'POST', {
        email,
        phone: OTP_VERIFICATION_PHONE,
        role: 'doctor',
        otp,
      });

      this.addDoctorEmailVerified = true;
      this.addDoctorEmailOtpRequested = false;
      this.addDoctorEmailOtpRetryAt = 0;
      this.toggleDoctorEmailOtpInput(false);
      this.setDoctorEmailVerifyStatus('Email verified successfully', 'success');
      this.toast('Email verified', 'success');
    } catch (error) {
      const message = error?.message || 'Unable to verify email';
      const normalizedMessage = String(message).toLowerCase();
      const retryAfterSeconds = this.parseOtpRetrySeconds(message);
      if (retryAfterSeconds > 0) {
        this.addDoctorEmailOtpRetryAt = Date.now() + retryAfterSeconds * 1000;
      }
      if (/already registered|already exists|already exist|email is already registered/i.test(normalizedMessage)) {
        this.addDoctorEmailOtpRequested = false;
        this.toggleDoctorEmailOtpInput(false);
        this.setDoctorEmailVerifyStatus('already exist', 'error');
      } else if (/expired|not requested/i.test(message)) {
        this.addDoctorEmailOtpRequested = false;
        this.toggleDoctorEmailOtpInput(false);
        this.setDoctorEmailVerifyStatus(message, 'error');
      } else {
        this.setDoctorEmailVerifyStatus(message, 'error');
      }
      this.addDoctorEmailVerified = false;
      this.toast(message, 'error');
    } finally {
      this.addDoctorEmailVerificationBusy = false;
      this.setDoctorEmailVerifyButtonState(false);
    }
  },

  pickDoctorImageFile(kind) {
    const fileInputId = kind === 'profile' ? 'doc-form-profile-image-file' : 'doc-form-clinic-image-file';
    const fileInput = document.getElementById(fileInputId);
    if (fileInput) fileInput.click();
  },

  async onDoctorImageFileSelected(kind, event) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => reject(new Error('Unable to read file.'));
        reader.readAsDataURL(file);
      });
      if (kind === 'profile') {
        this.addDoctorImageState.profileDataUrl = dataUrl;
        this.addDoctorImageState.profileFileName = file.name;
        this.addDoctorImageState.profileFromFile = true;
        const input = document.getElementById('doc-form-profile-image-url');
        if (input) input.value = file.name;
      } else {
        this.addDoctorImageState.clinicDataUrl = dataUrl;
        this.addDoctorImageState.clinicFileName = file.name;
        this.addDoctorImageState.clinicFromFile = true;
        const input = document.getElementById('doc-form-clinic-image-url');
        if (input) input.value = file.name;
      }
    } catch (error) {
      this.toast(error?.message || 'Unable to read selected image', 'error');
    } finally {
      event.target.value = '';
    }
  },

  onDoctorImageUrlChange(kind) {
    if (kind === 'profile') {
      this.addDoctorImageState.profileDataUrl = '';
      this.addDoctorImageState.profileFileName = '';
      this.addDoctorImageState.profileFromFile = false;
      return;
    }
    this.addDoctorImageState.clinicDataUrl = '';
    this.addDoctorImageState.clinicFileName = '';
    this.addDoctorImageState.clinicFromFile = false;
  },

  toggleDoctorDaysDropdown() {
    const dropdown = document.getElementById('doc-form-days-dropdown');
    if (!dropdown) return;
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
  },

  toggleDoctorDay(day) {
    if (this.addDoctorSelectedDays.includes(day)) {
      this.addDoctorSelectedDays = this.addDoctorSelectedDays.filter((item) => item !== day);
    } else {
      this.addDoctorSelectedDays = [...this.addDoctorSelectedDays, day];
    }
    this.updateDoctorDaysSummary();
  },

  updateDoctorDaysSummary() {
    const summary = document.getElementById('doc-form-days-summary');
    if (!summary) return;
    summary.textContent = this.addDoctorSelectedDays.length
      ? this.addDoctorSelectedDays.join(', ')
      : 'Select available days *';
  },

  addDoctorTimeSlot() {
    const startTime = document.getElementById('doc-form-start-time')?.value || '';
    const endTime = document.getElementById('doc-form-end-time')?.value || '';
    if (!startTime || !endTime) {
      this.toast('Select start and end time', 'error');
      return;
    }
    if (endTime <= startTime) {
      this.toast('Select a valid time range', 'error');
      return;
    }
    const slot = `${startTime} - ${endTime}`;
    if (this.addDoctorTimeSlots.includes(slot)) {
      return;
    }
    this.addDoctorTimeSlots.push(slot);
    this.renderDoctorTimeSlots();
    document.getElementById('doc-form-start-time').value = '';
    document.getElementById('doc-form-end-time').value = '';
  },

  removeDoctorTimeSlot(slot) {
    this.addDoctorTimeSlots = this.addDoctorTimeSlots.filter((item) => item !== slot);
    this.renderDoctorTimeSlots();
  },

  renderDoctorTimeSlots() {
    const list = document.getElementById('doc-form-time-slots-list');
    if (!list) return;
    list.innerHTML = this.addDoctorTimeSlots.length
      ? this.addDoctorTimeSlots.map((slot) => `<span class="doctor-slot-pill">${slot}<button type="button" onclick="App.removeDoctorTimeSlot('${slot}')">x</button></span>`).join('')
      : '<span class="doctor-slot-empty">No slots added</span>';
  },

  getSupportDisplayStatus(status) {
    const normalized = String(status || 'Open');
    if (normalized === 'Open') return { label: 'Not opened', className: 'tag-amber' };
    if (normalized === 'In Progress') return { label: 'Working', className: 'tag-cyan' };
    if (normalized === 'Resolved' || normalized === 'Closed') return { label: 'Fixed', className: 'tag-green' };
    return { label: normalized, className: 'tag-indigo' };
  },

  getSupportCleanDescription(description) {
    return String(description || '-')
      .split(/\r?\n/)
      .filter((line) => !/^(Doctor|Phone|Email):/i.test(String(line).trim()))
      .join('\n')
      .trim() || '-';
  },

  async loadSupportRequests() {
    try {
      const result = await this.api('/api/support/tickets');
      this.supportRequests = Array.isArray(result) ? result : [];
      const table = document.getElementById('supportRequestsTable');
      if (!table) return;
      table.innerHTML = '';
      if (!this.supportRequests.length) {
        table.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:24px">-</td></tr>';
        return;
      }
      this.supportRequests.forEach((ticket) => {
        const status = this.getSupportDisplayStatus(ticket.status);
        const description = this.getSupportCleanDescription(ticket.description);
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${ticket.clinicName || '-'}</td>
          <td><strong>${ticket.issueTitle || '-'}</strong></td>
          <td style="max-width:260px;white-space:normal">${description}</td>
          <td><span class="tag ${status.className}">${status.label}</span></td>
          <td>${ticket.priority || 'Medium'}</td>
          <td>${ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : '-'}</td>
          <td><button class="btn btn-ghost btn-sm" onclick="App.viewSupportRequest('${ticket.id}')">View</button></td>
        `;
        table.appendChild(row);
      });
    } catch (error) {
      this.toast(error.message || 'Failed to load support tickets', 'error');
    }
  },

  filterSupportRequests(query) {
    const rows = document.querySelectorAll('#supportRequestsTable tr');
    rows.forEach((row) => {
      row.style.display = row.textContent.toLowerCase().includes(String(query || '').toLowerCase()) ? '' : 'none';
    });
  },

  resetSupportRequestForm() {
    const doctorSelect = document.getElementById('support-doctor-name');
    const phoneInput = document.getElementById('support-doctor-phone');
    const emailInput = document.getElementById('support-doctor-email');
    const clinicInput = document.getElementById('support-clinic-name');
    const issueInput = document.getElementById('support-issue-title');
    const descriptionInput = document.getElementById('support-description');

    if (doctorSelect) {
      doctorSelect.innerHTML = '<option value="">Select Doctor *</option>';
      this.getScopedDoctors().forEach((doctor) => {
        doctorSelect.innerHTML += `<option value="${doctor.id}">${doctor.name}</option>`;
      });
      doctorSelect.value = '';
    }

    if (issueInput) issueInput.value = '';
    if (descriptionInput) descriptionInput.value = '';
    this.handleSupportDoctorChange(doctorSelect?.value || '');

    if (!phoneInput?.value) phoneInput.value = this.currentDoctor?.phone || '';
    if (!emailInput?.value) emailInput.value = this.currentDoctor?.email || '';
    if (!clinicInput?.value) clinicInput.value = this.currentDoctor?.clinicName || '';

    const priority = document.getElementById('support-priority');
    if (priority) priority.value = 'Medium';
  },

  handleSupportDoctorChange(doctorId) {
    const selected = this.getScopedDoctors().find((doctor) => String(doctor.id) === String(doctorId));
    const phoneInput = document.getElementById('support-doctor-phone');
    const emailInput = document.getElementById('support-doctor-email');
    const clinicInput = document.getElementById('support-clinic-name');
    if (phoneInput) phoneInput.value = selected?.phone || this.currentDoctor?.phone || '';
    if (emailInput) emailInput.value = selected?.email || this.currentDoctor?.email || '';
    if (clinicInput) clinicInput.value = selected?.clinicName || this.currentDoctor?.clinicName || '';
  },

  async addSupportRequest() {
    const clinicName = document.getElementById('support-clinic-name')?.value?.trim() || '';
    const doctorId = document.getElementById('support-doctor-name')?.value || '';
    const doctor = this.getScopedDoctors().find((item) => String(item.id) === String(doctorId));
    const doctorName = doctor?.name || '';
    const doctorPhone = document.getElementById('support-doctor-phone')?.value?.trim() || '';
    const doctorEmail = document.getElementById('support-doctor-email')?.value?.trim() || '';
    const title = document.getElementById('support-issue-title')?.value?.trim() || '';
    const description = document.getElementById('support-description')?.value?.trim() || '';
    const priority = document.getElementById('support-priority')?.value || 'Medium';

    if (!clinicName || !doctorId || !doctorName || !doctorPhone || !doctorEmail || !title || !description) {
      this.toast('All ticket fields are required', 'error');
      return;
    }

    try {
      await this.api('/api/support/tickets', 'POST', { clinicName, doctorName, doctorPhone, doctorEmail, title, description, priority });
      this.toast('Ticket raised successfully', 'success');
      this.closeModal('addSupportRequestModal');
      this.resetSupportRequestForm();
      this.navigate('support');
    } catch (error) {
      this.toast(error.message || 'Failed to raise ticket', 'error');
    }
  },

  viewSupportRequest(ticketId) {
    const ticket = this.supportRequests.find((item) => String(item.id) === String(ticketId));
    if (!ticket) return;
    const details = [
      `Clinic: ${ticket.clinicName || '-'}`,
      `Issue: ${ticket.issueTitle || '-'}`,
      `Status: ${this.getSupportDisplayStatus(ticket.status).label}`,
      `Priority: ${ticket.priority || '-'}`,
      `Created: ${ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : '-'}`,
      '',
      this.getSupportCleanDescription(ticket.description),
    ].join('\n');
    alert(details);
  },

  async loadDoctorDirectory() {
    try {
      const result = await this.api('/api/doctor/doctors');
      this.doctorDirectory = Array.isArray(result) ? result : [];
      let patientCountMap = new Map();
      try {
        const patientResult = await this.api('/api/patients');
        const patients = Array.isArray(patientResult) ? patientResult : (patientResult?.items || []);
        patientCountMap = patients.reduce((acc, patient) => {
          const doctorId = String(patient.primaryDoctorId || patient.doctorId || '').trim();
          if (!doctorId) return acc;
          acc.set(doctorId, (acc.get(doctorId) || 0) + 1);
          return acc;
        }, new Map());
      } catch {}
      const table = document.getElementById('doctorsTable');
      if (!table) return;

      table.innerHTML = '';
      if (!this.doctorDirectory.length) {
        table.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:24px">No doctors found.</td></tr>';
        return;
      }

      this.doctorDirectory.forEach((doctor) => {
        const normalizedStatus = String(doctor.status || 'pending').toLowerCase();
        const statusClass = normalizedStatus === 'approved' ? 'tag-green' : normalizedStatus === 'rejected' ? 'tag-red' : 'tag-amber';
        const doctorId = String(doctor.userId || doctor.id || '').trim();
        const computedPatientCount = Number(patientCountMap.get(doctorId) || 0);
        const dbPatientCount = Number(doctor.patientCount || 0);
        const finalPatientCount = Math.max(dbPatientCount, computedPatientCount);
        const row = document.createElement('tr');
        row.innerHTML = `
          <td><strong>${doctor.name || '-'}</strong></td>
          <td style="font-family:'Space Mono',monospace;font-size:12px">${doctor.mobile || '-'}</td>
          <td>${doctor.email || '-'}</td>
          <td>${finalPatientCount}</td>
          <td><span class="tag ${statusClass}">${normalizedStatus}</span></td>
        `;
        table.appendChild(row);
      });
    } catch (error) {
      this.toast(error.message || 'Failed to load doctors', 'error');
    }
  },

  filterDoctors(query) {
    const rows = document.querySelectorAll('#doctorsTable tr');
    rows.forEach((row) => {
      row.style.display = row.textContent.toLowerCase().includes(String(query || '').toLowerCase()) ? '' : 'none';
    });
  },

  async addDoctorFromForm() {
    const get = (id) => document.getElementById(id)?.value?.trim() || '';
    if (!this.addDoctorEmailVerified) {
      this.setDoctorEmailVerifyStatus('Verify email before submitting.', 'error');
      this.toast('Verify email before submitting', 'error');
      return;
    }
    const payload = {
      name: get('doc-form-name'),
      email: get('doc-form-email'),
      phone: get('doc-form-phone'),
      specialization: get('doc-form-specialization'),
      experience: Number(get('doc-form-experience')),
      qualification: get('doc-form-qualification'),
      medicalRegistrationNumber: get('doc-form-council-code'),
      clinicName: get('doc-form-clinic-name'),
      clinicAddress: get('doc-form-clinic-address'),
      city: get('doc-form-city'),
      consultationFees: Number(get('doc-form-fees')),
      availableDays: this.addDoctorSelectedDays,
      availableTimeSlots: this.addDoctorTimeSlots,
      aboutDoctor: get('doc-form-about') || undefined,
      profileImageUrl: this.addDoctorImageState.profileFromFile ? this.addDoctorImageState.profileDataUrl : (get('doc-form-profile-image-url') || undefined),
      clinicImageUrl: this.addDoctorImageState.clinicFromFile ? this.addDoctorImageState.clinicDataUrl : (get('doc-form-clinic-image-url') || undefined),
      certificateUrl: get('doc-form-certificate-url') || undefined,
    };

    if (
      !payload.name || !payload.email || !payload.phone ||
      !payload.specialization || !payload.qualification || !payload.medicalRegistrationNumber ||
      !payload.clinicName || !payload.clinicAddress || !payload.city ||
      !payload.availableDays.length || !payload.availableTimeSlots.length ||
      Number.isNaN(payload.experience) || Number.isNaN(payload.consultationFees)
    ) {
      this.toast('Please fill all required doctor fields', 'error');
      return;
    }

    try {
      await this.api('/api/doctor/doctors', 'POST', payload);
      this.toast('Doctor added successfully', 'success');
      this.resetAddDoctorForm();
      this.navigate('doctors');
    } catch (error) {
      this.toast(error.message || 'Failed to add doctor', 'error');
    }
  },

  closeDoctorDaysDropdownIfOutside(event) {
    const picker = document.querySelector('.doctor-days-picker');
    const dropdown = document.getElementById('doc-form-days-dropdown');
    if (!picker || !dropdown) return;
    if (!picker.contains(event.target)) {
      dropdown.style.display = 'none';
    }
  },

  resetPatientForm() {
    this.editingPatientId = null;
    const fields = {
      'pt-name': '',
      'pt-phone': '+91',
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
    ['pt-name-error', 'pt-phone-error', 'pt-email-error'].forEach(id => {
      const errEl = document.getElementById(id);
      if (errEl) errEl.textContent = '';
    });
    const doctorSelect = document.getElementById('pt-doctor');
    if (doctorSelect) doctorSelect.value = '';
    const title = document.querySelector('#addPatientModal .modal-header h3');
    const submit = document.querySelector('#addPatientModal .modal-footer .btn-primary');
    if (title) title.textContent = 'Add Patient';
    if (submit) submit.textContent = 'Add Patient & Send Welcome WA';
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
    const doctorSelect = document.getElementById('pt-doctor');
    if (doctorSelect) doctorSelect.value = patient.primaryDoctorId || patient.doctorId || '';
    const title = document.querySelector('#addPatientModal .modal-header h3');
    const submit = document.querySelector('#addPatientModal .modal-footer .btn-primary');
    if (title) title.textContent = 'Edit Patient';
    if (submit) submit.textContent = 'Save Changes';
    this.openModal('addPatientModal');
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

  validateNameInput(el) {
    const originalValue = el.value;
    const newValue = originalValue.replace(/[^A-Za-z\s]/g, '');
    const errorDiv = document.getElementById('pt-name-error');
    if (originalValue !== newValue) {
      el.value = newValue;
      if (errorDiv) errorDiv.textContent = 'Numbers and special characters are not allowed.';
    } else {
      if (errorDiv) errorDiv.textContent = '';
    }
  },

  validatePhoneInput(el) {
    const originalValue = el.value;
    const newValue = originalValue.replace(/[^0-9+]/g, '');
    const errorDiv = document.getElementById('pt-phone-error');
    if (originalValue !== newValue) {
      el.value = newValue;
      if (errorDiv) errorDiv.textContent = 'Only numbers and + are allowed.';
    } else {
      if (errorDiv) errorDiv.textContent = '';
    }
  },

  validateEmailInput(el) {
    const email = el.value.trim();
    const errorDiv = document.getElementById('pt-email-error');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      if (errorDiv) errorDiv.textContent = 'Please enter a valid email format.';
    } else {
      if (errorDiv) errorDiv.textContent = '';
    }
  },

  async addPatient() {
    const name=document.getElementById('pt-name').value.trim(), phone=this.normalizeIndianPhone(document.getElementById('pt-phone').value);
    if (!name||!phone) return this.toast('Name and phone are required','error');
    const email = document.getElementById('pt-email').value.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return this.toast('Please enter a valid email format.','error');
    const primaryDoctorId = document.getElementById('pt-doctor')?.value || '';
    const conditionsStr = document.getElementById('pt-conditions')?.value || '';
    const conditions = conditionsStr.split(',').map(s=>s.trim()).filter(Boolean);
    const payload = {name,phone,age:document.getElementById('pt-age').value,email:document.getElementById('pt-email').value,bloodGroup:document.getElementById('pt-blood').value,notes:document.getElementById('pt-notes').value, conditions, primaryDoctorId: primaryDoctorId || undefined};
    try {
      if (this.editingPatientId) {
        await this.api(`/api/patients/${this.editingPatientId}`,'PUT',payload);
        this.toast('Patient updated successfully','success');
      } else {
        await this.api('/api/patients','POST',payload);
        this.toast('Patient added and welcome message queued.','success');
      }
      this.resetPatientForm();
      this.closeModal('addPatientModal');
      this.loadPatients();
      this.loadStats();
      this.loadDoctorDirectory();
    } catch(e){this.toast('Error: '+e.message,'error');}
  },

  openModal(id) {
    const m = document.getElementById(id); m.classList.add('open');
    if (id === 'addPatientModal' && !this.editingPatientId) {
      this.resetPatientForm();
    }
    if (id === 'addSupportRequestModal') {
      this.resetSupportRequestForm();
    }
    if (id === 'addPatientModal') {
      const doctorEl = document.getElementById('pt-doctor');
      if (doctorEl) {
        doctorEl.innerHTML = '<option value="">Select Doctor</option>';
        this.getScopedDoctors().forEach((d) => {
          doctorEl.innerHTML += `<option value="${d.id}">${d.name} - ${d.specialty || 'General'}</option>`;
        });
        if (this.editingPatientId) {
          const patient = this.patients.find((item) => (item.id || item.patientId) === this.editingPatientId);
          doctorEl.value = patient?.primaryDoctorId || patient?.doctorId || '';
        }
      }
    }
    if (id === 'verifyOtpModal') {
      const input = document.getElementById('verify-otp-input');
      if (input) setTimeout(() => input.focus(), 0);
    }
    if (id==='addApptModal'||id==='addRxModal') {
      ['appt-patient','rx-patient'].forEach(selId=>{const el=document.getElementById(selId);if(el){el.innerHTML='<option value="">Select Patient *</option>';this.patients.forEach(p=>el.innerHTML+=`<option value="${p.id}">${p.name}</option>`);}});
      ['appt-doctor','rx-doctor'].forEach(selId=>{const el=document.getElementById(selId);if(el){el.innerHTML='<option value="">Select Doctor *</option>';this.getScopedDoctors().forEach(d=>el.innerHTML+=`<option value="${d.id}">${d.name} - ${d.specialty}</option>`);}});
    }
    m.addEventListener('click', e => { if (e.target === m) this.closeModal(id); }, { once: true });
  },

  closeModal(id) {
    document.getElementById(id).classList.remove('open');
    if (id === 'addPatientModal') {
      this.resetPatientForm();
    }
    if (id === 'verifyOtpModal') {
      this._otpPatientId = null;
      const input = document.getElementById('verify-otp-input');
      if (input) input.value = '';
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
        tb.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:24px">No patients yet. Add your first patient!</td></tr>';
        return;
      }
      this.patients.forEach((p) => {
        const patientId = p.id || p.patientId;
        const verified = Boolean(p.whatsappVerified ?? p.verified);
        const patientCode = p.patientCode || '';
        const assignedDoctorName = this.resolveDoctorName(p.primaryDoctorId || p.doctorId, p.doctorName);
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.innerHTML = `<td style="font-family:'Space Mono',monospace;font-size:12px;color:var(--indigo)">${patientCode || '-'}</td>
          <td><strong>${p.name}</strong>${p.notes ? `<br><span style="font-size:11px;color:var(--text3)">${p.notes.substring(0,40)}</span>` : ''}</td>
          <td>${assignedDoctorName || '-'}</td>
          <td style="font-family:'Space Mono',monospace;font-size:12px">${p.phone}</td>
          <td>${p.age || '-'}</td>
          <td><span class="tag ${verified ? 'tag-green' : 'tag-red'}">${verified ? 'Completed' : 'Pending'}</span></td>
          <td><div class="action-btns">
            ${!verified ? `<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();App.sendOTP('${patientId}')">OTP</button>` : ''}
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();App.editPatient('${patientId}')">Edit</button>
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();App.viewDashboard('${patientId}')">Dashboard</button>
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();App.openPatientDocs('${patientId}')">Docs</button>
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();App.openSendSlot('${patientId}')">Slots</button>
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();App.openChatFor('${patientId}')">Chat</button>
            <button class="btn btn-red btn-sm" onclick="event.stopPropagation();App.deletePatient('${patientId}')">Delete</button>
          </div></td>`;
        tr.addEventListener('click', () => this.viewDashboard(patientId));
        tb.appendChild(tr);
      });
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
        item.style.gap = '12px';
        
        const documentUrl = this.getPatientDocUrl(doc);
        
        item.innerHTML = `
          <button type="button" onclick="App.openPatientDoc('${documentUrl}')" title="Open document in new tab" style="border:0;background:transparent;padding:0;margin:0;cursor:pointer;flex:1;min-width:0;text-align:left">
            <span style="font-weight:700;color:var(--text);text-decoration:underline">${doc.name}</span> <span class="tag tag-indigo" style="font-size:10px">${doc.type}</span><br>
            <span style="font-size:11px;color:var(--text3)">${new Date(doc.createdAt).toLocaleDateString('en-IN')}</span>
          </button>
          <div class="action-btns">
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); App.sharePatientDoc('${doc.id}')" title="Share via WhatsApp" style="display:flex;align-items:center;justify-content:center;padding:4px">
              <svg style="color:#25d366" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12.031 0C5.385 0 .013 5.372.013 12.018c0 2.12.553 4.195 1.597 6.015L0 24l6.113-1.605c1.763.957 3.738 1.463 5.918 1.463h.005C18.672 23.858 24 18.486 24 11.84 24 5.216 18.653 0 12.031 0zm0 21.84c-1.782 0-3.535-.478-5.064-1.385l-.363-.215-3.766.988.997-3.673-.236-.375c-.997-1.585-1.523-3.415-1.523-5.322 0-5.541 4.512-10.053 10.06-10.053 5.546 0 10.057 4.512 10.057 10.057 0 5.545-4.511 10.057-10.057 10.057zm5.518-7.538c-.302-.152-1.788-.883-2.065-.984-.277-.101-.478-.152-.68.151-.201.303-.781.984-.958 1.185-.176.202-.353.227-.655.076-1.32-.613-2.42-1.282-3.373-2.527-.246-.321-.137-.478.014-.629.136-.136.303-.353.453-.53.152-.176.202-.303.303-.504.101-.202.05-.379-.025-.53-.076-.152-.68-1.64-.932-2.247-.246-.593-.497-.511-.68-.521-.176-.01-.378-.01-.58-.01-.202 0-.53.076-.807.379-.277.303-1.059 1.034-1.059 2.522 0 1.488 1.084 2.926 1.235 3.128.151.202 2.128 3.254 5.155 4.558 1.761.758 2.651.815 3.447.669.878-.163 1.788-.731 2.04-1.437.252-.706.252-1.312.176-1.438-.075-.126-.277-.202-.579-.353z"/></svg>
            </button>
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); App.openPatientDoc('${documentUrl}')" title="Open in new tab" style="display:flex;align-items:center;justify-content:center;padding:4px">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
            <button class="btn btn-red btn-sm" onclick="event.stopPropagation(); App.deletePatientDoc('${doc.id}')" title="Delete" style="display:flex;align-items:center;justify-content:center;padding:4px">
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

  getPatientDocUrl(doc) {
    if (!doc?.url) return '';
    if (!doc.url.startsWith('/')) return doc.url;

    const backendBaseUrl = this.getBackendBaseUrl();
    return `${backendBaseUrl}${doc.url}`;
  },

  getBackendBaseUrl() {
    if (API && /^https?:\/\//i.test(API)) {
      return API.replace(/\/api\/?$/, '');
    }

    const { protocol, hostname, port, origin } = window.location;
    if (port === '4000' || port === '4001') {
      return origin;
    }

    const backendPort = port === '5174' ? '4000' : '4001';
    return `${protocol}//${hostname}:${backendPort}`;
  },

  openPatientDoc(url) {
    if (!url) {
      this.toast('Document URL not found', 'error');
      return;
    }

    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
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

  renderInventory() {
    const table = document.getElementById('inventoryTable');
    const summary = document.getElementById('inventorySummary');
    if (!table || !summary) return;

    summary.innerHTML = `
      <div class="report-stat-card">
        <div class="stat-label">Total Items</div>
        <div class="stat-value">${this.inventory.length}</div>
      </div>
      <div class="report-stat-card">
        <div class="stat-label">Total Units</div>
        <div class="stat-value">${this.inventory.reduce((acc, item) => acc + (item.quantity || 0), 0)}</div>
      </div>
      <div class="report-stat-card">
        <div class="stat-label">Low Stock Alerts</div>
        <div class="stat-value" style="color:var(--error)">${this.inventory.filter(i => (i.quantity || 0) <= (i.minStockLevel || 5)).length}</div>
      </div>
      <div class="report-stat-card">
        <div class="stat-label">Total Value</div>
        <div class="stat-value">₹${this.inventory.reduce((acc, item) => acc + ((item.quantity || 0) * (item.purchasePrice || 0)), 0).toLocaleString()}</div>
      </div>
    `;

    table.innerHTML = this.inventory.map(item => {
      const isLowStock = (item.quantity || 0) <= (item.minStockLevel || 5);
      return `
        <tr>
          <td>
            <div class="item-name-cell">
              <strong>${item.itemName}</strong>
              <span class="item-sku">${item.sku || 'N/A'}</span>
            </div>
          </td>
          <td><span class="badge-category">${item.category || 'General'}</span></td>
          <td>
            <div class="stock-cell">
              <span class="stock-qty ${isLowStock ? 'text-error' : ''}">${item.quantity} ${item.unit || 'pcs'}</span>
              ${isLowStock ? '<span class="badge-low">Low Stock</span>' : ''}
            </div>
          </td>
          <td>${item.reorderLevel || '-'}</td>
          <td>₹${item.sellingPrice || '0'}</td>
          <td>
            <div class="location-cell">
              <span class="loc-area">${item.storageArea || '-'}</span>
              <span class="loc-path">${[item.rackShelf, item.row, item.col].filter(Boolean).join(' > ')}</span>
            </div>
          </td>
          <td>
            <div class="table-actions">
              <button class="btn-icon" onclick="App.editInventoryItem('${item.id}')" title="Edit">✎</button>
              <button class="btn-icon text-error" onclick="App.deleteInventoryItem('${item.id}')" title="Delete">✕</button>
            </div>
          </td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text3)">No inventory items found. Click "+ Add Inventory" to get started.</td></tr>';
  },

  updateInventoryLocationPreview() {
    const area = document.getElementById('inv-area')?.value || '';
    const rack = document.getElementById('inv-rack')?.value || '';
    const row = document.getElementById('inv-row')?.value || '';
    const col = document.getElementById('inv-col')?.value || '';
    const box = document.getElementById('inv-box')?.value || '';
    const slot = document.getElementById('inv-slot')?.value || '';
    
    const preview = document.getElementById('inv-location-preview');
    if (!preview) return;

    const path = [area, rack, row, col, box, slot].filter(s => s.trim() !== '').join(' ➔ ');
    preview.innerHTML = path ? `<span>${path}</span>` : '<span>Not set</span>';
  },

  switchInventoryTab(tab) {
    document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.inventory-tab-content').forEach(c => c.classList.remove('active'));
    
    document.getElementById(`tab-inv-${tab}`)?.classList.add('active');
    document.getElementById(`inv-tab-${tab}`)?.classList.add('active');
  },

  async addInventoryItem() {
    const payload = {
      itemName: document.getElementById('inv-name').value.trim(),
      sku: document.getElementById('inv-sku').value.trim(),
      medicineType: document.getElementById('inv-medicine-type').value,
      category: document.getElementById('inv-category').value.trim(),
      unit: document.getElementById('inv-unit').value,
      strength: document.getElementById('inv-strength').value.trim(),
      barcode: document.getElementById('inv-barcode').value.trim(),
      storageType: document.getElementById('inv-storage-type').value,
      prescriptionRequired: document.getElementById('inv-rx-required').checked,
      gstPercentage: parseFloat(document.getElementById('inv-gst').value) || 0,
      purchasePrice: parseFloat(document.getElementById('inv-purchase-price').value) || 0,
      sellingPrice: parseFloat(document.getElementById('inv-selling-price').value) || 0,
      minStockLevel: parseInt(document.getElementById('inv-min-stock').value) || 0,
      reorderLevel: parseInt(document.getElementById('inv-reorder').value) || 0,
      storageArea: document.getElementById('inv-area').value.trim(),
      rackShelf: document.getElementById('inv-rack').value.trim(),
      row: document.getElementById('inv-row').value.trim(),
      col: document.getElementById('inv-col').value.trim(),
      boxNumber: document.getElementById('inv-box').value.trim(),
      slotPosition: document.getElementById('inv-slot').value.trim(),
      isActive: document.getElementById('inv-is-active').checked,
      notes: document.getElementById('inv-notes').value.trim(),
      quantity: parseInt(document.getElementById('inv-quantity').value) || 0,
      vendorName: document.getElementById('inv-vendor').value.trim(),
      batchNumber: document.getElementById('inv-batch-no').value.trim(),
      expiryDate: document.getElementById('inv-expiry').value
    };

    if (!payload.itemName) return this.toast('Item name is required', 'error');

    try {
      await this.api('/api/inventory', 'POST', payload);
      this.toast('Inventory item added successfully', 'success');
      this.closeModal('inventoryModal');
      this.loadInventory();
    } catch (e) {
      this.toast('Failed to save item: ' + e.message, 'error');
    }
  },

  async deleteInventoryItem(id) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await this.api(`/api/inventory/${id}`, 'DELETE');
      this.toast('Item deleted', 'success');
      this.loadInventory();
    } catch (e) { this.toast('Failed to delete: ' + e.message, 'error'); }
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
      const error = new Error(data?.message || data?.error || `HTTP ${res.status}`);
      if (data?.verification) error.verification = data.verification;
      throw error;
    }

    return data;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
  document.addEventListener('click', (event) => App.closeDoctorDaysDropdownIfOutside(event));
});
