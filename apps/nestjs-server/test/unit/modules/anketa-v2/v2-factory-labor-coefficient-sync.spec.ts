import { V2TypicalWorkSeedService } from "../../../../src/modules/anketa-v2/services/v2-typical-work.service";

describe("factory labor coefficient sync", () => {
	it("заменяет устаревшие единицы коэффициентами из snapshot", async () => {
		const work = {
			id: "f7f6a953-d4cb-413b-9ef6-910a41188e8c",
			templateId: "template-1",
			name: "Этап 220. Проведение ИФТ Решения",
			archComponentType: "Объект / Витрина данных",
		};
		const rows = ["Да", "Нет", "Неизвестно"].map((valueLabel) => ({
			id: `row-${valueLabel}`,
			workId: work.id,
			streamExecutor: "Источники данных",
			paramCode: "field_hashing",
			paramName: "Требуется хэширование/ шифрование",
			valueCode: valueLabel.toLowerCase(),
			valueLabel,
			coefficient: "1",
		}));
		const saved: Array<Record<string, unknown>> = [];
		const laborRepository = {
			find: jest.fn().mockResolvedValue(rows),
			create: jest.fn((value) => value),
			save: jest.fn(async (value) => {
				saved.push(value);
				return value;
			}),
		};
		const service = new V2TypicalWorkSeedService(
			{ find: jest.fn().mockResolvedValue([work]) } as never,
			{} as never,
			{} as never,
			laborRepository as never,
			{} as never,
			{} as never,
			{} as never,
			{} as never,
			{} as never,
			{} as never,
		);

		const count = await service.syncFactoryLaborCoefficients();

		expect(count).toBeGreaterThanOrEqual(2);
		expect(rows.map((row) => Number(row.coefficient))).toEqual([1.25, 0.75, 1]);
		expect(saved).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ valueLabel: "Да", coefficient: "1.25" }),
				expect.objectContaining({ valueLabel: "Нет", coefficient: "0.75" }),
			]),
		);
	});
});
