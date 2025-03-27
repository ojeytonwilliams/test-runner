/* @jest-environment jsdom */

import { FrameTestEvaluator } from "../src/test-evaluators/frame-test-evaluator";

// This is a limited reset, but should be enough if we only add or remove
// elements.
const resetDocument = () => {
	document.body.innerHTML = "";
};

describe("FrameTestEvaluator", () => {
	let messenger: FrameTestEvaluator;

	beforeEach(async () => {
		messenger = new FrameTestEvaluator();
		await messenger.init({ code: {} });
		jest.spyOn(console, "error").mockImplementation(jest.fn());
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe("runTest", () => {
		it("should evaluate a test in the messenger environment", async () => {
			const test = "// something that does not throw an error";

			const result = await messenger.runTest(test);

			expect(result).toStrictEqual({ pass: true });
		});

		it("should handle a test that throws an error", async () => {
			const test = "throw new Error('test error')";

			const result = await messenger.runTest(test);

			expect(result).toStrictEqual({
				err: {
					message: "test error",
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					stack: expect.stringMatching("Error: test error"),
				},
			});
		});

		it("should handle a test that throws an error with expected and actual values", async () => {
			const test =
				"throw new chai.AssertionError('test error', { expected: 'expected', actual: 'actual' })";

			const result = await messenger.runTest(test);

			expect(result).toStrictEqual({
				err: {
					message: "test error",
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					stack: expect.stringMatching("Error: test error"),
					expected: "expected",
					actual: "actual",
				},
			});
		});

		it("should test against the enclosing document", async () => {
			resetDocument();
			document.body.appendChild(document.createElement("div"));
			document.body.appendChild(document.createElement("div"));

			const test = "assert.equal(document.querySelectorAll('div').length, 2)";
			const result = await messenger.runTest(test);

			expect(result).toStrictEqual({ pass: true });
		});
	});
});
