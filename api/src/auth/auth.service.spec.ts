import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { AdminService } from '../admin/admin.service';
import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    validatePassword: jest.fn(),
    updateById: jest.fn(),
    findByResetToken: jest.fn(),
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
    it('creates a user and returns access_token', async () => {
      const user = {
        _id: new Types.ObjectId(),
        email: 'a@b.com',
        displayName: 'Alice',
      };
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(user);

      const result = await service.register('a@b.com', 'pass123');

      expect(result.access_token).toBe('signed.jwt.token');
      expect(result.user.email).toBe('a@b.com');
      expect(mockUsersService.create).toHaveBeenCalledWith(
        'a@b.com',
        'pass123',
        undefined,
      );
    });

    it('throws ConflictException when email is already registered', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ email: 'a@b.com' });

      await expect(service.register('a@b.com', 'pass123')).rejects.toThrow(
        ConflictException,
      );
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

    it('throws UnauthorizedException when user does not exist', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.login('nobody@b.com', 'pass')).rejects.toThrow(
        UnauthorizedException,
      );
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

      await expect(service.login('a@b.com', 'wrongpass')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
