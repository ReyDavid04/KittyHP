import { IsString, Matches } from 'class-validator';

export class ForgotPasswordDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9._-]+(?:@inventec\.com)?$/i, {
    message: 'Captura un correo corporativo válido.',
  })
  email!: string;
}
