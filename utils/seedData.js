const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Location = require('../models/Location');
const Slot = require('../models/Slot');
const Booking = require('../models/Booking');

dotenv.config();

const locationsData = [
  {
    name: 'Cyber Towers Tech Hub Parking',
    code: 'CYBER-01',
    address: 'Hitec City Main Road, Madhapur',
    city: 'Hyderabad',
    coordinates: { lat: 17.4504, lng: 78.3808 },
    baseRate: 40,
    operatingHours: '24/7 Open',
    image: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80',
    description: 'Automated 5-level multi-story parking facility with ultra-fast EV chargers and license plate recognition.',
    amenities: ['EV Superchargers', '24/7 Security CCTV', 'Covered Slots', 'Valet Assistance', 'Elevator Access'],
  },
  {
    name: 'Inorbit Metro Smart Lot',
    code: 'INORBIT-02',
    address: 'APIIC Software Layout, Mindspace',
    city: 'Hyderabad',
    coordinates: { lat: 17.4348, lng: 78.3867 },
    baseRate: 35,
    operatingHours: '06:00 AM - 11:30 PM',
    image: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=800&q=80',
    description: 'Convenient transit parking facility directly connected to Hyderabad Metro station with contactless digital exit.',
    amenities: ['Direct Metro Skywalk', 'CCTV Surveillance', 'Digital UPI Gate', 'Two-Wheeler Dedicated Zone'],
  },
  {
    name: 'Banjara Hills Galleria Parking',
    code: 'BANJARA-03',
    address: 'Road No. 1, Banjara Hills',
    city: 'Hyderabad',
    coordinates: { lat: 17.4156, lng: 78.4487 },
    baseRate: 50,
    operatingHours: '08:00 AM - 12:00 AM',
    image: 'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=800&q=80',
    description: 'Premium premium valet and self-parking building serving prime commercial shopping and dining districts.',
    amenities: ['Premium Valet', 'Car Wash Bay', 'EV Charging', '24/7 Guards', 'Handicapped Priority'],
  },
  {
    name: 'Gachibowli Financial District Hub',
    code: 'GACHI-04',
    address: 'ISB Road, Financial District, Nanakramguda',
    city: 'Hyderabad',
    coordinates: { lat: 17.4239, lng: 78.3374 },
    baseRate: 30,
    operatingHours: '24/7 Open',
    image: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=80',
    description: 'High-capacity corporate smart parking deck with dynamic real-time occupancy guidance sensors.',
    amenities: ['Smart Bay Indicators', 'CCTV Monitoring', 'EV Charging Stations', 'Shuttle Bus Pickup'],
  },
  {
    name: 'Begumpet Airport Transit Plaza',
    code: 'BEGUM-05',
    address: 'Old Airport Road, Prakash Nagar',
    city: 'Hyderabad',
    coordinates: { lat: 17.4475, lng: 78.4682 },
    baseRate: 45,
    operatingHours: '24/7 Open',
    image: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80',
    description: 'Secured long-stay and hourly airport passenger parking with round-the-clock patrol and CCTV.',
    amenities: ['Long-Term Stay Safe', '24/7 Patrol', 'Luggage Trolleys', 'Covered Bays'],
  },
];

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_parking_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
    console.log('🔄 Cleaning existing collections...');

    await User.deleteMany();
    await Location.deleteMany();
    await Slot.deleteMany();
    await Booking.deleteMany();

    console.log('👤 Creating default users...');
    // Default Admin User
    const adminUser = await User.create({
      name: 'Dr. System Administrator',
      email: 'admin@smartparking.com',
      password: 'admin123', // Will be hashed via pre-save hook
      phone: '9876543210',
      role: 'admin',
    });

    // Default Regular Driver User
    const normalUser = await User.create({
      name: 'Sai Venkat (Student Driver)',
      email: 'user@example.com',
      password: 'user123', // Will be hashed via pre-save hook
      phone: '9812345678',
      role: 'user',
    });

    console.log('📍 Seeding parking locations...');
    const createdLocations = await Location.insertMany(locationsData);

    console.log('🅿️ Seeding smart parking slots...');
    const allSlots = [];

    for (const loc of createdLocations) {
      // Create 10-12 diverse slots per location
      const slotTemplates = [
        { num: 'A-01', floor: 'Ground Floor', type: 'car', rate: loc.baseRate, charging: false, accessible: false },
        { num: 'A-02', floor: 'Ground Floor', type: 'car', rate: loc.baseRate, charging: false, accessible: false },
        { num: 'A-03', floor: 'Ground Floor', type: 'ev', rate: loc.baseRate + 15, charging: true, accessible: false },
        { num: 'A-04', floor: 'Ground Floor', type: 'accessible', rate: loc.baseRate, charging: false, accessible: true },
        { num: 'B-01', floor: 'Level 1', type: 'car', rate: loc.baseRate, charging: false, accessible: false },
        { num: 'B-02', floor: 'Level 1', type: 'suv', rate: loc.baseRate + 10, charging: false, accessible: false },
        { num: 'B-03', floor: 'Level 1', type: 'bike', rate: Math.round(loc.baseRate * 0.4), charging: false, accessible: false },
        { num: 'B-04', floor: 'Level 1', type: 'bike', rate: Math.round(loc.baseRate * 0.4), charging: false, accessible: false },
        { num: 'C-01', floor: 'Basement B1', type: 'car', rate: loc.baseRate, charging: false, accessible: false },
        { num: 'C-02', floor: 'Basement B1', type: 'ev', rate: loc.baseRate + 15, charging: true, accessible: false },
      ];

      for (let i = 0; i < slotTemplates.length; i++) {
        const t = slotTemplates[i];
        let status = 'available';
        let sensorStatus = 'empty';

        // Add some realistic variation (first slot occupied, 4th slot reserved)
        if (i === 1) {
          status = 'occupied';
          sensorStatus = 'detected';
        } else if (i === 5) {
          status = 'reserved';
        }

        allSlots.push({
          slotNumber: t.num,
          location: loc._id,
          floor: t.floor,
          vehicleType: t.type,
          hourlyRate: t.rate,
          status,
          hasCharging: t.charging,
          isAccessible: t.accessible,
          sensorStatus,
        });
      }
    }

    const createdSlots = await Slot.insertMany(allSlots);

    // Update totalSlots in locations
    for (const loc of createdLocations) {
      const count = createdSlots.filter((s) => s.location.toString() === loc._id.toString()).length;
      loc.totalSlots = count;
      await loc.save();
    }

    console.log('📑 Creating sample realistic bookings...');
    const sampleSlot = createdSlots.find((s) => s.status === 'reserved');
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const booking1 = await Booking.create({
      bookingCode: 'PRK-7842X',
      user: normalUser._id,
      slot: sampleSlot._id,
      location: sampleSlot.location,
      driverName: normalUser.name,
      driverPhone: normalUser.phone,
      vehicleNumber: 'TS 09 AB 4567',
      vehicleType: sampleSlot.vehicleType,
      startTime: now,
      endTime: twoHoursLater,
      durationHours: 2,
      hourlyRate: sampleSlot.hourlyRate,
      totalAmount: sampleSlot.hourlyRate * 2,
      paymentStatus: 'paid',
      paymentMethod: 'UPI',
      status: 'confirmed',
      qrCodeData: JSON.stringify({
        code: 'PRK-7842X',
        slot: sampleSlot.slotNumber,
        vehicle: 'TS 09 AB 4567',
      }),
    });

    sampleSlot.currentBooking = booking1._id;
    await sampleSlot.save();

    // Past completed booking
    const pastSlot = createdSlots[0];
    const pastStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const pastEnd = new Date(now.getTime() - 21 * 60 * 60 * 1000);

    await Booking.create({
      bookingCode: 'PRK-9102K',
      user: normalUser._id,
      slot: pastSlot._id,
      location: pastSlot.location,
      driverName: normalUser.name,
      driverPhone: normalUser.phone,
      vehicleNumber: 'TS 09 AB 4567',
      vehicleType: 'car',
      startTime: pastStart,
      endTime: pastEnd,
      durationHours: 3,
      hourlyRate: pastSlot.hourlyRate,
      totalAmount: pastSlot.hourlyRate * 3,
      paymentStatus: 'paid',
      paymentMethod: 'Credit/Debit Card',
      status: 'completed',
      checkInTime: pastStart,
      checkOutTime: pastEnd,
    });

    console.log('==================================================');
    console.log('🎉 Smart Parking Database Successfully Seeded!');
    console.log(`- Locations: ${createdLocations.length}`);
    console.log(`- Slots:     ${createdSlots.length}`);
    console.log('- Default Accounts:');
    console.log('   Admin: admin@smartparking.com / admin123');
    console.log('   User:  user@example.com / user123');
    console.log('==================================================');

    return {
      locations: createdLocations.length,
      slots: createdSlots.length,
      admin: 'admin@smartparking.com / admin123',
      user: 'user@example.com / user123',
    };
  } catch (error) {
    console.error('❌ Seeder Error:', error);
    throw error;
  }
};

// Allow running directly via `node utils/seedData.js`
if (require.main === module) {
  seedDatabase().then(() => {
    process.exit(0);
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = seedDatabase;
