import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationUnit, OrganizationUnitType } from './entities/OrganizationUnit';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrgUnitsService {
  constructor(@InjectRepository(OrganizationUnit) private readonly repo: Repository<OrganizationUnit>) {}

  async getSubtreeOrgUnitIds(rootOrgUnitId: string, tenantId?: string | null): Promise<string[]> {
    const rows = (await this.repo.query(
      `
      WITH RECURSIVE tree AS (
        SELECT
          org_unit_id,
          parent_org_unit_id,
          tenant_id,
          ARRAY[org_unit_id] AS path
        FROM org_units
        WHERE org_unit_id = $1 AND is_active = true
          AND ($2::uuid IS NULL OR tenant_id = $2::uuid)

        UNION ALL

        SELECT
          ou.org_unit_id,
          ou.parent_org_unit_id,
          ou.tenant_id,
          tree.path || ou.org_unit_id
        FROM org_units ou
        JOIN tree ON ou.parent_org_unit_id = tree.org_unit_id
        WHERE ou.is_active = true
          AND ($2::uuid IS NULL OR ou.tenant_id = $2::uuid)
          AND NOT (ou.org_unit_id = ANY(tree.path))
      )
      SELECT org_unit_id FROM tree;
      `,
      [rootOrgUnitId, tenantId || null]
    )) as Array<{ org_unit_id: string }>;

    return rows.map((r) => r.org_unit_id);
  }

  async create(params: {
    type: OrganizationUnitType;
    name: string;
    code: string;
    parentOrgUnitId?: string | null;
    tenantId?: string | null;
    metadata?: Record<string, any> | null;
  }): Promise<OrganizationUnit> {
    const existing = await this.repo.findOne({ where: { code: params.code } });
    if (existing) {
      const err: any = new Error('Organization unit with this code already exists');
      err.code = 'DUPLICATE_CODE';
      throw err;
    }

    const entity = this.repo.create({
      orgUnitId: uuidv4(),
      type: params.type,
      name: params.name,
      code: params.code,
      parentOrgUnitId: params.parentOrgUnitId ?? null,
      tenantId: params.tenantId ?? null,
      metadata: params.metadata ?? null,
      isActive: true,
    });

    await this.repo.save(entity);
    return entity;
  }

  async get(orgUnitId: string, tenantId?: string | null): Promise<OrganizationUnit | null> {
    return this.repo.findOne({ where: { orgUnitId, tenantId: tenantId ?? undefined } });
  }

  async list(params: {
    type?: OrganizationUnitType;
    parentOrgUnitId?: string;
    limit: number;
    offset: number;
    allowedOrgUnitIds?: string[];
    tenantId?: string | null;
  }) {
    const qb = this.repo.createQueryBuilder('ou');
    qb.where('ou.is_active = true');

    if (params.tenantId) {
      qb.andWhere('ou.tenant_id = :tenantId', { tenantId: params.tenantId });
    }

    if (Array.isArray(params.allowedOrgUnitIds)) {
      if (params.allowedOrgUnitIds.length === 0) {
        return { rows: [], total: 0 };
      }
      qb.andWhere('ou.org_unit_id IN (:...allowedOrgUnitIds)', { allowedOrgUnitIds: params.allowedOrgUnitIds });
    }

    if (params.type) qb.andWhere('ou.type = :type', { type: params.type });
    if (params.parentOrgUnitId) qb.andWhere('ou.parent_org_unit_id = :parentOrgUnitId', { parentOrgUnitId: params.parentOrgUnitId });

    qb.orderBy('ou.created_at', 'DESC').limit(params.limit).offset(params.offset);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }
}
