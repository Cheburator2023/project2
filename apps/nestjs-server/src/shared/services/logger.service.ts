import { Injectable, LoggerService } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { ILogEntry } from "../interfaces/log.interface";

@Injectable()
export class CustomLogger implements LoggerService {
	private readonly appName = "smart-anketa-api";
	private readonly projectCode = "ANKETA";
	private readonly appType = "NODEJS";
	private readonly envType =
		process.env.NODE_ENV === "production" ? "K8S" : "DEV";
	private readonly tslgClientVersion = "1.0.0";

	log(message: string, context?: string, additionalData?: Record<string, any>) {
		const logEntry = {
			"@timestamp": new Date().toISOString(),
			level: "info",
			message,
			context,
			...this.getBaseFields(),
			...additionalData,
		};
		console.log(JSON.stringify(logEntry));
	}

	error(
		message: string,
		stack: string,
		context?: string,
		additionalData?: Record<string, any>,
	) {
		const logEntry = {
			"@timestamp": new Date().toISOString(),
			level: "error",
			message,
			context,
			stack,
			...this.getBaseFields(),
			...additionalData,
		};
		console.error(JSON.stringify(logEntry));
	}

	warn(message: string, context?: string) {
		this.printLog("warn", message, context);
	}

	debug(message: string, context?: string) {
		this.printLog("debug", message, context);
	}

	verbose(message: string, context?: string) {
		this.printLog("verbose", message, context);
	}

	private getBaseFields() {
		return {
			appName: this.appName,
			projectCode: this.projectCode,
			appType: this.appType,
			envType: this.envType,
			tslgClientVersion: this.tslgClientVersion,
			PID: process.pid,
		};
	}

	private printLog(
		level: ILogEntry["level"],
		text: string,
		context?: string,
		stack?: string,
	) {
		const timestamp = new Date();
		const logEntry: ILogEntry = {
			"@timestamp": timestamp.getTime() / 1000,
			level,
			eventId: uuidv4(),
			text,
			localTime: timestamp.toISOString(),
			stack,
			PID: process.pid,
			appType: this.appType,
			projectCode: this.projectCode,
			appName: this.appName,
			timestamp: timestamp.toISOString(),
			envType: this.envType,
			tslgClientVersion: this.tslgClientVersion,
			...(context && { message: context }),
		};

		if (this.envType === "K8S") {
			logEntry.namespace = process.env.KUBERNETES_NAMESPACE;
			logEntry.podName = process.env.HOSTNAME;
			logEntry.tec = {
				nodeName: process.env.NODE_NAME,
				podIp: process.env.POD_IP,
			};
		}

		console.log(JSON.stringify(logEntry));
	}

	private getBaseLogEntry(
		level: ILogEntry["level"],
		text: string,
		context?: string,
	): Omit<ILogEntry, "stack"> {
		const timestamp = new Date();
		return {
			"@timestamp": timestamp.getTime() / 1000,
			level,
			eventId: uuidv4(),
			text,
			localTime: timestamp.toISOString(),
			PID: process.pid,
			appType: this.appType,
			projectCode: this.projectCode,
			appName: this.appName,
			timestamp: timestamp.toISOString(),
			envType: this.envType,
			tslgClientVersion: this.tslgClientVersion,
			...(context && { message: context }),
		};
	}
}
