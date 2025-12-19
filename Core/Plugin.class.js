/**
 * @author  Bizarrus
 **/
export default class Plugin {
	/*
	 * Will be called, when the plugin is loaded.
	 */
	onInit() {
		/* Override Me */
	}

	/*
	 * Will be called, when the plugin is destroyed.
	 */
	onDestroy() {
		/* Override Me */
	}

	/*
	* @param {Packet} packet
	* @returns {Packet|null} null to stop handling the packet
	*/
	onPacket(packet) {
		/* Override Me */
		return packet;
	}

	/*
	* @param {GenericProtocol} packet
	* @returns {GenericProtocol|null} null to stop handling the packet
	*/
	onGeneric(packet) {
		/* Override Me */
		return packet;
	}


	/*
	 * Will be called, when a chat-command (/<command> <args>) is executed by the client.
	 * @param {String} command
	 * @param {Array} args
	 * @returns {Boolean} false to stop send the command-packet to the server
	 */
	onCommand(command, args) {
		/* Override Me */
		return false;
	}
}