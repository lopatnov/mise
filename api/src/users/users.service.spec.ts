import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { User } from './user.schema';
import { UsersService } from './users.service';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;

  const mockUserInstance = { save: jest.fn() };

  const mockModel = Object.assign(
    jest.fn().mockImplementation(() => mockUserInstance),
    {
      findOne: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    },
  );

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: mockModel },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // ── findByEmail ───────────────────────────────────────────────────────────

  describe('findByEmail', () => {
    it('normalises email to lowercase before querying', async () => {
      mockModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

      await service.findByEmail('A@B.COM');

      expect(mockModel.findOne).toHaveBeenCalledWith({ email: 'a@b.com' });
    });

    it('returns the user when found', async () => {
      const user = { email: 'a@b.com' };
      mockModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(user) });

      expect(await service.findByEmail('a@b.com')).toEqual(user);
    });

    it('returns null when not found', async () => {
      mockModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

      expect(await service.findByEmail('x@y.com')).toBeNull();
    });
  });

  // ── findById ──────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('returns the user by id', async () => {
      const id = new Types.ObjectId();
      const user = { _id: id };
      mockModel.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(user) });

      expect(await service.findById(String(id))).toEqual(user);
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('excludes passwordHash and resetToken', async () => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      mockModel.find.mockReturnValue(chain);

      await service.findAll();

      expect(chain.select).toHaveBeenCalledWith('-passwordHash -resetToken');
    });
  });

  // ── countByRole ───────────────────────────────────────────────────────────

  describe('countByRole', () => {
    it('returns the count for the given role', async () => {
      mockModel.countDocuments.mockResolvedValue(3);

      expect(await service.countByRole('admin')).toBe(3);
      expect(mockModel.countDocuments).toHaveBeenCalledWith({ role: 'admin' });
    });
  });

  // ── countActiveByRole ─────────────────────────────────────────────────────

  describe('countActiveByRole', () => {
    it('counts only active users for the role', async () => {
      mockModel.countDocuments.mockResolvedValue(2);

      expect(await service.countActiveByRole('user')).toBe(2);
      expect(mockModel.countDocuments).toHaveBeenCalledWith({ role: 'user', isActive: true });
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('hashes the password and saves the user', async () => {
      jest.mocked(bcrypt.hash).mockResolvedValue('hashed' as never);
      const saved = { email: 'a@b.com', passwordHash: 'hashed' };
      mockUserInstance.save.mockResolvedValue(saved);

      const result = await service.create('A@B.com', 'pass123', 'Alice');

      expect(bcrypt.hash).toHaveBeenCalledWith('pass123', 10);
      expect(mockModel).toHaveBeenCalledWith({ email: 'a@b.com', passwordHash: 'hashed', displayName: 'Alice' });
      expect(result).toEqual(saved);
    });
  });

  // ── createAdmin ───────────────────────────────────────────────────────────

  describe('createAdmin', () => {
    it('creates a user with role admin', async () => {
      jest.mocked(bcrypt.hash).mockResolvedValue('hashed' as never);
      mockUserInstance.save.mockResolvedValue({ role: 'admin' });

      await service.createAdmin('admin@b.com', 'pass');

      expect(mockModel).toHaveBeenCalledWith(expect.objectContaining({ role: 'admin' }));
    });
  });

  // ── updateById ────────────────────────────────────────────────────────────

  describe('updateById', () => {
    it('puts defined values in $set and undefined values in $unset', async () => {
      mockModel.findByIdAndUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue({}) });

      await service.updateById('abc123', { isActive: true, resetToken: undefined });

      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'abc123',
        { $set: { isActive: true }, $unset: { resetToken: '' } },
        { new: true },
      );
    });

    it('omits $unset when no undefined values are passed', async () => {
      mockModel.findByIdAndUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue({}) });

      await service.updateById('abc123', { isActive: false });

      const op = mockModel.findByIdAndUpdate.mock.calls[0][1] as Record<string, unknown>;
      expect(op.$unset).toBeUndefined();
    });
  });

  // ── deleteById ────────────────────────────────────────────────────────────

  describe('deleteById', () => {
    it('calls findByIdAndDelete with the id', async () => {
      mockModel.findByIdAndDelete.mockResolvedValue(null);

      await service.deleteById('abc123');

      expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith('abc123');
    });
  });

  // ── findByResetToken ──────────────────────────────────────────────────────

  describe('findByResetToken', () => {
    it('queries with token string and expiry greater than now', async () => {
      mockModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

      await service.findByResetToken('tok-123');

      expect(mockModel.findOne).toHaveBeenCalledWith({
        resetToken: 'tok-123',
        resetTokenExpiresAt: { $gt: expect.any(Date) },
      });
    });
  });

  // ── validatePassword ──────────────────────────────────────────────────────

  describe('validatePassword', () => {
    it('returns true when password matches hash', async () => {
      jest.mocked(bcrypt.compare).mockResolvedValue(true as never);

      expect(await service.validatePassword('pass', 'hash')).toBe(true);
    });

    it('returns false when password does not match', async () => {
      jest.mocked(bcrypt.compare).mockResolvedValue(false as never);

      expect(await service.validatePassword('wrong', 'hash')).toBe(false);
    });
  });
});
