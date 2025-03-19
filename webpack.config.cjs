module.exports = (env = {}) => {
	const isDev = env.development;

	return {
		mode: isDev ? "development" : "production",
		cache: isDev ? { type: "filesystem" } : false,
		entry: "./src/index.ts",
		output: {
			filename: "bundle.mjs",
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
