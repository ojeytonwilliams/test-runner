// TODO: remove the dummy export once TS understands this is a module (i.e. it
// has imports)
export {};

declare global {
	interface Window {
		FCCSandbox: FCCSandbox;
	}
}

class TestRunner {
	#iframe: HTMLIFrameElement;

	constructor(iframe: HTMLIFrameElement) {
		this.#iframe = iframe;
		document.body.appendChild(iframe);
	}

	dispose() {
		this.#iframe.remove();
	}
}

class FCCSandbox {
	#testRunner: TestRunner | null;

	constructor() {
		this.#testRunner = null;
	}
	get testRunner() {
		return this.#testRunner;
	}

	createTestRunner() {
		this.#testRunner?.dispose();
		this.#testRunner = new TestRunner(document.createElement("iframe"));

		return this.#testRunner;
	}
}

window.FCCSandbox = new FCCSandbox();
