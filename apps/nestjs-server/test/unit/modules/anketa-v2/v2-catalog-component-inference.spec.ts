import { describe, expect, it } from "vitest";
import { inferMissingCatalogComponent } from "../../../../src/modules/anketa-v2/utils/v2-catalog-component-inference";

describe("inferMissingCatalogComponent", () => {
	it("keeps explicit arch component", () => {
		expect(
			inferMissingCatalogComponent("Система-источник", "ИД. Внешний", "Этап 214"),
		).toBe("Система-источник");
	});

	it("maps stage 220 to object data component", () => {
		expect(
			inferMissingCatalogComponent("", "ИД. Внешний", "Этап 220"),
		).toBe("Объект/Витрина данных");
	});

	it("maps stage 230 to source system component", () => {
		expect(
			inferMissingCatalogComponent("", "ИД. Внешний", "Этап 230"),
		).toBe("Система-источник");
	});

	it("maps control stream without component to model service", () => {
		expect(
			inferMissingCatalogComponent("", "Контроль моделей", ""),
		).toBe("Модельный сервис");
	});

	it("treats placeholder component as missing", () => {
		expect(
			inferMissingCatalogComponent("Источники данных?", "ИД. Внешний", "Этап 219"),
		).toBe("Система-источник");
	});
});
