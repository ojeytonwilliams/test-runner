// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
	{
		ignores: ["dist/**", "__fixtures__/dist/**"],
	},
	eslint.configs.recommended,
	tseslint.configs.recommended,
	{
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
		files: ["**/*.[mc]js"],
	},
);
