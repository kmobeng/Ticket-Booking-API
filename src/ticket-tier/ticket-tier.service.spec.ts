import { Test, TestingModule } from '@nestjs/testing';
import { TicketTierService } from './ticket-tier.service';

describe('TicketTierService', () => {
  let service: TicketTierService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TicketTierService],
    }).compile();

    service = module.get<TicketTierService>(TicketTierService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
