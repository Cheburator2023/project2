import { describe, expect, it } from "vitest";
import {
	resolveSmartAnketaApiBaseUrl,
	SMART_ANKETA_SHELL_API_PROXY_PATH,
	swaggerUiUrlFromApiBase,
} from "./resolveSmartAnketaApiBaseUrl";

describe("resolveSmartAnketaApiBaseUrl", () => {
	it("prefers shell config even when webpack baked localhost", () => {
		expect(
			resolveSmartAnketaApiBaseUrl({
				fromConfig: "/proxy/smart-anketa-api",
				pageOrigin: "https://sum-shell.example",
				isDev: false,
				bakedUrl: "http://localhost:3000",
			}),
		).toBe("/proxy/smart-anketa-api");
	});

	it("does not use localhost on a stand when config is not in the store yet", () => {
		expect(
			resolveSmartAnketaApiBaseUrl({
				fromConfig: "",
				pageOrigin: "https://sum-shell.example",
				isDev: false,
				bakedUrl: "http://localhost:3000",
			}),
		).toBe(`https://sum-shell.example${SMART_ANKETA_SHELL_API_PROXY_PATH}`);
	});

	it("keeps local nest when the page itself is localhost", () => {
		expect(
			resolveSmartAnketaApiBaseUrl({
				fromConfig: "",
				pageOrigin: "http://localhost:8004",
				isDev: true,
				bakedUrl: "http://localhost:3000",
			}),
		).toBe("http://localhost:3000");
	});
});

describe("swaggerUiUrlFromApiBase", () => {
	it("appends /api to the nest base", () => {
		expect(swaggerUiUrlFromApiBase("http://localhost:3000")).toBe(
			"http://localhost:3000/api",
		);
	});

	it("keeps shell proxy path", () => {
		expect(swaggerUiUrlFromApiBase("/proxy/smart-anketa-api")).toBe(
			"/proxy/smart-anketa-api/api",
		);
	});
});
