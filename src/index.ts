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
		source: string;
		type: "frame" | "worker";
		// TODO: can we avoid using `assetPath` and use `import.meta.url` instead?
		assetPath?: string;
		code: { contents: string };
	}) {
		this.#testRunner?.dispose();
		if (type === "frame") {
			this.#testRunner = new FrameTestRunner({
				source,
				assetPath,
				script: "frame-test-evaluator.mjs",
			});
		} else {
			this.#testRunner = new WorkerTestRunner({
				source,
				assetPath,
				script: "worker-test-evaluator.mjs",
			});
		}
		await this.#testRunner.init({ code });

		return this.#testRunner;
	}
}

window.FCCSandbox = new FCCSandbox();
