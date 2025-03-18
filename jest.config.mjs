import { createJsWithTsEsmPreset } from "ts-jest";

const presetConfig = createJsWithTsEsmPreset({
	//...options
});

const jestConfig = {
	...presetConfig,
};

export default jestConfig;
