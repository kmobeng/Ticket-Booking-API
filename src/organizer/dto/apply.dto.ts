import { IsNotEmpty, IsString } from 'class-validator';

export class ApplyDto {
  @IsNotEmpty({ message: 'Business name is required' })
  @IsString({ message: 'Business name must be a string' })
  businessName!: string;
}
