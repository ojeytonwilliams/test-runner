// TODO: remove the dummy export once TS understands this is a module (i.e. it
// has imports)
export {};

declare global {
	interface Window {
		FCCSandbox?: unknown;
	}
}

window.FCCSandbox = "something";
