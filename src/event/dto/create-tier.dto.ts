import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';
import { Ticket_Type } from '../../../generated/prisma/enums';

export class CreateTierDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsIn(
    [
      Ticket_Type.GENERAL,
      Ticket_Type.VIP,
      Ticket_Type.EARLY_BIRD,
      Ticket_Type.VVIP,
    ],
    { message: 'Invalid ticket type' },
  )
  name!: Ticket_Type;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: 'Price must be a number' })
  @IsPositive()
  @IsNotEmpty({ message: 'Price is required' })
  price!: number;

  @IsInt({ message: 'Quantity must be an integer' })
  @IsPositive()
  @IsNotEmpty({ message: 'Quantity is required' })
  quantity!: number;
}
