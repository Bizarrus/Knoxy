export default class Pair {
	constructor(key, value) {
		this.key	= key;
		this.value	= value;
	}

	getKey() {
		return this.key;
	}

	getValue() {
		return this.value;
	}

	setKey(key) {
		this.key = key;
	}

	setValue(value) {
		this.value = value;
	}
}