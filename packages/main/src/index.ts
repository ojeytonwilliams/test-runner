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
	}: {
		// the compiled user code, evaluated before the tests.
		source: string;
		type: "frame" | "worker";
		// TODO: can we avoid using `assetPath` and use `import.meta.url` instead?
		assetPath?: string;
		// the original user code, available for the tests to use.
		code: { contents: string };
	}) {
		this.#testRunner?.dispose();
		if (type === "frame") {
			this.#testRunner = new FrameTestRunner({
				assetPath,
				script: "frame-test-evaluator.mjs",
			});
		} else {
			this.#testRunner = new WorkerTestRunner({
				assetPath,
				script: "worker-test-evaluator.mjs",
			});
		}
		await this.#testRunner.init({ code, source });

		return this.#testRunner;
	}
}

window.FCCSandbox = new FCCSandbox();
