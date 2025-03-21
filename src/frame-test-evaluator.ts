import type { TestEvaluator, Fail } from "./test-evaluator";

export class FrameTestEvaluator implements TestEvaluator {
	#runTest?: TestEvaluator["runTest"];
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
		return Promise.resolve();
	}

	async runTest(test: string) {
		return await this.#runTest!(test);
	}

	async handleMessage(e: MessageEvent): Promise<void> {
		if (e.data.type === "test") {
			const result = await this.#runTest!(e.data.value);
			self.parent.postMessage({ type: "result", value: result }, "*");
		}
	}
}

const messenger = new FrameTestEvaluator();
messenger.init();

onmessage = async function (e) {
	if (e.source !== self.parent) {
		return;
	}
	messenger.handleMessage(e);
};
