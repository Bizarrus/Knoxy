/**
 * @author  SeBiTM
 **/
export default class BinaryNode {
	constructor() {
		this.zero	= null;
		this.one	= null;
		this.data	= null;
	}

	isLeaf() {
		return (this.data !== null && this.isEmpty());
	}

	isEmpty() {
		return (this.zero === null && this.one === null);
	}
}