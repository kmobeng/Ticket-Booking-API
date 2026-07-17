import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateMeDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  name!: string;
}
