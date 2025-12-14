import GenericReader from "./GenericReader.class.js";

export default class GenericProtocol {
  static delimiter = ";";

  constructor(index = 0) {
    if (!Number.isInteger(index)) throw new Error("Generic index is not an Integer");
    this.index = index;
    this.values = new Map();

    this.tree = null;
    this.treeIndex = 0;
    this.byteData = null;

    this.nodeNames = null;
    this.nodeIndices = null;
    this.nodeValues = null;

    this.hash = null;
  }

  static parseTree(tree = null) {
    const base = new GenericProtocol(0);
    base.updateTree(tree);
    return base;
  }

  updateTree(tree) {
    this.reset(tree);

    this.hash = this.next(GenericProtocol.delimiter);
    this.index = this.nextInt(GenericProtocol.delimiter);

    for (let i = 0; i < this.index; i++) {
      this.nodeNames.push(null);
      this.nodeIndices.push(null);
    }

    while (!this.isEmpty(GenericProtocol.delimiter)) {
      this.nodeNames.push(this.next(GenericProtocol.delimiter));
    }

    for (let i = this.index; i < this.nodeNames.length; i++) {
      if (!this.nodeValues.has(this.nodeNames[i])) {
        this.nodeValues.set(this.nodeNames[i], i);
      }
    }

    while (this.nodeIndices.length < this.nodeNames.length) {
      const indices = [];
      while (!this.isEmpty(GenericProtocol.delimiter)) {
        indices.push(this.nextInt(GenericProtocol.delimiter));
      }
      this.nodeIndices.push(indices);
    }

    this.next(":");

    for (let i = this.index; i < this.nodeIndices.length; i++) {
      const indices = this.nodeIndices[i];
      for (const t of indices) {
        if (t !== 0) continue;

        const map = new Map();
        for (let k = 0; !this.isEmpty(GenericProtocol.delimiter); k++) {
          map.set(this.next(GenericProtocol.delimiter), k);
        }
        this.nodeValues.set(this.nodeNames[i], map);
      }
    }

    this.reset(null);
    return this;
  }

  reset(tree) {
    this.treeIndex = 0;
    if (tree != null) {
      this.tree = tree;
      this.nodeIndices = [];
      this.nodeNames = [];
      this.nodeValues = new Map();
      this.values = new Map();
    }
  }

  next(delimiter) {
    const nextIndex = this.tree.indexOf(delimiter, this.treeIndex);
    if (nextIndex >= 0) {
      const s = this.tree.substring(this.treeIndex, nextIndex);
      this.treeIndex = nextIndex + 1;
      return s;
    }
    return null;
  }

  nextInt(delimiter) {
    return parseInt(this.next(delimiter), 10);
  }

  isEmpty(delimiter) {
    if (this.tree.indexOf(delimiter, this.treeIndex) === this.treeIndex) {
      this.treeIndex = this.tree.indexOf(delimiter, this.treeIndex) + 1;
      return true;
    }
    return false;
  }

  copyRef(ref) {
    if (typeof ref === "string") {
      if (!this.nodeValues.has(ref)) return null;
      ref = this.nodeValues.get(ref);
    }
    if (!Number.isInteger(ref)) return null;

    const node = new GenericProtocol(ref);
    node.name = this.nodeNames[ref];

    node.nodeIndices = this.nodeIndices;
    node.nodeNames = this.nodeNames;
    node.nodeValues = this.nodeValues;

    node.hash = this.hash;
    node.byteData = this.byteData;

    return node;
  }

  add(key, value) {
    if (this.values.has(key)) this.values.delete(key);
    this.values.set(key, value);
    return this;
  }

  get(key) {
    if (!this.values.has(key)) return null;
    return this.values.get(key);
  }

  containsKey(key) {
    return this.values.has(key);
  }

  getSize() {
    return this.values.size;
  }

  getName() {
    return this.name;
  }

  getValue(nodeName, key) {
    if (!this.nodeValues.has(nodeName)) return -1;
    const dic = this.nodeValues.get(nodeName);
    if (!(dic instanceof Map)) return -1;
    if (!dic.has(key)) return -1;
    return dic.get(key);
  }

  static decodeString(value) {
    if (value == null || value.length === 0 || value.charAt(0) !== "\u0000") return value;
    if (value.length === 1) return null;
    return value.substring(1);
  }
  static readChars(reader) {
    let length = reader.readUnsignedByte();
    if (length === 255) return null;

    if (length >= 128) {
      length = ((length & 0x7f) << 16) | (reader.readUnsignedByte() << 8) | reader.readUnsignedByte();
    }

    let out = "";
    for (let i = 0; i < length; i++) {
      out += reader.readChar();
    }
    return out;
  }

  read(data, offset = 0) {
    return this.readReader(new GenericReader(data, offset));
  }

  readReader(reader) {
    const index = reader.readShort();
    const node = this.copyRef(index);
    if (this.readInternal(reader, index, node) !== node) {
      throw new Error("Tokens mapped directly to a primitive value can not be encoded");
    }
    return node;
  }

  readInternal(reader, index, node) {
    if (node == null) node = this.copyRef(index);

    const indices = node.nodeIndices[index];
    if (!indices) throw new Error(`No nodeIndices for index=${index} name=${node.nodeNames?.[index]}`);

    for (let i = 0; i < indices.length; i++) {
      let ind = indices[i];

      switch (ind) {
        case 0: return reader.readByte();
        case 1: return reader.readBoolean();
        case 2: return reader.readByte();
        case 3: return reader.readShort();
        case 4: return reader.readInt();
        case 5: return reader.readLong();
        case 6: return reader.readFloat();
        case 7: return reader.readDouble();
        case 8: return reader.readChar();
        case 9: return GenericProtocol.decodeString(reader.readUTF());

        case 10: throw new Error("Not implemented yet: BinaryType");

        case 11: {
          i++;
          ind = indices[i];

          const list = [];
          node.add(this.nodeNames[ind], list);

          while (reader.readByte() === 11) {
            list.push(this.readInternal(reader, ind, null));
          }

          i++;
          break;
        }
        case 12: break;
        case 13: return GenericProtocol.readChars(reader);

        default:
          node.add(this.nodeNames[ind], this.readInternal(reader, ind, null));
          break;
      }
    }

    return node;
  }
}
