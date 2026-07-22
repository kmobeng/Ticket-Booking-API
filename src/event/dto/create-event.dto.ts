import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateEventDto {
  @IsNotEmpty({ message: 'Title is required' })
  @IsString({ message: 'Title must be a string' })
  title!: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @IsNotEmpty({ message: 'Venue is required' })
  @IsString({ message: 'Venue must be a string' })
  venue!: string;

  @IsNotEmpty({ message: 'Start date is required' })
  @Type(() => Date)
  @IsDate({ message: 'Start date must be a valid date' })
  startDate!: Date;

  @IsNotEmpty({ message: 'End date is required' })
  @Type(() => Date)
  @IsDate({ message: 'End date must be a valid date' })
  endDate!: Date;
}
