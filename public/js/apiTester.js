/**
 * REST API Interactive Tester
 * Specially designed for WTMP Course Project Evaluation Live Demonstration
 * Showcases GET, POST, PUT, DELETE HTTP Methods & JWT Bearer Header Verification
 */

const ApiTesterModule = {
  endpoints: [
    {
      id: 'get-locations',
      method: 'GET',
      path: '/api/locations',
      title: 'Get All Parking Facilities & Availability Stats',
      auth: false,
      description: 'Retrieves all registered parking lots with aggregated real-time slot counts.',
      handler: () => API.request('/locations', { method: 'GET' }),
    },
    {
      id: 'get-slots',
      method: 'GET',
      path: '/api/slots',
      title: 'Get Parking Slots Inventory',
      auth: false,
      description: 'Retrieves parking slots with vehicle type, floor, and occupancy status.',
      handler: () => API.request('/slots', { method: 'GET' }),
    },
    {
      id: 'post-login',
      method: 'POST',
      path: '/api/auth/login',
      title: 'JWT Auth Login (bcryptjs verification)',
      auth: false,
      description: 'Verifies hashed password with bcryptjs and returns signed JWT token.',
      handler: () =>
        API.request('/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: 'admin@smartparking.com',
            password: 'admin123',
          }),
        }),
    },
    {
      id: 'get-my-bookings',
      method: 'GET',
      path: '/api/bookings/my',
      title: 'Get User Bookings (Protected by JWT)',
      auth: true,
      description: 'Decodes JWT token in Authorization header and returns user reservations.',
      handler: () => API.request('/bookings/my', { method: 'GET' }),
    },
    {
      id: 'get-admin-stats',
      method: 'GET',
      path: '/api/admin/stats',
      title: 'Get Admin Analytics (Admin Role Guard)',
      auth: true,
      description: 'Validates JWT token and admin role to return system analytics.',
      handler: () => API.request('/admin/stats', { method: 'GET' }),
    },
    {
      id: 'put-toggle-slot',
      method: 'PUT',
      path: '/api/slots/:id/toggle',
      title: 'Update Slot Status / Sensor (PUT Method)',
      auth: true,
      description: 'Toggles a slot between available and occupied.',
      handler: async () => {
        const slotsRes = await API.slots.getAll();
        if (!slotsRes.data || slotsRes.data.length === 0) throw new Error('No slots available to update');
        const target = slotsRes.data[0];
        return await API.request(`/slots/${target._id}/toggle`, { method: 'PUT' });
      },
    },
    {
      id: 'post-booking',
      method: 'POST',
      path: '/api/bookings',
      title: 'Create Slot Reservation (POST Method)',
      auth: true,
      description: 'Reserves an available slot and creates a new booking document.',
      handler: async () => {
        const slotsRes = await API.slots.getAll({ status: 'available' });
        if (!slotsRes.data || slotsRes.data.length === 0) throw new Error('No available slots right now to book');
        const slot = slotsRes.data[0];
        return await API.request('/bookings', {
          method: 'POST',
          body: JSON.stringify({
            slotId: slot._id,
            driverName: 'WTMP Examiner Demo',
            driverPhone: '9876543210',
            vehicleNumber: 'AP 29 WT 2026',
            vehicleType: slot.vehicleType,
            durationHours: 2,
            paymentMethod: 'UPI',
          }),
        });
      },
    },
    {
      id: 'delete-booking',
      method: 'DELETE',
      path: '/api/bookings/:id',
      title: 'Cancel Booking & Release Slot (DELETE Method)',
      auth: true,
      description: 'Cancels an active booking, updating state and releasing slot back to available.',
      handler: async () => {
        const myBookings = await API.bookings.getMy();
        const active = myBookings.data?.find((b) => b.status === 'confirmed');
        if (!active) throw new Error('No active confirmed booking found to cancel. Book a slot first!');
        return await API.request(`/bookings/${active._id}`, { method: 'DELETE' });
      },
    },
  ],

  init() {
    this.renderTesterUI();
  },

  renderTesterUI() {
    const container = document.getElementById('apiTesterContainer');
    if (!container) return;

    container.innerHTML = `
      <div class="glass-card p-6 rounded-2xl border border-gray-800 mb-6">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-5 mb-5">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-900/60 text-blue-300 border border-blue-700">
                REST API SPECIFICATION
              </span>
              <span class="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-700">
                CRUD OPERATIONS
              </span>
              <span class="px-2.5 py-1 rounded-md text-xs font-bold bg-purple-900/60 text-purple-300 border border-purple-700">
                JWT & BCRYPTJS
              </span>
            </div>
            <h3 class="text-xl font-black text-white mt-2">Interactive REST API Live Demonstration Panel</h3>
            <p class="text-sm text-gray-400 mt-1">
              Test and demonstrate all required HTTP methods (GET, POST, PUT, DELETE) directly against the Node.js Express backend.
            </p>
          </div>

          <div class="flex items-center gap-3">
            <button onclick="ApiTesterModule.runAllTests()" class="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow transition">
              <i class="fas fa-play mr-1.5"></i> Run All 4 HTTP Tests
            </button>
            <button onclick="App.reseedDemoData()" class="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold text-xs rounded-xl border border-gray-700">
              <i class="fas fa-redo text-yellow-400 mr-1.5"></i> Reset DB
            </button>
          </div>
        </div>

        <div class="space-y-4">
          ${this.endpoints.map((ep) => this.renderEndpointCard(ep)).join('')}
        </div>
      </div>
    `;
  },

  renderEndpointCard(ep) {
    const methodColors = {
      GET: 'bg-emerald-950/80 text-emerald-400 border-emerald-600',
      POST: 'bg-blue-950/80 text-blue-400 border-blue-600',
      PUT: 'bg-amber-950/80 text-amber-400 border-amber-600',
      DELETE: 'bg-rose-950/80 text-rose-400 border-rose-600',
    }[ep.method];

    return `
      <div class="p-4 rounded-xl bg-gray-900/80 border border-gray-800 transition hover:border-gray-700">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div class="flex items-start md:items-center gap-3">
            <span class="w-20 text-center py-1 rounded text-xs font-mono font-black border ${methodColors}">
              ${ep.method}
            </span>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-mono text-sm font-bold text-white">${ep.path}</span>
                ${
                  ep.auth
                    ? `<span class="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 border border-purple-700 text-purple-300 font-bold" title="Requires Authorization: Bearer <JWT>"><i class="fas fa-key text-[9px] mr-1"></i>JWT</span>`
                    : ''
                }
              </div>
              <p class="text-xs text-gray-400 mt-0.5">${ep.title} — ${ep.description}</p>
            </div>
          </div>

          <button 
            id="btnTest-${ep.id}" 
            onclick="ApiTesterModule.runSingleTest('${ep.id}')"
            class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border border-gray-700 whitespace-nowrap">
            <i class="fas fa-play text-[10px] text-green-400"></i> Send Request
          </button>
        </div>

        <!-- Output response container (hidden by default) -->
        <div id="output-${ep.id}" class="mt-3 hidden">
          <div class="flex items-center justify-between text-xs text-gray-400 bg-gray-950 p-2 rounded-t-lg border-x border-t border-gray-800">
            <span id="status-${ep.id}" class="font-mono font-bold">Status: ...</span>
            <span id="time-${ep.id}" class="font-mono text-gray-500">... ms</span>
          </div>
          <pre id="pre-${ep.id}" class="p-3 bg-black/80 text-green-400 font-mono text-xs rounded-b-lg border border-gray-800 max-h-52 overflow-y-auto"></pre>
        </div>
      </div>
    `;
  },

  async runSingleTest(id) {
    const ep = this.endpoints.find((e) => e.id === id);
    if (!ep) return;

    const btn = document.getElementById(`btnTest-${id}`);
    const out = document.getElementById(`output-${id}`);
    const statusEl = document.getElementById(`status-${id}`);
    const timeEl = document.getElementById(`time-${id}`);
    const pre = document.getElementById(`pre-${id}`);

    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin text-blue-400"></i> Testing...`;
    out.classList.remove('hidden');
    statusEl.innerHTML = `<span class="text-yellow-400">Sending HTTP ${ep.method} request...</span>`;
    pre.innerText = 'Connecting to Express server...';

    const startTime = performance.now();
    try {
      const data = await ep.handler();
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      statusEl.innerHTML = `<span class="text-green-400 font-bold"><i class="fas fa-check-circle mr-1"></i>200 OK / 201 Created (SUCCESS)</span>`;
      timeEl.innerText = `${duration} ms`;
      pre.innerText = JSON.stringify(data, null, 2);
    } catch (error) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      statusEl.innerHTML = `<span class="text-red-400 font-bold"><i class="fas fa-times-circle mr-1"></i>HTTP Error: ${error.message}</span>`;
      timeEl.innerText = `${duration} ms`;
      pre.innerText = JSON.stringify({ error: error.message }, null, 2);
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i class="fas fa-play text-[10px] text-green-400"></i> Re-test`;
    }
  },

  async runAllTests() {
    for (const ep of this.endpoints) {
      await this.runSingleTest(ep.id);
    }
  },
};

window.ApiTesterModule = ApiTesterModule;
