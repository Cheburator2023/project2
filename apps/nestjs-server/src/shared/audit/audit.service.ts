import { Injectable, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { CustomLogger } from '../services/logger.service';
import {
    DEFAULT_SIDECAR_URL,
    DEFAULT_TIMEOUT_MS,
    DEFAULT_RETRY_INTERVAL_MS,
} from './audit.constants';
import { SidecarAuditRequest, PendingAuditEvent } from './audit.interfaces';

@Injectable()
export class AuditService implements OnModuleInit {
    private readonly queue: PendingAuditEvent[] = [];
    private isProcessing = false;
    private retryTimer: NodeJS.Timeout | null = null;

    private readonly enabled: boolean;
    private readonly sidecarUrl: string;
    private readonly timeoutMs: number;
    private readonly retryIntervalMs: number;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly logger: CustomLogger,
    ) {
        this.enabled =
            this.configService.get<string>('AUDIT_ENABLED', 'true') === 'true';
        this.sidecarUrl = this.configService.get<string>(
            'AUDIT_SIDECAR_URL',
            DEFAULT_SIDECAR_URL,
        );
        this.timeoutMs = parseInt(
            this.configService.get<string>(
                'AUDIT_SIDECAR_TIMEOUT',
                String(DEFAULT_TIMEOUT_MS),
            ),
            10,
        );
        this.retryIntervalMs = parseInt(
            this.configService.get<string>(
                'AUDIT_RETRY_INTERVAL_MS',
                String(DEFAULT_RETRY_INTERVAL_MS),
            ),
            10,
        );
    }

    onModuleInit(): void {
        if (this.enabled) {
            this.startRetryTimer();
            this.logger.log(
                `Audit service enabled – sidecar URL: ${this.sidecarUrl}, timeout: ${this.timeoutMs}ms, retry: ${this.retryIntervalMs}ms`,
                'AuditService',
            );
        } else {
            this.logger.log('Audit service disabled', 'AuditService');
        }
    }

    sendEvent(
        eventCode: string,
        eventClass: 'START' | 'SUCCESS' | 'FAILURE',
        correlationId: string,
        initiator?: Record<string, unknown>,
        additionalFields?: Record<string, unknown>,
    ): void {
        if (!this.enabled) {
            this.logger.debug('Audit is disabled – event discarded', 'AuditService');
            return;
        }

        const timestamp = new Date().toISOString();
        const sidecarRequest: SidecarAuditRequest = {
            eventCode,
            eventClass,
            correlationId,
            timestamp,
            initiator: initiator ? { ...initiator } : undefined,
            additionalFields: additionalFields ? { ...additionalFields } : undefined,
        };

        const pending: PendingAuditEvent = {
            id: uuidv4(),
            request: sidecarRequest,
        };

        this.queue.push(pending);

        this.logger.debug(
            `[Audit] ${eventClass}/${eventCode} queued, correlationId=${correlationId}`,
            'AuditService',
            { eventCode, eventClass, correlationId, initiator, additionalFields },
        );

        this.flush();
    }

    private async flush(): Promise<void> {
        if (this.isProcessing || this.queue.length === 0) return;
        this.isProcessing = true;
        const eventsToSend = [...this.queue];
        this.queue.length = 0;

        for (const pending of eventsToSend) {
            try {
                await this.sendSingleEvent(pending.request);
            } catch (error) {
                const message = (error as Error).message;
                this.logger.warn(
                    `[Audit] Failed to send event ${pending.id}: ${message}`,
                    'AuditService',
                    { id: pending.id, request: pending.request },
                );
                this.queue.push(pending);
            }
        }
        this.isProcessing = false;
    }

    private async sendSingleEvent(request: SidecarAuditRequest): Promise<void> {
        const url = this.sidecarUrl;
        const request$ = this.httpService
            .post(url, request, {
                headers: { 'Content-Type': 'application/json' },
                timeout: this.timeoutMs,
            })
            .pipe(
                timeout(this.timeoutMs + 500),
                catchError((err: AxiosError) => {
                    const message = err.response
                        ? `HTTP ${err.response.status}: ${err.response.statusText}`
                        : err.message;
                    throw new Error(message);
                }),
            );
        await firstValueFrom(request$);
        this.logger.debug(
            `[Audit] Successfully sent event ${request.eventCode} (${request.eventClass}) correlationId=${request.correlationId}`,
            'AuditService',
        );
    }

    private startRetryTimer(): void {
        this.retryTimer = setInterval(() => {
            this.flush();
        }, this.retryIntervalMs);
    }

    onModuleDestroy(): void {
        if (this.retryTimer) {
            clearInterval(this.retryTimer);
            this.retryTimer = null;
        }
    }
}