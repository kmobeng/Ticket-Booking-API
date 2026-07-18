import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @IsNotEmpty({ message: 'Current password is required' })
  @IsString({ message: 'Current password must be a string' })
  @MinLength(8, {
    message: 'Current password must be at least 8 characters long',
  })
  currentPassword!: string;

  @IsNotEmpty({ message: 'New password is required' })
  @IsString({ message: 'New password must be a string' })
  @MinLength(8, {
    message: 'New password must be at least 8 characters long',
  })
  newPassword!: string;
}
