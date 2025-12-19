export default class KnUserContext {
	readResolve() {
		return this.enumConstantName || 'DE';
	}
}