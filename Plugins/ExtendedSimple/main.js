/**
 * @author  Bizarrus
 **/
import Plugin from '../../Core/Plugin.class.js';

export default class ExtendedSimple extends Plugin {
	constructor() {
		super();

		console.log('[ExtendedSimple] Construct');
	}

	onInit() {
		console.log('[ExtendedSimple] Init');
	}

	onDestroy() {
		console.log('[ExtendedSimple] Destroy');
	}

	onPacket(packet) {
		console.log('[ExtendedSimple] Packet', packet);
		return packet;
	}

	onCommand(command, args) {
		console.log('[ExtendedSimple] Command', command, args);
		return false;
	}
}