import { BadRequestException, ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { AdminService } from '../admin/admin.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    validatePassword: jest.fn(),
    updateById: jest.fn(),
    findByResetToken: jest.fn(),
    findByEmailVerificationToken: jest.fn(),
  };

  const mockAdminService = {
    getSettings: jest.fn().mockResolvedValue({ allowRegistration: true }),
    validateInvite: jest.fn(),
    markInviteUsed: jest.fn(),
    getAppUrl: jest.fn().mockResolvedValue('http://localhost:4200'),
    sendEmail: jest.fn().mockResolvedValue(false),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('signed.jwt.token'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAdminService.getSettings.mockResolvedValue({ allowRegistration: true });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: AdminService, useValue: mockAdminService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ── register ─────────────────────────────────────────────────────────────

  describe('register', () => {
    it('creates a user, sends verification email, and returns needsVerification', async () => {
      const user = { _id: new Types.ObjectId(), email: 'a@b.com', displayName: 'Alice' };
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(user);
      mockUsersService.updateById.mockResolvedValue(undefined);
      mockAdminService.sendEmail.mockResolvedValue(true);

      const result = await service.register('a@b.com', 'pass123');

      expect(result).toMatchObject({ needsVerification: true, email: 'a@b.com' });
      expect(mockUsersService.create).toHaveBeenCalledWith('a@b.com', 'pass123', undefined);
      expect(mockUsersService.updateById).toHaveBeenCalledWith(
        String(user._id),
        expect.objectContaining({
          emailVerificationToken: expect.any(String),
          emailVerificationTokenExpiresAt: expect.any(Date),
        }),
      );
    });

    it('returns devLink when SMTP is not configured', async () => {
      const user = { _id: new Types.ObjectId(), email: 'a@b.com' };
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(user);
      mockUsersService.updateById.mockResolvedValue(undefined);
      mockAdminService.sendEmail.mockResolvedValue(false);

      const result = await service.register('a@b.com', 'pass123');

      expect(result).toMatchObject({ needsVerification: true, email: 'a@b.com' });
      expect((result as { devLink?: string }).devLink).toContain('/verify-email?token=');
    });

    it('throws ConflictException when email is already registered', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ email: 'a@b.com' });

      await expect(service.register('a@b.com', 'pass123')).rejects.toThrow(ConflictException);
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns access_token for valid credentials', async () => {
      const user = {
        _id: new Types.ObjectId(),
        email: 'a@b.com',
        passwordHash: 'hash',
        isActive: true,
      };
      mockUsersService.findByEmail.mockResolvedValue(user);
      mockUsersService.validatePassword.mockResolvedValue(true);

      const result = await service.login('a@b.com', 'pass123');

      expect(result.access_token).toBe('signed.jwt.token');
    });

    it('throws ForbiddenException when email is not verified', async () => {
      const user = {
        _id: new Types.ObjectId(),
        email: 'a@b.com',
        passwordHash: 'hash',
        isActive: true,
        emailVerificationToken: 'some-token',
      };
      mockUsersService.findByEmail.mockResolvedValue(user);

      await expect(service.login('a@b.com', 'pass123')).rejects.toThrow(ForbiddenException);
    });

    it('throws UnauthorizedException when user does not exist', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.login('nobody@b.com', 'pass')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is incorrect', async () => {
      const user = {
        _id: new Types.ObjectId(),
        email: 'a@b.com',
        passwordHash: 'hash',
        isActive: true,
      };
      mockUsersService.findByEmail.mockResolvedValue(user);
      mockUsersService.validatePassword.mockResolvedValue(false);

      await expect(service.login('a@b.com', 'wrongpass')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── forgotPassword ────────────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('returns a safe message when the email does not exist (prevents enumeration)', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword('nobody@b.com');

      expect(result.message).toBeDefined();
      expect(result.devLink).toBeUndefined();
      expect(mockUsersService.updateById).not.toHaveBeenCalled();
    });

    it('returns a devLink when SMTP is not configured', async () => {
      const user = { _id: new Types.ObjectId(), email: 'a@b.com' };
      mockUsersService.findByEmail.mockResolvedValue(user);
      mockUsersService.updateById.mockResolvedValue(undefined);
      mockAdminService.sendEmail.mockResolvedValue(false);

      const result = await service.forgotPassword('a@b.com');

      expect(result.devLink).toBeDefined();
      expect(result.devLink).toContain('/reset-password?token=');
      expect(mockUsersService.updateById).toHaveBeenCalledWith(
        String(user._id),
        expect.objectContaining({ resetToken: expect.any(String), resetTokenExpiresAt: expect.any(Date) }),
      );
    });

    it('returns a safe message without devLink when email is sent successfully', async () => {
      const user = { _id: new Types.ObjectId(), email: 'a@b.com' };
      mockUsersService.findByEmail.mockResolvedValue(user);
      mockUsersService.updateById.mockResolvedValue(undefined);
      mockAdminService.sendEmail.mockResolvedValue(true);

      const result = await service.forgotPassword('a@b.com');

      expect(result.message).toBeDefined();
      expect(result.devLink).toBeUndefined();
    });
  });

  // ── verifyEmail ───────────────────────────────────────────────────────────────

  describe('verifyEmail', () => {
    it('returns access_token and marks email as verified for a valid token', async () => {
      const user = { _id: new Types.ObjectId(), email: 'a@b.com' };
      mockUsersService.findByEmailVerificationToken.mockResolvedValue(user);
      mockUsersService.updateById.mockResolvedValue(undefined);

      const result = await service.verifyEmail('valid-token');

      expect(result.access_token).toBe('signed.jwt.token');
      expect(mockUsersService.updateById).toHaveBeenCalledWith(
        String(user._id),
        expect.objectContaining({
          isEmailVerified: true,
          emailVerificationToken: undefined,
          emailVerificationTokenExpiresAt: undefined,
        }),
      );
    });

    it('throws BadRequestException when the token is invalid or expired', async () => {
      mockUsersService.findByEmailVerificationToken.mockResolvedValue(null);

      await expect(service.verifyEmail('bad-token')).rejects.toThrow(BadRequestException);
    });
  });

  // ── resetPassword ─────────────────────────────────────────────────────────────

  describe('resetPassword', () => {
    it('throws BadRequestException when the token is invalid or expired', async () => {
      mockUsersService.findByResetToken.mockResolvedValue(null);

      await expect(service.resetPassword('bad-token', 'newpass123')).rejects.toThrow(BadRequestException);
    });

    it('updates the password hash and clears the reset token for a valid token', async () => {
      const user = { _id: new Types.ObjectId(), email: 'a@b.com' };
      mockUsersService.findByResetToken.mockResolvedValue(user);
      mockUsersService.updateById.mockResolvedValue(undefined);
      jest.mocked(bcrypt.hash).mockResolvedValue('hashed-newpass' as never);

      const result = await service.resetPassword('valid-token', 'newpass123');

      expect(mockUsersService.updateById).toHaveBeenCalledWith(
        String(user._id),
        expect.objectContaining({
          passwordHash: 'hashed-newpass',
          resetToken: undefined,
          resetTokenExpiresAt: undefined,
        }),
      );
      expect(result).toEqual({ message: 'Password updated successfully.' });
    });
  });
});
