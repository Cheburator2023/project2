import { Injectable, LoggerService } from "@nestjs/common";
import { Request, Response } from "express";
import { TSLGTransport } from "../logger/tslg.transport";
import { LogEntryBuilder } from "../logger/log-entry-builder";

/**
 * Логгер приложения.
 *
 * Отвечает за:
 *  - формирование JSON-записи лога (LogEntryBuilder) по ТИС 1404;
 *  - вывод в консоль (управляется TSLG_CONSOLE_OUTPUT);
 *  - отправку в СС Журналирование через TSLGTransport;
 *  - маскирование чувствительных данных;
 *  - поддержку уровней TRACE/DEBUG/INFO/WARN/WARNING/ERROR/FATAL/PANIC/CRITICAL.
 */
@Injectable()
export class CustomLogger implements LoggerService {
    private readonly appName = process.env.APP_NAME || "smart-anketa-api";
    private readonly projectCode = process.env.PROJECT_CODE || "SUMD";
    private readonly appType = "NODEJS";
    private readonly envType =
        process.env.NODE_ENV === "production" ? "K8S" : "DEV";
    private readonly tslgClientVersion =
        process.env.TSLG_CLIENT_VERSION || "1.0.0";
    private readonly risCode = process.env.RIS_CODE || "1661";

    private readonly consoleOutput: boolean;
    private readonly debugJson: boolean;
    private readonly logLevel: string;

    private static readonly MAX_BODY_LOG_CHARS = 2048;
    private static readonly MAX_LOG_SIZE_BYTES = 995328; // 972 KB (ТИС 1404)
    private static readonly OMITTED_BODY_FIELDS = new Set([
        "jsonSchema",
        "uiSchema",
        "logic",
        "dictionariesSnapshot",
        "json_schema",
        "ui_schema",
    ]);

    /**
     * Числовые приоритеты уровней логирования (меньше — критичнее).
     * Значения совместимы с референсной реализацией.
     */
    private static readonly LOG_LEVELS: Record<string, number> = {
        fatal: -3,
        panic: -2,
        critical: -1,
        error: 0,
        warn: 1,
        warning: 1,
        info: 2,
        debug: 3,
        verbose: 4,
        trace: 5,
    };

    private static readonly DEFAULT_LOG_LEVEL = "info";

    private tslgTransport: TSLGTransport | null = null;
    private readonly logEntryBuilder: LogEntryBuilder;

    constructor() {
        // TSLG_CONSOLE_OUTPUT: явно заданное значение имеет приоритет;
        // если не задано — включаем в непроизводственных средах.
        this.consoleOutput =
            this.parseBoolean(process.env.TSLG_CONSOLE_OUTPUT) ??
            process.env.NODE_ENV !== "production";

        this.debugJson = process.env.DEBUG_JSON === "true";

        // TSLG_LOG_LEVEL: если не передан — по умолчанию info.
        this.logLevel = (
            process.env.TSLG_LOG_LEVEL || CustomLogger.DEFAULT_LOG_LEVEL
        ).toLowerCase();

        this.logEntryBuilder = new LogEntryBuilder({
            appName: this.appName,
            risCode: this.risCode,
            projectCode: this.projectCode,
            appType: this.appType,
            envType: this.envType,
            namespace: process.env.KUBERNETES_NAMESPACE,
            podName: process.env.POD_NAME,
            podIp: process.env.POD_IP,
            nodeName: process.env.NODE_NAME,
            tslgClientVersion: this.tslgClientVersion,
            tslgServerVersion: process.env.TSLG_SERVER_VERSION,
            enableUserData: process.env.TSLG_ENABLE_USER_DATA === "true",
            sanitizeSensitiveData:
                process.env.TSLG_SANITIZE_SENSITIVE_DATA !== "false",
            enableFullContext: process.env.TSLG_ENABLE_FULL_CONTEXT === "true",
            sanitizePercentage: parseInt(
                process.env.TSLG_SANITIZE_PERCENTAGE || "60",
                10,
            ),
            userFieldsMapping: {
                userId: process.env.TSLG_USER_ID || "sub",
                username: process.env.TSLG_USER_USERNAME || "preferred_username",
                email: process.env.TSLG_USER_EMAIL || "email",
                firstName: process.env.TSLG_USER_FIRSTNAME || "given_name",
                lastName: process.env.TSLG_USER_LASTNAME || "family_name",
            },
        });

        const tslgHost = process.env.TSLG_AGENT_HOST;
        const tslgPort = process.env.TSLG_AGENT_PORT;

        if (tslgHost && tslgPort) {
            this.tslgTransport = new TSLGTransport({
                host: tslgHost,
                port: parseInt(tslgPort, 10),
                socketTimeout: parseInt(
                    process.env.TSLG_SOCKET_TIMEOUT_MS || "10000",
                    10,
                ),
                reconnectionDelay: parseInt(
                    process.env.TSLG_RECONNECTION_DELAY_MS || "1000",
                    10,
                ),
                connectionTTL: parseInt(
                    process.env.TSLG_CONNECTION_TTL_MS || "2000",
                    10,
                ),
                maxConnectionAttempts: parseInt(
                    process.env.TSLG_MAX_CONNECTION_ATTEMPTS || "10",
                    10,
                ),
                maxBufferSize: parseInt(
                    process.env.TSLG_MAX_BUFFER_SIZE || "1000",
                    10,
                ),
                bufferFlushInterval: parseInt(
                    process.env.TSLG_BUFFER_FLUSH_INTERVAL_MS || "500",
                    10,
                ),
            });
        }
    }

