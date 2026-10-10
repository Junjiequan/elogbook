import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import type { AppConfig } from './config/configuration.js';
import { configureApp } from './configure-app.js';

const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
configureApp(app);

const port = app.get<ConfigService<AppConfig, true>>(ConfigService).get('port', { infer: true });
await app.listen(port);
Logger.log(`eLogbook API listening on http://localhost:${port}/api/v1`, 'Main');
