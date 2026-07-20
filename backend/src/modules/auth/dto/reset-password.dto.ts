import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9._-]+(?:@inventec\.com)?$/i, {
    message: 'Captura un correo corporativo válido.',
  })
  email!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'El código debe contener 6 dígitos.' })
  code!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
