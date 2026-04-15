import { User } from './User';
import { Hotel } from './Hotel';
import { Room } from './Room';
import { Booking } from './Booking';
import { Review } from './Review';
import { Bookmark } from './Bookmark';
import { Setting } from './Setting';

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

export { User, Hotel, Room, Booking, Review, Bookmark, Setting };