    private parseBoolean(value: unknown): boolean | null {
        if (value === undefined || value === null) return null;
        if (typeof value === "boolean") return value;
        if (typeof value === "string") {
            const lower = value.toLowerCase().trim();
            return lower === "true" || lower === "1" || lower === "yes";
        }
        return null;
    }

    private shouldLog(level: string): boolean {
        const current =
            CustomLogger.LOG_LEVELS[level.toLowerCase()] ??
            CustomLogger.LOG_LEVELS[CustomLogger.DEFAULT_LOG_LEVEL];
        const configured =
            CustomLogger.LOG_LEVELS[this.logLevel] ??
            CustomLogger.LOG_LEVELS[CustomLogger.DEFAULT_LOG_LEVEL];
        return current <= configured;
    }

    log(
        message: string,
        context?: string,
        additionalData?: Record<string, any>,
    ): void {
        this.printLog("INFO", message, context, additionalData);
    }

    error(
        message: string,
        stack: string,
        context?: string,
        additionalData?: Record<string, any>,
    ): void {
        this.printLog(
            "ERROR",
            message,
            context,
            { ...additionalData, stack: this.cleanStack(stack) },
            stack,
        );
    }

    warn(
        message: string,
        context?: string,
        additionalData?: Record<string, any>,
    ): void {
        this.printLog("WARN", message, context, additionalData);
    }

    debug(
        message: string,
        context?: string,
        additionalData?: Record<string, any>,
    ): void {
        this.printLog("DEBUG", message, context, additionalData);
    }

    verbose(
        message: string,
        context?: string,
        additionalData?: Record<string, any>,
    ): void {
        this.printLog("VERBOSE", message, context, additionalData);
    }

    trace(
        message: string,
        context?: string,
        additionalData?: Record<string, any>,
    ): void {
        this.printLog("TRACE", message, context, additionalData);
    }

    fatal(
        message: string,
        context?: string,
        additionalData?: Record<string, any>,
    ): void {
        this.printLog("FATAL", message, context, additionalData);
    }

    panic(
        message: string,
        context?: string,
        additionalData?: Record<string, any>,
    ): void {
        this.printLog("PANIC", message, context, additionalData);
    }

    critical(
        message: string,
        context?: string,
        additionalData?: Record<string, any>,
    ): void {
        this.printLog("CRITICAL", message, context, additionalData);
    }

    httpLog(request: Request, response: Response, responseTime: number): void {
        const logData = {
            requestMethod: request.method,
            requestURI: request.path,
            requestBody: this.sanitizeBody(request.body),
            requestHeaders: this.sanitizeHeaders(request.headers),
            responseStatus: response.statusCode,
            requestTime: responseTime,
            initiatorHost: request.ip,
        };

        const message = `HTTP ${request.method} ${request.path}`;
        this.printLog("INFO", message, "http", logData);
    }

    private printLog(
        level: string,
        message: string,
        context?: string,
        additionalData?: Record<string, any>,
        stack?: string,
    ): void {
        if (!this.shouldLog(level)) return;

        try {
            const enrichedData: Record<string, any> = {
                ...(additionalData || {}),
            };
            if (context && typeof context === "string") {
                enrichedData.context = context;
            }

            let errorObj: Error | null = null;
            if (stack) {
                errorObj = new Error(message);
                errorObj.stack = stack;
            }

            const event = this.eventFromLevel(level);

            const logEntry = this.logEntryBuilder.buildLogEntry(
                level,
                message,
                event,
                errorObj,
                enrichedData,
            );

            const logData = JSON.stringify(logEntry);

            if (this.consoleOutput) {
                this.consoleLog(level, message, context, additionalData, stack);
            }

            if (this.debugJson) {
                console.log("[TSLG DEBUG JSON]:", logData);
            }

            if (this.tslgTransport) {
                if (
                    Buffer.byteLength(logData, "utf8") >
                    CustomLogger.MAX_LOG_SIZE_BYTES
                ) {
                    console.warn("[TSLG] Log message too large, truncating");
                    const truncatedEntry: Record<string, unknown> = {
                        ...logEntry,
                        text:
                            String(logEntry.text).substring(0, 1000) +
                            " [TRUNCATED]",
                    };
                    this.tslgTransport.send(JSON.stringify(truncatedEntry));
                } else {
                    this.tslgTransport.send(logData);
                }
            }
        } catch (logError) {
            console.error("[TSLG] Error building log entry:", logError);
            if (this.consoleOutput) {
                this.consoleLog(level, message, context, additionalData, stack);
            }
        }
    }

