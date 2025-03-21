module.exports = (env = {}) => {
	const isDev = env.development;

	return {
		mode: isDev ? "development" : "production",
		cache: isDev ? { type: "filesystem" } : false,
		entry: {
			index: "./src/index.ts",
			"frame-test-evaluator": "./src/frame-test-evaluator.ts",
			"worker-test-evaluator": "./src/worker-test-evaluator.ts",
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
			extensions: [".ts", ".js"],
		},
	};
};
