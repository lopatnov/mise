import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Auth flow (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;

  // Use a unique email per test run so tests pass on a non-empty database
  const email = `e2e-${Date.now()}@mise.test`;
  const password = 'secret123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/auth/register → 201 with needsVerification and devLink', async () => {
    const res = await request(app.getHttpServer()).post('/api/auth/register').send({ email, password }).expect(201);

    const body = res.body as { needsVerification: boolean; email: string; devLink?: string };
    expect(body.needsVerification).toBe(true);
    expect(body.email).toBe(email);
    // SMTP not configured in test env → devLink returned
    expect(body.devLink).toBeDefined();
    expect(body.devLink).toContain('/verify-email?token=');

    // Verify the email so subsequent login tests work
    const verifyToken = new URL(body.devLink as string).searchParams.get('token');
    const verifyRes = await request(app.getHttpServer())
      .get('/api/auth/verify-email')
      .query({ token: verifyToken })
      .expect(200);
    token = (verifyRes.body as { access_token: string }).access_token;
    expect(token).toBeDefined();
  });

  it('POST /api/auth/register duplicate email → 409', () => {
    return request(app.getHttpServer()).post('/api/auth/register').send({ email, password }).expect(409);
  });

  it('POST /api/auth/login with correct credentials → 201 with token', async () => {
    const res = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password }).expect(201);

    token = (res.body as { access_token: string }).access_token;
    expect(token).toBeDefined();
  });

  it('POST /api/auth/login with wrong password → 401', () => {
    return request(app.getHttpServer()).post('/api/auth/login').send({ email, password: 'wrongpassword' }).expect(401);
  });

  it('GET /api/auth/me with valid Bearer token → 200', () => {
    return request(app.getHttpServer()).get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
  });

  it('GET /api/auth/me without token → 401', () => {
    return request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });
});
