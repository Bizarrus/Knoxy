import GenericProtocol from './GenericProtocol.class.js';

export default class GenericdValue {
  constructor(type, value) {
    this.type = type;
    this.value = value;
  }

  toJSON() {
    if (this.type == null) {
      throw new Error("GenericdValue.toJSON() called on invalid GenericdValue");
    }

    if (this.type === 'List') {
      return {
        type: 'List',
        value: this.value.map(v => {
          if (v instanceof GenericdValue) return v.toJSON();
          if (v instanceof GenericProtocol) return v.toJSON(); // nutzt GenericProtocol.getValues()
          return v;
        })
      };
    }

    return {
      type: this.type,
      value: typeof this.value === 'bigint'
        ? this.value.toString()
        : this.value
    };
  }
}
