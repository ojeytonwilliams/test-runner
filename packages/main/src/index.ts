import { FrameTestRunner, WorkerTestRunner } from "./test-runner";

declare global {
	interface Window {
		FCCSandbox: FCCSandbox;
	}
}

class FCCSandbox {
	#frameRunner: FrameTestRunner | null;
	#workerRunner: WorkerTestRunner | null;
	#pythonRunner: WorkerTestRunner | null;

	constructor() {
		this.#frameRunner = null;
		this.#workerRunner = null;
		this.#pythonRunner = null;
	}
	getRunner(
		type: "frame" | "worker" | "python",
	): FrameTestRunner | WorkerTestRunner | null {
		switch (type) {
			case "frame":
				return this.#frameRunner;
			case "worker":
				return this.#workerRunner;
			case "python":
				return this.#pythonRunner;
		}
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
		let testRunner: FrameTestRunner | WorkerTestRunner | null = null;
		switch (type) {
			case "frame":
				if (!this.#frameRunner) {
					this.#frameRunner = new FrameTestRunner({
						assetPath,
						script: "frame-test-evaluator.js",
					});
				}
				testRunner = this.#frameRunner;
				break;
			case "worker":
				if (!this.#workerRunner) {
					this.#workerRunner = new WorkerTestRunner({
						assetPath,
						script: "worker-test-evaluator.js",
					});
				}
				testRunner = this.#workerRunner;
				break;
			case "python":
				if (!this.#pythonRunner) {
					this.#pythonRunner = new WorkerTestRunner({
						assetPath,
						script: "python-test-evaluator.js",
					});
				}
				testRunner = this.#pythonRunner;
				break;
		}
		await testRunner.init({ code, source, loadEnzyme, hooks });

		return testRunner;
	}
}

window.FCCSandbox = new FCCSandbox();
