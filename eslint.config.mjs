// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
	{
		ignores: ["dist/**", "__fixtures__/dist/**", "packages/**/build"],
	},
	{
		extends: [eslint.configs.recommended],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
		files: ["**/*.[mc]js"],
	},
	{
		extends: [
			eslint.configs.recommended,
			tseslint.configs.recommendedTypeChecked,
		],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		files: ["**/*.ts"],
	},
);
