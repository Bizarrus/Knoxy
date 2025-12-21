import FileSystem from 'node:fs';
import GenericProtocol from './Protocol/Generic/GenericProtocol.class.js';

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

	handleUpdate(tree, generic) {
		if(generic.getName() === 'CONFIRM_PROTOCOL_HASH') {
			if(this.LastestUpdated) { // reuse latest stored GenericTree (after reconnect)
				tree.updateTree(this.LastestUpdated);
			}
		} else if(generic.getName() === 'CHANGE_PROTOCOL') {
			this.LastestUpdated = generic.get('PROTOCOL_DATA').value; // store latest GenericTree

			// 			tree.updateTree(this.LastestUpdated);

			console.info('Protocol changed', tree.hash);
		}
	}
}