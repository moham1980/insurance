import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Party } from '../entities/Party';
import { PiiReference } from '../entities/PiiReference';
import { PartyRoleAssignment, PartyRoleType } from '../entities/PartyRoleAssignment';
import { GlobalSubject } from '../entities/GlobalSubject';
import { IdentityIdentifier } from '../entities/IdentityIdentifier';
import { IdentityLink } from '../entities/IdentityLink';
import { encryptAead, blindIndex as piiBlindIndex } from '../pii-crypto';

export interface PartyKycContext {
  tenantId: string;
  userId: string;
  roles: string[];
  organizationId?: string;
  correlationId: string;
}

@Injectable()
export class IdentityService {
  constructor(
    @InjectRepository(Party)
    private readonly partyRepo: Repository<Party>,
    @InjectRepository(PiiReference)
    private readonly piiRepo: Repository<PiiReference>,
    @InjectRepository(PartyRoleAssignment)
    private readonly roleRepo: Repository<PartyRoleAssignment>,
    @InjectRepository(GlobalSubject)
    private readonly globalSubjectRepo: Repository<GlobalSubject>,
    @InjectRepository(IdentityIdentifier)
    private readonly identifierRepo: Repository<IdentityIdentifier>,
    @InjectRepository(IdentityLink)
    private readonly linkRepo: Repository<IdentityLink>,
    private readonly dataSource: DataSource,
  ) {}

  private assertTenant(ctx: PartyKycContext, tenantId: string) {
    if (ctx.tenantId !== tenantId && !ctx.roles.includes('insurer_admin')) {
      throw new ForbiddenException('Cross-tenant access denied');
    }
  }

  async createPartyRole(ctx: PartyKycContext, partyId: string, dto: any): Promise<PartyRoleAssignment> {
    this.assertTenant(ctx, ctx.tenantId);
    const validFrom = new Date(dto.validFrom || new Date());
    const validTo = dto.validTo ? new Date(dto.validTo) : null;
    if (validTo && validTo <= validFrom) {
      throw new Error('validTo must be after validFrom');
    }
    const existing = await this.roleRepo.find({
      where: { partyId, organizationId: dto.organizationId, tenantId: ctx.tenantId, roleType: dto.roleType, status: 'active' },
    });
    const now = new Date();
    for (const r of existing) {
      if (this.overlaps(r.validFrom, r.validTo, validFrom, validTo)) {
        throw new Error('Overlapping active role assignment');
      }
    }
    const role = this.roleRepo.create({
      assignmentId: uuidv4(),
      partyId,
      organizationId: dto.organizationId,
      tenantId: ctx.tenantId,
      roleType: dto.roleType,
      scope: dto.scope || [],
      validFrom,
      validTo,
      status: dto.status || 'active',
    });
    return this.roleRepo.save(role);
  }

  async listPartyRoles(ctx: PartyKycContext, partyId: string): Promise<PartyRoleAssignment[]> {
    return this.roleRepo.find({ where: { partyId, tenantId: ctx.tenantId } });
  }

  async revokePartyRole(ctx: PartyKycContext, partyId: string, assignmentId: string): Promise<PartyRoleAssignment> {
    const role = await this.roleRepo.findOne({ where: { assignmentId, partyId, tenantId: ctx.tenantId } });
    if (!role) throw new NotFoundException('Role assignment not found');
    role.status = 'revoked';
    role.validTo = new Date();
    role.updatedAt = new Date();
    return this.roleRepo.save(role);
  }

  async createGlobalSubject(ctx: PartyKycContext, dto: any): Promise<GlobalSubject> {
    const subject = this.globalSubjectRepo.create({
      globalSubjectId: uuidv4(),
      iamSubjectId: dto.iamSubjectId,
      assuranceLevel: dto.assuranceLevel || 'low',
      status: dto.status || 'active',
    });
    return this.globalSubjectRepo.save(subject);
  }

  async createIdentifier(ctx: PartyKycContext, globalSubjectId: string, dto: any): Promise<IdentityIdentifier> {
    return this.dataSource.transaction(async (manager) => {
      const piiRepo = manager.getRepository(PiiReference);
      const identifierRepo = manager.getRepository(IdentityIdentifier);

      const normalized = dto.type === 'NATIONAL_ID' || dto.type === 'MOBILE' ? (dto.value || dto.encryptedValueRef || '') : '';
      let piiRef: PiiReference | null = null;
      if (normalized && (dto.type === 'NATIONAL_ID' || dto.type === 'MOBILE' || dto.type === 'EMAIL')) {
        const ciphertext = encryptAead(dto.value || dto.encryptedValueRef);
        piiRef = piiRepo.create({
          piiReferenceId: uuidv4(),
          piiType: dto.type,
          ciphertext,
          keyVersion: 'v1',
          blindIndex: piiBlindIndex(normalized),
          tenantId: ctx.tenantId,
          kmsProvider: process.env.PII_STORE_PROVIDER || 'local',
          vaultPath: process.env.VAULT_ADDR || null,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        piiRef = await piiRepo.save(piiRef);
      }

      const identifier = identifierRepo.create({
        identifierId: uuidv4(),
        globalSubjectId,
        type: dto.type,
        blindIndex: dto.blindIndex || (normalized ? piiBlindIndex(normalized) : ''),
        encryptedValueRef: dto.encryptedValueRef,
        piiReferenceId: piiRef ? piiRef.piiReferenceId : null,
        verifiedAt: dto.verifiedAt ? new Date(dto.verifiedAt) : null,
        status: dto.status || 'active',
      });
      return identifierRepo.save(identifier);
    });
  }

  async createIdentityLink(ctx: PartyKycContext, globalSubjectId: string, dto: any): Promise<IdentityLink> {
    this.assertTenant(ctx, dto.tenantId);
    const link = this.linkRepo.create({
      linkId: uuidv4(),
      globalSubjectId,
      tenantId: dto.tenantId,
      localPartyId: dto.localPartyId,
      verificationLevel: dto.verificationLevel || 'none',
      linkedAt: new Date(dto.linkedAt || new Date()),
      revokedAt: null,
    });
    return this.linkRepo.save(link);
  }

  async revokeIdentityLink(ctx: PartyKycContext, globalSubjectId: string, linkId: string): Promise<IdentityLink> {
    const link = await this.linkRepo.findOne({ where: { linkId, globalSubjectId } });
    if (!link) throw new NotFoundException('Identity link not found');
    this.assertTenant(ctx, link.tenantId);
    link.revokedAt = new Date();
    link.updatedAt = new Date();
    return this.linkRepo.save(link);
  }

  private overlaps(startA: Date, endA: Date | null, startB: Date, endB: Date | null): boolean {
    const aEnd = endA || new Date('9999-12-31T23:59:59Z');
    const bEnd = endB || new Date('9999-12-31T23:59:59Z');
    return startA <= bEnd && startB <= aEnd;
  }
}
