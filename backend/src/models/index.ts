import { User } from './User';
import { Hotel } from './Hotel';
import { Room } from './Room';
import { Booking } from './Booking';
import { Review } from './Review';
import { Bookmark } from './Bookmark';
import { Setting } from './Setting';
import { Corporate } from './Corporate';
import { CorporateBookingApproval } from './CorporateBookingApproval';
import { Payment } from './Payment';
import { FlightBooking } from './FlightBooking';
import { HotelBooking } from './HotelBooking';
import { AuditLog } from './AuditLog';
import { LivePrice } from './LivePrice';

// Disable FK constraints in associations for MSSQL compatibility
// (MSSQL doesn't allow multiple cascade paths to the same table)
const noConstraints = { foreignKey: { allowNull: true }, constraints: false };

Hotel.hasMany(Room, { foreignKey: 'hotelId', as: 'rooms', constraints: false });
Room.belongsTo(Hotel, { foreignKey: 'hotelId', as: 'hotel', constraints: false });

Hotel.hasMany(Review, { foreignKey: 'hotelId', as: 'reviews', constraints: false });
Review.belongsTo(Hotel, { foreignKey: 'hotelId', as: 'hotel', constraints: false });

User.hasMany(Review, { foreignKey: 'userId', as: 'reviews', constraints: false });
Review.belongsTo(User, { foreignKey: 'userId', as: 'user', constraints: false });

User.hasMany(Booking, { foreignKey: 'userId', as: 'bookings', constraints: false });
Booking.belongsTo(User, { foreignKey: 'userId', as: 'user', constraints: false });
User.hasMany(Booking, { foreignKey: 'bookedByUserId', as: 'bookedCorporateBookings', constraints: false });
Booking.belongsTo(User, { foreignKey: 'bookedByUserId', as: 'bookedByUser', constraints: false });
User.hasMany(Booking, { foreignKey: 'approvedByUserId', as: 'approvedCorporateBookings', constraints: false });
Booking.belongsTo(User, { foreignKey: 'approvedByUserId', as: 'approvedByUser', constraints: false });

Room.hasMany(Booking, { foreignKey: 'roomId', as: 'bookings', constraints: false });
Booking.belongsTo(Room, { foreignKey: 'roomId', as: 'room', constraints: false });

Hotel.hasMany(Booking, { foreignKey: 'hotelId', as: 'bookings', constraints: false });
Booking.belongsTo(Hotel, { foreignKey: 'hotelId', as: 'hotel', constraints: false });

User.hasMany(Bookmark, { foreignKey: 'userId', as: 'bookmarks', constraints: false });
Bookmark.belongsTo(User, { foreignKey: 'userId', as: 'user', constraints: false });

Hotel.hasMany(Bookmark, { foreignKey: 'hotelId', as: 'bookmarks', constraints: false });
Bookmark.belongsTo(Hotel, { foreignKey: 'hotelId', as: 'hotel', constraints: false });

Booking.hasOne(Review, { foreignKey: 'bookingId', as: 'review', constraints: false });
Review.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking', constraints: false });

Corporate.hasMany(User, { foreignKey: 'corporateId', as: 'users', constraints: false });
User.belongsTo(Corporate, { foreignKey: 'corporateId', as: 'corporate', constraints: false });

Corporate.hasMany(Booking, { foreignKey: 'corporateId', as: 'bookings', constraints: false });
Booking.belongsTo(Corporate, { foreignKey: 'corporateId', as: 'corporate', constraints: false });

Booking.hasMany(Payment, { foreignKey: 'bookingId', as: 'payments', constraints: false });
Payment.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking', constraints: false });

Booking.hasOne(FlightBooking, { foreignKey: 'bookingId', as: 'flightDetail', constraints: false });
FlightBooking.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking', constraints: false });

Booking.hasOne(HotelBooking, { foreignKey: 'bookingId', as: 'hotelDetail', constraints: false });
HotelBooking.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking', constraints: false });

Booking.hasOne(CorporateBookingApproval, { foreignKey: 'bookingId', as: 'corporateApproval', constraints: false });
CorporateBookingApproval.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking', constraints: false });
CorporateBookingApproval.belongsTo(User, { foreignKey: 'requesterUserId', as: 'requester', constraints: false });
CorporateBookingApproval.belongsTo(User, { foreignKey: 'approverUserId', as: 'approver', constraints: false });

export { User, Hotel, Room, Booking, Review, Bookmark, Setting, Corporate, CorporateBookingApproval, Payment, FlightBooking, HotelBooking, AuditLog, LivePrice };
