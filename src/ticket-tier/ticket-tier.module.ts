import { Module } from '@nestjs/common';
import { TicketTierService } from './ticket-tier.service';
import { TicketTierController } from './ticket-tier.controller';

@Module({
  providers: [TicketTierService],
  controllers: [TicketTierController],
})
export class TicketTierModule {}
