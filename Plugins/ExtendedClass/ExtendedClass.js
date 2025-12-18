/**
 * @author  Bizarrus
 **/
import Plugin from '../../Core/Plugin.class.js';

export default class ExtendedClass extends Plugin {
	constructor() {
		super();

		console.log('[ExtendedClass] Construct');
	}

	onInit() {
		console.log('[ExtendedClass] Init');
	}

	onDestroy() {
		console.log('[ExtendedClass] Destroy');
	}

	onPacket(packet) {
		console.log('[ExtendedClass] Packet', packet);
		return packet;
	}

	onCommand(command, args) {
		console.log('[ExtendedClass] Command', command, args);
		return false;
	}
}