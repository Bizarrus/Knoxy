import BinaryNode from '../../Utils/BinaryNode.class.js';
import BitStream from '../../Utils/BitStream.class.js';
import Pair from '../../Utils/Pair.class.js';
import Path from '../../Utils/Path.class.js';
//import Tree from '../../../Data/Tree.js';
import fs from 'node:fs';

export default (new class Huffman {
	constructor() {
        this.DecRoot			= new BinaryNode();
        this._16BitChar			= null;
        this._16BitCharPath		= 0;
        this._16BitCharPathLen	= 0;
        this.CharBuffer			= new Array(65535).fill(0);
        this.EncMap				= new Map();
        //this.Tree				= String.fromCharCode(...Tree);

		const data = fs.readFileSync('./Data/Tree.bin');
		this.Tree = data.toString('utf-8');

		let result = '';
		let index = 0;

		while (index < this.Tree.length) {
		let currentChar = this.Tree.charAt(index);
		if (currentChar === '\u0001') {
			index++;
			currentChar = this.Tree.charAt(index);
			if (currentChar === '0') {
				result += '\u0000';
				index++;
				continue;
			}
		}
		result += currentChar;
		index++;
		}
		this.Tree = result;


        this.createTree();
    }

    createTree() {
        let m	= 1;
        let n	= -33;
        let strLen;
		
        for(let i = 0; i < this.Tree.length; i += strLen) {
            let temp = this.Tree.charCodeAt(i++);
            let pathLen;
			
            if(temp === 255) {
                strLen	= this.Tree.charCodeAt(i++) + 1;
                pathLen	= this.Tree.charCodeAt(i++);
            } else {
                strLen	= Math.floor(temp / 21) + 1;
                pathLen	= temp % 21;
            }
			
            if((m & 0x1) === 0x0) {
                ++m;
            } else {
                while((m & 0x1) === 0x1) {
                    m >>= 1;
                    --n;
                }
                ++m;
            }
			
            while(n < pathLen) {
                m <<= 1;
                ++n;
            }
			
            const str	= this.Tree.substr(i, strLen);
            const path	= this.reverseBits(m, pathLen);
			
            if(strLen === 3 && str === "\\\\\\") {
                this._16BitChar			= str;
                this._16BitCharPath		= path;
                this._16BitCharPathLen	= pathLen;
            }
			
            this.addString(str, path, pathLen);
			
            if(!this.put(this.DecRoot, str, path, pathLen)) {
                throw new Error("error while creating tree (invalid path)");
            }
        }
    }

    reverseBits(x, pathLen) {
        let rv = 0;
		
        for(let i = 0; i < pathLen; ++i, x >>= 1) {
            rv = (rv << 1) | (x & 1);
        }
		
        return rv;
    }

    put(node, str, path, pathLen) {
        if(pathLen === 0) {
            node.setData(str);
			
            return node.isLeaf();
        }
		
        if(node.isEmpty()) {
            if(node.isLeaf()) {
                return false;
            }
			
            node.setZero(new BinaryNode());
            node.setOne(new BinaryNode());
        }
		
        return this.put((path & 1) === 0 ? node.getZero() : node.getOne(), str, path >> 1, pathLen - 1);
    }

    addString(str, path, pathLen) {
        let current = this.EncMap;
		
        for(let i = 0; i < str.length; ++i) {
            let _char		= str.charCodeAt(i);
            let character	= this.CharBuffer[_char];
			
            if(character === 0) {
                this.CharBuffer[_char]	= _char;
                character				= _char;
            }
			
            let child = null;
			
            if(current.has(character)) {
				child = current.get(character);
            }
			
			if(child === null) {
				const map	= new Map();
				child		= new Pair(null, map);
                current.set(character, child);
                current		= map;
            } else {
                current		= child.getValue();
            }
			
            if(i === str.length - 1) {
                child.setKey(new Path(path, pathLen));
            }
        }
    }

    decompress(data) {
        const bitStream	= new BitStream(data);
        let tempNode	= this.DecRoot;
        const output	= [];
		
        while(bitStream.hasNext()) {
			if(tempNode === null) {
				continue;
			}
			
            tempNode = bitStream.nextBit() === 0 ? tempNode.getZero() : tempNode.getOne();
            
			if(tempNode === null) {
				continue;
			}
			
			if(!tempNode.isLeaf()) {
                continue;
            }
			
            if(tempNode.getData() === this._16BitChar) {
                let _char = 0;
				
                for(let k = 0; k < 16; ++k) {
                    _char += bitStream.nextBit() << k;
                }
				
                output.push(String.fromCharCode(_char));
            } else {
                output.push(tempNode.getData());
            }
			
            tempNode = this.DecRoot;
        }
        return output.join('');
    }

    compress(str) {
        const output	= new BitStream();
        let current		= this.EncMap;
        let previous	= -1;
        let previousLen	= -1;
        let previousPos = -1;
		
        for(let i = 0; i < str.length; ++i) {
            let _char		= str.charCodeAt(i);
            let character	= this.CharBuffer[_char];
			
            if(character === 0) {
                this.CharBuffer[_char]	= _char;
                character				= _char;
            }
			
            let temp = null;
			
            if(current.has(character)) {
				temp = current.get(character);
            }
			
			if(temp === null) {
                if(previous === -1) {
                    output.addBits(this._16BitCharPath, this._16BitCharPathLen);
                    output.addBits(_char, 16);
                    previousPos = i;
                } else {
                    output.addBits(previous, previousLen);
                }
				
                previous	= -1;
                i			= previousPos;
                current		= this.EncMap;
            } else {
                if(temp.getKey() !== null) {
                    previous	= temp.getKey().getPath();
                    previousLen = temp.getKey().getLength();
                    previousPos = i;
                }
				
                if(temp.getValue() !== null) {
                    current = temp.getValue();
                }
            }
        }
		
        if(previous >= 0) {
            output.addBits(previous, previousLen);
        }
		
        return output.toByteArray();
    }
}());