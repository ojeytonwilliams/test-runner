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
	}: {
		source: string;
		type: "frame" | "worker";
	}) {
		this.#testRunner?.dispose();
		if (type === "frame") {
			this.#testRunner = new FrameTestRunner({ source });
		} else {
			this.#testRunner = new WorkerTestRunner({ source });
		}
		await this.#testRunner.init();

		return this.#testRunner;
	}
}

window.FCCSandbox = new FCCSandbox();
