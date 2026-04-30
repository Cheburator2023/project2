import { ArgumentMetadata, BadRequestException } from "@nestjs/common";
import { JsonValidationPipe } from "../../../../../src/modules/calculation/pipe/json-validation.pipe";

describe("JsonValidationPipe", () => {
	let pipe: JsonValidationPipe;
	let logger: { error: jest.Mock };

	beforeEach(() => {
		logger = {
			error: jest.fn(),
		};
		pipe = new JsonValidationPipe(logger as any);
	});

	const bodyMeta: ArgumentMetadata = { type: "body" };

	it("returns object body unchanged", () => {
		expect(pipe.transform({ a: 1 }, bodyMeta)).toEqual({ a: 1 });
	});

	it("returns non-body parameters unchanged", () => {
		expect(pipe.transform("raw", { type: "query" })).toBe("raw");
	});

	it("returns null body unchanged", () => {
		expect(pipe.transform(null, bodyMeta)).toBe(null);
	});

	it("returns object body even with circular references (current contract)", () => {
		// текущий код возвращает объект-тело без вызова JSON.parse, поэтому
		// циклы не приводят к ошибке
		const cyclic: any = {};
		cyclic.self = cyclic;
		expect(() => pipe.transform(cyclic, bodyMeta)).not.toThrow();
	});

	it("returns string body unchanged when valid", () => {
		// строковое тело: code пытается JSON.parse(JSON.stringify(value)) —
		// это успешно для валидных строк
		expect(pipe.transform("a string", bodyMeta)).toBe("a string");
	});

	it("returns array body unchanged (object branch)", () => {
		expect(pipe.transform([1, 2, 3], bodyMeta)).toEqual([1, 2, 3]);
	});

	it("logs context and throws BadRequestException when JSON stringify fails", () => {
		const originalStringify = JSON.stringify;
		const syntaxError = new SyntaxError("Unexpected token x at position 12");
		JSON.stringify = jest.fn(() => {
			throw syntaxError;
		}) as any;

		try {
			expect(() => pipe.transform("invalid json payload", bodyMeta)).toThrow(
				BadRequestException,
			);
			expect(logger.error).toHaveBeenCalledWith(
				"Invalid JSON received",
				syntaxError.stack,
				"JsonValidationPipe",
				expect.objectContaining({
					errorPosition: 'Error at position 12: "invalid json payload"',
					rawInput: "invalid json payload",
				}),
			);
		} finally {
			JSON.stringify = originalStringify;
		}
	});

	it("uses error message as context for non-SyntaxError failures", () => {
		const originalStringify = JSON.stringify;
		const error = new TypeError("Do not know how to serialize a BigInt");
		JSON.stringify = jest.fn(() => {
			throw error;
		}) as any;

		try {
			expect(() => pipe.transform("bigint-like", bodyMeta)).toThrow(
				BadRequestException,
			);
			expect(logger.error).toHaveBeenCalledWith(
				"Invalid JSON received",
				error.stack,
				"JsonValidationPipe",
				expect.objectContaining({
					errorPosition: "Do not know how to serialize a BigInt",
					rawInput: "bigint-like",
				}),
			);
		} finally {
			JSON.stringify = originalStringify;
		}
	});

	it("truncates long raw input before logging", () => {
		const originalStringify = JSON.stringify;
		JSON.stringify = jest.fn(() => {
			throw new Error("boom");
		}) as any;
		const longInput = "x".repeat(600);

		try {
			expect(() => pipe.transform(longInput, bodyMeta)).toThrow(
				BadRequestException,
			);
			const loggedMeta = logger.error.mock.calls[0][3];
			expect(loggedMeta.rawInput).toHaveLength(503);
			expect(loggedMeta.rawInput.endsWith("...")).toBe(true);
		} finally {
			JSON.stringify = originalStringify;
		}
	});

	it("returns fallback context when SyntaxError position parsing itself fails", () => {
		const error = new SyntaxError("broken");
		Object.defineProperty(error, "message", {
			get: () => ({
				match: () => {
					throw new Error("match failed");
				},
			}),
		});

		expect((pipe as any).getErrorContext(error, "raw")).toBe(
			"Unable to determine error position",
		);
	});
});
