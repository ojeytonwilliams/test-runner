// TODO: remove the dummy export once TS understands this is a module (i.e. it
// has imports)
export {};

declare global {
	interface Window {
		FCCSandbox: FCCSandbox;
	}
}

class FCCSandbox {
	createTestRunner() {
		const iframe = document.createElement("iframe");
		document.body.appendChild(iframe);
	}
}

window.FCCSandbox = new FCCSandbox();
