import { IsArray, IsBoolean, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateWebhookDto {
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  @MaxLength(2048)
  url?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  events?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
