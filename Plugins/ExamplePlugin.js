/**
 * @author  Bizarrus
 **/
import Plugin from '../Core/Plugin.class.js';

export default class ExamplePlugin extends Plugin {
	constructor() {
		super();

		console.log('[ExamplePlugin] Construct');
	}

	onInit() {
		console.log('[ExamplePlugin] Init');
	}

	onDestroy() {
		console.log('[ExamplePlugin] Destroy');
	}

	onPacket(packet) {
		console.log('[ExamplePlugin] Packet', packet);
		return packet;
	}

	onCommand(command, args) {
		console.log('[ExamplePlugin] Command', command, args);
		return false;
	}
}