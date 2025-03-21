import { AbstractTestEvaluator, type Fail } from "./abstract-test-evaluator";

export class TestEvaluator extends AbstractTestEvaluator {
	#runTest?: AbstractTestEvaluator["runTest"];
	init() {
		this.#runTest = async (test) => {
			try {
				await eval(test);
				return { pass: true };
			} catch (e: unknown) {
				const error = e as Fail;
				return {
					message: error.message,
					stack: error.stack,
					...(error.expected && { expected: error.expected }),
					...(error.actual && { actual: error.actual }),
				};
			}
		};
	}

	async runTest(test: string) {
		return await this.#runTest!(test);
	}

	protected async processMessage(e: MessageEvent): Promise<void> {
		if (e.data.type === "test") {
			const result = await this.#runTest!(e.data.value);
			self.parent.postMessage({ type: "result", value: result }, "*");
		}
	}
}
