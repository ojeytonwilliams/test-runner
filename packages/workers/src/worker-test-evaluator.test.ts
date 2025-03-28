/* @jest-environment jsdom */

import { WorkerTestEvaluator } from "./worker-test-evaluator";

describe("WorkerTestEvaluator", () => {
	let messenger: WorkerTestEvaluator;

	beforeEach(async () => {
		messenger = new WorkerTestEvaluator();
		await messenger.init({ code: {}, source: "" });
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
			const test = "assert.equal('actual', 'expected')";

			const result = await messenger.runTest(test);

			expect(result).toStrictEqual({
				err: {
					message: "expected 'actual' to equal 'expected'",
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					stack: expect.stringMatching("AssertionError: expected"),
					expected: "expected",
					actual: "actual",
				},
			});
		});

		it("should use the init source when running a test", async () => {
			await messenger.init({ code: {}, source: "let x = 1" });

			const test = "assert.equal(x, 2)";
			const result = await messenger.runTest(test);

			expect(result).toStrictEqual({
				err: {
					message: "expected 1 to equal 2",
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					stack: expect.stringMatching("AssertionError: expected"),
					expected: 2,
					actual: 1,
				},
			});
		});

		it("should still run tests against code if the source throws", async () => {
			const source = "throw Error('expected')";
			await messenger.init({ code: { contents: source }, source });

			const test = `assert.equal(code, \`${source}\`)`;
			const result = await messenger.runTest(test);

			expect(result).toStrictEqual({ pass: true });
		});
	});
});
