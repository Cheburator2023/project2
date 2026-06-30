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
	// Дешёвые source maps: строки оригинальных файлов, без column mapping.
	devtool: "cheap-module-source-map",
	optimization: {
		minimize: true,
		minimizer: [
			new EsbuildPlugin({
				target: browserslistToEsbuild(),
				css: true,
			}),
		],
		splitChunks: {
			chunks: "async",
			cacheGroups: {
				vendor: {
					test: /[\\/]node_modules[\\/]/,
					name: "vendors",
					chunks: "initial",
					enforce: true,
				},
			},
		},
		runtimeChunk: false,
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
