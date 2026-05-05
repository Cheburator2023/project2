const { merge } = require("webpack-merge");
const webpack = require("webpack");
const TerserPlugin = require("terser-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const { DefinePlugin } = webpack;
const common = require("./webpack.common.js");
const APP_NAME = "smartAnketa";

const git_revision = require("child_process")
	.execSync('git show --format="short" -s')
	.toString()
	.trim();

module.exports = merge(common, {
	mode: "development",
	devtool: "cheap-module-source-map",
	optimization: {
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
		sideEffects: false,
		concatenateModules: false,
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: "./public/index.html",
			excludeChunks: [APP_NAME],
		}),
		new DefinePlugin({
			"process.env": {},
			"process.env.MOCKED_REQUESTS": JSON.stringify(
				process.env.MOCKED_REQUESTS || "",
			),
			"process.env.GIT_REVISION": JSON.stringify(git_revision || ""),
			"process.env.APP_NAME": JSON.stringify(APP_NAME),
			"process.env.REACT_APP_API_URL": JSON.stringify("http://localhost:3000"),
			"process.env.NO_ROLES": JSON.stringify(process.env.NO_ROLES || ""),
		}),
	],
});
