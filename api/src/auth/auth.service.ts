import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { type Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { AdminService } from '../admin/admin.service';
import { UsersService } from '../users/users.service';

interface SignTokenUser {
  _id: Types.ObjectId;
  email: string;
  displayName?: string;
  role?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private adminService: AdminService,
    private jwtService: JwtService,
  ) {}

  async register(email: string, password: string, displayName?: string, inviteToken?: string) {
    const settings = await this.adminService.getSettings();

    if (!settings.allowRegistration) {
      if (!inviteToken) {
        throw new ForbiddenException('Registration is disabled. An invite is required.');
      }
      const invite = await this.adminService.validateInvite(inviteToken);
      if (!invite) {
        throw new BadRequestException('Invalid or expired invite token.');
      }
      if (invite.email && invite.email.toLowerCase() !== email.toLowerCase()) {
        throw new BadRequestException('This invite is for a different email address.');
      }
      await this.adminService.markInviteUsed(inviteToken);
    }

    const existing = await this.usersService.findByEmail(email);
    if (existing) throw new ConflictException('Email already registered');
    const user = await this.usersService.create(email, password, displayName);
    return this.signToken(user);
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new ForbiddenException('Account is disabled');
    const valid = await this.usersService.validatePassword(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    return this.signToken(user);
  }

  async forgotPassword(email: string): Promise<{ message: string; devLink?: string }> {
    const user = await this.usersService.findByEmail(email);
    // Always return success to prevent email enumeration
    if (!user) return { message: 'If this email exists, a reset link has been sent.' };

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.usersService.updateById(String(user._id), {
      resetToken: token,
      resetTokenExpiresAt: expiresAt,
    });

    const appUrl = await this.adminService.getAppUrl();
    const resetLink = `${appUrl}/reset-password?token=${token}`;
    const html = `<p>Click the link to reset your password (valid 1 hour):</p><p><a href="${resetLink}">${resetLink}</a></p>`;

    const sent = await this.adminService.sendEmail(email, 'Password reset — Mise', html);

    if (!sent) {
      // SMTP not configured — return link in response for dev/self-hosted without email
      return {
        message: 'SMTP not configured. Use the link below to reset your password.',
        devLink: resetLink,
      };
    }
    return { message: 'If this email exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.usersService.findByResetToken(token);
    if (!user) throw new BadRequestException('Invalid or expired reset token.');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersService.updateById(String(user._id), {
      passwordHash,
      resetToken: undefined,
      resetTokenExpiresAt: undefined,
    });
    return { message: 'Password updated successfully.' };
  }

  private signToken(user: SignTokenUser) {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role ?? 'user',
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        role: user.role ?? 'user',
      },
    };
  }
}