    private eventFromLevel(level: string): string {
        const map: Record<string, string> = {
            trace: "Трассировка",
            debug: "Отладка",
            info: "Информация",
            warn: "Предупреждение",
            warning: "Предупреждение",
            error: "Ошибка",
            fatal: "КритическаяОшибка",
            panic: "Паника",
            critical: "Критично",
            verbose: "Подробно",
        };
        return map[level.toLowerCase()] || "Информация";
    }

    private consoleLog(
        level: string,
        message: string,
        context?: string,
        additionalData?: Record<string, any>,
        stack?: string,
    ): void {
        const timestamp = new Date().toISOString();
        const levelUpper = level.toUpperCase();

        let logMessage = `[${timestamp}] [${levelUpper}] [${
            context || "application"
        }] ${this.safeStringify(message)}`;

        if (stack) {
            logMessage += ` | Stack: ${this.safeStringify(stack)}`;
        }

        if (additionalData && Object.keys(additionalData).length > 0) {
            logMessage += ` | Data: ${this.safeStringify(additionalData)}`;
        }

        switch (level.toLowerCase()) {
            case "error":
            case "fatal":
            case "panic":
            case "critical":
                console.error(logMessage);
                break;
            case "warn":
            case "warning":
                console.warn(logMessage);
                break;
            default:
                console.log(logMessage);
        }
    }

    private safeStringify(obj: any, depth = 0): string {
        if (depth > 10) return "[Circular]";
        try {
            if (obj === null || obj === undefined) return String(obj);
            if (typeof obj === "string") return obj;
            if (typeof obj === "number" || typeof obj === "boolean")
                return String(obj);
            if (obj instanceof Error) return obj.toString();
            if (typeof obj === "object") return JSON.stringify(obj, null, 2);
            return String(obj);
        } catch (error: any) {
            return `[Stringification error: ${error.message}]`;
        }
    }

    private cleanStack(stack: string): string {
        return (
            stack
                ?.split("\n")
                ?.map((line) => line.trim())
                ?.join("\n") || ""
        );
    }

    private sanitizeBody(body: any): string {
        if (!body) return "";
        try {
            const sanitized = this.compactBodyForLog(body);
            const serialized = JSON.stringify(sanitized);
            if (serialized.length <= CustomLogger.MAX_BODY_LOG_CHARS) {
                return serialized;
            }
            return `${serialized.slice(
                0,
                CustomLogger.MAX_BODY_LOG_CHARS,
            )}…[truncated ${serialized.length} chars]`;
        } catch {
            return "[Non-serializable body]";
        }
    }

    private compactBodyForLog(body: any): Record<string, unknown> {
        if (typeof body !== "object" || body === null || Array.isArray(body)) {
            return body as Record<string, unknown>;
        }

        const sanitized = { ...body } as Record<string, unknown>;

        for (const [key, value] of Object.entries(sanitized)) {
            if (CustomLogger.OMITTED_BODY_FIELDS.has(key) && value != null) {
                const size =
                    typeof value === "string"
                        ? value.length
                        : JSON.stringify(value).length;
                sanitized[key] = `[omitted ${Math.ceil(size / 1024)} KB]`;
                continue;
            }

            if (typeof value === "string" && this.isJwtToken(value)) {
                sanitized[key] = "*****";
                continue;
            }

            if (
                key.toLowerCase() === "password" ||
                key.toLowerCase() === "token" ||
                key.toLowerCase() === "authorization"
            ) {
                sanitized[key] = "*****";
            }
        }

        return sanitized;
    }

    private sanitizeHeaders(headers: any): any {
        if (!headers) return {};

        const sanitized = { ...headers };
        if (sanitized.authorization) {
            sanitized.authorization = "*****";
        }
        if (sanitized["x-access-token"]) {
            sanitized["x-access-token"] = "*****";
        }
        if (sanitized["x-refresh-token"]) {
            sanitized["x-refresh-token"] = "*****";
        }

        return sanitized;
    }

    private sanitizeData(data: any): any {
        if (typeof data !== "object" || data === null) {
            if (typeof data === "string" && this.isJwtToken(data)) {
                return "*****";
            }
            return data;
        }

        if (Array.isArray(data)) {
            return data.map((item) => this.sanitizeData(item));
        }

        const sanitized = { ...data };
        const sensitiveFields = [
            "password",
            "token",
            "jwt",
            "accessToken",
            "refreshToken",
            "authorization",
            "secret",
            "apiKey",
            "credentials",
        ];

        for (const [key, value] of Object.entries(sanitized)) {
            if (typeof value === "string" && this.isJwtToken(value)) {
                sanitized[key] = "*****";
                continue;
            }

            if (sensitiveFields.includes(key.toLowerCase())) {
                sanitized[key] = "*****";
            } else {
                sanitized[key] = this.sanitizeData(value);
            }
        }

        return sanitized;
    }

    private isJwtToken(value: string): boolean {
        return typeof value === "string" && value.split(".").length === 3;
    }

    onApplicationShutdown(): void {
        if (this.tslgTransport) {
            this.tslgTransport.close();
        }
    }
}