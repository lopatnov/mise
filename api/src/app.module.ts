import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { createObserveModule } from '@nestjs/observe';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RecipesModule } from './recipes/recipes.module';
import { SeoModule } from './seo/seo.module';
import { UploadsModule } from './uploads/uploads.module';
import { UsersModule } from './users/users.module';

export const { ObserveModule, ObserveInstrument } = createObserveModule();
const isObserveEnabled = !!(process.env.OBSERVE_APP_KEY && process.env.OBSERVE_APP_SECRET);

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads'),
      serveRoot: '/uploads',
    }),
    ...(isObserveEnabled
      ? [
          ObserveModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
              appKey: config.get<string>('OBSERVE_APP_KEY') ?? '',
              appSecret: config.get<string>('OBSERVE_APP_SECRET') ?? '',
              serviceId: config.getOrThrow<string>('OBSERVE_SERVICE_ID'),
            }),
          }),
        ]
      : []),
    AuthModule,
    UsersModule,
    RecipesModule,
    CategoriesModule,
    UploadsModule,
    AdminModule,
    SeoModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
