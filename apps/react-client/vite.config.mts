import child_process from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";

import { federation } from "@module-federation/vite";
import svgr from "@svgr/rollup";
import react from "@vitejs/plugin-react";
import browserslistToEsbuild from "browserslist-to-esbuild";
import { defineConfig, type HttpProxy, loadEnv } from "vite";
// import { viteStaticCopy } from 'vite-plugin-static-copy';
import checker from "vite-plugin-checker";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import tsconfigPaths from "vite-tsconfig-paths";

const APP_NAME = "smartAnketa";
const publicEnvVars: any[] = [];
const STAGE = process.env.STAGE;
const IS_DEV = process.env.NODE_ENV === "development";
const NO_ROLES = process.env.NO_ROLES;
/** Shell на :8080 грузит remote с :8004 — нужен absolute origin + CORS. */
const MF_SHELL = process.env.MF_SHELL === "1";
const DEV_ORIGIN =
	process.env.VITE_DEV_ORIGIN ||
	(MF_SHELL || IS_DEV ? "http://localhost:8004" : undefined);

const ROOT_DIR = path.resolve(__dirname, "./");
const DIST_DIR = path.resolve(ROOT_DIR, "./dist");
const JSON_LOGIC_TS_ENTRY = path.resolve(
	ROOT_DIR,
	"../../packages/json-logic-ts/dist/esm/index.js",
);

const proxyList = {
	dev: "https://example.com",
};
// @ts-ignore
const currentTarget = STAGE ? proxyList[STAGE] : proxyList.dev;

const git_revision = child_process
	.execSync('git show --format="short" -s')
	.toString()
	.trim();

const changelog_content = readFileSync(
	path.resolve(ROOT_DIR, "../../CHANGELOG.md"),
	"utf8",
);
const changelog_version_match = changelog_content.match(
	/^#{1,3}\s+\[(\d+\.\d+\.\d+)\]/m,
);
const app_version = changelog_version_match?.[1] ?? "0.0.0";

function resolveVendorChunk(id: string): string | undefined {
	if (!id.includes("node_modules")) {
		return undefined;
	}

	if (
		/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(
			id,
		)
	) {
		return "react-vendor";
	}

	if (/[\\/]node_modules[\\/]@mui[\\/]/.test(id)) {
		return "mui-vendor";
	}

	if (/[\\/]node_modules[\\/]@tanstack[\\/]/.test(id)) {
		return "query-vendor";
	}

	if (
		/[\\/]node_modules[\\/](@monaco-editor|monaco-editor|mermaid|ag-grid-|@xyflow|@svar-ui)[\\/]/.test(
			id,
		)
	) {
		return "heavy-vendor";
	}

	return undefined;
}

/** UMD logic.js has no ESM default export — required for Rollup prod build. */
function jsonLogicEsmInteropPlugin() {
	const logicPath = path.resolve(
		ROOT_DIR,
		"../../packages/json-logic-ts/dist/esm/logic.js",
	);

	return {
		name: "json-logic-esm-interop",
		transform(code: string, id: string) {
			if (id === logicPath) {
				return {
					code: `${code}\nexport default globalThis.jsonLogic;`,
					map: null,
				};
			}
		},
	};
}

/**
 * Убирает зависшие deps_temp_* до старта optimizeDeps.
 * Иначе браузер ловит 404 на chunk-*.js при том же ?v=browserHash.
 */
function cleanOrphanViteDepsTempPlugin(cacheDir: string) {
	return {
		name: "clean-orphan-vite-deps-temp",
		buildStart() {
			if (!existsSync(cacheDir)) return;
			for (const name of readdirSync(cacheDir)) {
				if (!name.startsWith("deps_temp_")) continue;
				rmSync(path.join(cacheDir, name), { recursive: true, force: true });
			}
		},
	};
}

/**
 * @module-federation/vite отдаёт remoteEntry.js с Content-Type: text/html —
 * shell/script tag и проверка curl ломаются; SPA-роут выглядит как «попали в React».
 */
function remoteEntryMimePlugin() {
	return {
		name: "remote-entry-javascript-mime",
		configureServer(server: { middlewares: { use: Function } }) {
			server.middlewares.use(
				(
					req: { url?: string },
					res: {
						setHeader: (name: string, value: string) => void;
					},
					next: () => void,
				) => {
					const url = req.url?.split("?")[0] ?? "";
					if (url === "/remoteEntry.js" || url.endsWith("/remoteEntry.js")) {
						const originalSetHeader = res.setHeader.bind(res);
						res.setHeader = (name: string, value: string) => {
							if (String(name).toLowerCase() === "content-type") {
								return originalSetHeader(
									"Content-Type",
									"application/javascript",
								);
							}
							return originalSetHeader(name, value);
						};
					}
					next();
				},
			);
		},
	};
}

