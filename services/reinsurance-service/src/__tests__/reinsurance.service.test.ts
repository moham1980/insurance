import { ReinsuranceService } from '../reinsurance.service';
import { ReTreaty } from '../entities/ReTreaty';
import { ReCession } from '../entities/ReCession';
import { ReStatement } from '../entities/ReStatement';
import { ReReconciliation } from '../entities/ReReconciliation';
import { ReClaimRecovery } from '../entities/ReClaimRecovery';
import { ReTicket } from '../entities/ReTicket';
import { ReTicketMessage } from '../entities/ReTicketMessage';
import { ReTicketAttachment } from '../entities/ReTicketAttachment';

class FakeRepo<T extends { [key: string]: any }> {
  items: T[] = [];

  create(dto: Partial<T>): T {
    return dto as T;
  }

  async save(item: T): Promise<T> {
    const idx = this.items.findIndex((i) => (i as any).id === (item as any).id);
    if (idx >= 0) this.items[idx] = item;
    else this.items.push(item);
    return item;
  }

  async findOne(opts: any): Promise<T | null> {
    const where = opts?.where || {};
    return this.items.find((i) => Object.entries(where).every(([k, v]) => (i as any)[k] === v)) || null;
  }

  async find(opts?: any): Promise<T[]> {
    const where = opts?.where || {};
    let result = this.items.filter((i) => Object.entries(where).every(([k, v]) => (i as any)[k] === v));
    if (opts?.order?.createdAt === 'DESC') result = [...result].sort((a, b) => +b.createdAt - +a.createdAt);
    if (opts?.take) result = result.slice(0, opts.take);
    return result;
  }

  createQueryBuilder(alias: string) {
    let result = [...this.items];
    const builder: any = {
      where: {} as any,
      andWhere: jest.fn(function (this: any, _clause: string, params: any) {
        Object.assign(this.where, params);
        return this;
      }),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      async getManyAndCount(): Promise<[T[], number]> {
        const filtered = result.filter((i) => Object.entries(builder.where).every(([k, v]) => (i as any)[k] === v));
        return [filtered, filtered.length];
      },
    };
    builder.andWhere = builder.andWhere.bind(builder);
    return builder;
  }

  async getManyAndCount(): Promise<[T[], number]> {
    return [this.items, this.items.length];
  }
}

function createService() {
  const treatiesRepo = new FakeRepo<ReTreaty>() as any;
  const cessionsRepo = new FakeRepo<ReCession>() as any;
  const statementsRepo = new FakeRepo<ReStatement>() as any;
  const reconciliationsRepo = new FakeRepo<ReReconciliation>() as any;
  const recoveriesRepo = new FakeRepo<ReClaimRecovery>() as any;
  const ticketsRepo = new FakeRepo<ReTicket>() as any;
  const ticketMessagesRepo = new FakeRepo<ReTicketMessage>() as any;
  const ticketAttachmentsRepo = new FakeRepo<ReTicketAttachment>() as any;

  const dataSource = {
    transaction: async (fn: any) => {
      const manager = {
        getRepository: (entity: any) => {
          if (entity === ReTreaty) return treatiesRepo;
          if (entity === ReCession) return cessionsRepo;
          if (entity === ReStatement) return statementsRepo;
          return {} as any;
        },
      };
      return await fn(manager as any);
    },
    query: jest.fn(),
  } as any;

  const service = new ReinsuranceService(
    dataSource,
    treatiesRepo,
    cessionsRepo,
    statementsRepo,
    reconciliationsRepo,
    recoveriesRepo,
    ticketsRepo,
    ticketMessagesRepo,
    ticketAttachmentsRepo,
    { create: jest.fn().mockReturnValue({}), save: jest.fn().mockResolvedValue({}), find: jest.fn().mockResolvedValue([]) } as any, // AuditLog repo (P1 #10)
    { create: jest.fn().mockReturnValue({}), save: jest.fn().mockResolvedValue({}), find: jest.fn().mockResolvedValue([]) } as any, // EntityVersion repo (P1 #10)
  );

  return { service, treatiesRepo, cessionsRepo, statementsRepo };
}

