import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtUser } from '../auth/interfaces/jwt-user.interface.js';
import { ReorderPinsDto } from './dto/reorder-pins.dto.js';
import { type PinnedEntryDto, PinsService } from './pins.service.js';

/** Pins are personal: everything here is about the signed-in person's own pins. */
@ApiTags('pins')
@ApiBearerAuth()
@Controller('pins')
export class PinsController {
  constructor(private readonly pins: PinsService) {}

  @Get()
  list(@CurrentUser() user: JwtUser): Promise<PinnedEntryDto[]> {
    return this.pins.list(user);
  }

  // Declared before `:entryId`, so "order" is never read as an entry id.
  @Put('order')
  @HttpCode(204)
  reorder(@CurrentUser() user: JwtUser, @Body() dto: ReorderPinsDto): Promise<void> {
    return this.pins.reorder(user, dto.entryIds);
  }

  @Put(':entryId')
  @HttpCode(204)
  pin(
    @CurrentUser() user: JwtUser,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ): Promise<void> {
    return this.pins.pin(user, entryId);
  }

  @Delete(':entryId')
  @HttpCode(204)
  unpin(
    @CurrentUser() user: JwtUser,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ): Promise<void> {
    return this.pins.unpin(user, entryId);
  }
}
