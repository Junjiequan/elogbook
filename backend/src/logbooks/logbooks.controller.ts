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
import { CreateLogbookDto } from './dto/create-logbook.dto.js';
import { UpdateLogbookDto } from './dto/update-logbook.dto.js';
import type { LogbookDto } from './logbook.mapper.js';
import { LogbooksService } from './logbooks.service.js';

@ApiTags('logbooks')
@ApiBearerAuth()
@Controller('logbooks')
export class LogbooksController {
  constructor(private readonly logbooks: LogbooksService) {}

  @Get()
  list(@CurrentUser() user: JwtUser): Promise<LogbookDto[]> {
    return this.logbooks.list(user);
  }

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateLogbookDto): Promise<LogbookDto> {
    return this.logbooks.create(user, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: JwtUser, @Param('id', ParseUUIDPipe) id: string): Promise<LogbookDto> {
    return this.logbooks.get(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLogbookDto,
  ): Promise<LogbookDto> {
    return this.logbooks.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: JwtUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.logbooks.remove(user, id);
  }
}
