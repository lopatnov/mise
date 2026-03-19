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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/register → 201 with token and user', async () => {
    const res = await request(app.getHttpServer()).post('/auth/register').send({ email, password }).expect(201);

    const body = res.body as { access_token: string; user: { email: string } };
    expect(body.access_token).toBeDefined();
    expect(body.user.email).toBe(email);
  });

  it('POST /auth/register duplicate email → 409', () => {
    return request(app.getHttpServer()).post('/auth/register').send({ email, password }).expect(409);
  });

  it('POST /auth/login with correct credentials → 201 with token', async () => {
    const res = await request(app.getHttpServer()).post('/auth/login').send({ email, password }).expect(201);

    token = (res.body as { access_token: string }).access_token;
    expect(token).toBeDefined();
  });

  it('POST /auth/login with wrong password → 401', () => {
    return request(app.getHttpServer()).post('/auth/login').send({ email, password: 'wrongpassword' }).expect(401);
  });

  it('GET /auth/me with valid Bearer token → 200', () => {
    return request(app.getHttpServer()).get('/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
  });

  it('GET /auth/me without token → 401', () => {
    return request(app.getHttpServer()).get('/auth/me').expect(401);
  });
});
