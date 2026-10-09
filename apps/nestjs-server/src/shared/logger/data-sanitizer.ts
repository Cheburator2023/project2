import { maskString, maskJwtToken } from "./mask.util";

/**
 * Маскирование чувствительных данных в дополнительных атрибутах лога.
 * Список полей и паттернов — по «Практикам ведения логов» (БЛ.01)
 * и ТИС 1404.
 */
export class DataSanitizer {
    static sanitizeData(data: any, sanitizePercentage = 60): any {
        if (!data || typeof data !== "object") return data || {};

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
            "privateKey",
            "certificate",
            "signature",
            "bearer",
            "auth",
            "authentication",
            "pwd",
            "pass",
            "key",
        ];

        const sensitivePatterns = [
            /eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, // JWT
        ];

        const sanitized = JSON.parse(JSON.stringify(data));
        this.sanitizeRecursive(
            sanitized,
            sensitiveFields,
            sensitivePatterns,
            sanitizePercentage,
        );
        return sanitized;
    }

    private static sanitizeRecursive(
        obj: any,
        sensitiveFields: string[],
        sensitivePatterns: RegExp[],
        sanitizePercentage: number,
    ): void {
        for (const key in obj) {
            if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

            if (sensitiveFields.includes(key.toLowerCase())) {
                if (
                    (key.toLowerCase().includes("token") ||
                        key.toLowerCase().includes("jwt")) &&
                    typeof obj[key] === "string" &&
                    obj[key].length > 100
                ) {
                    obj[key] = maskJwtToken(obj[key]);
                } else if (typeof obj[key] === "string") {
                    obj[key] = maskString(obj[key], sanitizePercentage / 100);
                } else {
                    obj[key] = "*****";
                }
            } else if (typeof obj[key] === "string") {
                obj[key] = this.sanitizeSensitivePatterns(
                    obj[key],
                    sensitivePatterns,
                );
            } else if (typeof obj[key] === "object" && obj[key] !== null) {
                this.sanitizeRecursive(
                    obj[key],
                    sensitiveFields,
                    sensitivePatterns,
                    sanitizePercentage,
                );
            }
        }
    }

    private static sanitizeSensitivePatterns(
        value: string,
        patterns: RegExp[],
    ): string {
        let result = value;
        patterns.forEach((pattern) => {
            const matches = result.match(pattern);
            if (matches) {
                matches.forEach((match) => {
                    result = result.replace(match, maskJwtToken(match));
                });
            }
        });
        return result;
    }
}