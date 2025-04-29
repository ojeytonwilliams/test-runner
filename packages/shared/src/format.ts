import { inspect } from "util/util";

const quoteString = (x: unknown) => (typeof x === "string" ? `'${x}'` : x);

export function format(x: unknown) {
	// we're trying to mimic console.log, so we avoid wrapping strings in quotes:
	if (typeof x === "string") return x;
	else if (x instanceof Set) {
		return `Set(${x.size}) { ${Array.from(x, quoteString).join(", ")} }`;
	} else if (x instanceof Map) {
		return `Map(${x.size}) {${Array.from(
			x.entries(),
			([k, v]) => ` '${k}' => ${v}`,
		).join(",")} }`;
	} else if (typeof x === "bigint") {
		return x.toString() + "n";
	} else if (typeof x === "symbol") {
		return x.toString();
	} else if (x instanceof NodeList) {
		return x.length === 0 ? "NodeList []" : `NodeList(${x.length}) [...]`;
	}
	return inspect(x);
}
