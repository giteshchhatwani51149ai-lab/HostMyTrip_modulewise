import sequelize from '../config/database';

/**
 * MSSQL-safe idempotent column-add helper.
 * Adds new columns to the `bookings` table only if they don't already exist.
 * Safe to call repeatedly on every server boot.
 */
export async function ensureBookingColumns() {
  // NOTE: Sequelize's mssql dialect maps DataTypes.DATE → DATETIMEOFFSET when binding
  // parameters. Using DATETIME for these columns causes "Conversion failed when converting
  // date and/or time from character string." on UPDATE. Use DATETIMEOFFSET to match.
  const cols = [
    { name: 'internalNotes',  ddl: 'NVARCHAR(MAX) NULL' },
    { name: 'cancelReason',   ddl: 'NVARCHAR(500) NULL' },
    { name: 'cancelledAt',    ddl: 'DATETIMEOFFSET NULL' },
    { name: 'reminderSentAt', ddl: 'DATETIMEOFFSET NULL' },
    { name: 'feedbackSentAt', ddl: 'DATETIMEOFFSET NULL' },
    // Refund tracking columns
    { name: 'refundStatus',         ddl: "NVARCHAR(20) NOT NULL CONSTRAINT DF_bookings_refundStatus DEFAULT 'none'" },
    { name: 'refundAmount',         ddl: 'FLOAT NULL' },
    { name: 'cancellationFee',      ddl: 'FLOAT NULL' },
    { name: 'refundId',             ddl: 'NVARCHAR(255) NULL' },
    { name: 'refundInitiatedAt',    ddl: 'DATETIMEOFFSET NULL' },
    { name: 'refundCompletedAt',    ddl: 'DATETIMEOFFSET NULL' },
    { name: 'refundFailureReason',  ddl: 'NVARCHAR(500) NULL' },
    { name: 'paymentGateway',       ddl: 'NVARCHAR(20) NULL' },
    { name: 'paymentTxnId',         ddl: 'NVARCHAR(255) NULL' },
  ];

  // 1. Add columns if missing
  for (const c of cols) {
    const sql = `
      IF NOT EXISTS (
        SELECT 1 FROM sys.columns
        WHERE Name = N'${c.name}'
          AND Object_ID = Object_ID(N'bookings')
      )
      BEGIN
        ALTER TABLE bookings ADD ${c.name} ${c.ddl};
      END
    `;
    try {
      await sequelize.query(sql);
    } catch (err: any) {
      console.warn(`[ensureBookingColumns] Failed for ${c.name}: ${err?.message}`);
    }
  }

  // 2. Migrate any pre-existing DATETIME columns to DATETIMEOFFSET so Sequelize updates work
  const datetimeCols = [
    'cancelledAt', 'reminderSentAt', 'feedbackSentAt',
    'refundInitiatedAt', 'refundCompletedAt',
  ];
  for (const colName of datetimeCols) {
    try {
      await sequelize.query(`
        IF EXISTS (
          SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = 'bookings'
            AND COLUMN_NAME = '${colName}'
            AND DATA_TYPE = 'datetime'
        )
        BEGIN
          ALTER TABLE bookings ALTER COLUMN ${colName} DATETIMEOFFSET NULL;
        END
      `);
    } catch (err: any) {
      console.warn(`[ensureBookingColumns] Migrate ${colName} → DATETIMEOFFSET failed: ${err?.message}`);
    }
  }

  console.log('✅ Booking detail columns verified.');
}
