export default class BinaryNode {
    constructor() {
        this.zero	= null;
        this.one	= null;
        this.data	= null;
    }
	
    isLeaf() {
        return this.data !== null && this.isEmpty();
    }

    isEmpty() {
        return this.zero === null && this.one === null;
    }

    setData(data) {
        this.data = data;
    }

    getData() {
        return this.data;
    }

    getZero() {
        return this.zero;
    }

    setZero(left) {
        this.zero = left;
    }

    getOne() {
        return this.one;
    }

    setOne(right) {
        this.one = right;
    }
}