import { defineConfig, devices } from "@playwright/test";

const UI_BASE_URL = process.env.E2E_UI_BASE_URL ?? "http://localhost:8004";
const API_BASE_URL = process.env.E2E_API_BASE_URL ?? "http://localhost:3000";
const reuseExisting = process.env.E2E_REUSE_SERVERS !== "0";

/**
 * UI e2e (god mode).
 *
 * Prefers already running:
 *   npm run dev:fullstack:god
 *
 * Or starts both via webServer when E2E_REUSE_SERVERS=0.
 */
export default defineConfig({
	testDir: "./specs",
	fullyParallel: false,
	workers: 1,
	retries: process.env.CI ? 1 : 0,
	timeout: 10 * 60_000,
	expect: { timeout: 30_000 },
	reporter: [["list"], ["html", { open: "never" }]],
	use: {
		baseURL: UI_BASE_URL,
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
		actionTimeout: 20_000,
		navigationTimeout: 60_000,
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: reuseExisting
		? undefined
		: [
				{
					command: "npm run dev:god --workspace=nestjs-server",
					url: `${API_BASE_URL}/api`,
					reuseExistingServer: true,
					timeout: 180_000,
					cwd: "..",
					env: {
						...process.env,
						NO_ROLES: "true",
						NODE_ENV: "development",
					},
				},
				{
					command: "npm run dev:god --workspace=react-client",
					url: UI_BASE_URL,
					reuseExistingServer: true,
					timeout: 180_000,
					cwd: "..",
					env: {
						...process.env,
						NO_ROLES: "true",
						NODE_ENV: "development",
					},
				},
			],
});
