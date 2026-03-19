import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import * as nodemailer from 'nodemailer';
import { UsersService } from '../users/users.service';
import { AdminService } from './admin.service';
import { Invite } from './invite.schema';
import { Settings } from './settings.schema';

jest.mock('nodemailer');

describe('AdminService', () => {
  let service: AdminService;

  const mockSettingsModel = {
    findOne: jest.fn(),
    create: jest.fn(),
  };

  const mockInviteModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findByIdAndDelete: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  const mockUsersService = {
    countByRole: jest.fn(),
    countActiveByRole: jest.fn(),
    createAdmin: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getModelToken(Settings.name), useValue: mockSettingsModel },
        { provide: getModelToken(Invite.name), useValue: mockInviteModel },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  // ── getSettings ──────────────────────────────────────────────────────────────

  describe('getSettings', () => {
    it('returns existing settings when a document exists', async () => {
      const settings = { allowRegistration: true, smtpHost: 'smtp.example.com' };
      mockSettingsModel.findOne.mockReturnValue({ lean: () => Promise.resolve(settings) });

      const result = await service.getSettings();

      expect(result).toEqual(settings);
    });

    it('creates and returns default settings when none exist', async () => {
      const created = { allowRegistration: true };
      mockSettingsModel.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });
      mockSettingsModel.create.mockResolvedValue({ toObject: () => created });

      const result = await service.getSettings();

      expect(mockSettingsModel.create).toHaveBeenCalledWith({});
      expect(result).toEqual(created);
    });
  });

  // ── createInvite ─────────────────────────────────────────────────────────────

  describe('createInvite', () => {
    it('creates an invite with a UUID token and the correct expiry', async () => {
      const createdBy = 'user-id-123';
      mockInviteModel.create.mockResolvedValue({ token: 'uuid', email: 'a@b.com', createdBy });

      await service.createInvite({ email: 'a@b.com', expiresInDays: 3 }, createdBy);

      const arg = mockInviteModel.create.mock.calls[0][0] as {
        token: string;
        expiresAt: Date;
        email: string;
        createdBy: string;
      };
      expect(typeof arg.token).toBe('string');
      expect(arg.token).toHaveLength(36); // UUID v4
      expect(arg.email).toBe('a@b.com');
      expect(arg.createdBy).toBe(createdBy);
      const expectedMs = 3 * 24 * 60 * 60 * 1000;
      const diff = arg.expiresAt.getTime() - Date.now();
      expect(diff).toBeGreaterThan(expectedMs - 5000);
      expect(diff).toBeLessThanOrEqual(expectedMs + 1000);
    });

    it('defaults to 7 days expiry when expiresInDays is not provided', async () => {
      mockInviteModel.create.mockResolvedValue({});

      await service.createInvite({}, 'user-id');

      const arg = mockInviteModel.create.mock.calls[0][0] as { expiresAt: Date };
      const expectedMs = 7 * 24 * 60 * 60 * 1000;
      const diff = arg.expiresAt.getTime() - Date.now();
      expect(diff).toBeGreaterThan(expectedMs - 5000);
      expect(diff).toBeLessThanOrEqual(expectedMs + 1000);
    });
  });

  // ── validateInvite ───────────────────────────────────────────────────────────

  describe('validateInvite', () => {
    it('returns the invite for a valid token', async () => {
      const invite = { token: 'valid-token', used: false, expiresAt: new Date(Date.now() + 10_000) };
      mockInviteModel.findOne.mockReturnValue({ lean: () => Promise.resolve(invite) });

      const result = await service.validateInvite('valid-token');

      expect(result).toEqual(invite);
    });

    it('returns null for an expired or used token', async () => {
      mockInviteModel.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });

      const result = await service.validateInvite('expired-token');

      expect(result).toBeNull();
    });
  });

  // ── sendEmail ────────────────────────────────────────────────────────────────

  describe('sendEmail', () => {
    it('returns false when SMTP is not configured', async () => {
      mockSettingsModel.findOne.mockReturnValue({ lean: () => Promise.resolve({ smtpHost: undefined }) });

      const result = await service.sendEmail('to@example.com', 'Subject', '<p>body</p>');

      expect(result).toBe(false);
    });

    it('returns true when SMTP is configured and the message is delivered', async () => {
      mockSettingsModel.findOne.mockReturnValue({
        lean: () =>
          Promise.resolve({
            smtpHost: 'smtp.example.com',
            smtpPort: 587,
            smtpUser: 'user@example.com',
            smtpPass: 'secret',
            smtpFrom: 'noreply@example.com',
          }),
      });
      const sendMail = jest.fn().mockResolvedValue({});
      (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });

      const result = await service.sendEmail('to@example.com', 'Subject', '<p>body</p>');

      expect(result).toBe(true);
      expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'to@example.com', subject: 'Subject' }));
    });

    it('returns false when nodemailer throws an error', async () => {
      mockSettingsModel.findOne.mockReturnValue({
        lean: () =>
          Promise.resolve({
            smtpHost: 'smtp.example.com',
            smtpPort: 587,
            smtpUser: 'user@example.com',
            smtpPass: 'secret',
          }),
      });
      (nodemailer.createTransport as jest.Mock).mockReturnValue({
        sendMail: jest.fn().mockRejectedValue(new Error('connection refused')),
      });

      const result = await service.sendEmail('to@example.com', 'Subject', '<p>body</p>');

      expect(result).toBe(false);
    });
  });
});
