import { IsString, MaxLength } from 'class-validator';

export class OAuthCredentialDto {
  /** The ID token (a JWT) the provider's button returned. */
  @IsString()
  @MaxLength(8192)
  credential: string;
}
