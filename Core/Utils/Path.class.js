export default class Path {
    constructor(path, length) {
        this.path		= path;
        this.pathLen	= length;
    }

    getPath() {
        return this.path;
    }

    getLength() {
        return this.length;
    }
};