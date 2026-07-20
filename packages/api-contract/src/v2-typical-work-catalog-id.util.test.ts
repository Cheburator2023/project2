import { describe, expect, it } from "vitest";
import { remapFactoryAllowedWorkIdsToTemplateWorks } from "./v2-typical-work-catalog-id.util";

describe("remapFactoryAllowedWorkIdsToTemplateWorks", () => {
	const factoryRegistry = [
		{
			id: "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4004",
			name: "05A. Разработка пилотной модели (MVP)",
		},
		{
			id: "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4005",
			name: "05. Разработка модели",
		},
	];

	it("maps factory registry ids to template work ids by name", () => {
		const templateWorks = [
			{
				id: "7147da4f-b4cd-445e-8ac3-838c4b106ca7",
				name: "05A. Разработка пилотной модели (MVP)",
			},
			{
				id: "aaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
				name: "05. Разработка модели",
			},
		];

		expect(
			remapFactoryAllowedWorkIdsToTemplateWorks(
				[
					"f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4004",
					"f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4005",
				],
				templateWorks,
				factoryRegistry,
			),
		).toEqual([
			"7147da4f-b4cd-445e-8ac3-838c4b106ca7",
			"aaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
		]);
	});

	it("keeps ids unchanged when they already belong to the template", () => {
		const templateWorks = [
			{
				id: "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4004",
				name: "05A. Разработка пилотной модели (MVP)",
			},
		];

		expect(
			remapFactoryAllowedWorkIdsToTemplateWorks(
				["f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4004"],
				templateWorks,
				factoryRegistry,
			),
		).toEqual(["f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4004"]);
	});
});
