/**
 * Slots Module
 * Manages Slot Listing, Filters, Real-Time Availability & Parking Bay Visualizer
 */

const SlotsModule = {
  currentLocationId: null,
  locationsList: [],
  allSlots: [],

  async init() {
    await this.loadLocationDropdown();
    this.setupEventListeners();
  },

  setupEventListeners() {
    const locSelect = document.getElementById('slotLocationFilter');
    if (locSelect) {
      locSelect.addEventListener('change', (e) => {
        this.currentLocationId = e.target.value;
        this.loadSlotsForLocation(this.currentLocationId);
      });
    }

    const typeFilter = document.getElementById('slotVehicleTypeFilter');
    const statusFilter = document.getElementById('slotStatusFilter');
    const floorFilter = document.getElementById('slotFloorFilter');

    [typeFilter, statusFilter, floorFilter].forEach((el) => {
      if (el) {
        el.addEventListener('change', () => this.filterAndRenderSlots());
      }
    });
  },

  async loadLocationDropdown() {
    try {
      const response = await API.locations.getAll();
      if (!response.success || !response.data) return;

      this.locationsList = response.data;
      const select = document.getElementById('slotLocationFilter');
      if (!select) return;

      select.innerHTML = this.locationsList
        .map(
          (loc) =>
            `<option value="${loc._id}">${loc.name} (${loc.availableSlots} free / ${loc.totalSlots})</option>`
        )
        .join('');

      if (this.locationsList.length > 0) {
        if (!this.currentLocationId) {
          this.currentLocationId = this.locationsList[0]._id;
        }
        select.value = this.currentLocationId;
        await this.loadSlotsForLocation(this.currentLocationId);
      }
    } catch (error) {
      console.error('Failed to load locations dropdown:', error);
    }
  },

  async loadSlotsForLocation(locationId) {
    if (!locationId) return;
    this.currentLocationId = locationId;

    const grid = document.getElementById('slotsGrid');
    if (grid) {
      grid.innerHTML = `
        <div class="col-span-full py-12 text-center text-gray-400">
          <i class="fas fa-spinner fa-spin text-3xl mb-3 text-blue-500"></i>
          <p>Loading smart parking slots...</p>
        </div>
      `;
    }

    try {
      const [locResponse, slotsResponse] = await Promise.all([
        API.locations.getById(locationId),
        API.slots.getAll({ location: locationId }),
      ]);

      if (locResponse.success) {
        this.renderLocationInfo(locResponse.data);
      }

      if (slotsResponse.success) {
        this.allSlots = slotsResponse.data;
        this.updateFloorFilterOptions();
        this.filterAndRenderSlots();
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      if (grid) {
        grid.innerHTML = `
          <div class="col-span-full py-8 text-center text-red-400">
            <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
            <p>Failed to load parking slots. Please retry.</p>
          </div>
        `;
      }
    }
  },

  renderLocationInfo(loc) {
    const banner = document.getElementById('locationInfoBanner');
    if (!banner) return;

    banner.innerHTML = `
      <div class="glass-card rounded-xl p-5 border border-gray-700/60 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-3">
            <h3 class="text-xl font-bold text-white">${loc.name}</h3>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-900/60 text-blue-300 border border-blue-700">
              ${loc.code}
            </span>
          </div>
          <p class="text-sm text-gray-400 mt-1">
            <i class="fas fa-map-marker-alt text-red-400 mr-1.5"></i> ${loc.address}, ${loc.city}
            <span class="mx-2">•</span>
            <i class="fas fa-clock text-blue-400 mr-1.5"></i> ${loc.operatingHours || '24/7 Open'}
          </p>
          <div class="flex flex-wrap gap-1.5 mt-2.5">
            ${(loc.amenities || [])
              .map(
                (a) =>
                  `<span class="text-xs px-2 py-0.5 bg-gray-800 text-gray-300 rounded border border-gray-700"><i class="fas fa-check text-green-400 mr-1"></i>${a}</span>`
              )
              .join('')}
          </div>
        </div>

        <div class="flex items-center gap-4 bg-gray-900/80 p-3.5 rounded-xl border border-gray-700">
          <div class="text-center px-3 border-r border-gray-700">
            <span class="text-xs text-gray-400 uppercase tracking-wider block">Available</span>
            <span class="text-2xl font-extrabold text-green-400">${loc.availableSlots || 0}</span>
          </div>
          <div class="text-center px-3 border-r border-gray-700">
            <span class="text-xs text-gray-400 uppercase tracking-wider block">Occupied</span>
            <span class="text-2xl font-extrabold text-red-400">${loc.occupiedSlots || 0}</span>
          </div>
          <div class="text-center px-3">
            <span class="text-xs text-gray-400 uppercase tracking-wider block">Base Rate</span>
            <span class="text-2xl font-extrabold text-blue-400">₹${loc.baseRate}/hr</span>
          </div>
        </div>
      </div>
    `;
  },

  updateFloorFilterOptions() {
    const floorSelect = document.getElementById('slotFloorFilter');
    if (!floorSelect) return;

    const floors = Array.from(new Set(this.allSlots.map((s) => s.floor))).sort();
    const currentVal = floorSelect.value;

    floorSelect.innerHTML =
      '<option value="">All Floors / Levels</option>' +
      floors.map((f) => `<option value="${f}">${f}</option>`).join('');

    if (floors.includes(currentVal)) {
      floorSelect.value = currentVal;
    }
  },

  filterAndRenderSlots() {
    const typeFilter = document.getElementById('slotVehicleTypeFilter')?.value || '';
    const statusFilter = document.getElementById('slotStatusFilter')?.value || '';
    const floorFilter = document.getElementById('slotFloorFilter')?.value || '';

    let filtered = [...this.allSlots];

    if (typeFilter) {
      filtered = filtered.filter((s) => s.vehicleType === typeFilter);
    }
    if (statusFilter) {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }
    if (floorFilter) {
      filtered = filtered.filter((s) => s.floor === floorFilter);
    }

    const grid = document.getElementById('slotsGrid');
    if (!grid) return;

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-16 text-center text-gray-400">
          <i class="fas fa-car-tunnel text-4xl mb-3 text-gray-600"></i>
          <h4 class="text-lg font-semibold text-gray-300">No Parking Slots Match Your Filter</h4>
          <p class="text-sm mt-1">Try clearing or switching the vehicle type or status filters.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map((slot) => this.renderSlotCard(slot)).join('');
  },

  renderSlotCard(slot) {
    const vehicleIcon = {
      car: 'fa-car',
      bike: 'fa-motorcycle',
      suv: 'fa-truck-pickup',
      ev: 'fa-bolt text-yellow-400',
      accessible: 'fa-wheelchair text-blue-400',
    }[slot.vehicleType] || 'fa-car';

    const statusBadge = {
      available: {
        bg: 'bg-emerald-950/80 border-emerald-600 text-emerald-400',
        text: 'AVAILABLE',
        icon: 'fa-circle-check',
        actionText: 'Book Slot',
      },
      reserved: {
        bg: 'bg-amber-950/80 border-amber-600 text-amber-400',
        text: 'RESERVED',
        icon: 'fa-clock',
        actionText: 'Reserved',
      },
      occupied: {
        bg: 'bg-rose-950/80 border-rose-600 text-rose-400',
        text: 'OCCUPIED',
        icon: 'fa-ban',
        actionText: 'Occupied',
      },
      maintenance: {
        bg: 'bg-slate-800 border-slate-600 text-slate-400',
        text: 'MAINTENANCE',
        icon: 'fa-wrench',
        actionText: 'Disabled',
      },
    }[slot.status] || {
      bg: 'bg-gray-800 text-gray-300',
      text: slot.status,
      icon: 'fa-circle',
      actionText: 'Unavailable',
    };

    const isAvailable = slot.status === 'available';
    const clickAttr = isAvailable
      ? `onclick="BookingsModule.openBookingModal('${slot._id}')"`
      : '';

    return `
      <div 
        ${clickAttr}
        class="parking-slot-card status-${slot.status} p-4 rounded-xl shadow border border-gray-700/60 transition-all flex flex-col justify-between h-48 select-none"
        title="${isAvailable ? 'Click to book this parking slot' : `Slot is currently ${slot.status}`}"
      >
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 rounded-lg bg-gray-900/80 border border-gray-700 flex items-center justify-center text-lg text-blue-400">
              <i class="fas ${vehicleIcon}"></i>
            </div>
            <div>
              <span class="text-xs uppercase font-medium text-gray-400 tracking-wider">${slot.floor}</span>
              <h4 class="text-lg font-black text-white leading-tight font-mono">${slot.slotNumber}</h4>
            </div>
          </div>

          <span class="px-2 py-0.5 rounded text-[11px] font-bold border ${statusBadge.bg} flex items-center gap-1">
            <i class="fas ${statusBadge.icon}"></i> ${statusBadge.text}
          </span>
        </div>

        <!-- Middle indicators -->
        <div class="my-2 flex flex-wrap gap-1.5 items-center">
          ${
            slot.hasCharging
              ? `<span class="text-[11px] px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800 flex items-center gap-1"><i class="fas fa-charging-station text-yellow-400"></i> EV Charger</span>`
              : ''
          }
          ${
            slot.isAccessible
              ? `<span class="text-[11px] px-2 py-0.5 rounded bg-blue-950/70 text-blue-300 border border-blue-800 flex items-center gap-1"><i class="fas fa-wheelchair"></i> Priority</span>`
              : ''
          }
          <span class="text-[11px] px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700 capitalize">
            ${slot.vehicleType}
          </span>
        </div>

        <!-- Footer / Rate & Action -->
        <div class="pt-2 border-t border-gray-800 flex items-center justify-between mt-auto">
          <div>
            <span class="text-[11px] text-gray-400 block leading-none">Rate</span>
            <span class="text-sm font-bold text-emerald-400">₹${slot.hourlyRate}<span class="text-xs font-normal text-gray-400">/hr</span></span>
          </div>

          ${
            isAvailable
              ? `<button class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow">
                  <i class="fas fa-bolt"></i> ${statusBadge.actionText}
                </button>`
              : `<span class="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <i class="fas fa-lock"></i> Locked
                </span>`
          }
        </div>
      </div>
    `;
  },

  selectLocationAndNavigate(locationId) {
    this.currentLocationId = locationId;
    App.switchTab('slotsTab');
    const select = document.getElementById('slotLocationFilter');
    if (select) {
      select.value = locationId;
    }
    this.loadSlotsForLocation(locationId);
  },
};

window.SlotsModule = SlotsModule;
