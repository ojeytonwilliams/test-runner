// This runs in an iframe and listens for messages from the parent window

import { TestEvaluator } from "./toy-test-evaluator";

const messenger = new TestEvaluator();
messenger.init();

self.onmessage = async function (e) {
	messenger.handleMessage(e);
};
