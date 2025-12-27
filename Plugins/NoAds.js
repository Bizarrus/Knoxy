/**
 * @author  Bizarrus
 **/
import Plugin from '../Core/Plugin.class.js';

export default class NoAds extends Plugin {
	constructor() {
		super();
		this.enable();
	}

	onPacket(packet, definition) {
		if(definition === null) {
			return packet;
		}

		const packetStr = packet.toString('UTF-8');

		// @ToDo when ads, remove packet - currently here extremely primitive
		if(definition.Name === 'PRIVATE_MESSAGE' || definition.Opcode === 'r') {
			if(
				packetStr.indexOf('/tracktxtl') !== -1 ||
				packetStr.indexOf('promotionToolStApp') !== -1 ||
				packetStr.indexOf('promotion/aktionen') !== -1
			) {
				console.log('[NoAds]', 'Blocked Packet:', packetStr);
				return null;
			}
		} else if(definition.Name === 'GENERIC_PROTOCOL' || definition.Opcode === ':') {
			if(
				packetStr.indexOf('_gaq.push') !== -1 ||
				packetStr.indexOf('adContent') !== -1
			) {
				console.log('[NoAds]', 'Blocked Packet:', packetStr);
				return null;
			}
		}

		return packet;
	}
}