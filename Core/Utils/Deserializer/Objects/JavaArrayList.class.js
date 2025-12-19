export default class JavaArrayList {
	size = 0;
	elements = [];

	readObject(stream) {
		stream.defaultReadObject();

		const capacity = stream.readInt();

		for (let i = 0; i < this.size; i++) {
			this.elements.push(stream.readObject());
		}
	}

	readResolve() {
		return this.elements;
	}
}