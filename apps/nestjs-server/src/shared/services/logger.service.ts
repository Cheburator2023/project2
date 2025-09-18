import { Injectable, LoggerService } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { Request, Response } from "express";
import chalk from "chalk";

@Injectable()
export class CustomLogger implements LoggerService {
	private readonly appName = "smart-anketa-api";
	private readonly projectCode = "ANKETA";
	private readonly appType = "NODEJS";
	private readonly envType =
		process.env.NODE_ENV === "production" ? "K8S" : "DEV";
	private readonly tslgClientVersion = "1.0.0";
	private readonly risCode = "1404";
	private readonly enableColors =
		this.envType === "DEV" && process.stdout.isTTY; // Enable colors only in development with TTY support

	// Color mapping for different log levels
	private readonly levelColors = {
		INFO: chalk.blue,
		ERROR: chalk.red,
		WARN: chalk.yellow,
		DEBUG: chalk.magenta,
		VERBOSE: chalk.cyan,
	};

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
		});
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
			logEntry.tec = {
				podip: process.env.POD_IP,
				nodeName: process.env.NODE_NAME,
			};
		}

		if (this.enableColors && this.envType === "DEV") {
			this.printColoredHttpLog(request, response, responseTime, logEntry);
		} else {
			console.log(JSON.stringify(logEntry));
		}
	}

	private printLog(
		level: string,
		message: string,
		context?: string,
		additionalData?: Record<string, any>,
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

		if (this.envType === "K8S") {
			logEntry.namespace = process.env.KUBERNETES_NAMESPACE;
			logEntry.tec = {
				podip: process.env.POD_IP,
				nodeName: process.env.NODE_NAME,
			};
		}

		if (this.enableColors && this.envType === "DEV") {
			this.printColoredLog(level, message, logEntry);
		} else {
			console.log(JSON.stringify(logEntry));
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
				// Обработка заголовка Authorization: Bearer <token>
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

	/**
	 * Pretty prints JSON data with proper indentation and colors
	 */
	private prettyPrintJson(data: any, indent = 2): string {
		try {
			return JSON.stringify(data, null, indent);
		} catch {
			return "[Non-serializable data]";
		}
	}

	/**
	 * Prints colored and formatted log output for development environment
	 */
	private printColoredLog(level: string, message: string, logEntry: any): void {
		const timestamp = chalk.gray(new Date().toISOString());
		const levelColor = this.levelColors[level] || chalk.white;
		const coloredLevel = levelColor.bold(`[${level}]`);
		const context = logEntry.loggerName
			? chalk.green(`[${logEntry.loggerName}]`)
			: "";
		const coloredMessage = levelColor(message);

		// Main log line
		console.log(`${timestamp} ${coloredLevel} ${context} ${coloredMessage}`);

		// Additional data formatting
		const additionalData = { ...logEntry };
		delete additionalData.level;
		delete additionalData.text;
		delete additionalData.localTime;
		delete additionalData.loggerName;

		// Show additional data if present
		if (Object.keys(additionalData).length > 0) {
			console.log(chalk.gray("📋 Additional Data:"));
			console.log(chalk.gray(this.prettyPrintJson(additionalData)));
		}

		// Add separator for better readability
		if (level === "ERROR") {
			console.log(chalk.red("─".repeat(80)));
		}
	}

	/**
	 * Prints colored and formatted HTTP log output for development environment
	 */
	private printColoredHttpLog(
		request: Request,
		response: Response,
		responseTime: number,
		logEntry: any,
	): void {
		const timestamp = chalk.gray(new Date().toISOString());
		const method = this.getMethodColor(request.method)(request.method);
		const statusColor = this.getStatusColor(response.statusCode);
		const status = statusColor(response.statusCode.toString());
		const path = chalk.white(request.path);
		const time = chalk.yellow(`${responseTime}ms`);
		const ip = chalk.cyan(request.ip);

		// Main HTTP log line
		console.log(
			`${timestamp} ${chalk.blue.bold("[HTTP]")} ${method} ${path} ${status} ${time} - ${ip}`,
		);

		// Request details if present
		if (request.body && Object.keys(request.body).length > 0) {
			console.log(chalk.gray("📤 Request Body:"));
			console.log(chalk.gray(this.prettyPrintJson(logEntry.requestBody)));
		}

		// Response details for errors
		if (response.statusCode >= 400) {
			console.log(chalk.red("─".repeat(80)));
		}
	}

	/**
	 * Get color for HTTP method
	 */
	private getMethodColor(method: string) {
		switch (method.toUpperCase()) {
			case "GET":
				return chalk.green;
			case "POST":
				return chalk.blue;
			case "PUT":
				return chalk.yellow;
			case "DELETE":
				return chalk.red;
			case "PATCH":
				return chalk.magenta;
			default:
				return chalk.white;
		}
	}

	/**
	 * Get color for HTTP status code
	 */
	private getStatusColor(statusCode: number) {
		if (statusCode >= 200 && statusCode < 300) {
			return chalk.green;
		} else if (statusCode >= 300 && statusCode < 400) {
			return chalk.yellow;
		} else if (statusCode >= 400 && statusCode < 500) {
			return chalk.red;
		} else if (statusCode >= 500) {
			return chalk.red.bold;
		}
		return chalk.white;
	}
}
