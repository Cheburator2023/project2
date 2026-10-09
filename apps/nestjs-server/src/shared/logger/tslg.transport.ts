import * as net from 'net';
import { BufferManager } from './buffer-manager';

export interface TSLGTransportMetrics {
    sentLogs: number;
    failedLogs: number;
    reconnections: number;
    bufferFlushes: number;
    connectionErrors: number;
    ttlReconnections: number;
    bufferOverflows: number;
    forcedFlushes: number;
}

/**
 * Транспорт до TSLG-агента.
 *
 * Обеспечивает:
 *  - неблокирующую отправку (ОЛ.01);
 *  - переподключение с экспоненциальной задержкой;
 *  - graceful reconnect по TTL (для балансировки);
 *  - буферизацию при недоступности агента (ОЛ.02);
 *  - метрики работы транспорта.
 *
 * Не отвечает за формирование записи лога — за это отвечает LogEntryBuilder
 * на стороне CustomLogger.
 */
export class TSLGTransport {
    private socket: net.Socket | null = null;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private ttlInterval: NodeJS.Timeout | null = null;
    private flushInterval: NodeJS.Timeout | null = null;
    private connectionAttempts = 0;
    private maxConnectionAttempts: number;
    private lastConnectionTime = 0;
    private bufferManager: BufferManager;
    private metrics: TSLGTransportMetrics;

    private readonly options: {
        host: string;
        port: number;
        socketTimeout: number;
        reconnectionDelay: number;
        connectionTTL: number;
        maxConnectionAttempts: number;
        maxBufferSize: number;
        bufferFlushInterval: number;
    };

    private readonly console = {
        log: console.log.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
    };

    constructor(options: {
        host: string;
        port: number;
        socketTimeout?: number;
        reconnectionDelay?: number;
        connectionTTL?: number;
        maxConnectionAttempts?: number;
        maxBufferSize?: number;
        bufferFlushInterval?: number;
    }) {
        this.options = {
            socketTimeout: 10000,
            reconnectionDelay: 1000,
            connectionTTL: 2000,
            maxConnectionAttempts: 10,
            maxBufferSize: 1000,
            bufferFlushInterval: 500,
            ...options,
        };
        this.maxConnectionAttempts = this.options.maxConnectionAttempts;
        this.metrics = this.initializeMetrics();
        this.bufferManager = new BufferManager(
            this.options.maxBufferSize,
            this.metrics,
        );

        this.connect();

        if (this.options.connectionTTL > 0) {
            this.startTTLMonitor();
        }
        this.startBufferFlushMonitor();
    }

    private initializeMetrics(): TSLGTransportMetrics {
        return {
            sentLogs: 0,
            failedLogs: 0,
            reconnections: 0,
            bufferFlushes: 0,
            connectionErrors: 0,
            ttlReconnections: 0,
            bufferOverflows: 0,
            forcedFlushes: 0,
        };
    }

    private connect(): void {
        if (this.connectionAttempts >= this.maxConnectionAttempts) {
            this.console.error(
                `[TSLG] Max connection attempts (${this.maxConnectionAttempts}) reached. Giving up.`,
            );
            return;
        }

        this.connectionAttempts++;

        try {
            this.socket = net.createConnection({
                host: this.options.host,
                port: this.options.port,
                timeout: this.options.socketTimeout,
            });

            this.setupSocketEventHandlers();
            this.socket.setTimeout(this.options.socketTimeout);
            this.socket.setKeepAlive(true, 60000);
        } catch (error) {
            this.console.error('[TSLG] Failed to create TSLG connection:', error);
            this.metrics.connectionErrors++;
            this.scheduleReconnect();
        }
    }

