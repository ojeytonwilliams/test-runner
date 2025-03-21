interface Pass {
	pass: true;
}

export interface Fail {
	message: string;
	stack: string;
	expected?: string;
	actual?: string;
}

export abstract class AbstractTestEvaluator {
	abstract init(): void;
	abstract runTest(test: string): Promise<Pass | Fail>;

	handleMessage(e: MessageEvent): void {
		// ignore messages that do not come from the parent window
		if (e.source !== self.parent) {
			return;
		}

		this.processMessage(e);
	}

	protected abstract processMessage(e: MessageEvent): Promise<void>;
}
