import { dummy } from "../src";
describe("Test Test", () => {
	it("should pass", () => {
		expect(true).toBe(true);
	});

	it("should match expectations", () => {
		expect(dummy()).toBe("something");
	});
});