export const viteCommonConfig = ({
	appName,
	base = "/",
}: {
	appName?: string;
	base?: string;
}) =>
	defineConfig(({ mode }): any => {
		const envDir = fileURLToPath(new URL("..", import.meta.url));
		const env = loadEnv(mode, envDir, "");

		for (const key of publicEnvVars) {
			if (!env[key]) {
				throw new Error(`Missing environment variable: ${key}`);
			}
			process.env[`${key}`] = env[key];
		}

		return {
			cacheDir: fileURLToPath(new URL("./.cache/vite-app", import.meta.url)),
			base,
			optimizeDeps: {
				holdUntilCrawlEnd: true,
				// Workspace-пакет: не prebundle — иначе кэш deps устаревает после rebuild api-contract.
				exclude: IS_DEV ? ["@smart-anketa/api-contract"] : [],
				include: [
					"@smart-anketa/json-logic-ts",
					"react-dnd",
					"react-dnd-html5-backend",
					"@minoru/react-dnd-treeview",
					"@svar-ui/react-gantt",
				],
			},
			resolve: {
				alias: {
					"@smart-anketa/json-logic-ts": JSON_LOGIC_TS_ENTRY,
				},
			},
			build: {
				target: browserslistToEsbuild(),
				cssCodeSplit: true,
				chunkSizeWarningLimit: 1200,
				commonjsOptions: { transformMixedEsModules: true },
				rollupOptions: {
					output: {
						dir: DIST_DIR,
						strict: false,
						entryFileNames: "[name].js",
						chunkFileNames: "chunks/[name]-[hash].js",
						assetFileNames: "assets/[name]-[hash][extname]",
						manualChunks(id: string) {
							return resolveVendorChunk(id);
						},
					},
				},
			},

			plugins: [
				cleanOrphanViteDepsTempPlugin(
					fileURLToPath(new URL("./.cache/vite-app", import.meta.url)),
				),
				remoteEntryMimePlugin(),
				jsonLogicEsmInteropPlugin(),
				// remoteEntry.js нужен и в vite serve (shell :8080), не только в prod build.
				federation({
					name: APP_NAME,
					filename: "remoteEntry.js",
					exposes: {
						"./App": "./src/indexFederated",
					},
					shared: {},
				}),
				tsconfigPaths(),
				nodePolyfills({
					// To add only specific polyfills, add them here. If no option is passed, adds all polyfills
					include: ["net"],
				}),
				react(),
				svgr({
					dimensions: false,
					svgProps: {
						focusable: "{false}",
					},
				}),
				checker({
					typescript: true,
					overlay: {
						initialIsOpen: false,
					},
				}),
			],

			define: {
				"process.env.MOCKED_REQUESTS": JSON.stringify(
					process.env.MOCKED_REQUESTS,
				),
				"process.env.GIT_REVISION": JSON.stringify(git_revision),
				"process.env.APP_VERSION": JSON.stringify(app_version),
				"process.env.APP_NAME": JSON.stringify(APP_NAME),
				"process.env.REACT_APP_API_URL": JSON.stringify(
					"",
					// "https://sum-shell-sumd.sumd.dk1-sumd01.innodev.local/proxy/smart-anketa-api",
				),
				"process.env.NO_ROLES": JSON.stringify(NO_ROLES),
			},

			// resolve: {
			//   alias: [
			//     // packages
			//     {
			//       find: 'types',
			//       replacement: path.resolve('./types'),
			//     },
			//   ],
			// },

			server: {
				// host: "www.test.vtb.ru",
				...(DEV_ORIGIN ? { origin: DEV_ORIGIN } : {}),
				fs: {
					strict: false,
					cachedChecks: false,
				},
				port: 8004,
				cors: true,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
					"Access-Control-Allow-Headers": "*",
				},
				hmr: {
					overlay: false,
				},
				watch: {
					usePolling: Boolean(process.env.VITE_USE_POLLING),
				},
				proxy: {
					"/api": {
						target: currentTarget,
						secure: false,
						rewrite(_path: string) {
							return _path.replace(/^\/api/, "");
						},
						changeOrigin: true,
					},
					// Proxying websockets
					"/socket": {
						target: currentTarget,
						headers: {
							Origin: currentTarget,
						},
						rewrite(_path: string) {
							return _path.replace(/^\/socket/, "");
						},
						configure: (proxy: HttpProxy.Server) => {
							proxy.on("error", (err) => {
								console.warn("Socket error using onProxyReqWs event", err);
							});
						},
						ws: true,
						secure: false,
						changeOrigin: true,
					},
				},
			},
		};
	});

export default viteCommonConfig({});
