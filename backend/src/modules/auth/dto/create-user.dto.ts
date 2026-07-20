import { IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  @Matches(/^[a-zA-Z0-9._-]+(?:@inventec\.com)?$/i, {
    message: 'El correo debe pertenecer al dominio @inventec.com.',
  })
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsString()
  @IsIn(['admin', 'user'])
  role!: 'admin' | 'user';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
