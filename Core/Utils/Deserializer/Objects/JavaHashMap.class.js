export default class JavaHashMap {
	loadFactor = 0.75;
	threshold = 12;
	table = null;

	readObject(stream) {
		// Standardfelder lesen
		stream.defaultReadObject();

		// Anzahl der Buckets und Größe
		const capacity = stream.readInt();
		const size = stream.readInt();

		// Key-Value-Paare lesen
		const map = new Map();
		for (let i = 0; i < size; i++) {
			const key = stream.readObject();
			const value = stream.readObject();
			map.set(key, value);
		}

		this.entries = map;
	}

	readResolve() {
		return this.entries;
	}
}