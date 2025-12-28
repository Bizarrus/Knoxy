/**
 * @author  Bizarrus
 **/
export default class Definition {
	Name		= null;
	Opcode		= null;
	Parameters	= null;
	Description= null;
	Data		= null;
	SubTypes	= null;

	constructor(name, json) {
		this.Name			= name;
		this.Opcode			= json.opcode;
		this.Parameters		= json.parameters;
		this.Description	= json.description;
		this.SubTypes		= json.subTypes || {};
	}

	getName() {
		return this.Name;
	}

	getParameters() {
		return this.Parameters;
	}

	getDescription() {
		return this.Description;
	}

	fill(data) {
		this.Data = data;
		if (this.SubTypes && Object.keys(this.SubTypes).length > 0) {
			this._parseSubTypes();
		}

		return this;
	}

	_parseSubTypes() {
		let parameters = this.getParameters();
		if (!Array.isArray(parameters)) return;

		for (let i = 0; i < parameters.length; i++) {
			let param = parameters[i];

			let type = param.type || 'String';
			let asArray = type.endsWith('[]');
			if (!asArray) continue;

			let subTypeName = type.slice(0, -2);
			let subType = this.SubTypes?.[subTypeName];
			if (!subType || !subType.seperator) continue;

			let seperator = subType.seperator.replace(/\\0/g, '\0');
			let subParts = this.Data.join('\0');
			if (subType.startIndex) {
				subParts = subParts.substring(subType.startIndex);
			}

			let partsList = subParts.split(seperator);
			this.DataReplaced = true;

			this.Data = partsList.map(part => {
				const parts = (part + '\0-')
					.replace(/\\0/g, '\0')
					.split('\0');

				const def = new Definition(subTypeName, {
					opcode: null,
					parameters: subType.parameters,
					description: subType.description || '',
					subTypes: subType.subTypes || {}
				});

				return def.fill(parts);
			});
		}
	}


	toString() {
		let parameters = this.getParameters();

		if(typeof(parameters) === 'object' && !Array.isArray(parameters)) {
			this.Data.shift();

			return '[Definition ' + this.Name + ', Opcode "' + this.Opcode + '", Params { ' + Object.entries(this.Data).map(([ key, value ]) => `${key}=${JSON.stringify(value)}`).join(', ') + ' }]';
		} else {
			let result = {};

			parameters.forEach((param, index) => {
				result[param.name] = this.Data[index + 1] || null;
			});

			return '[Definition ' + this.Name + ', Opcode "' + this.Opcode + '", Params { ' + Object.entries(result).map(([ key, value ]) => `${key}=${JSON.stringify(value)}`).join(', ') + ' }]';
		}
	}
}