import { Test } from '@nestjs/testing';
import { InsurerController } from './insurer.controller';
import { InsurerBffService } from './insurer-bff.service';

describe('InsurerController', () => {
  let controller: InsurerController;
  let service: Partial<InsurerBffService>;

  beforeEach(async () => {
    service = {
      listProducts: jest.fn().mockResolvedValue({ rows: [] }),
      processRfq: jest.fn().mockResolvedValue({ processed: true }),
    };

    const module = await Test.createTestingModule({
      controllers: [InsurerController],
      providers: [{ provide: InsurerBffService, useValue: service }],
    }).compile();

    controller = module.get(InsurerController);
  });

  it('lists products with pagination', async () => {
    const req = { headers: { authorization: 'Bearer token' } };
    const res = await controller.listProducts('50', '0', req, { 'x-correlation-id': 'cid-2' });
    expect(res.success).toBe(true);
    expect(res.correlationId).toBe('cid-2');
    expect(service.listProducts).toHaveBeenCalledWith('Bearer token', { limit: 50, offset: 0 });
  });
});
