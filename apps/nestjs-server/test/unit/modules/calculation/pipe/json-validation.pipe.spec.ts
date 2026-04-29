import { ArgumentMetadata } from "@nestjs/common";
import { JsonValidationPipe } from "../../../../../src/modules/calculation/pipe/json-validation.pipe";

describe("JsonValidationPipe", () => {
	let pipe: JsonValidationPipe;

	beforeEach(() => {
		pipe = new JsonValidationPipe({
			error: jest.fn(),
		} as any);
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
});
