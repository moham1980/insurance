import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ChannelWorkspace, ChannelType, WorkspaceStatus } from './entities/ChannelWorkspace';
import { WorkspaceMembership } from './entities/WorkspaceMembership';
import { BrandConfig } from './entities/BrandConfig';

@Injectable()
export class WorkspaceService {
  constructor(
    @InjectRepository(ChannelWorkspace)
    private workspaceRepo: Repository<ChannelWorkspace>,
    @InjectRepository(WorkspaceMembership)
    private membershipRepo: Repository<WorkspaceMembership>,
    @InjectRepository(BrandConfig)
    private brandRepo: Repository<BrandConfig>,
  ) {}

  async createWorkspace(
    tenantId: string,
    actor: any,
    params: {
      organizationId: string;
      channelType: ChannelType;
      brandKey: string;
      domain?: string;
      allowedCapabilities?: string[];
      status?: WorkspaceStatus;
    },
  ): Promise<ChannelWorkspace> {
    if (actor.tenantId && actor.tenantId !== tenantId) {
      throw new ForbiddenException('Cannot create workspace for another tenant');
    }
    const brand = await this.brandRepo.findOne({ where: { brandKey: params.brandKey } });
    if (!brand) {
      throw new NotFoundException(`BrandConfig with key ${params.brandKey} not found`);
    }
    const ws = this.workspaceRepo.create({
      workspaceId: uuidv4(),
      tenantId,
      organizationId: params.organizationId,
      channelType: params.channelType,
      brandKey: params.brandKey,
      domain: params.domain || null,
      allowedCapabilities: Array.isArray(params.allowedCapabilities) ? params.allowedCapabilities : [],
      status: params.status || 'active',
    });
    return this.workspaceRepo.save(ws);
  }

  async listWorkspaces(tenantId: string, actor: any, params: { partyId?: string; limit?: number; offset?: number }) {
    const limit = Math.min(params.limit || 50, 200);
    const offset = params.offset || 0;
    const qb = this.workspaceRepo.createQueryBuilder('w').where('w.tenantId = :tenantId', { tenantId });

    if (params.partyId) {
      const memberWorkspaceIds = await this.membershipRepo
        .createQueryBuilder('m')
        .select('m.workspaceId')
        .where('m.partyId = :partyId', { partyId: params.partyId })
        .andWhere('m.revokedAt IS NULL')
        .getMany();
      if (memberWorkspaceIds.length > 0) {
        qb.andWhere('w.workspaceId IN (:...ids)', { ids: memberWorkspaceIds.map((m) => m.workspaceId) });
      } else if (!this.isAdmin(actor)) {
        return { rows: [], total: 0 };
      }
    }

    const [rows, total] = await qb
      .orderBy('w.createdAt', 'DESC')
      .take(limit)
      .skip(offset)
      .getManyAndCount();
    return { rows, total };
  }

  async getWorkspace(tenantId: string, actor: any, workspaceId: string): Promise<ChannelWorkspace> {
    const ws = await this.workspaceRepo.findOne({ where: { workspaceId } });
    if (!ws) throw new NotFoundException('Workspace not found');
    if (ws.tenantId !== tenantId) throw new ForbiddenException('Cross-tenant workspace access denied');
    if (!(await this.canAccessWorkspace(actor, ws))) throw new ForbiddenException('Workspace membership required');
    return ws;
  }

  async addMember(
    tenantId: string,
    actor: any,
    workspaceId: string,
    params: { partyId: string; role: string; grantedAt?: Date },
  ): Promise<WorkspaceMembership> {
    const ws = await this.getWorkspace(tenantId, actor, workspaceId);
    if (!this.isAdmin(actor) && !this.isWorkspaceAdmin(actor, ws)) {
      throw new ForbiddenException('Only workspace administrators can add members');
    }
    const membership = this.membershipRepo.create({
      membershipId: uuidv4(),
      workspaceId,
      partyId: params.partyId,
      role: params.role,
      grantedAt: params.grantedAt || new Date(),
      revokedAt: null,
    });
    return this.membershipRepo.save(membership);
  }

  async removeMember(tenantId: string, actor: any, workspaceId: string, membershipId: string): Promise<void> {
    const ws = await this.getWorkspace(tenantId, actor, workspaceId);
    if (!this.isAdmin(actor) && !this.isWorkspaceAdmin(actor, ws)) {
      throw new ForbiddenException('Only workspace administrators can remove members');
    }
    await this.membershipRepo.update({ membershipId, workspaceId }, { revokedAt: new Date() });
  }

  async listMyWorkspaces(tenantId: string, actor: any, partyId: string, params: { limit?: number; offset?: number }) {
    const limit = Math.min(params.limit || 50, 200);
    const offset = params.offset || 0;
    const qb = this.workspaceRepo
      .createQueryBuilder('w')
      .innerJoin(WorkspaceMembership, 'm', 'm.workspaceId = w.workspaceId')
      .where('w.tenantId = :tenantId', { tenantId })
      .andWhere('m.partyId = :partyId', { partyId })
      .andWhere('m.revokedAt IS NULL')
      .orderBy('w.createdAt', 'DESC')
      .take(limit)
      .skip(offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async listWorkspacesByOrganization(
    tenantId: string,
    actor: any,
    organizationId: string,
    params: { limit?: number; offset?: number },
  ) {
    const limit = Math.min(params.limit || 50, 200);
    const offset = params.offset || 0;
    const qb = this.workspaceRepo
      .createQueryBuilder('w')
      .where('w.tenantId = :tenantId', { tenantId })
      .andWhere('w.organizationId = :organizationId', { organizationId })
      .andWhere('w.status = :status', { status: 'active' })
      .orderBy('w.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    if (!this.isAdmin(actor)) {
      const actorOrgId = actor?.organizationId || actor?.orgUnitId;
      if (actorOrgId && actorOrgId !== organizationId) {
        const memberWorkspaceIds = await this.membershipRepo
          .createQueryBuilder('m')
          .select('m.workspaceId')
          .where('m.partyId = :partyId', { partyId: actor?.partyId || actor?.userId })
          .andWhere('m.revokedAt IS NULL')
          .getMany();
        if (memberWorkspaceIds.length > 0) {
          qb.andWhere('w.workspaceId IN (:...ids)', { ids: memberWorkspaceIds.map((m) => m.workspaceId) });
        } else {
          return { rows: [], total: 0 };
        }
      }
    }

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  private isAdmin(actor: any): boolean {
    return Array.isArray(actor?.roles) && (actor.roles.includes('insurer_admin') || actor.roles.includes('tenant_admin') || actor.roles.includes('broker_admin'));
  }

  private isWorkspaceAdmin(actor: any, ws: ChannelWorkspace): boolean {
    // Simplistic: if actor has a workspace membership with role workspace_admin matching workspace
    return false;
  }

  private async canAccessWorkspace(actor: any, ws: ChannelWorkspace): Promise<boolean> {
    if (this.isAdmin(actor)) return true;
    if (!actor?.userId && !actor?.partyId) return false;
    const partyId = actor.partyId || actor.userId;
    const membership = await this.membershipRepo.findOne({
      where: { workspaceId: ws.workspaceId, partyId, revokedAt: IsNull() },
    });
    return !!membership;
  }
}
