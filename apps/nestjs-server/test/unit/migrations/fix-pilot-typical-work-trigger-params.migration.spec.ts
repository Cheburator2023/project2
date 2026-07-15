import { FixPilotTypicalWorkTriggerParams1763500000000 } from "../../../src/migrations/1763500000000-FixPilotTypicalWorkTriggerParams";

describe("FixPilotTypicalWorkTriggerParams1763500000000", () => {
	it("renames broken pilot trigger params and removes split fragments", async () => {
		const queries: string[] = [];
		const migration = new FixPilotTypicalWorkTriggerParams1763500000000();
		await migration.up({
			query: async (sql: string) => {
				queries.push(sql);
			},
		} as never);

		expect(queries.some((sql) => sql.includes("пилот_первичный"))).toBe(true);
		expect(queries.some((sql) => sql.includes("повторный"))).toBe(true);
		expect(
			queries.some((sql) => sql.includes("тип_пилота_разовой_загрузки")),
		).toBe(true);
	});
});
