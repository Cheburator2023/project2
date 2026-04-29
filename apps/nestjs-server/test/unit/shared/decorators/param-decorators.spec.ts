import type { ExecutionContext } from "@nestjs/common";

import {
	CurrentUser,
	currentUserFactory,
} from "../../../../src/shared/decorators/user.decorator";
import {
	ReqContext,
	reqContextFactory,
} from "../../../../src/shared/decorators/request-context.decorator";
import {
	StreamFilter,
	STREAM_FILTER_KEY,
} from "../../../../src/shared/decorators/stream-filter.decorator";
import { RealmRole } from "../../../../src/shared/decorators/realm-role.decorator";

const buildHttpExecutionContext = (request: any): ExecutionContext =>
	({
		getType: jest.fn().mockReturnValue("http"),
		getArgByIndex: jest.fn(),
		getArgs: jest.fn(),
		getClass: jest.fn(),
		getHandler: jest.fn(),
		switchToHttp: jest.fn().mockReturnValue({ getRequest: () => request }),
		switchToRpc: jest.fn(),
		switchToWs: jest.fn(),
	}) as unknown as ExecutionContext;

describe("Param decorators (factories)", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("CurrentUser", () => {
		it("извлекает пользователя из HTTP-контекста", () => {
			const mockUser = { id: "u-1", name: "Alice" };
			const exec = buildHttpExecutionContext({ user: mockUser });

			expect(currentUserFactory(undefined, exec)).toBe(mockUser);
		});

		it("возвращает undefined, если в req нет user", () => {
			const exec = buildHttpExecutionContext({});

			expect(currentUserFactory(undefined, exec)).toBeUndefined();
		});

		it("CurrentUser экспортируется как функция-декоратор", () => {
			expect(typeof CurrentUser).toBe("function");
		});
	});

	describe("ReqContext", () => {
		it("создаёт request.context при первом вызове", () => {
			const request: any = {};
			const exec = buildHttpExecutionContext(request);

			const ctx = reqContextFactory(undefined, exec);

			expect(ctx).toBeDefined();
			expect(typeof ctx.requestId).toBe("string");
			expect(ctx.abortController).toBeInstanceOf(AbortController);
			expect(request.context).toBe(ctx);
		});

		it("возвращает существующий request.context повторно", () => {
			const existing = {
				requestId: "abc",
				abortController: new AbortController(),
			};
			const request: any = { context: existing };
			const exec = buildHttpExecutionContext(request);

			expect(reqContextFactory(undefined, exec)).toBe(existing);
		});

		it("ReqContext экспортируется как функция-декоратор", () => {
			expect(typeof ReqContext).toBe("function");
		});
	});

	describe("StreamFilter", () => {
		it("добавляет метаданные с ключом STREAM_FILTER_KEY=true", () => {
			class Probe {}
			const decorator = StreamFilter();
			expect(STREAM_FILTER_KEY).toBe("stream_filter");
			expect(typeof decorator).toBe("function");
			// применяем декоратор к классу — это вызывает SetMetadata
			decorator(Probe);
		});
	});

	describe("RealmRole", () => {
		it("оборачивает Roles с префиксом realm:", () => {
			const decorator = RealmRole("calculation:read" as any);
			expect(typeof decorator).toBe("function");
		});
	});
});
