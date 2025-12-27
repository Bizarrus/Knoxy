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
	onPacket(packet, definition) {
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
	* @param {Request} request
	* @returns {Request|null} null to stop handling the packet
	*/
	onRequest(id, request) {
		/* Override Me */
		return true;
	}

	/*
	* @param {Response} response
	* @returns {Response|null} null to stop handling the packet
	*/
	onResponse(id, response) {
		/* Override Me */
		return true;
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

	/* Do not modify here */
	Enabled = false;

	isEnabled() {
		return this.Enabled;
	}

	enable() {
		this.Enabled = true;

		this.onInit();
	}

	disable() {
		this.Enabled = false;

		this.onDestroy();
	}
}