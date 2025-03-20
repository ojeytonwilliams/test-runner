// eslint-disable-next-line @typescript-eslint/no-require-imports
const webpack = require("webpack");

module.exports = (env = {}) => {
	const isDev = env.development;

	return {
		mode: isDev ? "development" : "production",
		cache: isDev ? { type: "filesystem" } : false,
		entry: {
			index: "./src/index.ts",
			"test-messenger": "./src/test-messenger.ts",
		},
		output: {
			filename: "[name].mjs",
			path: __dirname + "/dist",
		},
		module: {
			rules: [
				{
					test: /\.ts$/,
					use: [
						{
							loader: "ts-loader",
							options: {
								compilerOptions: {
									noEmit: false,
								},
							},
						},
					],
					exclude: /node_modules/,
				},
			],
		},
		resolve: {
			fallback: {
				// buffer: require.resolve("buffer"),
				util: require.resolve("util"),
				stream: false,
				process: require.resolve("process/browser.js"),
			},
			extensions: [".ts", ".js"],
		},
		plugins: [
			new webpack.ProvidePlugin({
				process: "process/browser",
			}),
		],
	};
};
