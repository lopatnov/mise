import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';

/** The real app wired the way main.ts does for the parts the e2e specs depend on. */
export async function createE2eApp(): Promise<INestApplication<App>> {
  const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

/** Register and verify a user through the real endpoints, returning its access token. */
export async function registerAndVerify(app: INestApplication<App>, email: string, password = 'secret123') {
  const registerRes = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send({ email, password })
    .expect(201);
  const verifyToken = new URL((registerRes.body as { devLink: string }).devLink).searchParams.get('token');
  const verifyRes = await request(app.getHttpServer())
    .get('/api/auth/verify-email')
    .query({ token: verifyToken })
    .expect(200);
  return (verifyRes.body as { access_token: string }).access_token;
}
