import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { MEMBER_ROLES, type MemberRole } from '../entities/logbook-member.entity.js';
import { VISIBILITIES, type Visibility } from '../entities/logbook.entity.js';

export class MemberInputDto {
  /** The person is found by email; someone who has not signed in yet is invited. */
  @IsEmail()
  @MaxLength(254)
  email: string;

  /**
   * What the person may do: `owner` everything (settings, members, delete); `editor` add and edit entries
   * and manage versions; `viewer` read only. See "Roles" in the README.
   */
  @IsIn(MEMBER_ROLES)
  role: MemberRole;
}

export class UpdateLogbookDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  description?: string;

  @IsOptional()
  @IsIn(VISIBILITIES)
  visibility?: Visibility;

  /**
   * The complete list of members: anyone not in it loses access. It needs at least one `owner`. The logbook's
   * `owner` stays the same while that person is still an owner; to hand the logbook over, make someone else an
   * owner (and change or remove the previous one): it goes to the first owner listed.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => MemberInputDto)
  members?: MemberInputDto[];
}
