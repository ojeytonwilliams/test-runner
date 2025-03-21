import type { TestEvaluator, Fail } from "./test-evaluator";

// TODO: currently this is almost identical to FrameTestEvaluator, can we make
// it more DRY? Don't attempt until they're both more fleshed out.
export class WorkerTestEvaluator implements TestEvaluator {
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
		// init will be async in the future, so I've made it a promise now.
		return Promise.resolve();
	}

	async runTest(test: string) {
		return await this.#runTest!(test);
	}

	async handleMessage(e: MessageEvent): Promise<void> {
		if (e.data.type === "test") {
			const result = await this.#runTest!(e.data.value);
			postMessage({ type: "result", value: result });
		} else if (e.data.type === "init") {
			await this.init();
			postMessage({ type: "ready" });
		}
	}
}

const worker = new WorkerTestEvaluator();

onmessage = async function (e) {
	worker.handleMessage(e);
};
