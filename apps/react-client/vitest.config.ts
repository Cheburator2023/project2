import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
	const { default: tsconfigPaths } = await import("vite-tsconfig-paths");
	return {
		plugins: [tsconfigPaths()],
		test: {
			globals: true,
			include: ["src/**/*.test.{ts,tsx}"],
			setupFiles: ["src/test/setup-vitest.ts"],
			environmentMatchGlobs: [
				["src/**/*.test.tsx", "happy-dom"],
				["src/**/*.test.ts", "node"],
			],
		},
	};
});
