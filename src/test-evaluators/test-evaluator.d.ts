interface Pass {
	pass: true;
}

export interface Fail {
	err: {
		message: string;
		stack: string;
		expected?: string;
		actual?: string;
	};
}

export interface TestEvaluator {
	init(): Promise<void>;
	runTest(test: string): Promise<Pass | Fail>;
	handleMessage(e: MessageEvent): void;
}
