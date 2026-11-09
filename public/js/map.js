/**
 * Map View Module (Leaflet.js & OpenStreetMap)
 * Renders interactive parking facility map with real-time occupancy markers
 */

let parkingMap = null;
let markersLayer = null;

const MapModule = {
  init() {
    if (parkingMap) return;

    // Centered around Hyderabad Tech Corridor
    parkingMap = L.map('map', {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([17.435, 78.40], 12);

    // OpenStreetMap dark / modern tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(parkingMap);

    markersLayer = L.layerGroup().addTo(parkingMap);

    // Initial load of markers
    this.loadLocationsOnMap();

    // Fix map render sizing on tab display
    setTimeout(() => {
      parkingMap.invalidateSize();
    }, 400);
  },

  async loadLocationsOnMap(filterText = '') {
    try {
      const response = await API.locations.getAll();
      if (!response.success || !response.data) return;

      const locations = response.data;
      markersLayer.clearLayers();

      const filtered = filterText
        ? locations.filter(
            (l) =>
              l.name.toLowerCase().includes(filterText.toLowerCase()) ||
              l.address.toLowerCase().includes(filterText.toLowerCase()) ||
              l.city.toLowerCase().includes(filterText.toLowerCase())
          )
        : locations;

      filtered.forEach((loc) => {
        const { lat, lng } = loc.coordinates;
        if (!lat || !lng) return;

        const isAvailable = loc.availableSlots > 0;
        const markerColor = loc.availableSlots > 4 ? '#10b981' : loc.availableSlots > 0 ? '#f59e0b' : '#ef4444';

        // Custom HTML Marker Icon
        const customIcon = L.divIcon({
          className: 'custom-map-pin',
          html: `
            <div style="
              background-color: ${markerColor};
              width: 36px;
              height: 36px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              border: 3px solid #ffffff;
              box-shadow: 0 4px 10px rgba(0,0,0,0.5);
              cursor: pointer;
            ">
              <span style="
                transform: rotate(45deg);
                color: #ffffff;
                font-weight: 800;
                font-size: 13px;
                font-family: sans-serif;
              ">${loc.availableSlots}</span>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          popupAnchor: [0, -36],
        });

        const popupContent = `
          <div style="min-width: 240px; padding: 4px;">
            <div style="font-weight: 700; font-size: 15px; margin-bottom: 4px; color: #60a5fa;">
              ${loc.name}
            </div>
            <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px;">
              <i class="fas fa-map-marker-alt text-red-400 mr-1"></i> ${loc.address}, ${loc.city}
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; background: #1f2937; padding: 6px 10px; border-radius: 6px; margin-bottom: 8px;">
              <span style="font-size: 12px; color: #d1d5db;">Available Slots:</span>
              <span style="font-weight: 700; color: ${markerColor}; font-size: 14px;">
                ${loc.availableSlots} / ${loc.totalSlots}
              </span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-bottom: 10px; color: #9ca3af;">
              <span>Base Rate: <strong style="color: #34d399;">₹${loc.baseRate}/hr</strong></span>
              <span><i class="fas fa-clock text-blue-400"></i> ${loc.operatingHours || '24/7'}</span>
            </div>

            <div style="display: flex; gap: 6px;">
              <button 
                onclick="SlotsModule.selectLocationAndNavigate('${loc._id}')" 
                style="flex: 1; background: #2563eb; color: #fff; padding: 6px 10px; border-radius: 6px; font-weight: 600; font-size: 12px; border: none; cursor: pointer; transition: background 0.2s;"
                onmouseover="this.style.background='#1d4ed8'"
                onmouseout="this.style.background='#2563eb'">
                <i class="fas fa-parking mr-1"></i> View Slots & Book
              </button>
              <a 
                href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" 
                target="_blank" 
                style="background: #374151; color: #e5e7eb; padding: 6px 10px; border-radius: 6px; font-size: 12px; text-decoration: none; display: flex; align-items: center;"
                title="Get Directions in Google Maps">
                <i class="fas fa-directions"></i>
              </a>
            </div>
          </div>
        `;

        const marker = L.marker([lat, lng], { icon: customIcon }).bindPopup(popupContent);
        markersLayer.addLayer(marker);
      });

      if (filtered.length > 0 && parkingMap) {
        const bounds = filtered.map((l) => [l.coordinates.lat, l.coordinates.lng]);
        parkingMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    } catch (error) {
      console.error('Failed to load map locations:', error);
    }
  },

  refreshMap() {
    if (parkingMap) {
      parkingMap.invalidateSize();
      this.loadLocationsOnMap();
    }
  },
};

window.MapModule = MapModule;
