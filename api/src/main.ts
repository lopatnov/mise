import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule, ObserveInstrument } from './app.module';
import { CategoriesService } from './categories/categories.service';
import { HttpExceptionFilter } from './common/http-exception.filter';

/**
 * Configures the NestJS application with observability, CORS, API routing,
 * exception handling, validation, and Swagger documentation, then seeds default
 * categories and starts listening on the configured port (3000 by default).
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  app.enableCors();

  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'robots.txt', method: RequestMethod.GET },
      { path: 'sitemap.xml', method: RequestMethod.GET },
      { path: 'health', method: RequestMethod.GET },
    ],
  });

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('Mise API')
    .setDescription('Personal recipe book API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Seed default categories on first run
  const categoriesService = app.get(CategoriesService);
  await categoriesService.seed();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Mise API running on http://localhost:${port}`);
  console.log(`Swagger UI: http://localhost:${port}/api/docs`);
}
void bootstrap();
