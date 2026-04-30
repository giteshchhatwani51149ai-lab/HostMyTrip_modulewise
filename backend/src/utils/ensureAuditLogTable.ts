import sequelize from '../config/database';

/**
 * Idempotently create the `audit_logs` table on every server boot.
 * Mirrors the seed-script pattern used elsewhere (we cannot rely on
 * Sequelize sync() against MSSQL).
 */
export async function ensureAuditLogTable() {
  try {
    await sequelize.query(`
      IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_NAME = 'audit_logs'
      )
      BEGIN
        CREATE TABLE audit_logs (
          id              INT IDENTITY(1,1) PRIMARY KEY,
          actorUserId     INT NULL,
          actorRole       NVARCHAR(50) NULL,
          actorEmail      NVARCHAR(255) NULL,
          [action]        NVARCHAR(100) NOT NULL,
          entityType      NVARCHAR(50) NULL,
          entityId        INT NULL,
          ip              NVARCHAR(64) NULL,
          userAgent       NVARCHAR(500) NULL,
          metadata        NVARCHAR(MAX) NULL,
          [before]        NVARCHAR(MAX) NULL,
          [after]         NVARCHAR(MAX) NULL,
          success         BIT NOT NULL CONSTRAINT DF_audit_logs_success DEFAULT 1,
          errorMessage    NVARCHAR(1000) NULL,
          createdAt       DATETIMEOFFSET NOT NULL CONSTRAINT DF_audit_logs_createdAt DEFAULT SYSDATETIMEOFFSET()
        );
        CREATE INDEX IX_audit_logs_action     ON audit_logs([action]);
        CREATE INDEX IX_audit_logs_entity     ON audit_logs(entityType, entityId);
        CREATE INDEX IX_audit_logs_actor      ON audit_logs(actorUserId);
        CREATE INDEX IX_audit_logs_createdAt  ON audit_logs(createdAt DESC);
      END
    `);
    console.log('✅ Audit log table verified.');
  } catch (err: any) {
    console.warn('[ensureAuditLogTable] Failed:', err?.message);
  }
}
