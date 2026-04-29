import { ApiResponse } from "../../../../src/shared/utils/api-response.util";

/**
 * Unit-тесты ApiResponse.
 * Проверяем форматирование успешного, ошибочного и постраничного ответа API.
 */
describe("ApiResponse", () => {
	// Успешный ответ: success=true, data и message
	it("success() wraps data with success=true", () => {
		const r = ApiResponse.success({ id: 1 }, "ok");
		expect(r.success).toBe(true);
		expect(r.data).toEqual({ id: 1 });
		expect(r.message).toBe("ok");
	});

	// Ошибочный ответ: success=false, errorCode, data=null
	it("error() wraps message with success=false", () => {
		const r = ApiResponse.error("fail", "E_X");
		expect(r.success).toBe(false);
		expect(r.message).toBe("fail");
		expect(r.errorCode).toBe("E_X");
		expect(r.data).toBeNull();
	});

	// Постраничный ответ: data.data + data.meta (общее число, страница, лимит)
	it("paginated() wraps array with meta", () => {
		const r = ApiResponse.paginated([1, 2], 5, 1, 2, "msg");
		expect(r.success).toBe(true);
		expect(r.data?.data).toEqual([1, 2]);
		expect(r.data?.meta).toEqual({ total: 5, page: 1, limit: 2 });
	});
});
