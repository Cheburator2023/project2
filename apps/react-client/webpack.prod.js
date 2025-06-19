const { merge } = require("webpack-merge");
const webpack = require("webpack");

const { DefinePlugin } = webpack;
const common = require("./webpack.common.js");
const APP_NAME = "smartAnketa";

// biome-ignore lint/style/useNodejsImportProtocol: <explanation>
const git_revision = require("child_process")
	.execSync('git show --format="short" -s')
	.toString()
	.trim();

module.exports = merge(common, {
	mode: "development",
	devtool: "cheap-module-source-map",
	optimization: {
		minimize: false,
	},
	plugins: [
		new DefinePlugin({
			"process.env.MOCKED_REQUESTS": JSON.stringify(
				process.env.MOCKED_REQUESTS || "",
			),
			"process.env.GIT_REVISION": JSON.stringify(git_revision || ""),
			"process.env.APP_NAME": JSON.stringify(APP_NAME),
		}),
	],
});
