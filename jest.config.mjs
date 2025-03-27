// import { createJsWithTsEsmPreset } from "ts-jest";

// const presetConfig = createJsWithTsEsmPreset({
// 	//...options
// });

const jestConfig = {
	// ...presetConfig,
	preset: "jest-puppeteer",
	globalSetup: "./jest-setup.mjs",
	testPathIgnorePatterns: ["/node_modules/", "packages/.*/build"],
};

export default jestConfig;
