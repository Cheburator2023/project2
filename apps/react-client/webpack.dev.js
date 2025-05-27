const { merge } = require("webpack-merge");
const path = require("node:path");
const webpack = require("webpack");
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin");

const { DefinePlugin } = webpack;

const common = require("./webpack.common.js");
const git_revision = require("node:child_process")
	.execSync('git show --format="short" -s')
	.toString()
	.trim();

module.exports = merge(common, {
	mode: "development",
	devtool: "cheap-module-source-map",
	cache: false,
	optimization: {
		minimize: false,
	},
	plugins: [
		new ReactRefreshWebpackPlugin({ overlay: false }),
		new DefinePlugin({
			"process.env.MOCKED_REQUESTS": JSON.stringify(
				process.env.MOCKED_REQUESTS || "",
			),
			"process.env.GIT_REVISION": JSON.stringify(git_revision || ""),
		}),
	],
	watchOptions: {
		poll: 10000,
		ignored: /node_modules/,
	},
	devServer: {
		static: "./",
		port: 8001,
		historyApiFallback: { disableDotRule: true },
		hot: true,
		allowedHosts: ["all"],
		client: {
			overlay: {
				runtimeErrors: (error) => {
					const ignoreErrors = [
						"ResizeObserver loop completed with undelivered notifications.",
					];
					return !ignoreErrors.includes(error.message);
				},
			},
		},
	},
});
