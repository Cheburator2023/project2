import { runPostListenSeed } from "../../../../src/shared/bootstrap/run-post-listen-seed";
import { V2DictionarySeedService } from "../../../../src/modules/anketa-v2/services/v2-dictionary-seed.service";
import { V2StreamCatalogService } from "../../../../src/modules/anketa-v2/services/v2-stream-catalog.service";
import { V2TemplateSeedService } from "../../../../src/modules/anketa-v2/services/v2-template-seed.service";
import { V2TypicalWorkSeedService } from "../../../../src/modules/anketa-v2/services/v2-typical-work.service";

describe("runPostListenSeed", () => {
	it("runs catalog seeds in order after listen so factory bootstrap cannot block the port", async () => {
		const order: string[] = [];
		const app = {
			get: (cls: unknown) => {
				if (cls === V2DictionarySeedService) {
					return {
						runStartupSeed: async () => {
							order.push("dictionary");
						},
					};
				}
				if (cls === V2StreamCatalogService) {
					return {
						runStartupSeed: async () => {
							order.push("stream");
						},
					};
				}
				if (cls === V2TypicalWorkSeedService) {
					return {
						runStartupSeed: async () => {
							order.push("typical-work");
						},
					};
				}
				if (cls === V2TemplateSeedService) {
					return {
						ensureFactoryTemplateIfEmpty: async () => {
							order.push("template");
						},
					};
				}
				throw new Error(`unexpected token ${String(cls)}`);
			},
		};

		await runPostListenSeed(app as never);

		expect(order).toEqual(["dictionary", "stream", "typical-work", "template"]);
	});
});
