import { TestRunner } from "./test-runner";

declare global {
	interface Window {
		FCCSandbox: FCCSandbox;
	}
}

class FCCSandbox {
	#testRunner: TestRunner | null;
	TestRunner = TestRunner;

	constructor() {
		this.#testRunner = null;
	}
	get testRunner() {
		return this.#testRunner;
	}

	async createTestRunner({ source }: { source: string }) {
		this.#testRunner?.dispose();
		this.#testRunner = new TestRunner({ source });
		await this.#testRunner.init();

		return this.#testRunner;
	}
}

window.FCCSandbox = new FCCSandbox();
