import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Request } from 'express';

interface HitRecord {
  count: number;
  resetAt: number;
}

/** Simple in-memory rate limiter: 5 attempts per 15 minutes per IP per route. */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, HitRecord>();
  private readonly limit = 5;
  private readonly windowMs = 15 * 60 * 1000;

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0].trim() ?? req.ip ?? 'unknown';
    const key = `${context.getHandler().name}:${ip}`;
    const now = Date.now();

    const record = this.hits.get(key);
    if (!record || now > record.resetAt) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    if (record.count >= this.limit) {
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }

    record.count++;
    return true;
  }
}
