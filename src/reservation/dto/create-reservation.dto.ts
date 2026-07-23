import { IsInt, IsNotEmpty, IsPositive, IsUUID } from 'class-validator';

export class CreateReservationDto {
  @IsNotEmpty({ message: 'Ticket ID is required' })
  @IsUUID(4, { message: 'Ticket ID must be a UUID' })
  ticketId!: string;

  @IsNotEmpty({ message: 'Quantity is required' })
  @IsPositive({ message: 'Quantity must be a positive number' })
  @IsInt({ message: 'Quantity must be an integer' })
  quantity!: number;
}
