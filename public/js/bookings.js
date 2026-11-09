/**
 * Bookings Module
 * Handles Reservation Flow, Pricing Calculation, Ticket Generation & My Bookings Management
 */

const BookingsModule = {
  currentSlot: null,
  myBookings: [],

  init() {
    this.setupModalListeners();
  },

  setupModalListeners() {
    const durationInput = document.getElementById('bookingDuration');
    if (durationInput) {
      durationInput.addEventListener('input', () => this.updateCostCalculation());
    }

    const form = document.getElementById('bookingForm');
    if (form) {
      form.addEventListener('submit', (e) => this.handleBookingSubmit(e));
    }
  },

  async openBookingModal(slotId) {
    if (!API.getToken()) {
      App.showToast('Please log in or select a demo account to book a parking slot.', 'warning');
      App.openAuthModal('login');
      return;
    }

    try {
      const response = await API.slots.getById(slotId);
      if (!response.success || !response.data) {
        App.showToast('Failed to retrieve slot details.', 'danger');
        return;
      }

      this.currentSlot = response.data;
      const user = API.getCurrentUser() || {};

      document.getElementById('bookingSlotId').value = this.currentSlot._id;
      document.getElementById('modalSlotNumber').innerText = this.currentSlot.slotNumber;
      document.getElementById('modalLocationName').innerText = this.currentSlot.location.name;
      document.getElementById('modalFloor').innerText = this.currentSlot.floor;
      document.getElementById('modalVehicleType').innerText = this.currentSlot.vehicleType.toUpperCase();
      document.getElementById('modalHourlyRate').innerText = `₹${this.currentSlot.hourlyRate}`;

      document.getElementById('driverName').value = user.name || '';
      document.getElementById('driverPhone').value = user.phone || '9876543210';
      document.getElementById('vehicleNumber').value = '';
      document.getElementById('bookingDuration').value = 2;

      // Start time defaults to current local datetime
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      document.getElementById('bookingStartTime').value = now.toISOString().slice(0, 16);

      this.updateCostCalculation();

      // Open Bootstrap modal
      const modal = new bootstrap.Modal(document.getElementById('bookingModal'));
      modal.show();
    } catch (error) {
      console.error('Error opening booking modal:', error);
      App.showToast(error.message || 'Error opening booking form', 'danger');
    }
  },

  updateCostCalculation() {
    if (!this.currentSlot) return;

    const hours = Number(document.getElementById('bookingDuration').value) || 1;
    const rate = this.currentSlot.hourlyRate || 40;
    const total = hours * rate;

    document.getElementById('calcDuration').innerText = `${hours} hr${hours > 1 ? 's' : ''}`;
    document.getElementById('calcRate').innerText = `₹${rate}/hr`;
    document.getElementById('calcTotal').innerText = `₹${total}`;
  },

  async handleBookingSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btnConfirmBooking');
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-1"></i> Processing...`;

    try {
      const payload = {
        slotId: document.getElementById('bookingSlotId').value,
        driverName: document.getElementById('driverName').value.trim(),
        driverPhone: document.getElementById('driverPhone').value.trim(),
        vehicleNumber: document.getElementById('vehicleNumber').value.trim().toUpperCase(),
        startTime: document.getElementById('bookingStartTime').value,
        durationHours: Number(document.getElementById('bookingDuration').value),
        paymentMethod: document.getElementById('paymentMethod').value,
      };

      const response = await API.bookings.create(payload);

      if (response.success) {
        // Hide Booking Modal
        const bookingModalEl = document.getElementById('bookingModal');
        const modalInstance = bootstrap.Modal.getInstance(bookingModalEl);
        if (modalInstance) modalInstance.hide();

        App.showToast('🎉 Booking Confirmed Successfully!', 'success');

        // Show Instant Ticket Modal
        this.showTicketModal(response.data);

        // Refresh Slots and Map
        if (SlotsModule.currentLocationId) {
          SlotsModule.loadSlotsForLocation(SlotsModule.currentLocationId);
        }
        MapModule.loadLocationsOnMap();
      }
    } catch (error) {
      console.error('Booking submission failed:', error);
      App.showToast(error.message || 'Failed to complete booking. Please try again.', 'danger');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i class="fas fa-check-circle mr-1"></i> Confirm & Pay`;
    }
  },

  showTicketModal(booking) {
    document.getElementById('ticketBookingCode').innerText = booking.bookingCode;
    document.getElementById('ticketSlotNumber').innerText = booking.slot?.slotNumber || 'N/A';
    document.getElementById('ticketLocation').innerText = booking.location?.name || 'N/A';
    document.getElementById('ticketAddress').innerText = booking.location?.address || '';
    document.getElementById('ticketDriver').innerText = booking.driverName;
    document.getElementById('ticketVehicle').innerText = booking.vehicleNumber;
    document.getElementById('ticketDuration').innerText = `${booking.durationHours} Hours`;
    document.getElementById('ticketAmount').innerText = `₹${booking.totalAmount}`;
    document.getElementById('ticketStatus').innerText = booking.status.toUpperCase();

    const start = new Date(booking.startTime).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const end = new Date(booking.endTime).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    document.getElementById('ticketTimes').innerText = `${start} → ${end}`;

    // Render Simulated Barcode / QR
    const qrContainer = document.getElementById('ticketQrContainer');
    qrContainer.innerHTML = `
      <div class="p-3 bg-white border-2 border-gray-900 rounded-lg inline-block shadow-sm">
        <img 
          src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
            booking.bookingCode + '|' + booking.vehicleNumber
          )}" 
          alt="Parking Gate QR" 
          class="w-32 h-32 mx-auto"
          onerror="this.src='https://dummyimage.com/140x140/000/fff&text=${booking.bookingCode}'"
        />
        <p class="text-[10px] text-gray-700 font-mono text-center font-bold mt-1 tracking-widest">${booking.bookingCode}</p>
      </div>
    `;

    const ticketModal = new bootstrap.Modal(document.getElementById('bookingTicketModal'));
    ticketModal.show();
  },

  async loadMyBookings() {
    const listContainer = document.getElementById('myBookingsList');
    if (!listContainer) return;

    if (!API.getToken()) {
      listContainer.innerHTML = `
        <div class="p-8 text-center glass-card rounded-xl border border-gray-700">
          <i class="fas fa-user-lock text-4xl text-gray-500 mb-3"></i>
          <h4 class="text-lg font-bold text-gray-300">Authentication Required</h4>
          <p class="text-sm text-gray-400 mt-1">Please log in to view and manage your parking bookings.</p>
          <button onclick="App.openAuthModal('login')" class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold">
            Log In Now
          </button>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = `
      <div class="py-12 text-center text-gray-400">
        <i class="fas fa-spinner fa-spin text-3xl mb-2 text-blue-500"></i>
        <p>Loading your parking reservations...</p>
      </div>
    `;

    try {
      const response = await API.bookings.getMy();
      if (!response.success || !response.data) {
        throw new Error('Failed to load bookings');
      }

      this.myBookings = response.data;

      if (this.myBookings.length === 0) {
        listContainer.innerHTML = `
          <div class="p-12 text-center glass-card rounded-xl border border-gray-700">
            <i class="fas fa-ticket text-4xl text-gray-600 mb-3"></i>
            <h4 class="text-lg font-bold text-gray-300">No Reservations Found</h4>
            <p class="text-sm text-gray-400 mt-1">You have not booked any parking slots yet.</p>
            <button onclick="App.switchTab('slotsTab')" class="mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow">
              <i class="fas fa-search mr-1.5"></i> Find and Book a Slot
            </button>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = this.myBookings
        .map((b) => this.renderBookingCard(b))
        .join('');
    } catch (error) {
      console.error('Error fetching my bookings:', error);
      listContainer.innerHTML = `
        <div class="p-8 text-center text-red-400 glass-card rounded-xl">
          <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
          <p>${error.message || 'Failed to load bookings'}</p>
        </div>
      `;
    }
  },

  renderBookingCard(booking) {
    const statusBadges = {
      confirmed: 'bg-blue-900/60 text-blue-300 border-blue-700',
      checked_in: 'bg-emerald-900/60 text-emerald-300 border-emerald-700',
      completed: 'bg-gray-800 text-gray-400 border-gray-700',
      cancelled: 'bg-rose-900/60 text-rose-300 border-rose-700',
    };

    const startFormatted = new Date(booking.startTime).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const endFormatted = new Date(booking.endTime).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const isConfirmed = booking.status === 'confirmed';
    const isCheckedIn = booking.status === 'checked_in';
    const canCancel = isConfirmed;

    return `
      <div class="glass-card p-5 rounded-xl border border-gray-700/60 transition-all mb-4">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-800 pb-3 mb-3">
          <div class="flex items-center gap-3">
            <span class="px-3 py-1 bg-blue-950 border border-blue-800 text-blue-300 font-mono text-sm font-bold rounded-lg">
              ${booking.bookingCode}
            </span>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase ${statusBadges[booking.status] || 'bg-gray-800 text-gray-300'}">
              ${booking.status.replace('_', ' ')}
            </span>
          </div>

          <div class="text-right">
            <span class="text-xs text-gray-400 block">Total Amount Paid</span>
            <span class="text-lg font-black text-emerald-400">₹${booking.totalAmount}</span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
          <div>
            <span class="text-xs text-gray-400 uppercase tracking-wider block">Parking Location & Bay</span>
            <h5 class="font-bold text-white mt-0.5">${booking.location?.name || 'Smart Parking Lot'}</h5>
            <p class="text-xs text-gray-400">Slot: <strong class="text-blue-400 font-mono">${booking.slot?.slotNumber || 'N/A'}</strong> (${booking.slot?.floor || 'Ground'})</p>
          </div>

          <div>
            <span class="text-xs text-gray-400 uppercase tracking-wider block">Vehicle Details</span>
            <p class="font-mono font-bold text-gray-200 mt-0.5">${booking.vehicleNumber}</p>
            <p class="text-xs text-gray-400 capitalize">Driver: ${booking.driverName}</p>
          </div>

          <div>
            <span class="text-xs text-gray-400 uppercase tracking-wider block">Reserved Schedule</span>
            <p class="text-xs text-gray-300 mt-0.5"><i class="fas fa-play text-green-400 mr-1"></i> ${startFormatted}</p>
            <p class="text-xs text-gray-300"><i class="fas fa-stop text-red-400 mr-1"></i> ${endFormatted} (${booking.durationHours} hrs)</p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-gray-800">
          <button 
            onclick="BookingsModule.viewExistingTicket('${booking._id}')" 
            class="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-gray-700">
            <i class="fas fa-qrcode text-blue-400"></i> View Ticket Pass
          </button>

          ${
            isConfirmed
              ? `<button 
                  onclick="BookingsModule.updateStatus('${booking._id}', 'checked_in')" 
                  class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow">
                  <i class="fas fa-car-side"></i> Check-in at Gate (PUT)
                </button>`
              : ''
          }

          ${
            isCheckedIn
              ? `<button 
                  onclick="BookingsModule.updateStatus('${booking._id}', 'completed')" 
                  class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow">
                  <i class="fas fa-door-open"></i> Check-out & Exit (PUT)
                </button>`
              : ''
          }

          ${
            canCancel
              ? `<button 
                  onclick="BookingsModule.cancelBooking('${booking._id}')" 
                  class="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                  <i class="fas fa-trash-alt"></i> Cancel Booking (DELETE)
                </button>`
              : ''
          }
        </div>
      </div>
    `;
  },

  async viewExistingTicket(bookingId) {
    try {
      const response = await API.bookings.getById(bookingId);
      if (response.success && response.data) {
        this.showTicketModal(response.data);
      }
    } catch (error) {
      App.showToast(error.message || 'Failed to fetch ticket', 'danger');
    }
  },

  async updateStatus(bookingId, status) {
    try {
      const response = await API.bookings.updateStatus(bookingId, status);
      if (response.success) {
        App.showToast(response.message || 'Status updated successfully', 'success');
        this.loadMyBookings();
        if (SlotsModule.currentLocationId) {
          SlotsModule.loadSlotsForLocation(SlotsModule.currentLocationId);
        }
      }
    } catch (error) {
      App.showToast(error.message || 'Failed to update status', 'danger');
    }
  },

  async cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this parking reservation? The slot will be freed for other drivers.')) {
      return;
    }

    try {
      const response = await API.bookings.cancel(bookingId, 'Driver requested cancellation');
      if (response.success) {
        App.showToast(response.message || 'Booking cancelled successfully', 'info');
        this.loadMyBookings();
        if (SlotsModule.currentLocationId) {
          SlotsModule.loadSlotsForLocation(SlotsModule.currentLocationId);
        }
        MapModule.loadLocationsOnMap();
      }
    } catch (error) {
      App.showToast(error.message || 'Failed to cancel booking', 'danger');
    }
  },
};

window.BookingsModule = BookingsModule;
