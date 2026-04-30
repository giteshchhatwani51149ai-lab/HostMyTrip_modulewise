/**
 * Performance Indexes Migration
 * Adds non-clustered indexes to speed up admin queries.
 *
 * Usage:
 *   npx ts-node src/seeders/addPerformanceIndexes.ts
 *   (or in prod) node dist/seeders/addPerformanceIndexes.js
 *
 * Idempotent: only creates index if missing.
 */
import 'dotenv/config';
import sequelize from '../config/database';

interface IndexDef {
  name: string;
  table: string;
  columns: string;     // raw column expression: "[createdAt] DESC"
  include?: string;    // optional INCLUDE columns
}

const INDEXES: IndexDef[] = [
  // bookings — by far the most queried table
  { name: 'IX_bookings_createdAt',     table: 'bookings', columns: '[createdAt] DESC' },
  { name: 'IX_bookings_status',        table: 'bookings', columns: '[status]' },
  { name: 'IX_bookings_paymentStatus', table: 'bookings', columns: '[paymentStatus]' },
  { name: 'IX_bookings_guestEmail',    table: 'bookings', columns: '[guestEmail]' },
  { name: 'IX_bookings_hotelId',       table: 'bookings', columns: '[hotelId]' },
  { name: 'IX_bookings_corporateId',   table: 'bookings', columns: '[corporateId]' },
  { name: 'IX_bookings_userId',        table: 'bookings', columns: '[userId]' },
  { name: 'IX_bookings_bookingRef',    table: 'bookings', columns: '[bookingReference]' },
  { name: 'IX_bookings_approvalStatus', table: 'bookings', columns: '[approvalStatus]' },

  // users
  { name: 'IX_users_email',            table: 'users',    columns: '[email]' },
  { name: 'IX_users_role',             table: 'users',    columns: '[role]' },
  { name: 'IX_users_corporateId',      table: 'users',    columns: '[corporateId]' },
  { name: 'IX_users_createdAt',        table: 'users',    columns: '[createdAt] DESC' },

  // hotels
  { name: 'IX_hotels_city',            table: 'hotels',   columns: '[city]' },
  { name: 'IX_hotels_rating',          table: 'hotels',   columns: '[rating] DESC' },

  // rooms
  { name: 'IX_rooms_hotelId',          table: 'rooms',    columns: '[hotelId]' },
  { name: 'IX_rooms_available',        table: 'rooms',    columns: '[available]' },

  // corporates
  { name: 'IX_corporates_status',      table: 'corporates', columns: '[status]' },
];

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ DB connected. Adding indexes...\n');

    for (const idx of INDEXES) {
      const sql = `
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='${idx.name}' AND object_id = OBJECT_ID('${idx.table}'))
BEGIN
  CREATE NONCLUSTERED INDEX [${idx.name}] ON [${idx.table}] (${idx.columns})${idx.include ? ` INCLUDE (${idx.include})` : ''};
  PRINT 'Created ${idx.name}';
END
ELSE PRINT 'Skipped ${idx.name} (exists)';`;

      try {
        await sequelize.query(sql);
        console.log(`  ✓ ${idx.name} on ${idx.table}`);
      } catch (e: any) {
        console.warn(`  ⚠ ${idx.name}: ${e?.message || e}`);
      }
    }

    console.log('\n✅ All indexes processed.');
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

run();
