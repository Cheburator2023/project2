import { Provider } from "@nestjs/common";

export const CHALK_TOKEN = "CHALK_TOKEN";

export interface ChalkColorFunction {
	(text: string): string;
	bold?: ChalkColorFunction;
}

export interface ChalkInstance {
	red: ChalkColorFunction;
	green: ChalkColorFunction;
	blue: ChalkColorFunction;
	yellow: ChalkColorFunction;
	magenta: ChalkColorFunction;
	cyan: ChalkColorFunction;
	white: ChalkColorFunction;
	gray: ChalkColorFunction;
}

// Fallback chalk implementation for production
const createFallbackChalk = (): ChalkInstance => {
	const fallbackFunction: ChalkColorFunction = (text: string) => text;
	fallbackFunction.bold = fallbackFunction;

	return {
		red: fallbackFunction,
		green: fallbackFunction,
		blue: fallbackFunction,
		yellow: fallbackFunction,
		magenta: fallbackFunction,
		cyan: fallbackFunction,
		white: fallbackFunction,
		gray: fallbackFunction,
	};
};

export const chalkProvider: Provider = {
	provide: CHALK_TOKEN,
	useFactory: (): ChalkInstance | null => {
		// Return null in production to avoid importing chalk
		if (process.env.NODE_ENV !== "production") {
			return null;
		}

		try {
			// Dynamically import chalk only in development
			const chalk = require("chalk");
			return chalk;
		} catch (error) {
			// If chalk is not available, log warning and return fallback
			console.warn("Chalk not available, using fallback implementation");
			return createFallbackChalk();
		}
	},
};
