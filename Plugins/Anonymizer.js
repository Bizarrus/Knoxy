/**
 * @author  Bizarrus
 **/
import Plugin from '../Core/Plugin.class.js';

export default class Anonymizer extends Plugin {
	constructor() {
		super();
		this.enable();
	}

	onPacket(packet, definition) {
		if(definition === null) {
			return packet;
		}

		if(definition.Name === 'HANDSHAKE' || definition.Opcode === 't') {
			let p = definition.Data;
			p[8] = null; // KnRi-Cookie
			p[13] = null; // Nick
			p[14] = null; // PW

			return p.join('\0');
		}

		return packet;
	}
}