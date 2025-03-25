import { FrameTestEvaluator } from "../src/test-evaluators/frame-test-evaluator";

describe("FrameTestEvaluator", () => {
	let messenger: FrameTestEvaluator;

	beforeEach(() => {
		messenger = new FrameTestEvaluator();
		messenger.init();
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
					stack: expect.stringMatching("Error: test error"),
				},
			});
		});

		it("should handle a test that throws an error with expected and actual values", async () => {
			const test =
				"let err = Error('test error'); err.expected = 'expected'; err.actual = 'actual'; throw err";

			const result = await messenger.runTest(test);

			expect(result).toStrictEqual({
				err: {
					message: "test error",
					stack: expect.stringMatching("Error: test error"),
					expected: "expected",
					actual: "actual",
				},
			});
		});
	});
});
