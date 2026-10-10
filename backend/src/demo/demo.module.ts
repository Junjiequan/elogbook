import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { DemoController } from './demo.controller.js';
import { DemoService } from './demo.service.js';

@Module({ imports: [UsersModule], controllers: [DemoController], providers: [DemoService] })
export class DemoModule {}
