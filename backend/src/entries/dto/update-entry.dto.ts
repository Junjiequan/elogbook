import { IsInt, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import type { EntryContent } from '../entities/entry.entity.js';

export class UpdateEntryDto {
  /** The revision the edit was made on. If someone saved in the meantime the server answers 409. */
  @IsInt()
  @Min(1)
  revision: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsObject()
  content?: EntryContent;
}
