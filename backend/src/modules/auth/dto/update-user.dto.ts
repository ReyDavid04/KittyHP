import { IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  @Matches(/^[a-zA-Z0-9._-]+(?:@inventec\.com)?$/i, {
    message: 'El correo debe pertenecer al dominio @inventec.com.',
  })
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;

  @IsOptional()
  @IsString()
  @IsIn(['admin', 'user', 'viewer'])
  role?: 'admin' | 'user' | 'viewer';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
