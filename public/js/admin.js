/**
 * Admin Module
 * Provides Full Administration, KPI Analytics, Slot & Location CRUD, and Sensor Simulation
 */

const AdminModule = {
  stats: null,
  allSlots: [],
  allLocations: [],

  async init() {
    this.setupListeners();
  },

  setupListeners() {
    const locForm = document.getElementById('addLocationForm');
    if (locForm) {
      locForm.addEventListener('submit', (e) => this.handleAddLocation(e));
    }

    const slotForm = document.getElementById('addSlotForm');
    if (slotForm) {
      slotForm.addEventListener('submit', (e) => this.handleAddSlot(e));
    }
  },

  async loadAdminDashboard() {
    const container = document.getElementById('adminPanelContainer');
    if (!container) return;

    const user = API.getCurrentUser();
    if (!user || user.role !== 'admin') {
      container.innerHTML = `
        <div class="p-10 text-center glass-card rounded-2xl border border-red-800/60 max-w-lg mx-auto">
          <div class="w-16 h-16 rounded-full bg-red-950/80 border border-red-700 flex items-center justify-center mx-auto mb-4 text-2xl text-red-400">
            <i class="fas fa-shield-alt"></i>
          </div>
          <h3 class="text-xl font-extrabold text-white">Admin Privileges Required</h3>
          <p class="text-sm text-gray-400 mt-2 mb-6">
            The Admin Panel is protected by JWT role-based access control. You must be authenticated as an Administrator to manage parking slots and view analytics.
          </p>
          <div class="flex flex-col gap-2.5">
            <button 
              onclick="App.quickDemoLogin('admin@smartparking.com', 'admin123')" 
              class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition shadow flex items-center justify-center gap-2">
              <i class="fas fa-user-shield"></i> Log In as Demo Admin (1-Click)
            </button>
            <button 
              onclick="App.openAuthModal('login')" 
              class="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-sm rounded-xl border border-gray-700">
              Log In with Existing Credentials
            </button>
          </div>
        </div>
      `;
      return;
    }

    // Render Admin Shell if authenticated
    await this.renderAdminShell();
    await this.refreshAdminStats();
    await this.loadAdminLocations();
    await this.loadAdminSlots();
    await this.loadAdminBookings();
  },

  async renderAdminShell() {
    const container = document.getElementById('adminPanelContainer');
    container.innerHTML = `
      <!-- KPI Metrics Cards -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6" id="adminKpis">
        <div class="glass-card p-4 rounded-xl border border-gray-800 text-center">
          <span class="text-xs text-gray-400 uppercase font-semibold">Total Revenue</span>
          <h3 class="text-2xl font-black text-emerald-400 mt-1" id="kpiRevenue">₹0</h3>
        </div>
        <div class="glass-card p-4 rounded-xl border border-gray-800 text-center">
          <span class="text-xs text-gray-400 uppercase font-semibold">Occupancy</span>
          <h3 class="text-2xl font-black text-amber-400 mt-1" id="kpiOccupancy">0%</h3>
        </div>
        <div class="glass-card p-4 rounded-xl border border-gray-800 text-center">
          <span class="text-xs text-gray-400 uppercase font-semibold">Total Slots</span>
          <h3 class="text-2xl font-black text-blue-400 mt-1" id="kpiTotalSlots">0</h3>
        </div>
        <div class="glass-card p-4 rounded-xl border border-gray-800 text-center">
          <span class="text-xs text-gray-400 uppercase font-semibold">Available</span>
          <h3 class="text-2xl font-black text-green-400 mt-1" id="kpiAvailable">0</h3>
        </div>
        <div class="glass-card p-4 rounded-xl border border-gray-800 text-center">
          <span class="text-xs text-gray-400 uppercase font-semibold">Occupied</span>
          <h3 class="text-2xl font-black text-red-400 mt-1" id="kpiOccupied">0</h3>
        </div>
        <div class="glass-card p-4 rounded-xl border border-gray-800 text-center">
          <span class="text-xs text-gray-400 uppercase font-semibold">Total Bookings</span>
          <h3 class="text-2xl font-black text-purple-400 mt-1" id="kpiBookings">0</h3>
        </div>
      </div>

      <!-- Action Bar -->
      <div class="flex flex-wrap items-center justify-between gap-3 mb-6 bg-gray-900/60 p-4 rounded-xl border border-gray-800">
        <div class="flex items-center gap-2">
          <button onclick="AdminModule.switchAdminSubtab('adminSlotsTab')" id="btnTabSlots" class="px-4 py-2 rounded-lg font-bold text-xs bg-blue-600 text-white shadow">
            <i class="fas fa-th mr-1.5"></i> Manage Slots (CRUD)
          </button>
          <button onclick="AdminModule.switchAdminSubtab('adminLocationsTab')" id="btnTabLocations" class="px-4 py-2 rounded-lg font-bold text-xs bg-gray-800 text-gray-300 hover:bg-gray-700">
            <i class="fas fa-map-marked-alt mr-1.5"></i> Parking Locations
          </button>
          <button onclick="AdminModule.switchAdminSubtab('adminBookingsTab')" id="btnTabBookings" class="px-4 py-2 rounded-lg font-bold text-xs bg-gray-800 text-gray-300 hover:bg-gray-700">
            <i class="fas fa-clipboard-list mr-1.5"></i> All Bookings
          </button>
          <button onclick="AdminModule.switchAdminSubtab('adminSimulatorTab')" id="btnTabSimulator" class="px-4 py-2 rounded-lg font-bold text-xs bg-gray-800 text-gray-300 hover:bg-gray-700">
            <i class="fas fa-microchip mr-1.5 text-yellow-400"></i> IoT Sensor Simulator
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button onclick="AdminModule.openAddSlotModal()" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow">
            <i class="fas fa-plus mr-1"></i> Add Slot (POST)
          </button>
          <button onclick="AdminModule.openAddLocationModal()" class="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow">
            <i class="fas fa-plus mr-1"></i> Add Location (POST)
          </button>
        </div>
      </div>

      <!-- Subtab 1: Manage Slots -->
      <div id="adminSlotsTab" class="admin-subtab">
        <div class="glass-card rounded-xl border border-gray-800 overflow-hidden">
          <div class="p-4 border-b border-gray-800 flex items-center justify-between">
            <h4 class="font-bold text-white text-base">Parking Slots Inventory</h4>
            <span class="text-xs text-gray-400">Toggle slot status (PUT) or delete (DELETE)</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-gray-300">
              <thead class="bg-gray-900/90 text-xs uppercase text-gray-400 font-semibold border-b border-gray-800">
                <tr>
                  <th class="p-3">Slot #</th>
                  <th class="p-3">Location</th>
                  <th class="p-3">Floor</th>
                  <th class="p-3">Type</th>
                  <th class="p-3">Rate</th>
                  <th class="p-3">Status</th>
                  <th class="p-3">Sensor</th>
                  <th class="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody id="adminSlotsTableBody" class="divide-y divide-gray-800/60">
                <tr><td colspan="8" class="p-6 text-center text-gray-500">Loading slots...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Subtab 2: Manage Locations -->
      <div id="adminLocationsTab" class="admin-subtab hidden">
        <div class="glass-card rounded-xl border border-gray-800 overflow-hidden">
          <div class="p-4 border-b border-gray-800 flex items-center justify-between">
            <h4 class="font-bold text-white text-base">Parking Facilities</h4>
            <span class="text-xs text-gray-400">Locations mapped on OpenStreetMap</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-gray-300">
              <thead class="bg-gray-900/90 text-xs uppercase text-gray-400 font-semibold border-b border-gray-800">
                <tr>
                  <th class="p-3">Code</th>
                  <th class="p-3">Name</th>
                  <th class="p-3">Address & City</th>
                  <th class="p-3">Coordinates (Lat, Lng)</th>
                  <th class="p-3">Capacity</th>
                  <th class="p-3">Rate/hr</th>
                  <th class="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody id="adminLocationsTableBody" class="divide-y divide-gray-800/60">
                <tr><td colspan="7" class="p-6 text-center text-gray-500">Loading locations...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Subtab 3: All Bookings -->
      <div id="adminBookingsTab" class="admin-subtab hidden">
        <div class="glass-card rounded-xl border border-gray-800 overflow-hidden">
          <div class="p-4 border-b border-gray-800 flex items-center justify-between">
            <h4 class="font-bold text-white text-base">All Driver Bookings</h4>
            <span class="text-xs text-gray-400">System-wide reservation registry</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-gray-300">
              <thead class="bg-gray-900/90 text-xs uppercase text-gray-400 font-semibold border-b border-gray-800">
                <tr>
                  <th class="p-3">Booking ID</th>
                  <th class="p-3">User & Driver</th>
                  <th class="p-3">Vehicle</th>
                  <th class="p-3">Slot & Location</th>
                  <th class="p-3">Amount</th>
                  <th class="p-3">Status</th>
                  <th class="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody id="adminBookingsTableBody" class="divide-y divide-gray-800/60">
                <tr><td colspan="7" class="p-6 text-center text-gray-500">Loading bookings...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Subtab 4: IoT Hardware Sensor Simulator -->
      <div id="adminSimulatorTab" class="admin-subtab hidden">
        <div class="glass-card p-6 rounded-xl border border-gray-800 max-w-2xl mx-auto">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-lg bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 flex items-center justify-center text-xl">
              <i class="fas fa-microchip"></i>
            </div>
            <div>
              <h4 class="font-bold text-white text-base">IoT Ultrasonic Parking Sensor Simulator</h4>
              <p class="text-xs text-gray-400">Simulate physical embedded ground sensors detecting vehicles in real-time.</p>
            </div>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-gray-300 uppercase mb-1">Select Target Parking Slot</label>
              <select id="sensorSlotSelect" class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
                <option value="">Select a slot to simulate...</option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-4 pt-2">
              <button onclick="AdminModule.triggerSensor('car_arrived')" class="p-4 rounded-xl bg-red-950/70 hover:bg-red-900/80 border border-red-700 text-red-200 text-left transition">
                <i class="fas fa-car-side text-2xl text-red-400 mb-2 block"></i>
                <div class="font-bold text-sm">Car Arrived & Parked</div>
                <div class="text-[11px] text-gray-400">Sensor detects metal obstruction -> Marks slot OCCUPIED</div>
              </button>

              <button onclick="AdminModule.triggerSensor('car_departed')" class="p-4 rounded-xl bg-green-950/70 hover:bg-green-900/80 border border-green-700 text-green-200 text-left transition">
                <i class="fas fa-sign-out-alt text-2xl text-green-400 mb-2 block"></i>
                <div class="font-bold text-sm">Car Departed / Left</div>
                <div class="text-[11px] text-gray-400">Ultrasonic beam clear -> Frees slot to AVAILABLE</div>
              </button>
            </div>

            <div id="sensorLog" class="p-3 bg-black/60 rounded-lg font-mono text-xs text-green-400 border border-gray-800 h-24 overflow-y-auto">
              [IoT Sensor Daemon Ready. Awaiting sensor trigger...]
            </div>
          </div>
        </div>
      </div>
    `;
  },

  switchAdminSubtab(tabId) {
    document.querySelectorAll('.admin-subtab').forEach((el) => el.classList.add('hidden'));
    const target = document.getElementById(tabId);
    if (target) target.classList.remove('hidden');

    ['btnTabSlots', 'btnTabLocations', 'btnTabBookings', 'btnTabSimulator'].forEach((b) => {
      const btn = document.getElementById(b);
      if (btn) {
        btn.className = 'px-4 py-2 rounded-lg font-bold text-xs bg-gray-800 text-gray-300 hover:bg-gray-700';
      }
    });

    const activeMap = {
      adminSlotsTab: 'btnTabSlots',
      adminLocationsTab: 'btnTabLocations',
      adminBookingsTab: 'btnTabBookings',
      adminSimulatorTab: 'btnTabSimulator',
    };

    const activeBtn = document.getElementById(activeMap[tabId]);
    if (activeBtn) {
      activeBtn.className = 'px-4 py-2 rounded-lg font-bold text-xs bg-blue-600 text-white shadow';
    }
  },

  async refreshAdminStats() {
    try {
      const response = await API.admin.getStats();
      if (!response.success || !response.stats) return;

      const s = response.stats;
      document.getElementById('kpiRevenue').innerText = `₹${s.totalRevenue}`;
      document.getElementById('kpiOccupancy').innerText = `${s.occupancyRate}%`;
      document.getElementById('kpiTotalSlots').innerText = s.totalSlots;
      document.getElementById('kpiAvailable').innerText = s.availableSlots;
      document.getElementById('kpiOccupied').innerText = s.occupiedSlots;
      document.getElementById('kpiBookings').innerText = s.totalBookings;
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    }
  },

  async loadAdminSlots() {
    try {
      const response = await API.slots.getAll();
      if (!response.success || !response.data) return;

      this.allSlots = response.data;
      const tbody = document.getElementById('adminSlotsTableBody');
      const sensorSelect = document.getElementById('sensorSlotSelect');

      if (sensorSelect) {
        sensorSelect.innerHTML =
          '<option value="">Select a slot to simulate...</option>' +
          this.allSlots
            .map(
              (s) =>
                `<option value="${s._id}">${s.slotNumber} - ${s.location?.name || 'Lot'} [Current: ${s.status}]</option>`
            )
            .join('');
      }

      if (!tbody) return;

      tbody.innerHTML = this.allSlots
        .map((s) => {
          const statusColors = {
            available: 'text-green-400 bg-green-950/60 border-green-800',
            reserved: 'text-amber-400 bg-amber-950/60 border-amber-800',
            occupied: 'text-red-400 bg-red-950/60 border-red-800',
            maintenance: 'text-gray-400 bg-gray-800 border-gray-700',
          }[s.status] || 'text-gray-300';

          return `
            <tr class="hover:bg-gray-800/40">
              <td class="p-3 font-mono font-bold text-white">${s.slotNumber}</td>
              <td class="p-3 text-xs text-gray-300">${s.location?.name || 'N/A'}</td>
              <td class="p-3 text-xs text-gray-400">${s.floor}</td>
              <td class="p-3 text-xs capitalize text-blue-300">${s.vehicleType}</td>
              <td class="p-3 text-xs font-bold text-emerald-400">₹${s.hourlyRate}</td>
              <td class="p-3">
                <span class="px-2 py-0.5 rounded text-[11px] font-bold border ${statusColors} uppercase">
                  ${s.status}
                </span>
              </td>
              <td class="p-3 text-xs font-mono">
                ${
                  s.sensorStatus === 'detected'
                    ? '<span class="text-red-400"><i class="fas fa-circle text-[8px] mr-1"></i>Detected</span>'
                    : '<span class="text-green-400"><i class="fas fa-circle text-[8px] mr-1"></i>Empty</span>'
                }
              </td>
              <td class="p-3 text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <button 
                    onclick="AdminModule.toggleSlot('${s._id}')" 
                    title="Toggle slot status (PUT /api/slots/:id/toggle)"
                    class="px-2.5 py-1 bg-amber-600/30 hover:bg-amber-600/60 text-amber-300 border border-amber-700 rounded text-xs font-semibold">
                    <i class="fas fa-sync-alt mr-1"></i> Toggle (PUT)
                  </button>
                  <button 
                    onclick="AdminModule.deleteSlot('${s._id}')" 
                    title="Delete slot (DELETE /api/slots/:id)"
                    class="px-2 py-1 bg-rose-900/40 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded text-xs">
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </div>
              </td>
            </tr>
          `;
        })
        .join('');
    } catch (error) {
      console.error('Failed to load slots in admin:', error);
    }
  },

  async loadAdminLocations() {
    try {
      const response = await API.locations.getAll();
      if (!response.success || !response.data) return;

      this.allLocations = response.data;
      const tbody = document.getElementById('adminLocationsTableBody');
      if (!tbody) return;

      tbody.innerHTML = this.allLocations
        .map((loc) => {
          return `
            <tr class="hover:bg-gray-800/40">
              <td class="p-3 font-mono font-bold text-blue-400">${loc.code}</td>
              <td class="p-3 font-bold text-white text-sm">${loc.name}</td>
              <td class="p-3 text-xs text-gray-400">${loc.address}, ${loc.city}</td>
              <td class="p-3 text-xs font-mono text-gray-400">${loc.coordinates.lat.toFixed(4)}, ${loc.coordinates.lng.toFixed(4)}</td>
              <td class="p-3 text-xs font-semibold text-gray-200">${loc.availableSlots} free / ${loc.totalSlots} total</td>
              <td class="p-3 text-xs font-bold text-emerald-400">₹${loc.baseRate}</td>
              <td class="p-3 text-right">
                <button 
                  onclick="AdminModule.deleteLocation('${loc._id}')" 
                  title="Delete Location (DELETE /api/locations/:id)"
                  class="px-2.5 py-1 bg-rose-900/40 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded text-xs font-semibold">
                  <i class="fas fa-trash-alt mr-1"></i> Delete
                </button>
              </td>
            </tr>
          `;
        })
        .join('');
    } catch (error) {
      console.error('Failed to load locations in admin:', error);
    }
  },

  async loadAdminBookings() {
    try {
      const response = await API.bookings.getAllAdmin();
      if (!response.success || !response.data) return;

      const bookings = response.data;
      const tbody = document.getElementById('adminBookingsTableBody');
      if (!tbody) return;

      tbody.innerHTML = bookings
        .map((b) => {
          const statusBadges = {
            confirmed: 'bg-blue-900/60 text-blue-300 border-blue-700',
            checked_in: 'bg-emerald-900/60 text-emerald-300 border-emerald-700',
            completed: 'bg-gray-800 text-gray-400 border-gray-700',
            cancelled: 'bg-rose-900/60 text-rose-300 border-rose-700',
          }[b.status] || 'bg-gray-800 text-gray-300';

          return `
            <tr class="hover:bg-gray-800/40">
              <td class="p-3 font-mono font-bold text-blue-300">${b.bookingCode}</td>
              <td class="p-3 text-xs text-gray-200">
                <strong>${b.driverName}</strong>
                <span class="block text-gray-400 text-[11px]">${b.driverPhone}</span>
              </td>
              <td class="p-3 font-mono font-bold text-xs text-white">${b.vehicleNumber}</td>
              <td class="p-3 text-xs text-gray-300">
                Slot: <strong class="text-emerald-400 font-mono">${b.slot?.slotNumber || 'N/A'}</strong>
                <span class="block text-gray-400 text-[11px]">${b.location?.name || ''}</span>
              </td>
              <td class="p-3 text-xs font-bold text-emerald-400">₹${b.totalAmount}</td>
              <td class="p-3">
                <span class="px-2 py-0.5 rounded text-[11px] font-bold border ${statusBadges} uppercase">
                  ${b.status}
                </span>
              </td>
              <td class="p-3 text-right">
                ${
                  b.status === 'confirmed' || b.status === 'checked_in'
                    ? `<button 
                        onclick="BookingsModule.cancelBooking('${b._id}')" 
                        class="px-2.5 py-1 bg-rose-900/40 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded text-xs">
                        Cancel (DELETE)
                      </button>`
                    : '<span class="text-xs text-gray-500">—</span>'
                }
              </td>
            </tr>
          `;
        })
        .join('');
    } catch (error) {
      console.error('Failed to load bookings in admin:', error);
    }
  },

  async toggleSlot(slotId) {
    try {
      const response = await API.slots.toggleStatus(slotId);
      if (response.success) {
        App.showToast(`Slot status toggled to: ${response.data.status}`, 'info');
        this.loadAdminSlots();
        this.refreshAdminStats();
      }
    } catch (error) {
      App.showToast(error.message || 'Failed to toggle slot', 'danger');
    }
  },

  async deleteSlot(slotId) {
    if (!confirm('Are you sure you want to delete this parking slot?')) return;
    try {
      const response = await API.slots.delete(slotId);
      if (response.success) {
        App.showToast('Slot deleted successfully!', 'success');
        this.loadAdminSlots();
        this.refreshAdminStats();
      }
    } catch (error) {
      App.showToast(error.message || 'Failed to delete slot', 'danger');
    }
  },

  async deleteLocation(locId) {
    if (!confirm('Are you sure you want to delete this location? ALL slots belonging to this location will also be deleted!')) return;
    try {
      const response = await API.locations.delete(locId);
      if (response.success) {
        App.showToast('Location and associated slots deleted successfully!', 'success');
        this.loadAdminLocations();
        this.loadAdminSlots();
        this.refreshAdminStats();
        MapModule.loadLocationsOnMap();
      }
    } catch (error) {
      App.showToast(error.message || 'Failed to delete location', 'danger');
    }
  },

  openAddSlotModal() {
    const select = document.getElementById('newSlotLocation');
    if (select) {
      select.innerHTML = this.allLocations
        .map((loc) => `<option value="${loc._id}">${loc.name} (${loc.code})</option>`)
        .join('');
    }
    const modal = new bootstrap.Modal(document.getElementById('addSlotModal'));
    modal.show();
  },

  async handleAddSlot(e) {
    e.preventDefault();
    try {
      const payload = {
        slotNumber: document.getElementById('newSlotNumber').value.trim().toUpperCase(),
        location: document.getElementById('newSlotLocation').value,
        floor: document.getElementById('newSlotFloor').value.trim() || 'Ground Level',
        vehicleType: document.getElementById('newSlotType').value,
        hourlyRate: Number(document.getElementById('newSlotRate').value) || 40,
        hasCharging: document.getElementById('newSlotCharging').checked,
        isAccessible: document.getElementById('newSlotAccessible').checked,
      };

      const response = await API.slots.create(payload);
      if (response.success) {
        App.showToast('🎉 Parking Slot Created Successfully (POST /api/slots)!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('addSlotModal')).hide();
        document.getElementById('addSlotForm').reset();
        this.loadAdminSlots();
        this.refreshAdminStats();
      }
    } catch (error) {
      App.showToast(error.message || 'Failed to create slot', 'danger');
    }
  },

  openAddLocationModal() {
    const modal = new bootstrap.Modal(document.getElementById('addLocationModal'));
    modal.show();
  },

  async handleAddLocation(e) {
    e.preventDefault();
    try {
      const payload = {
        name: document.getElementById('newLocName').value.trim(),
        code: document.getElementById('newLocCode').value.trim().toUpperCase(),
        address: document.getElementById('newLocAddress').value.trim(),
        city: document.getElementById('newLocCity').value.trim(),
        coordinates: {
          lat: Number(document.getElementById('newLocLat').value),
          lng: Number(document.getElementById('newLocLng').value),
        },
        baseRate: Number(document.getElementById('newLocRate').value) || 40,
        operatingHours: document.getElementById('newLocHours').value.trim() || '24/7 Open',
        description: document.getElementById('newLocDesc').value.trim(),
      };

      const response = await API.locations.create(payload);
      if (response.success) {
        App.showToast('🎉 Location Created Successfully (POST /api/locations)!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('addLocationModal')).hide();
        document.getElementById('addLocationForm').reset();
        this.loadAdminLocations();
        this.refreshAdminStats();
        MapModule.loadLocationsOnMap();
        SlotsModule.loadLocationDropdown();
      }
    } catch (error) {
      App.showToast(error.message || 'Failed to create location', 'danger');
    }
  },

  async triggerSensor(event) {
    const slotId = document.getElementById('sensorSlotSelect').value;
    if (!slotId) {
      App.showToast('Please select a target parking slot first.', 'warning');
      return;
    }

    try {
      const response = await API.admin.simulateSensor(slotId, event);
      if (response.success) {
        const log = document.getElementById('sensorLog');
        const timestamp = new Date().toLocaleTimeString();
        log.innerHTML = `[${timestamp}] 📡 EVENT: ${event.toUpperCase()} -> Slot ${response.data.slotNumber} is now: ${response.data.status.toUpperCase()}<br/>` + log.innerHTML;
        App.showToast(`Hardware Sensor: ${event.replace('_', ' ').toUpperCase()} recorded!`, 'success');
        this.loadAdminSlots();
        this.refreshAdminStats();
        if (SlotsModule.currentLocationId) {
          SlotsModule.loadSlotsForLocation(SlotsModule.currentLocationId);
        }
      }
    } catch (error) {
      App.showToast(error.message || 'Sensor trigger failed', 'danger');
    }
  },
};

window.AdminModule = AdminModule;
