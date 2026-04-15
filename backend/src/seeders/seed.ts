import sequelize from '../config/database';
import { Hotel, Room, User, Booking, Review, Bookmark } from '../models';
import bcrypt from 'bcrypt';

const hotels = [
  {
    name: 'The Grand Oberoi',
    city: 'Mumbai',
    address: 'Nariman Point, Mumbai, Maharashtra 400021',
    description: 'An iconic luxury hotel offering breathtaking views of the Arabian Sea with world-class amenities, fine dining restaurants, and a full-service spa. Perfect for both business and leisure travelers.',
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800',
      'https://images.unsplash.com/photo-1444201983204-c43cbd584d93?w=800',
    ]),
    rating: 4.8,
    reviewCount: 1240,
    starRating: 5,
    amenities: JSON.stringify(['Free WiFi', 'Spa', 'Swimming Pool', 'Gym', 'Restaurant', 'Room Service', 'Bar', 'Business Center', 'Concierge', 'Valet Parking']),
  },
  {
    name: 'JW Marriott',
    city: 'Bengaluru',
    address: 'Vittal Mallya Road, Bengaluru, Karnataka 560001',
    description: 'Nestled in the heart of Bengaluru, JW Marriott offers elegant rooms and suites, award-winning dining experiences, and a tranquil spa to help you unwind after a day of exploration.',
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
      'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800',
    ]),
    rating: 4.7,
    reviewCount: 892,
    starRating: 5,
    amenities: JSON.stringify(['Free WiFi', 'Spa', 'Swimming Pool', 'Gym', 'Multiple Restaurants', 'Bar', 'Business Center', 'Airport Shuttle']),
  },
  {
    name: 'Taj Falaknuma Palace',
    city: 'Hyderabad',
    address: 'Engine Bowli, Falaknuma, Hyderabad, Telangana 500053',
    description: "A jewel in the crown of Hyderabad, this palace hotel is a stunning piece of history. Experience opulent suites, royal dining, breathtaking views, and Taj's signature warm hospitality.",
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800',
      'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=800',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
    ]),
    rating: 4.9,
    reviewCount: 2105,
    starRating: 5,
    amenities: JSON.stringify(['Free WiFi', 'Heritage Spa', 'Swimming Pool', 'Royal Dining', 'Horse Riding', 'Butler Service', 'Museum Tour', 'Cigar Lounge']),
  },
  {
    name: 'Radisson Blu',
    city: 'Delhi',
    address: 'National Highway 8, Mahipalpur, New Delhi 110037',
    description: 'Located minutes from Indira Gandhi International Airport, Radisson Blu offers contemporary comfort, stylish rooms, and excellent dining. Ideal for both short stays and extended visits.',
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1561501900-3701fa6a0864?w=800',
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
      'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800',
    ]),
    rating: 4.3,
    reviewCount: 678,
    starRating: 4,
    amenities: JSON.stringify(['Free WiFi', 'Swimming Pool', 'Gym', 'Restaurant', 'Bar', 'Airport Shuttle', 'Meeting Rooms', 'Laundry Service']),
  },
  {
    name: 'The Leela Palace',
    city: 'Goa',
    address: 'Mobor, Cavelossim, South Goa, Goa 403731',
    description: 'Set on the banks of the River Sal in South Goa, The Leela Palace is a luxury beachside destination with lush gardens, multiple pools, a rejuvenating spa, and a stretch of private beach.',
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
      'https://images.unsplash.com/photo-1559508551-44bff1de756b?w=800',
    ]),
    rating: 4.6,
    reviewCount: 1560,
    starRating: 5,
    amenities: JSON.stringify(['Private Beach', 'Free WiFi', 'Multiple Pools', 'Spa', '7 Restaurants', 'Yoga Center', 'Water Sports', 'Kids Club', 'Evening Entertainment']),
  },
  {
    name: 'Hyatt Regency',
    city: 'Chennai',
    address: '365, Anna Salai, Teynampet, Chennai, Tamil Nadu 600018',
    description: 'A sophisticated urban retreat in Chennai offering stunning views of the city skyline, luxurious rooms, a rooftop pool, and exceptional dining with Indian and international cuisines.',
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800',
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800',
      'https://images.unsplash.com/photo-1586611292717-f828b167408c?w=800',
    ]),
    rating: 4.5,
    reviewCount: 945,
    starRating: 5,
    amenities: JSON.stringify(['Free WiFi', 'Rooftop Pool', 'Gym', 'Spa', 'Multiple Restaurants', 'Bar', 'Business Center', 'EV Charging']),
  },
];

const roomTypes = [
  { type: 'Standard Room', priceMultiplier: 1, maxOccupancy: 2, description: 'Comfortable and well-appointed standard room with all essential amenities.' },
  { type: 'Deluxe Room', priceMultiplier: 1.5, maxOccupancy: 2, description: 'Spacious deluxe room with premium furnishings and enhanced views.' },
  { type: 'Junior Suite', priceMultiplier: 2.2, maxOccupancy: 3, description: 'Elegant suite with a separate sitting area and upgraded amenities.' },
  { type: 'Executive Suite', priceMultiplier: 3.5, maxOccupancy: 4, description: 'Premium suite with a full living room, butler service, and executive lounge access.' },
];

const basePrices: Record<string, number> = {
  'The Grand Oberoi': 8500,
  'JW Marriott': 7200,
  'Taj Falaknuma Palace': 18000,
  'Radisson Blu': 4500,
  'The Leela Palace': 12000,
  'Hyatt Regency': 6500,
};

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('DB Connected...');
    await sequelize.sync({ force: true });
    console.log('Tables recreated...');

    // Create admin user
    const salt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash('Admin@123', salt);
    const empHash = await bcrypt.hash('Employee@123', salt);

    await User.create({
      email: 'admin@hostmytrip.com',
      password: adminHash,
      role: 'admin',
      isVerified: true,
    });

    await User.create({
      email: 'employee@hostmytrip.com',
      password: empHash,
      role: 'employee',
      isVerified: true,
    });

    console.log('Admin & Employee users created.');

    // Create hotels and rooms
    for (const hotelData of hotels) {
      const hotel = await Hotel.create(hotelData);
      const basePrice = basePrices[hotel.name] || 5000;

      for (const rt of roomTypes) {
        await Room.create({
          hotelId: hotel.id,
          type: rt.type,
          pricePerNight: Math.round(basePrice * rt.priceMultiplier),
          maxOccupancy: rt.maxOccupancy,
          description: rt.description,
          images: hotelData.images,
          available: true,
        });
      }
      console.log(`Created hotel: ${hotel.name} with ${roomTypes.length} room types.`);
    }

    console.log('\n✅ Seed complete!');
    console.log('Admin login: admin@hostmytrip.com | Admin@123');
    console.log('Employee login: employee@hostmytrip.com | Employee@123');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
