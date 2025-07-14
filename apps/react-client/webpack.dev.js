const { merge } = require("webpack-merge");
const path = require("node:path");
const webpack = require("webpack");
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin");

const { DefinePlugin } = webpack;
const APP_NAME = "smartAnketa";

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
			"process.env": {},
			"process.env.MOCKED_REQUESTS": JSON.stringify(
				process.env.MOCKED_REQUESTS || "",
			),
			"process.env.GIT_REVISION": JSON.stringify(git_revision || ""),
			"process.env.APP_NAME": JSON.stringify(APP_NAME),
			"process.env.REACT_APP_API_URL": JSON.stringify("http://localhost:3000"),
		}),
	],
	watchOptions: {
		poll: 10000,
		ignored: /node_modules/,
	},
	devServer: {
		static: "./",
		port: 8004,
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
