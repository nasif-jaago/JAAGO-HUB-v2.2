export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantScopedEntity extends BaseEntity {
  organizationId: string;
}

export * from './accounting/journal-engine';
export * from './studio/custom-field-validator';
export * from './attendance';
