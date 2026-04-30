import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

/**
 * Append-only audit trail for security-sensitive actions.
 *
 * Captures:
 *   • Actor identity (user id, role, email — denormalised for resilience)
 *   • Action namespaced as `<domain>.<verb>` (e.g. `booking.cancel`)
 *   • Target entity (type + id)
 *   • Network context (ip, userAgent)
 *   • Outcome (success / errorMessage)
 *   • Sanitised metadata + before/after diffs
 *
 * **Never store** raw passwords, full PANs, CVVs, or auth tokens — the
 * `auditService` redacts these automatically before writing.
 *
 * Records are immutable: there is no `updateAuditLog` API. Old rows are
 * purged by a retention cron (`/api/cron/purge-audit-logs`).
 */
export interface AuditLogAttributes {
  id: number;
  actorUserId: number | null;
  actorRole: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string | null;
  entityId: number | null;
  ip: string | null;
  userAgent: string | null;
  metadata: any | null;
  before: any | null;
  after: any | null;
  success: boolean;
  errorMessage: string | null;
  createdAt?: Date;
}

type AuditLogCreationAttributes = Optional<AuditLogAttributes, 'id' | 'createdAt'>;

export class AuditLog
  extends Model<AuditLogAttributes, AuditLogCreationAttributes>
  implements AuditLogAttributes
{
  public id!: number;
  public actorUserId!: number | null;
  public actorRole!: string | null;
  public actorEmail!: string | null;
  public action!: string;
  public entityType!: string | null;
  public entityId!: number | null;
  public ip!: string | null;
  public userAgent!: string | null;
  public metadata!: any | null;
  public before!: any | null;
  public after!: any | null;
  public success!: boolean;
  public errorMessage!: string | null;
  public readonly createdAt!: Date;
}

AuditLog.init(
  {
    id:           { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    actorUserId:  { type: DataTypes.INTEGER, allowNull: true },
    actorRole:    { type: DataTypes.STRING(50), allowNull: true },
    actorEmail:   { type: DataTypes.STRING(255), allowNull: true },
    action:       { type: DataTypes.STRING(100), allowNull: false },
    entityType:   { type: DataTypes.STRING(50), allowNull: true },
    entityId:     { type: DataTypes.INTEGER, allowNull: true },
    ip:           { type: DataTypes.STRING(64), allowNull: true },
    userAgent:    { type: DataTypes.STRING(500), allowNull: true },
    metadata:     { type: DataTypes.TEXT, allowNull: true,
                    get(this: any) {
                      const v = this.getDataValue('metadata');
                      try { return v ? JSON.parse(v) : null; } catch { return v; }
                    },
                    set(this: any, v: any) {
                      this.setDataValue('metadata', v == null ? null : JSON.stringify(v));
                    } },
    before:       { type: DataTypes.TEXT, allowNull: true,
                    get(this: any) {
                      const v = this.getDataValue('before');
                      try { return v ? JSON.parse(v) : null; } catch { return v; }
                    },
                    set(this: any, v: any) {
                      this.setDataValue('before', v == null ? null : JSON.stringify(v));
                    } },
    after:        { type: DataTypes.TEXT, allowNull: true,
                    get(this: any) {
                      const v = this.getDataValue('after');
                      try { return v ? JSON.parse(v) : null; } catch { return v; }
                    },
                    set(this: any, v: any) {
                      this.setDataValue('after', v == null ? null : JSON.stringify(v));
                    } },
    success:      { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    errorMessage: { type: DataTypes.STRING(1000), allowNull: true },
  },
  {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    timestamps: true,
    updatedAt: false, // append-only
    indexes: [
      { fields: ['action'] },
      { fields: ['entityType', 'entityId'] },
      { fields: ['actorUserId'] },
      { fields: ['createdAt'] },
    ],
  }
);

export default AuditLog;
