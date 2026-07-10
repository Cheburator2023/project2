import { describe, expect, it } from "vitest";
import {
	collectActivatableGroupDefaults,
	ensureGroupActivationDefaults,
	findTriggerGatedGroupActivatableAncestor,
	isCalculationPathActive,
	resolveGroupIsActive,
	setGroupActivationAtPath,
	syncTriggerGatedGroupActivationFromTypicalWorks,
} from "./v2-group-activation.util";

describe("v2-group-activation.util", () => {
	it("collects defaults for activatable groups", () => {
		expect(
			collectActivatableGroupDefaults({
				streamDigitalAgents: {
					"ui:options": {
						groupActivatable: true,
						groupActive: false,
					},
				},
			}),
		).toEqual({ streamDigitalAgents: false });
	});

	it("seeds groupActivation from ui defaults", () => {
		const next = ensureGroupActivationDefaults(
			{},
			{
				streamStreamingData: {
					"ui:options": { groupActivatable: true, groupActive: false },
				},
			},
		);
		expect(next.groupActivation).toEqual({
			streamStreamingData: false,
		});
	});

	it("resolveGroupIsActive prefers formData over ui default", () => {
		const ui = {
			streamDigitalAgents: {
				"ui:options": { groupActivatable: true, groupActive: false },
			},
		};
		expect(resolveGroupIsActive("streamDigitalAgents", ui, {})).toBe(false);
		expect(
			resolveGroupIsActive(
				"streamDigitalAgents",
				ui,
				setGroupActivationAtPath({}, "streamDigitalAgents", true),
			),
		).toBe(true);
	});

	it("isCalculationPathActive skips inactive subtree", () => {
		const formData = setGroupActivationAtPath(
			{},
			"streamDigitalAgents",
			false,
		);
		expect(
			isCalculationPathActive(formData, "/streamDigitalAgents/localParams"),
		).toBe(false);
		expect(isCalculationPathActive(formData, "/summary/total")).toBe(true);
	});

	it("finds trigger-gated activatable ancestor for typical work path", () => {
		const ui = {
			streamDataSources: {
				"ui:options": { groupActivatable: true, groupActive: false },
				field_typical: {
					"ui:options": { archComponent: "typicalWork" },
				},
			},
		};
		expect(
			findTriggerGatedGroupActivatableAncestor(
				ui,
				"streamDataSources.field_typical",
			),
		).toBe("streamDataSources");
	});

	it("syncs trigger-gated group activation from live typical work rows", () => {
		const ui = {
			streamDataSources: {
				"ui:options": { groupActivatable: true, groupActive: false },
				field_typical: {
					"ui:options": { archComponent: "typicalWork" },
				},
			},
		};
		const base = ensureGroupActivationDefaults({}, ui);

		const activated = syncTriggerGatedGroupActivationFromTypicalWorks(
			base,
			ui,
			{
				streamDataSources: {
					field_typical: [{ name: "Работа Кирилла" }],
				},
			},
		);
		expect(activated.groupActivation).toEqual({ streamDataSources: true });

		const deactivated = syncTriggerGatedGroupActivationFromTypicalWorks(
			activated,
			ui,
			{
				streamDataSources: {
					field_typical: [],
				},
			},
		);
		expect(deactivated.groupActivation).toEqual({ streamDataSources: false });
	});
});
