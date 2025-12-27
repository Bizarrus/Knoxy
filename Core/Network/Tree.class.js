/**
 * @author  Bizarrus, SeBiTM
 **/
import FileSystem from 'node:fs';
import GenericProtocol from './Protocol/Generic/GenericProtocol.class.js';
import GenericWriter from './Protocol/Generic/GenericWriter.class.js';

export default class Tree {
	LastestUpdated = null;
	Tree = null;

	constructor(file) {
		if(!FileSystem.existsSync(file)) {
			return;
		}

		this.Tree = GenericProtocol.parseTree(FileSystem.readFileSync(file).toString('utf8'));
	}

	get() {
		return this.Tree;
	}

	isTreeCheck(generic) {
		return (generic.getName() === 'CONFIRM_PROTOCOL_HASH');
	}

	modifyTreeCheck(generic) {
		const version				= generic.get('PROTOCOL_HASH').value;
		const subtract 		= 60000000n;
		const writer	= new GenericWriter(true); // String mode!

		console.log('old version', version);
		console.log('new version', version - subtract);

		writer.writeByte(0x71);
		writer.writeByte(0x00);
		writer.writeByte(0x00);
		writer.writeByte(0x15);
		writer.writeLong(version - subtract); // Emulate an older version to subtract a little bit

		return writer.toString();
	}

	handleUpdate(tree, generic) {
		if(generic.getName() === 'CONFIRM_PROTOCOL_HASH') {
			// reuse latest stored GenericTree (after reconnect)
			if(this.LastestUpdated) {
				tree.updateTree(this.LastestUpdated);
			}
		} else if(generic.getName() === 'CHANGE_PROTOCOL') {
			// store latest GenericTree
			this.LastestUpdated = generic.get('PROTOCOL_DATA').value;

			console.info('LastestUpdated', this.LastestUpdated);
			tree.updateTree(this.LastestUpdated);

			console.info('hash', tree.hash);
		}
	}
}