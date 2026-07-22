import { Test, TestingModule } from '@nestjs/testing';
import { TicketTierController } from './ticket-tier.controller';

describe('TicketTierController', () => {
  let controller: TicketTierController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketTierController],
    }).compile();

    controller = module.get<TicketTierController>(TicketTierController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
