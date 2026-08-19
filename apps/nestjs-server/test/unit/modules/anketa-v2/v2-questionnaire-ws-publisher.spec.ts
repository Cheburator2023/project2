import { V2QuestionnaireWsPublisher } from "../../../../src/modules/anketa-v2/services/v2-questionnaire-ws-publisher.service";

describe("V2QuestionnaireWsPublisher", () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("batches registry invalidations so other clients refetch the list once", () => {
		const publisher = new V2QuestionnaireWsPublisher();
		const emit = jest.fn();
		publisher.attachRegistrySync(emit);

		publisher.publishRegistrySync();
		publisher.publishRegistrySync();

		expect(emit).not.toHaveBeenCalled();
		jest.advanceTimersByTime(50);

		expect(emit).toHaveBeenCalledTimes(1);
		expect(emit.mock.calls[0]?.[0]).toEqual({ at: expect.any(Number) });
	});
});
