import { IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'El usuario solo puede contener letras, números, punto, guion y guion bajo.',
  })
  username!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  displayName!: string;

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
