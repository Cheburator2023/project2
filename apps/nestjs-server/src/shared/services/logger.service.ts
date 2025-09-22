import { Injectable, LoggerService } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { Request, Response } from "express";
import { TSLGTransport } from "../logger/tslg.transport";

@Injectable()
export class CustomLogger implements LoggerService {
    private readonly appName = process.env.APP_NAME || "smart-anketa-api";
    private readonly projectCode = process.env.PROJECT_CODE || "ANKETA";
    private readonly appType = "NODEJS";
    private readonly envType = process.env.NODE_ENV === "production" ? "K8S" : "DEV";
    private readonly tslgClientVersion = process.env.TSLG_CLIENT_VERSION || "1.0.0";
    private readonly risCode = process.env.RIS_CODE || "1404";

    private tslgTransport: TSLGTransport | null = null;

    constructor() {
        const tslgHost = process.env.TSLG_AGENT_HOST;
        const tslgPort = process.env.TSLG_AGENT_PORT;

        if (tslgHost && tslgPort) {
            this.tslgTransport = new TSLGTransport({
                host: tslgHost,
                port: parseInt(tslgPort, 10),
                appName: this.appName,
                projectCode: this.projectCode,
                risCode: this.risCode,
                appType: this.appType,
                envType: this.envType,
                tslgClientVersion: this.tslgClientVersion,
                reconnectionDelay: parseInt(process.env.TSLG_RECONNECTION_DELAY_MS || '1000', 10),
                connectionTTL: parseInt(process.env.TSLG_CONNECTION_TTL_MS || '2000', 10),
            });
        }
    }

    log(message: string, context?: string, additionalData?: Record<string, any>) {
        this.printLog("INFO", message, context, additionalData);
    }

    error(
        message: string,
        stack: string,
        context?: string,
        additionalData?: Record<string, any>,
    ) {
        this.printLog("ERROR", message, context, {
            ...additionalData,
            stack: this.cleanStack(stack),
        }, stack);
    }

    warn(
        message: string,
        context?: string,
        additionalData?: Record<string, any>,
    ) {
        this.printLog("WARN", message, context, additionalData);
    }

    debug(
        message: string,
        context?: string,
        additionalData?: Record<string, any>,
    ) {
        this.printLog("DEBUG", message, context, additionalData);
    }

    verbose(
        message: string,
        context?: string,
        additionalData?: Record<string, any>,
    ) {
        this.printLog("VERBOSE", message, context, additionalData);
    }

    httpLog(request: Request, response: Response, responseTime: number) {
        const logEntry: any = {
            eventId: uuidv4(),
            appName: this.appName,
            level: "INFO",
            text: `HTTP ${request.method} ${request.path}`,
            localTime: new Date().toISOString(),
            tslgClientVersion: this.tslgClientVersion,
            risCode: this.risCode,
            projectCode: this.projectCode,
            appType: this.appType,
            envType: this.envType,
            PID: process.pid,
            loggerName: "http",
            requestMethod: request.method,
            requestURI: request.path,
            requestBody: this.sanitizeBody(request.body),
            requestHeaders: this.sanitizeHeaders(request.headers),
            responseStatus: response.statusCode,
            requestTime: responseTime,
            initiatorHost: request.ip,
            traceId: (request.headers["x-request-id"] as string) || uuidv4(),
        };

        if (this.envType === "K8S") {
            logEntry.namespace = process.env.KUBERNETES_NAMESPACE;
            logEntry.podName = process.env.POD_NAME;
            logEntry.tec = {
                podip: process.env.POD_IP,
                nodeName: process.env.NODE_NAME,
            };
        }

        // Отправляем в консоль
        console.log(JSON.stringify(logEntry));

        // Отправляем в TSLG если настроено
        if (this.tslgTransport) {
            this.tslgTransport.log("INFO", `HTTP ${request.method} ${request.path}`, "http", {
                requestMethod: request.method,
                requestURI: request.path,
                requestBody: this.sanitizeBody(request.body),
                requestHeaders: this.sanitizeHeaders(request.headers),
                responseStatus: response.statusCode,
                requestTime: responseTime,
                initiatorHost: request.ip,
                traceId: (request.headers["x-request-id"] as string) || uuidv4(),
            });
        }
    }

    private printLog(
        level: string,
        message: string,
        context?: string,
        additionalData?: Record<string, any>,
        stack?: string,
    ) {
        let sanitizedContext = context;
        if (context && typeof context === "object") {
            sanitizedContext = this.sanitizeData(context);
        }

        const logEntry: any = {
            eventId: uuidv4(),
            appName: this.appName,
            level,
            text: message,
            localTime: new Date().toISOString(),
            tslgClientVersion: this.tslgClientVersion,
            risCode: this.risCode,
            projectCode: this.projectCode,
            appType: this.appType,
            envType: this.envType,
            PID: process.pid,
            loggerName: sanitizedContext || "application",
            ...(additionalData && this.sanitizeData(additionalData)),
        };

        if (stack) {
            logEntry.stack = this.cleanStack(stack);
        }

        if (this.envType === "K8S") {
            logEntry.namespace = process.env.KUBERNETES_NAMESPACE;
            logEntry.podName = process.env.POD_NAME;
            logEntry.tec = {
                podip: process.env.POD_IP,
                nodeName: process.env.NODE_NAME,
            };
        }

        // Отправляем в консоль
        console.log(JSON.stringify(logEntry));

        // Отправляем в TSLG если настроено
        if (this.tslgTransport) {
            this.tslgTransport.log(level, message, sanitizedContext as string, additionalData, stack);
        }
    }

    private cleanStack(stack: string): string {
        return stack
            ?.split("\n")
            ?.map((line) => line.trim())
            ?.join("\n");
    }

    private sanitizeBody(body: any): string {
        if (!body) return "";
        try {
            const sanitized = { ...body };

            // Санитизация чувствительных данных
            if (sanitized.password) sanitized.password = "*****";
            if (sanitized.newPassword) sanitized.newPassword = "*****";
            if (sanitized.currentPassword) sanitized.currentPassword = "*****";
            if (sanitized.token) sanitized.token = "*****";
            if (sanitized.accessToken) sanitized.accessToken = "*****";
            if (sanitized.refreshToken) sanitized.refreshToken = "*****";
            if (sanitized.jwt) sanitized.jwt = "*****";
            if (sanitized.authorization) {
                if (sanitized.authorization.startsWith("Bearer ")) {
                    sanitized.authorization = "Bearer *****";
                } else {
                    sanitized.authorization = "*****";
                }
            }

            return JSON.stringify(sanitized);
        } catch {
            return "[Non-serializable body]";
        }
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

    onApplicationShutdown() {
        if (this.tslgTransport) {
            this.tslgTransport.close();
        }
    }
}