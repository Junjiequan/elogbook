import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtUser } from '../auth/interfaces/jwt-user.interface.js';
import { UpdateEntryDto } from './dto/update-entry.dto.js';
import { EntriesService } from './entries.service.js';
import type { EntryDto, EntryVersionDto } from './entry.mapper.js';

@ApiTags('entries')
@ApiBearerAuth()
@Controller()
export class EntriesController {
  constructor(private readonly entries: EntriesService) {}

  @Get('logbooks/:logbookId/entries')
  list(
    @CurrentUser() user: JwtUser,
    @Param('logbookId', ParseUUIDPipe) logbookId: string,
  ): Promise<EntryDto[]> {
    return this.entries.list(user, logbookId);
  }

  @Post('logbooks/:logbookId/entries')
  create(
    @CurrentUser() user: JwtUser,
    @Param('logbookId', ParseUUIDPipe) logbookId: string,
  ): Promise<EntryDto> {
    return this.entries.create(user, logbookId);
  }

  @Get('entries/:id')
  get(@CurrentUser() user: JwtUser, @Param('id', ParseUUIDPipe) id: string): Promise<EntryDto> {
    return this.entries.get(user, id);
  }

  @Patch('entries/:id')
  save(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEntryDto,
  ): Promise<EntryDto> {
    return this.entries.save(user, id, dto);
  }

  @Delete('entries/:id')
  @HttpCode(204)
  remove(@CurrentUser() user: JwtUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.entries.remove(user, id);
  }

  @Get('entries/:id/versions')
  listVersions(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EntryVersionDto[]> {
    return this.entries.listVersions(user, id);
  }

  /** Keeps the entry as it is now as a named point in its history. */
  @Post('entries/:id/versions')
  createVersion(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EntryVersionDto> {
    return this.entries.createVersion(user, id);
  }

  @Post('entries/:id/versions/:versionId/restore')
  @HttpCode(200)
  restoreVersion(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ): Promise<EntryDto> {
    return this.entries.restoreVersion(user, id, versionId);
  }
}
