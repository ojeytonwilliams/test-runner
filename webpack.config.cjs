const webpack = require("webpack");

module.exports = (env = {}) => {
	const isDev = env.development;

	return {
		mode: isDev ? "development" : "production",
		cache: isDev ? { type: "filesystem" } : false,
		entry: {
			index: "./src/index.ts",
			"frame-test-evaluator": "./src/test-evaluators/frame-test-evaluator.ts",
			"worker-test-evaluator": "./src/test-evaluators/worker-test-evaluator.ts",
		},
		output: {
			filename: "[name].mjs",
			// during testing, we need the files to be available for the test server:
			path: isDev ? __dirname + "/__fixtures__/dist" : __dirname + "/dist",
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
