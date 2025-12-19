export default class JavaEnum {
	name = null;

	readObject(stream) {}

	readResolve() {
		return this.name;
	}
}