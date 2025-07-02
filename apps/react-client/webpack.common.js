const path = require("node:path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ModuleFederationPlugin =
	require("webpack").container.ModuleFederationPlugin;

const SRC_DIR = path.join(__dirname, "./src");
const TS_CONFIG_PATH = path.resolve(__dirname, "./tsconfig.json");
const PUBLIC_PATH = process.env.PUBLIC_PATH || undefined;
const isDev = process.env.NODE_ENV === "development";
const APP_NAME = "smartAnketa";

const ALIAS = {
	"@react-client": `${SRC_DIR}`,
};

module.exports = {
	entry: {
		app: "./src/index",
	},
	plugins: [
		new ModuleFederationPlugin({
			name: APP_NAME,
			exposes: {
				"./App": "./src/indexFederated",
			},
			filename: "remoteEntry.js",
			shared: {},
		}),
		new HtmlWebpackPlugin({
			template: "./public/index.html",
			excludeChunks: [APP_NAME],
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
			// {
			// 	test: /bootstrap\.tsx$/,
			// 	loader: "bundle-loader",
			// 	options: {
			// 		lazy: true,
			// 	},
			// },
			{
				test: /\.tsx?$/,
				loader: "babel-loader",
				options: {
					presets: [
						"@babel/preset-env",
						["@babel/preset-react", { runtime: "automatic" }],
						"@babel/preset-typescript",
						...(isDev ? ["react-refresh/babel"] : []),
					],
				},
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
				use: [
					"style-loader",
					{
						loader: "css-loader",
						options: {
							modules: {
								localIdentName: "[name]__[local]__[hash:base64:5]",
							},
						},
					},
				],
			},
		],
	},
};
