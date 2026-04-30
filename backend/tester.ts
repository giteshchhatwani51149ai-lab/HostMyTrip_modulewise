import sequelize from './src/config/database';
import { User } from './src/models';
import { createBooking } from './src/controllers/bookingController';

async function testBooking() {
  await sequelize.authenticate();
  
  const user = await User.findOne({ where: { email: 'corpadmin.infy@hostmytrip.com' } });
  
  const req = {
    user: { id: user?.id, role: user?.role, corporateId: user?.corporateId, canBookHotels: user?.canBookHotels },
    body: {
      checkIn: '2026-05-01',
      checkOut: '2026-05-05',
      guests: 2,
      paymentType: 'full',
      guestName: 'Jane Doe Admin',
      guestEmail: 'jane.admin@infy.com',
      guestPhone: '0987654321',
      isLive: true,
      liveHotelName: 'Test Live Hotel',
      liveRoomType: 'Deluxe',
      livePricePerNight: 1000,
      liveCity: 'Paris'
    }
  } as any;
  
  const res = {
    status: function(code: number) {
      this.statusCode = code;
      return this;
    },
    json: function(data: any) {
      console.log("Status:", this.statusCode);
      console.log("Data:", data);
    }
  } as any;
  
  try {
     await createBooking(req, res);
  } catch (e) {
     console.error(e);
  }
  process.exit();
}
testBooking();
