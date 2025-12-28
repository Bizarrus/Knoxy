/**
 * @author  SeBiTM, Bizarrus
 **/
import GenericType from './GenericType.enum.js';
import GenericReader from './GenericReader.class.js';

export default class GenericProtocol {
	constructor() {
		this.hash			= null;
		this.baseOffset		= 0;
		this.nodeNames		= [];
		this.nodeIndices	= [];
		this.values			= new Map();
		this.currentIndex	= 0;
	}

	static parseTree(treeStr) {
		const protocol = new GenericProtocol();

		protocol.updateTree(treeStr);

		return protocol;
	}

	updateTree(treeStr) {
		if(!treeStr) {
			return;
		}

		const parts				= treeStr.split(';');
		let partPointer = 2;
		this.hash				= parts[0];
		this.baseOffset			= parseInt(parts[1]) || 0;
		this.nodeNames			= [];
		this.nodeIndices		= [];

		for(let i = 0; i < this.baseOffset; i++) {
			this.nodeNames.push(null);
			this.nodeIndices.push(null);
		}

		// Find names
		while (partPointer < parts.length && parts[partPointer] !== '') {
			this.nodeNames.push(parts[partPointer]);
			partPointer++;
		}

		// Find starting rules
		while(partPointer < parts.length && (parts[partPointer] === '' || parts[partPointer] === ':')) {
			partPointer++;
		}

		// Assign rules synchronously
		let currentId = this.baseOffset + 1;

		while(partPointer < parts.length && currentId < this.nodeNames.length) {
			const rawRule = parts[partPointer++];

			if(rawRule === ':') {
				break;
			}

			if(rawRule.length > 0) {
				this.nodeIndices[currentId] = rawRule.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
			} else {
				this.nodeIndices[currentId] = [];
			}

			currentId++;
		}
	}

	copyRef(index) {
		const node	= new GenericProtocol();
		node.hash					= this.hash;
		node.nodeNames				= this.nodeNames;
		node.nodeIndices			= this.nodeIndices;
		node.currentIndex			= index;
		node.values					= new Map();
		return node;
	}

	add(key, value) {
		this.values.set(key, value);
	}

	decode(string, position = 0) {
		const reader = new GenericReader(string, position);
		return this.read(reader);
	}

	read(reader) {
		const rootIndex		= reader.readShort();
		this.currentIndex	= rootIndex;
		const result	= this.executeRead(reader, rootIndex);
		this.values			= new Map();
		const name			= this.nodeNames[rootIndex] || `ID_${rootIndex}`;

		if(result instanceof Map) {
			this.values = result;
		} else {
			this.values.set(name, result);
		}

		return this;
	}

	executeRead(reader, ind, node = null) {
		if(node === null) {
			node = this.copyRef(ind);
		}

		const indices = this.nodeIndices[ind];

		if(!indices || indices.length === 0) {
			return node;
		}

		for(let i = 0; i < indices.length; i++) {
			let lnInd = indices[i];
			let nName = this.nodeNames[lnInd];

			switch(lnInd) {
				case GenericType.BYTE:
				case GenericType.ENUM:
					return reader.readByte();
				case GenericType.BOOLEAN:
					return reader.readBoolean();
				case GenericType.SHORT:
					return reader.readShort();
				case GenericType.INTEGER:
					return reader.readInt();
				case GenericType.LONG:
					return reader.readLong();
				case GenericType.FLOAT:
					return reader.readFloat();
				case GenericType.DOUBLE:
					return reader.readDouble();
				case GenericType.CHAR:
					return reader.readChar();
				case GenericType.UTF:
					return reader.readUTF().replace('\u20AD', 'K');
				/*
				case GenericType.BINARY:
					// Binary Data
				break;
				*/
				case GenericType.ARRAY:
					i++;
					const listInd		= indices[i];
					const arrList	= [];

					node.add(this.nodeNames[listInd], arrList);

					while(reader.position < reader.length && reader.readByte() === 11) {
						arrList.push(this.executeRead(reader, listInd, null));
					}

					i++; // Skip 12 (GenericType.ARRAY_END)
				break;
				/*
				case GenericType.ARRAY_END: (12)
					// Array End
				break;
				*/
				case GenericType.STRING:
					const str = this.readChars(reader);

					if(indices.length === 1) {
						return str;
					}

					node.add(this.nodeNames[ind] || 'value', str);
				break;
				default:
					if(nName) {
						node.add(nName, this.executeRead(reader, lnInd, null));
					}
				break;
			}
		}

		return node;
	}

	readChars(reader) {
		let length = reader.readByte() & 0xFF;

		if(length === 255) {
			return null;
		}

		if(length >= 128) {
			length = ((length - 128) << 16) | (reader.readByte() << 8) | reader.readByte();
		}

		let str = [];

		for(let i = 0; i < length; i++) {
			str[i] = String.fromCharCode(reader.readShort());
		}

		return str.join('');
	}

	getName() {
		return this.nodeNames[this.currentIndex] || `ID_${this.currentIndex}`;
	}

	get(key) {
		return this.values.get(key);
	}

	toJSON() {
		const convert = (val) => {
			if(val instanceof Map) {
				const obj = {};

				for(let [k, v] of val) {
					obj[k] = convert(v);
				}

				return obj;
			}

			if(Array.isArray(val)) {
				return val.map(convert);
			}

			return val;
		};

		return convert(this.values);
	}
}