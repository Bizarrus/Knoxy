/**
 * @author  SeBiTM
 **/
import GenericProtocol from './GenericProtocol.class.js';

export default class GenericValue {
	constructor(type, value) {
		this.type	= type;
		this.value	= value;
	}

	toJSON() {
		if(this.type == null) {
			throw new Error('GenericValue.toJSON() called on invalid GenericValue');
		}

		if(this.type === 'List') {
			return {
				type:	'List',
				value:	this.value.map(value => {
					if(value instanceof GenericValue) {
						return value.toJSON();
					}

					// nutzt GenericProtocol.getValues()
					if(value instanceof GenericProtocol) {
						return value.toJSON();
					}

					return v;
				})
			};
		}

		return {
			type:	this.type,
			value:	(typeof(this.value) === 'bigint' ? this.value.toString() : this.value)
		};
	}
}
