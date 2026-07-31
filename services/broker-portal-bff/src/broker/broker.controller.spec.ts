import { Test } from '@nestjs/testing';
import { BrokerController } from './broker.controller';
import { BrokerBffService } from './broker-bff.service';

describe('BrokerController', () => {
  let controller: BrokerController;
  let service: Partial<BrokerBffService>;

  beforeEach(async () => {
    service = {
      getDashboard: jest.fn().mockResolvedValue({ stats: [] }),
      listSubmissions: jest.fn().mockResolvedValue({ rows: [] }),
    };

    const module = await Test.createTestingModule({
      controllers: [BrokerController],
      providers: [{ provide: BrokerBffService, useValue: service }],
    }).compile();

    controller = module.get(BrokerController);
  });

  it('returns dashboard with correlation id', async () => {
    const req = { headers: { authorization: 'Bearer token' } };
    const res = await controller.dashboard(req, { 'x-correlation-id': 'cid-1' });
    expect(res.success).toBe(true);
    expect(res.correlationId).toBe('cid-1');
    expect(service.getDashboard).toHaveBeenCalledWith('Bearer token');
  });
});
