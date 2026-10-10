import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { AppConfig } from './config/configuration.js';

/**
 * Everything about the HTTP surface, shared by `main.ts` and the e2e tests so they run the same app.
 * The app must be created with `{ bodyParser: false }`: the body size limit is set here.
 */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get<ConfigService<AppConfig, true>>(ConfigService);

  const proxies = config.get('trustProxy', { infer: true });
  if (proxies !== undefined) {
    app.set('trust proxy', proxies);
  }

  app.use(helmet());
  const origins = config.get('corsOrigins', { infer: true });
  app.enableCors({ origin: origins.length > 0 ? origins : false });

  const limit = `${config.get('maxBodySizeMb', { infer: true })}mb`;
  app.useBodyParser('json', { limit });
  app.useBodyParser('urlencoded', { limit, extended: true });

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // drop fields the DTO does not name
      forbidNonWhitelisted: true, // ...and tell the caller, instead of silently ignoring them
      transform: true,
      validationError: { value: false }, // never echo submitted values (passwords) back
    }),
  );

  if (config.get('swaggerEnabled', { infer: true })) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('eLogbook API')
        .setDescription('Logbooks, entries, version history and pins.')
        .setVersion('1')
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup('api/docs', app, document, { swaggerOptions: { docExpansion: 'none' } });
  }

  app.enableShutdownHooks();
}
