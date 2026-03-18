import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Types } from 'mongoose';
import { UsersService } from '../users/users.service';

interface SignTokenUser {
  _id: Types.ObjectId;
  email: string;
  displayName?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(email: string, password: string, displayName?: string) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) throw new ConflictException('Email already registered');
    const user = await this.usersService.create(email, password, displayName);
    return this.signToken(user);
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await this.usersService.validatePassword(
      password,
      user.passwordHash,
    );
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    return this.signToken(user);
  }

  private signToken(user: SignTokenUser) {
    const payload = { sub: user._id.toString(), email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user._id, email: user.email, displayName: user.displayName },
    };
  }
}
