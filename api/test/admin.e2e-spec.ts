import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

/**
 * Requires a fresh MongoDB instance (no existing admin user).
 * In CI this is always the case (MongoDB service starts empty).
 */
describe('Admin setup, invites and password reset (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let inviteToken: string;

  const adminEmail = `e2e-admin-${Date.now()}@mise.test`;
  const adminPassword = 'admin123';
  const userEmail = `e2e-invite-${Date.now()}@mise.test`;
  const userPassword = 'user1234';

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

  // ── Setup ─────────────────────────────────────────────────────────────────────

  it('GET /api/admin/setup → returns { setupDone: boolean }', async () => {
    const res = await request(app.getHttpServer()).get('/api/admin/setup').expect(200);
    expect(typeof (res.body as { setupDone: boolean }).setupDone).toBe('boolean');
  });

  it('POST /api/admin/setup → 201 with admin role', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/admin/setup')
      .send({ email: adminEmail, password: adminPassword })
      .expect(201);

    const body = res.body as { id: string; email: string; role: string };
    expect(body.email).toBe(adminEmail);
    expect(body.role).toBe('admin');
  });

  it('POST /api/admin/setup again → 409 conflict', () => {
    return request(app.getHttpServer())
      .post('/api/admin/setup')
      .send({ email: `other-${Date.now()}@mise.test`, password: 'pass123' })
      .expect(409);
  });

  // ── Admin login ───────────────────────────────────────────────────────────────

  it('POST /api/auth/login as admin → 201 with token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password: adminPassword })
      .expect(201);

    adminToken = (res.body as { access_token: string }).access_token;
    expect(adminToken).toBeDefined();
  });

  // ── Invite flow ───────────────────────────────────────────────────────────────

  it('PATCH /api/admin/settings → disable public registration', () => {
    return request(app.getHttpServer())
      .patch('/api/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ allowRegistration: false })
      .expect(200);
  });

  it('POST /api/auth/register without invite → 403 when registration is disabled', () => {
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: userEmail, password: userPassword })
      .expect(403);
  });

  it('POST /api/admin/invites → 201 with invite token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/admin/invites')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ expiresInDays: 7 })
      .expect(201);

    const body = res.body as { token: string };
    expect(typeof body.token).toBe('string');
    expect(body.token).toHaveLength(36); // UUID v4
    inviteToken = body.token;
  });

  it('POST /api/auth/register with valid invite → 201 with needsVerification', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: userEmail, password: userPassword, inviteToken })
      .expect(201);

    const body = res.body as { needsVerification: boolean; email: string; devLink?: string };
    expect(body.needsVerification).toBe(true);
    expect(body.email).toBe(userEmail);
  });

  it('POST /api/auth/register with the same invite again → 400 (invite already used)', () => {
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: `other2-${Date.now()}@mise.test`, password: 'pass1234', inviteToken })
      .expect(400);
  });

  // ── Password reset flow ───────────────────────────────────────────────────────

  it('POST /api/auth/forgot-password → returns devLink (no SMTP configured)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/forgot-password')
      .send({ email: userEmail })
      .expect(201);

    const body = res.body as { message: string; devLink?: string };
    expect(body.message).toBeDefined();
    // SMTP is not configured in test env → devLink is returned
    expect(body.devLink).toBeDefined();
    expect(body.devLink).toContain('/reset-password?token=');

    // Extract the token for the next test step
    const url = new URL(body.devLink as string);
    inviteToken = url.searchParams.get('token') as string;
    expect(inviteToken).toBeTruthy();
  });

  it('POST /api/auth/reset-password → 201 with success message', async () => {
    const newPassword = 'newpass123';
    const res = await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .send({ token: inviteToken, password: newPassword })
      .expect(201);

    expect((res.body as { message: string }).message).toBeDefined();
  });

  it('POST /api/auth/reset-password with the same token again → 400 (token cleared)', () => {
    return request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .send({ token: inviteToken, password: 'anotherpass123' })
      .expect(400);
  });
});
