/* @jest-environment jsdom */

import { WorkerTestEvaluator } from "../src/test-evaluators/worker-test-evaluator";

describe("WorkerTestEvaluator", () => {
	let messenger: WorkerTestEvaluator;

	beforeEach(async () => {
		messenger = new WorkerTestEvaluator();
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
					stack: expect.stringMatching("Error: test error"),
				},
			});
		});

		it("should handle a test that throws an error with expected and actual values", async () => {
			const test = "assert.equal('actual', 'expected')";

			const result = await messenger.runTest(test);

			expect(result).toStrictEqual({
				err: {
					message: "expected 'actual' to equal 'expected'",
					stack: expect.stringMatching("AssertionError: expected"),
					expected: "expected",
					actual: "actual",
				},
			});
		});

		it("should use the init code when running a test", async () => {
			await messenger.init({ code: { contents: "let x = 1" } });

			const test = "assert.equal(x, 2)";
			const result = await messenger.runTest(test);

			expect(result).toStrictEqual({
				err: {
					message: "expected 1 to equal 2",
					stack: expect.stringMatching("AssertionError: expected"),
					expected: 2,
					actual: 1,
				},
			});
		});
	});
});
