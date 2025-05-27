const path = require("node:path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ModuleFederationPlugin =
	require("webpack").container.ModuleFederationPlugin;

const federationConfig = require("./federation.config.json");
const deps = require("./package.json").dependencies;

const SRC_DIR = path.join(__dirname, "./src");
const TS_CONFIG_PATH = path.resolve(__dirname, "./tsconfig.json");
const PUBLIC_PATH = process.env.PUBLIC_PATH || undefined;

const ALIAS = {
	"@react-client": `${SRC_DIR}`,
};

module.exports = {
	entry: {
		app: "./src/index",
	},
	plugins: [
		new ModuleFederationPlugin({
			...federationConfig,
			filename: "remoteEntry.js",
			shared: {
				// ...deps,
				// react: {
				// 	singleton: true,
				// 	eager: true,
				// 	requiredVersion: deps.react,
				// },
				// "react-dom": {
				// 	singleton: true,
				// 	eager: true,
				// 	requiredVersion: deps["react-dom"],
				// },
				// "react-router-dom": {
				// 	singleton: true,
				// 	eager: true,
				// 	requiredVersion: deps["react-router-dom"],
				// },
				// "@mui/material": {
				// 	singleton: true,
				// 	eager: true,
				// 	requiredVersion: deps["@mui/material"],
				// },
			},
		}),
		new HtmlWebpackPlugin({
			template: "./public/index.html",
			excludeChunks: ["EXMAPLE_APP_RENAME_THIS"],
		}),
	],
	output: {
		filename: "[name].bundle.js",
		path: path.resolve(__dirname, "dist"),
		publicPath: PUBLIC_PATH,
		clean: true,
	},
	resolve: {
		alias: ALIAS,
		extensions: [".ts", ".tsx", ".js", ".jsx"],
		fallback: {
			url: false,
			path: false,
		},
	},
	module: {
		rules: [
			{
				test: /bootstrap\.tsx$/,
				loader: "bundle-loader",
				options: {
					lazy: true,
				},
			},
			{
				test: /\.tsx?$/,
				loader: "babel-loader",
				exclude: /node_modules/,
			},
			{
				test: /\.svg$/i,
				issuer: /\.[jt]sx?$/,
				use: ["@svgr/webpack"],
			},
			{
				test: /\.(gif|svg|jpg|png|otf|ttf)$/,
				use: "file-loader",
			},
			{
				test: /\.css$/,
				use: ["style-loader", "css-loader"],
			},
		],
	},
};
