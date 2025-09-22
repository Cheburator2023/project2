import * as net from 'net';
import { v4 as uuidv4 } from 'uuid';

export class TSLGTransport {
    private socket: net.Socket | null = null;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private lastConnectionTime: number = 0;

    constructor(
        private readonly options: {
            host: string;
            port: number;
            appName: string;
            projectCode: string;
            risCode: string;
            appType: string;
            envType: string;
            tslgClientVersion: string;
            reconnectionDelay?: number;
            connectionTTL?: number;
        }
    ) {
        this.options = {
            reconnectionDelay: 1000,
            connectionTTL: 2000,
            ...options,
        };
        this.connect();
    }

    private connect() {
        this.socket = net.createConnection(
            {
                host: this.options.host,
                port: this.options.port,
            },
            () => {
                this.lastConnectionTime = Date.now();
            }
        );

        this.socket.on('error', (error) => {
            console.error('TSLG Transport connection error:', error);
            this.scheduleReconnect();
        });

        this.socket.on('close', () => {
            this.scheduleReconnect();
        });
    }

    private scheduleReconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        this.reconnectTimeout = setTimeout(() => {
            this.connect();
        }, this.options.reconnectionDelay);
    }

    private shouldReconnect(): boolean {
        return Date.now() - this.lastConnectionTime >= this.options.connectionTTL!;
    }

    log(level: string, message: string, context?: string, additionalData?: Record<string, any>, stack?: string) {
        if (this.socket && this.socket.writable) {
            if (this.shouldReconnect()) {
                this.socket.destroy();
                this.connect();
                return;
            }

            const logEntry = this.formatLogEntry(level, message, context, additionalData, stack);
            this.socket.write(JSON.stringify(logEntry) + '\n');
        }
    }

    private formatLogEntry(
        level: string,
        message: string,
        context?: string,
        additionalData?: Record<string, any>,
        stack?: string
    ): any {
        const logEntry: any = {
            eventId: uuidv4(),
            appName: this.options.appName,
            level: level.toUpperCase(),
            text: message,
            localTime: new Date().toISOString(),
            tslgClientVersion: this.options.tslgClientVersion,
            risCode: this.options.risCode,
            projectCode: this.options.projectCode,
            appType: this.options.appType,
            envType: this.options.envType,
            PID: process.pid,
            loggerName: context || 'application',
            ...this.sanitizeData(additionalData || {}),
        };

        if (stack) {
            logEntry.stack = this.cleanStack(stack);
        }

        if (this.options.envType === 'K8S') {
            logEntry.namespace = process.env.KUBERNETES_NAMESPACE;
            logEntry.podName = process.env.POD_NAME;
            logEntry.tec = {
                podIp: process.env.POD_IP,
                nodeName: process.env.NODE_NAME,
            };
        }

        return logEntry;
    }

    private cleanStack(stack: string): string {
        return stack
            ?.split('\n')
            ?.map((line) => line.trim())
            ?.join('\n');
    }

    private sanitizeData(data: Record<string, any>): Record<string, any> {
        const sensitiveFields = [
            'password',
            'token',
            'jwt',
            'accessToken',
            'refreshToken',
            'authorization',
            'secret',
            'apiKey',
            'credentials',
        ];

        const sanitized = { ...data };
        for (const [key, value] of Object.entries(sanitized)) {
            if (sensitiveFields.includes(key.toLowerCase())) {
                sanitized[key] = '*****';
            }
        }

        return sanitized;
    }

    close() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        if (this.socket) {
            this.socket.destroy();
        }
    }
}