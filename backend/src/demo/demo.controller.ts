import { Controller, Delete, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtUser } from '../auth/interfaces/jwt-user.interface.js';
import { type DemoStatus, DemoService } from './demo.service.js';

/** Sample content for trying the app out. Answers 404 when `DEMO_ENABLED` is off. */
@ApiTags('demo')
@ApiBearerAuth()
@Controller('demo')
export class DemoController {
  constructor(private readonly demo: DemoService) {}

  @Get()
  status(@CurrentUser() user: JwtUser): Promise<DemoStatus> {
    return this.demo.status(user);
  }

  @Post()
  @HttpCode(200)
  populate(@CurrentUser() user: JwtUser): Promise<{ created: number; total: number }> {
    return this.demo.populate(user);
  }

  @Delete()
  @HttpCode(204)
  remove(@CurrentUser() user: JwtUser): Promise<void> {
    return this.demo.remove(user);
  }
}
