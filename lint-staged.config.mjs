export default {
	"**/*.(ts|cjs|mjs)": ["eslint --fix", "prettier --write"],
	"!(**/*.(ts|cjs|mjs))": ["prettier --ignore-unknown --write"],
};
