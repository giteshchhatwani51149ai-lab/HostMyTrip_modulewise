import sequelize from '../config/database';

/**
 * MSSQL-safe idempotent column-add helper.
 * Adds new margin columns to the `corporates` table only if they don't already exist.
 * Safe to call repeatedly on every server boot.
 */
export async function ensureCorporateColumns() {
  const cols = [
    { name: 'flight_margin_percent', ddl: 'DECIMAL(5,2) NULL' },
    { name: 'flight_margin_amount', ddl: 'DECIMAL(10,2) NULL' },
    { name: 'hotel_margin_percent', ddl: 'DECIMAL(5,2) NULL' },
    { name: 'hotel_margin_amount', ddl: 'DECIMAL(10,2) NULL' },
  ];

  // Add columns if missing
  for (const c of cols) {
    const sql = `
      IF NOT EXISTS (
        SELECT 1 FROM sys.columns
        WHERE Name = N'${c.name}'
          AND Object_ID = Object_ID(N'corporates')
      )
      BEGIN
        ALTER TABLE corporates ADD ${c.name} ${c.ddl};
      END
    `;
    try {
      await sequelize.query(sql);
      console.log(`✅ Column ${c.name} verified on corporates table`);
    } catch (err: any) {
      console.warn(`[ensureCorporateColumns] Failed for ${c.name}: ${err?.message}`);
    }
  }

  console.log('✅ Corporate margin columns verified.');
}
