export default class JavaInteger {
	value = 0;

	readObject(stream) {
		stream.defaultReadObject();
	}

	readResolve() {
		return this.value;
	}
}