import { describe, expect, it } from "vitest";
import {
	parseParamNameSourceKeys,
	stripParamNameSourceKeys,
} from "./v2-work-param-source-keys.util";

describe("v2-work-param-source-keys.util", () => {
	it("parses Cyrillic legacy source keys", () => {
		const value =
			"Количество сущностей (исходных таблиц) @ field_Y_K0Hy0e|количество_сущностей_исходных_таблиц";

		expect(parseParamNameSourceKeys(value)).toEqual({
			displayName: "Количество сущностей (исходных таблиц)",
			sourceKeys: [
				"field_Y_K0Hy0e",
				"количество_сущностей_исходных_таблиц",
			],
		});
		expect(stripParamNameSourceKeys(value)).toBe(
			"Количество сущностей (исходных таблиц)",
		);
	});
});