    private setupSocketEventHandlers(): void {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            this.lastConnectionTime = Date.now();
            this.connectionAttempts = 0;
            this.console.log(
                `[TSLG] Connected successfully to ${this.options.host}:${this.options.port}`,
            );
            this.bufferManager.flushBuffer((data) => this.write(data + '\n'));
        });

        this.socket.on('error', (error) => {
            this.console.error(`[TSLG] Connection error: ${error.message}`);
            this.metrics.connectionErrors++;
            this.scheduleReconnect();
        });

        this.socket.on('close', (hadError) => {
            if (hadError) {
                this.scheduleReconnect();
            }
        });

        this.socket.on('timeout', () => {
            this.console.error('[TSLG] Connection timeout');
            this.safeReconnect();
        });
    }

    private scheduleReconnect(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        const delay = this.calculateReconnectDelay();
        this.metrics.reconnections++;
        this.console.log(`[TSLG] Scheduling reconnect in ${delay}ms`);

        this.reconnectTimeout = setTimeout(() => {
            this.connect();
        }, delay);
    }

    private calculateReconnectDelay(): number {
        const baseDelay = this.options.reconnectionDelay;
        const maxDelay = 30000;
        return Math.min(
            baseDelay * Math.pow(1.5, Math.max(0, this.connectionAttempts - 1)),
            maxDelay,
        );
    }

    private safeReconnect(): void {
        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
        }
        this.scheduleReconnect();
    }

    isConnected(): boolean {
        return !!(this.socket && !this.socket.destroyed && this.socket.writable);
    }

    private write(data: string): boolean {
        if (!this.isConnected()) {
            return false;
        }
        try {
            return this.socket!.write(data);
        } catch (error) {
            this.console.error('[TSLG] Error writing to socket:', error);
            return false;
        }
    }

    /**
     * Отправляет подготовленную JSON-строку лога.
     * Если соединение недоступно — буферизует (ОЛ.01 / ОЛ.02).
     */
    send(logData: string): void {
        if (!this.isConnected()) {
            this.bufferManager.bufferLog(logData);
            return;
        }

        try {
            const success = this.write(logData + '\n');
            if (!success) {
                this.bufferManager.bufferLog(logData);
            } else {
                this.metrics.sentLogs++;
            }
        } catch (error) {
            this.console.error('[TSLG] Failed to send log to TSLG:', error);
            this.bufferManager.bufferLog(logData);
        }
    }

    close(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        if (this.ttlInterval) {
            clearInterval(this.ttlInterval);
            this.ttlInterval = null;
        }
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }

        if (this.bufferManager.getBufferSize() > 0) {
            this.console.log(
                `[TSLG] Attempting to flush ${this.bufferManager.getBufferSize()} buffered logs before shutdown`,
            );
            this.bufferManager.flushBufferSync((data) => this.write(data + '\n'));
        }

        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
        }
        this.console.log('[TSLG] Transport closed');
    }

    private startTTLMonitor(): void {
        if (this.ttlInterval) {
            clearInterval(this.ttlInterval);
        }

        this.ttlInterval = setInterval(async () => {
            if (!this.isConnected()) return;

            const now = Date.now();
            const timeSinceReconnect = now - this.lastConnectionTime;

            if (timeSinceReconnect >= this.options.connectionTTL) {
                this.console.log(
                    `[TSLG] TTL ${this.options.connectionTTL}ms expired, scheduling reconnection for load balancing`,
                );
                await this.performGracefulReconnect();
            }
        }, 1000);
    }

    private startBufferFlushMonitor(): void {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
        }

        this.flushInterval = setInterval(() => {
            if (
                this.bufferManager.getBufferSize() > 0 &&
                this.isConnected() &&
                !this.bufferManager.isCurrentlyFlushing()
            ) {
                this.metrics.forcedFlushes++;
                this.bufferManager.flushBuffer((data) => this.write(data + '\n'));
            }
        }, this.options.bufferFlushInterval);
    }

    private async performGracefulReconnect(): Promise<void> {
        try {
            this.console.log(
                '[TSLG] Starting graceful reconnection for load balancing',
            );

            if (this.isConnected()) {
                const size = this.bufferManager.getBufferSize();
                if (size > 0) {
                    this.console.log(
                        `[TSLG] Waiting for ${size} buffered logs to be sent`,
                    );
                    await this.waitForBufferFlush();
                }
                if (this.socket) {
                    this.socket.destroy();
                    this.socket = null;
                }
            }

            this.connect();
            this.metrics.ttlReconnections++;
            this.console.log(
                '[TSLG] Graceful reconnection completed successfully',
            );
        } catch (error) {
            this.console.error('[TSLG] Graceful reconnection failed:', error);
        }
    }

    private async waitForBufferFlush(): Promise<void> {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 10;
            const checkBuffer = () => {
                attempts++;
                const size = this.bufferManager.getBufferSize();
                if (size === 0 || attempts >= maxAttempts) {
                    if (size > 0) {
                        this.console.warn(
                            `[TSLG] Buffer not fully flushed after ${attempts} attempts, ${size} logs remaining`,
                        );
                    }
                    resolve();
                } else {
                    setTimeout(checkBuffer, 500);
                }
            };
            setTimeout(checkBuffer, 500);
        });
    }

    getStatus(): Record<string, unknown> {
        return {
            isConnected: this.isConnected(),
            host: this.options.host,
            port: this.options.port,
            bufferSize: this.bufferManager.getBufferSize(),
            connectionAttempts: this.connectionAttempts,
            lastConnectionTime: this.lastConnectionTime,
            metrics: { ...this.metrics },
        };
    }

    getBufferSize(): number {
        return this.bufferManager.getBufferSize();
    }

    getLastConnectionTime(): number {
        return this.lastConnectionTime;
    }

    getConnectionAttempts(): number {
        return this.connectionAttempts;
    }
}