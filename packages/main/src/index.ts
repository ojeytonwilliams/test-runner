import { FrameTestRunner, WorkerTestRunner } from "./test-runner";

declare global {
	interface Window {
		FCCSandbox: FCCSandbox;
	}
}

class FCCSandbox {
	#testRunner: FrameTestRunner | WorkerTestRunner | null;

	constructor() {
		this.#testRunner = null;
	}
	get testRunner() {
		return this.#testRunner;
	}

	async createTestRunner({
		source,
		type,
		code,
		assetPath,
		hooks,
		loadEnzyme,
	}: {
		// the compiled user code, evaluated before the tests.
		source: string;
		type: "frame" | "worker" | "python";
		// TODO: can we avoid using `assetPath` and use `import.meta.url` instead?
		assetPath?: string;
		// the original user code, available for the tests to use.
		code: { contents: string };
		hooks?: {
			beforeAll?: string;
		};
		loadEnzyme?: boolean;
	}) {
		this.#testRunner?.dispose();
		switch (type) {
			case "frame":
				this.#testRunner = new FrameTestRunner({
					assetPath,
					script: "frame-test-evaluator.mjs",
				});
				break;
			case "worker":
				this.#testRunner = new WorkerTestRunner({
					assetPath,
					script: "worker-test-evaluator.mjs",
				});
				break;
			case "python":
				this.#testRunner = new WorkerTestRunner({
					assetPath,
					script: "python-test-evaluator.mjs",
				});
				break;
		}
		await this.#testRunner.init({ code, source, loadEnzyme, hooks });

		return this.#testRunner;
	}
}

window.FCCSandbox = new FCCSandbox();
