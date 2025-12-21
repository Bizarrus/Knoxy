export default class KnUserContext {
	normalizedNick = null;
	password = null;
	serverSetting = null;
	nick = null;
	toBeStored = false;
	lastLogin = 0;
	deviceToken = null;

	readObject(stream) {
		stream.defaultReadObject();
	}
}