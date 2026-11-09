/**
 * Main Application Orchestrator
 * Controls Global State, Authentication Modals, Tab Switching & Notification Toasts
 */

const App = {
  activeTab: 'mapTab',

  init() {
    this.updateUserNavState();
    this.setupGlobalListeners();

    // Initialize Submodules
    MapModule.init();
    SlotsModule.init();
    BookingsModule.init();
    AdminModule.init();
    ApiTesterModule.init();

    // Live clock update
    this.startLiveClock();
  },

  startLiveClock() {
    const clockEl = document.getElementById('liveClock');
    if (!clockEl) return;
    const updateTime = () => {
      const now = new Date();
      clockEl.innerText = now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    };
    updateTime();
    setInterval(updateTime, 1000);
  },

  setupGlobalListeners() {
    // Auth Modal Forms
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }
  },

  switchTab(tabId) {
    this.activeTab = tabId;

    // Hide all tab sections
    document.querySelectorAll('.tab-content-section').forEach((sec) => {
      sec.classList.add('hidden');
    });

    // Show target section
    const target = document.getElementById(tabId);
    if (target) {
      target.classList.remove('hidden');
    }

    // Update Nav Buttons
    document.querySelectorAll('.nav-tab-btn').forEach((btn) => {
      btn.classList.remove('bg-blue-600', 'text-white', 'shadow-md');
      btn.classList.add('text-gray-300', 'hover:text-white', 'hover:bg-gray-800');
    });

    const activeNavBtn = document.querySelector(`[data-tab-target="${tabId}"]`);
    if (activeNavBtn) {
      activeNavBtn.classList.remove('text-gray-300', 'hover:text-white', 'hover:bg-gray-800');
      activeNavBtn.classList.add('bg-blue-600', 'text-white', 'shadow-md');
    }

    // Trigger tab-specific refreshes
    if (tabId === 'mapTab') {
      setTimeout(() => MapModule.refreshMap(), 150);
    } else if (tabId === 'slotsTab') {
      if (SlotsModule.currentLocationId) {
        SlotsModule.loadSlotsForLocation(SlotsModule.currentLocationId);
      }
    } else if (tabId === 'bookingsTab') {
      BookingsModule.loadMyBookings();
    } else if (tabId === 'adminTab') {
      AdminModule.loadAdminDashboard();
    } else if (tabId === 'apiTesterTab') {
      ApiTesterModule.renderTesterUI();
    }

    // Scroll to top of content
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  updateUserNavState() {
    const user = API.getCurrentUser();
    const guestNav = document.getElementById('navGuestActions');
    const userNav = document.getElementById('navUserActions');
    const userNameEl = document.getElementById('navUserName');
    const userRoleEl = document.getElementById('navUserRole');
    const adminTabBtn = document.getElementById('navBtnAdmin');

    if (user && API.getToken()) {
      if (guestNav) guestNav.classList.add('hidden');
      if (userNav) userNav.classList.remove('hidden');
      if (userNameEl) userNameEl.innerText = user.name;

      if (userRoleEl) {
        if (user.role === 'admin') {
          userRoleEl.innerText = 'ADMIN';
          userRoleEl.className = 'text-[10px] px-2 py-0.5 rounded font-black bg-purple-900 text-purple-200 border border-purple-700';
        } else {
          userRoleEl.innerText = 'DRIVER';
          userRoleEl.className = 'text-[10px] px-2 py-0.5 rounded font-black bg-blue-900 text-blue-200 border border-blue-700';
        }
      }

      if (adminTabBtn) {
        // Highlight or badge admin button
        if (user.role === 'admin') {
          adminTabBtn.classList.remove('hidden');
        }
      }
    } else {
      if (guestNav) guestNav.classList.remove('hidden');
      if (userNav) userNav.classList.add('hidden');
    }
  },

  openAuthModal(mode = 'login') {
    const loginTab = document.getElementById('tabAuthLogin');
    const registerTab = document.getElementById('tabAuthRegister');
    const loginPane = document.getElementById('authLoginPane');
    const registerPane = document.getElementById('authRegisterPane');

    if (mode === 'login') {
      loginTab.classList.add('border-blue-500', 'text-blue-400');
      registerTab.classList.remove('border-blue-500', 'text-blue-400');
      loginPane.classList.remove('hidden');
      registerPane.classList.add('hidden');
    } else {
      registerTab.classList.add('border-blue-500', 'text-blue-400');
      loginTab.classList.remove('border-blue-500', 'text-blue-400');
      registerPane.classList.remove('hidden');
      loginPane.classList.add('hidden');
    }

    const modal = new bootstrap.Modal(document.getElementById('authModal'));
    modal.show();
  },

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPassword').value;
    const btn = document.getElementById('btnLoginSubmit');

    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-1"></i> Authenticating...`;

    try {
      const response = await API.auth.login(email, pass);
      if (response.success) {
        bootstrap.Modal.getInstance(document.getElementById('authModal')).hide();
        this.showToast(`Welcome back, ${response.user.name}!`, 'success');
        this.updateUserNavState();
        if (this.activeTab === 'adminTab' && response.user.role === 'admin') {
          AdminModule.loadAdminDashboard();
        } else if (this.activeTab === 'bookingsTab') {
          BookingsModule.loadMyBookings();
        }
      }
    } catch (error) {
      this.showToast(error.message || 'Login failed', 'danger');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i class="fas fa-sign-in-alt mr-1"></i> Log In`;
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const phone = document.getElementById('regPhone').value.trim();
    const role = document.getElementById('regRole').value;
    const btn = document.getElementById('btnRegSubmit');

    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-1"></i> Creating Account...`;

    try {
      const response = await API.auth.register({ name, email, password, phone, role });
      if (response.success) {
        bootstrap.Modal.getInstance(document.getElementById('authModal')).hide();
        this.showToast(`🎉 Account created! Logged in as ${response.user.name}`, 'success');
        this.updateUserNavState();
      }
    } catch (error) {
      this.showToast(error.message || 'Registration failed', 'danger');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i class="fas fa-user-plus mr-1"></i> Create Account`;
    }
  },

  async quickDemoLogin(email, password) {
    try {
      const response = await API.auth.login(email, password);
      if (response.success) {
        this.showToast(`Logged in as ${response.user.name} (${response.user.role.toUpperCase()})`, 'success');
        this.updateUserNavState();

        const authModalEl = document.getElementById('authModal');
        const modalInstance = bootstrap.Modal.getInstance(authModalEl);
        if (modalInstance) modalInstance.hide();

        if (response.user.role === 'admin') {
          this.switchTab('adminTab');
        } else {
          this.switchTab('slotsTab');
        }
      }
    } catch (error) {
      this.showToast(error.message || 'Demo login failed', 'danger');
    }
  },

  logout() {
    API.auth.logout();
    this.updateUserNavState();
    this.showToast('You have been logged out.', 'info');
    this.switchTab('mapTab');
  },

  async reseedDemoData() {
    if (!confirm('Reset the database to default seeded data? This will restore original parking slots and sample bookings.')) {
      return;
    }

    try {
      const response = await API.reseed();
      if (response.success) {
        this.showToast('Database successfully re-seeded!', 'success');
        MapModule.loadLocationsOnMap();
        SlotsModule.loadLocationDropdown();
        if (this.activeTab === 'adminTab') {
          AdminModule.loadAdminDashboard();
        }
      }
    } catch (error) {
      this.showToast('Failed to reset database: ' + error.message, 'danger');
    }
  },

  showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const bgMap = {
      success: 'bg-emerald-900/90 border-emerald-600 text-emerald-100',
      danger: 'bg-rose-900/90 border-rose-600 text-rose-100',
      warning: 'bg-amber-900/90 border-amber-600 text-amber-100',
      info: 'bg-blue-900/90 border-blue-600 text-blue-100',
    };

    const iconMap = {
      success: 'fa-check-circle text-emerald-400',
      danger: 'fa-exclamation-circle text-rose-400',
      warning: 'fa-triangle-exclamation text-amber-400',
      info: 'fa-info-circle text-blue-400',
    };

    const toastId = 'toast-' + Date.now();
    const toastHtml = `
      <div id="${toastId}" class="flex items-center gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md mb-2 transition-all transform translate-y-2 opacity-0 ${bgMap[type] || bgMap.info}" role="alert">
        <i class="fas ${iconMap[type] || iconMap.info} text-lg"></i>
        <div class="text-xs font-semibold flex-1">${message}</div>
        <button onclick="document.getElementById('${toastId}').remove()" class="text-white/60 hover:text-white text-xs">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    const toastEl = document.getElementById(toastId);

    setTimeout(() => {
      toastEl.classList.remove('translate-y-2', 'opacity-0');
    }, 20);

    setTimeout(() => {
      if (toastEl) {
        toastEl.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toastEl.remove(), 300);
      }
    }, 4500);
  },
};

window.App = App;

// Run App when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
