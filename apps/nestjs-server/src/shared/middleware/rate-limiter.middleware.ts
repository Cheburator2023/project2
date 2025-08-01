import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
    private requests = new Map<string, { count: number; lastReset: number }>();
    private readonly windowMs = 60000; // 1 minute window
    private readonly maxRequests = 30;

    private getClientIp(req: Request): string | null {
        const xForwardedFor = req.headers['x-forwarded-for'];

        const connectionRemoteAddress = req.connection?.remoteAddress;
        const socketRemoteAddress = req.socket?.remoteAddress;

        let ip: string | string[] | null = null;

        if (xForwardedFor) {
            ip = xForwardedFor;
        }
        else if (connectionRemoteAddress) {
            ip = connectionRemoteAddress;
        }
        else if (socketRemoteAddress) {
            ip = socketRemoteAddress;
        }

        if (Array.isArray(ip)) {
            ip = ip[0];
        }

        if (ip && typeof ip === 'string' && ip.includes('::ffff:')) {
            ip = ip.split(':').pop() || ip;
        }

        return ip || null;
    }

    use(req: Request, res: Response, next: NextFunction) {
        const ip = this.getClientIp(req);
        const now = Date.now();

        if (!ip) {
            return next();
        }

        // Initialize record if not exists
        if (!this.requests.has(ip)) {
            this.requests.set(ip, { count: 0, lastReset: now });
        }

        const record = this.requests.get(ip);

        if (!record) {
            return next();
        }

        if (now - record.lastReset > this.windowMs) {
            record.count = 0;
            record.lastReset = now;
        }

        if (record.count >= this.maxRequests) {
            res.setHeader('Retry-After', Math.ceil((record.lastReset + this.windowMs - now) / 1000));
            return res.status(429).json({
                message: 'Too many requests',
                retryAfter: Math.ceil((record.lastReset + this.windowMs - now) / 1000) + ' seconds',
            });
        }

        record.count++;
        next();
    }
}