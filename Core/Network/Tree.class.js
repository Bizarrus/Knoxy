/**
 * @author  Bizarrus, SeBiTM
 **/
import FileSystem from 'node:fs';
import GenericProtocol from './Protocol/Generic/GenericProtocol.class.js';

export default class Tree {
	LastestUpdated = null;
	Tree = null;

	constructor(file) {
		if(!FileSystem.existsSync(file)) {
			return;
		}

		this.Tree = GenericProtocol.parseTree(FileSystem.readFileSync(file).toString('utf-8'));
	}

	get() {
		return this.Tree;
	}

	handleUpdate(tree, generic) {
		switch(generic.getName()) {
			case 'CONFIRM_PROTOCOL_HASH':
				// reuse latest stored GenericTree (after reconnect)
				if(this.LastestUpdated) {
					tree.updateTree(this.LastestUpdated);
				}
			break;
			case 'CHANGE_PROTOCOL':
				// store latest GenericTree
				this.LastestUpdated = generic.get('PROTOCOL_DATA');

				console.info('LastestUpdated', this.LastestUpdated);
				tree.updateTree(this.LastestUpdated);

				console.info('hash', tree.hash);
			break;
		}
	}
}