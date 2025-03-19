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

	constructor({ source }: { source: string }) {
		const iframe = document.createElement("iframe");
		iframe.sandbox.add("allow-scripts");
		iframe.srcdoc = source;
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

	createTestRunner({ source }: { source: string }) {
		this.#testRunner?.dispose();
		this.#testRunner = new TestRunner({ source });

		return this.#testRunner;
	}
}

window.FCCSandbox = new FCCSandbox();
