import { V2QuestionnaireRegistryReadCache } from "../../../../src/modules/anketa-v2/services/v2-questionnaire-registry-read-cache.service";

describe("V2QuestionnaireRegistryReadCache", () => {
	it("returns list pages until structural invalidation", () => {
		const cache = new V2QuestionnaireRegistryReadCache();
		const generation = cache.getGeneration();
		const key = cache.listKey({
			streams: ["RB"],
			page: 1,
			limit: 50,
			search: "",
		});
		const page = {
			data: [],
			meta: { total: 0, page: 1, limit: 50, lastPage: 0 },
		};
		cache.setList(key, page, generation);
		expect(cache.getList(key)).toBe(page);

		cache.invalidateList();
		expect(cache.getList(key)).toBeUndefined();
		cache.setList(key, page, generation);
		expect(cache.getList(key)).toBeUndefined();
	});

	it("drops in-flight config write after invalidate", () => {
		const cache = new V2QuestionnaireRegistryReadCache();
		const generation = cache.getGeneration();
		cache.invalidateConfig();
		cache.setConfig(
			{ config: { columnTree: [], arrayIndicesByPath: {}, arrayGroupLabelsByPath: {} }, formPaths: [] },
			generation,
		);
		expect(cache.getConfig()).toBeNull();
	});

	it("notifies other browsers when the registry composition changes", () => {
		const wsPublisher = { publishRegistrySync: jest.fn() };
		const cache = new V2QuestionnaireRegistryReadCache(wsPublisher as never);

		cache.invalidateList();

		expect(wsPublisher.publishRegistrySync).toHaveBeenCalledTimes(1);
	});
});
