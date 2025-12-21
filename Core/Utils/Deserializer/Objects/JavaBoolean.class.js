export default class JavaBoolean {
	value = false;

	readObject(stream) {
		stream.defaultReadObject();
	}

	readResolve() {
		return this.value;
	}
}