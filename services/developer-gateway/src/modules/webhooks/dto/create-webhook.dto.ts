import { ArrayNotEmpty, IsArray, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateWebhookDto {
  @IsString()
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  @MaxLength(2048)
  url!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  events!: string[];
}
