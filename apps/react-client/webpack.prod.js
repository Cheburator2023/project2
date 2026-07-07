const { merge } = require("webpack-merge");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const webpack = require("webpack");
const { EsbuildPlugin } = require("esbuild-loader");
const browserslistToEsbuild = require("./webpack-browserslist-target.cjs");

const { DefinePlugin } = webpack;
const common = require("./webpack.common.js");
const APP_NAME = "smartAnketa";

const git_revision = require("node:child_process")
	.execSync('git show --format="short" -s')
	.toString()
	.trim();
const changelog_content = readFileSync(
	path.resolve(__dirname, "../../CHANGELOG.md"),
	"utf8",
);
const changelog_version_match = changelog_content.match(
	/^#{1,3}\s+\[(\d+\.\d+\.\d+)\]/m,
);
const app_version = changelog_version_match?.[1] ?? "0.0.0";

module.exports = merge(common, {
	mode: "production",
	// Полные source maps: отдельные .map, оригинальные файлы, строки и колонки.
	devtool: "source-map",
	optimization: {
		minimize: true,
		minimizer: [
			new EsbuildPlugin({
				target: browserslistToEsbuild(),
				css: true,
				sourcemap: true,
			}),
		],
		splitChunks: {
			chunks: "all",
			maxInitialRequests: 25,
			maxAsyncRequests: 30,
			cacheGroups: {
				reactVendor: {
					test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
					name: "react-vendor",
					chunks: "all",
					priority: 40,
					enforce: true,
				},
				muiVendor: {
					test: /[\\/]node_modules[\\/]@mui[\\/]/,
					name: "mui-vendor",
					chunks: "all",
					priority: 30,
				},
				queryVendor: {
					test: /[\\/]node_modules[\\/]@tanstack[\\/]/,
					name: "query-vendor",
					chunks: "all",
					priority: 25,
				},
				heavyVendor: {
					test: /[\\/]node_modules[\\/](@monaco-editor|monaco-editor|mermaid|ag-grid-|@xyflow|@svar-ui)[\\/]/,
					name: "heavy-vendor",
					chunks: "async",
					priority: 20,
				},
				vendors: {
					test: /[\\/]node_modules[\\/]/,
					name: "vendors",
					chunks: "initial",
					priority: 10,
					reuseExistingChunk: true,
				},
				default: {
					minChunks: 2,
					priority: -20,
					reuseExistingChunk: true,
				},
			},
		},
		runtimeChunk: "single",
		moduleIds: "deterministic",
		chunkIds: "deterministic",
		usedExports: true,
		sideEffects: true,
		concatenateModules: true,
	},
	plugins: [
		new DefinePlugin({
			"process.env": {},
			"process.env.MOCKED_REQUESTS": JSON.stringify(
				process.env.MOCKED_REQUESTS || "",
			),
			"process.env.GIT_REVISION": JSON.stringify(git_revision || ""),
			"process.env.APP_VERSION": JSON.stringify(app_version),
			"process.env.APP_NAME": JSON.stringify(APP_NAME),
			"process.env.REACT_APP_API_URL": JSON.stringify("http://localhost:3000"),
			"process.env.NO_ROLES": JSON.stringify(process.env.NO_ROLES || ""),
		}),
	],
});
