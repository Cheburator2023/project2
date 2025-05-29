import child_process from "node:child_process";
import path from "node:path";
import { URL, fileURLToPath } from "node:url";
import { federation } from "@module-federation/vite";
import svgr from "@svgr/rollup";
import react from "@vitejs/plugin-react";
import browserslistToEsbuild from "browserslist-to-esbuild";
import { type HttpProxy, defineConfig, loadEnv } from "vite";
// import { viteStaticCopy } from 'vite-plugin-static-copy';
import checker from "vite-plugin-checker";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import tsconfigPaths from "vite-tsconfig-paths";

const APP_NAME = process.env.APP_NAME || "EXMAPLE_MF_APP_NAME_TO_REPLACE";

const deps = require("./package.json").dependencies;

const publicEnvVars: any[] = [];
const { STAGE } = process.env;
const IS_DEV = process.env.NODE_ENV === "development";
const ROOT_DIR = path.resolve(__dirname, "./");
const DIST_DIR = path.resolve(ROOT_DIR, "./dist");

const proxyList = {
	dev: "https://example.com",
};
// @ts-ignore
const currentTarget = STAGE ? proxyList[STAGE] : proxyList.dev;

const git_revision = child_process
	.execSync('git show --format="short" -s')
	.toString()
	.trim();

export const viteCommonConfig = ({
	appName,
	base = "/",
}: { appName?: string; base?: string }) =>
	defineConfig(({ mode }) => {
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
			build: {
				target: browserslistToEsbuild(),
				commonjsOptions: { transformMixedEsModules: true },
				rollupOptions: {
					output: {
						dir: DIST_DIR,
						strict: false,
						entryFileNames: "[name].js",
						manualChunks: {
							react: ["react", "react-dom", "react-router-dom"],
						},
					},
				},
			},

			plugins: [
				// {
				//   name: 'deep-index',
				//   configureServer(server) {
				//     server.middlewares.use((req, res, next) => {
				//       if (req.url === '/') {
				//         req.url = '/public/index.html';
				//       }
				//       next();
				//     });
				//   },
				// },
				...(!IS_DEV
					? [
							federation({
								name: APP_NAME,
								filename: "remoteEntry.js",
								exposes: {
									"./App": "./src/indexFederated",
								},
								shared: [],
							}),
						]
					: []),
				tsconfigPaths(),
				nodePolyfills({
					// To add only specific polyfills, add them here. If no option is passed, adds all polyfills
					include: ["net"],
				}),
				react({
					babel: {
						plugins: ["../../etc/babel/babel-plugin-react-add-test-id.js"],
					},
				}),
				svgr({
					dimensions: false,
					svgProps: {
						focusable: "{false}",
					},
				}),
				// viteStaticCopy({
				//   targets: [{}],
				// }),
				checker({
					biome: {
						dev: {
							logLevel: ["error"],
						},
					},
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
				"process.env.APP_NAME": JSON.stringify(APP_NAME),
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
				fs: {
					strict: false,
					cachedChecks: false,
				},
				port: 8004,
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

// biome-ignore lint/style/noDefaultExport: <explanation>
export default viteCommonConfig({});