describe('ReinsuranceService tenant isolation', () => {
  it('createTreaty should reject duplicate treatyNumber within same tenant', async () => {
    const { service } = createService();

    await service.createTreaty({
      tenantId: 'tenant-a',
      treatyNumber: 'T-001',
      reinsurerName: 'R1',
      treatyType: 'proportional',
      effectiveFrom: '2026-01-01',
    });

    await expect(
      service.createTreaty({
        tenantId: 'tenant-a',
        treatyNumber: 'T-001',
        reinsurerName: 'R2',
        treatyType: 'proportional',
        effectiveFrom: '2026-01-01',
      })
    ).rejects.toThrow('treatyNumber already exists for tenant');

    const t2 = await service.createTreaty({
      tenantId: 'tenant-b',
      treatyNumber: 'T-001',
      reinsurerName: 'R2',
      treatyType: 'proportional',
      effectiveFrom: '2026-01-01',
    });
    expect(t2.tenantId).toBe('tenant-b');
  });

  it('listTreaties should return only same-tenant treaties', async () => {
    const { service, treatiesRepo } = createService();

    const a = { treatyId: 't-a-1', tenantId: 'tenant-a', status: 'active' } as any;
    const b = { treatyId: 't-b-1', tenantId: 'tenant-b', status: 'active' } as any;
    await treatiesRepo.save(a);
    await treatiesRepo.save(b);

    const result = await service.listTreaties({ tenantId: 'tenant-a', limit: 10, offset: 0 });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].tenantId).toBe('tenant-a');
  });
});

describe('ReinsuranceService closePeriod aggregation', () => {
  it('closePeriod aggregates approved cessions and marks them settled', async () => {
    const { service, treatiesRepo, cessionsRepo, statementsRepo } = createService();

    const treaty = {
      treatyId: 'trt-1',
      tenantId: 'tenant-a',
      treatyType: 'proportional',
      status: 'active',
      currency: 'IRR',
      retentionRate: null,
      cessionRate: '50',
      effectiveFrom: '2026-01-01',
      effectiveTo: null,
    } as any;
    await treatiesRepo.save(treaty);

    const c1 = {
      cessionId: 'c-1',
      tenantId: 'tenant-a',
      treatyId: 'trt-1',
      status: 'approved',
      cededAmount: '1000000',
      premium: '50000',
      createdAt: new Date('2026-01-15'),
      updatedAt: new Date(),
    } as any;
    const c2 = {
      cessionId: 'c-2',
      tenantId: 'tenant-a',
      treatyId: 'trt-1',
      status: 'approved',
      cededAmount: '2000000',
      premium: '100000',
      createdAt: new Date('2026-01-20'),
      updatedAt: new Date(),
    } as any;
    await cessionsRepo.save(c1);
    await cessionsRepo.save(c2);

    const result = await service.closePeriod({
      tenantId: 'tenant-a',
      treatyId: 'trt-1',
      periodEnd: '2026-01-31',
    });

    expect(result.cessionsClosed).toBe(2);
    expect(result.statementsCreated).toBe(1);

    const statement = statementsRepo.items[0];
    expect(statement).toBeTruthy();
    expect(statement.tenantId).toBe('tenant-a');
    expect(statement.treatyId).toBe('trt-1');
    expect(statement.totals.totalCessions).toBe(2);
    expect(parseFloat(statement.totals.totalCededAmount)).toBe(3000000);
    expect(parseFloat(statement.totals.totalPremium)).toBe(150000);

    expect(c1.status).toBe('settled');
    expect(c2.status).toBe('settled');
  });
});

describe('ReinsuranceService cession calculation', () => {
  it('calculateAutomaticCessions filters by productCode and tenant', async () => {
    const { service, treatiesRepo } = createService();

    const t1 = {
      treatyId: 't1',
      tenantId: 'tenant-a',
      treatyType: 'proportional',
      status: 'active',
      currency: 'IRR',
      retentionRate: null,
      cessionRate: '50',
      effectiveFrom: '2026-01-01',
      effectiveTo: null,
      terms: { productCodes: ['motor'] },
    } as any;
    const t2 = {
      treatyId: 't2',
      tenantId: 'tenant-a',
      treatyType: 'proportional',
      status: 'active',
      currency: 'IRR',
      retentionRate: null,
      cessionRate: '30',
      effectiveFrom: '2026-01-01',
      effectiveTo: null,
      terms: { productCodes: ['fire'] },
    } as any;
    await treatiesRepo.save(t1);
    await treatiesRepo.save(t2);

    const result = await service.calculateAutomaticCessions({
      tenantId: 'tenant-a',
      policyId: 'p-1',
      policyNumber: 'POL-1',
      sumInsured: 1_000_000,
      premium: 50_000,
      productCode: 'motor',
      effectiveDate: '2026-01-15',
      correlationId: 'cid-1',
    });

    expect(result.cessions).toHaveLength(1);
    expect(result.cessions[0].treatyId).toBe('t1');
    expect(result.totalCeded).toBe(500_000);
    expect(result.totalRetained).toBe(500_000);
  });
});
