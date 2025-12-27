/**
 * @author  Bizarrus
 **/
export default class Definition {
	Name		= null;
	Opcode		= null;
	Parameters	= null;
	Description= null;
	Data		= null;

	constructor(name, json) {
		this.Name			= name;
		this.Opcode			= json.opcode;
		this.Parameters		= json.parameters;
		this.Description	= json.description;
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

		return this;
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