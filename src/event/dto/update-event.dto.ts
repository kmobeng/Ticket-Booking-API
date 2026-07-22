import { IsDate, IsIn, IsOptional, IsString } from 'class-validator';
import { EventStatus } from '../../../generated/prisma/enums';
import { Transform, Type } from 'class-transformer';

export class UpdateEventDto {
  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'Venue must be a string' })
  venue?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Start date must be a valid date' })
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'End date must be a valid date' })
  endDate?: Date;

  //status should be DRAFT only
  @IsOptional()
  @Transform(({ value }) => value?.toUpperCase())
  @IsIn([EventStatus.DRAFT], { message: 'Status must be DRAFT' })
  status?: EventStatus;
}
