import { describe, expect, it } from "vitest";
import { buildNavbarBreadcrumbTrail } from "./navbarBreadcrumbTrail";

describe("buildNavbarBreadcrumbTrail", () => {
	it("links admin schema editor crumbs to schemas list", () => {
		const trail = buildNavbarBreadcrumbTrail(
			"/admin/templates/tpl-1/edit",
		);
		expect(trail).toEqual([
			{ label: "Администрирование", to: "/admin/schemas" },
			{ label: "Схемы", to: "/admin/schemas" },
			{ label: "Редактор" },
		]);
	});

	it("links v2 calculator root from nested page", () => {
		const trail = buildNavbarBreadcrumbTrail("/v2/calculation/create");
		expect(trail[0]).toEqual({
			label: "Калькулятор v2",
			to: "/v2",
		});
		expect(trail.at(-1)?.to).toBeUndefined();
	});

	it("links typical works list from detail page", () => {
		const trail = buildNavbarBreadcrumbTrail("/admin/typical-works/work-1");
		expect(trail[1]).toEqual({
			label: "Типовые работы",
			to: "/admin/typical-works",
		});
	});
});
