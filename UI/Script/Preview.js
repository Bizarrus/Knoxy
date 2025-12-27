(new class Preview {
	RAW 	= null;
	Definition= null;

	constructor() {
		this.RAW			= document.querySelector('section[data-name="raw"] ui-scroll');
		this.Definition		= document.querySelector('[data-name="definition"] ui-list#info ui-data');
		this.Data			= document.querySelector('[data-name="definition"] ui-list#data ui-data');

		[
			'onLog',
		].forEach((name) => {
			if(typeof(window.api[name]) === 'function') {
				window.api[name]((data) => {
					try {
						if(typeof(this[name]) === 'function') {
							this[name](data);
						}
					} catch(error) {
						console.error(error);
					}
				});
			}
		});

		document.addEventListener('click', (event) => {
			let current = event.target.closest('[data-action]');

			if(current) {
				let action	= current.dataset.action;
				let value		= null;

				if(action.indexOf(':') !== -1) {
					[action, value] = action.split(':', 2);
				}

				switch(action) {
					case 'dev':
					case 'proxy':
					case 'config':
					case 'client':
						window.api.action(action, value);
					break;
				}
			}
		});
	}

	onLog(log) {
		if(typeof(log.definition) !== 'undefined') {
			console.log(log.definition);
			this.Definition.innerHTML		= '';

			// Infos
			for(const [key, val] of Object.entries({
				'Name':			log.definition.Name,
				'Opcode':		log.definition.Opcode,
				'Description':	log.definition.Description,
			})) {
				const entry = document.createElement('ui-entry');
				this.setGrid(this.Definition, entry);

				/* Name */
				let name = this.addEntry(entry, key);
				name.style.fontWeight = 'bold';

				/* Value */
				this.addEntry(entry, val);

				this.Definition.append(entry);
			}

			// Protocol
			let parameters = log.definition.Parameters;

			if(!Array.isArray(parameters)) {
				let element = document.createElement('ui-entry');
				this.setGrid(this.Data, element);

				if(parameters.type === 'GenericProtocol' || parameters.type === 'Popup') {
					let element = document.createElement('ui-entry');

					/* Binary Data */
					let index = document.createElement('div');
					index.innerHTML = `Binary Data`;
					index.style.textAlign = 'center';
					element.append(index);

					this.Data.append(element);
				} else {
					log.definition.Data.forEach((parameter, position) => {
						let element = document.createElement('ui-entry');
						this.setGrid(this.Data, element);

						/* Index */
						let index = document.createElement('div');
						index.innerHTML = `${position}`;
						index.style.textAlign = 'center';
						element.append(index);

						/* Type */
						let type = document.createElement('div');
						type.innerHTML = this.createTypeBadges(parameters.type);
						element.append(type);

						/* Name */
						let name = document.createElement('string');
						name.innerHTML = parameters.name;
						element.append(name);

						/* Value */
						let value = document.createElement('div');
						value.innerHTML = parameter;
						element.append(value);

						/* Description */
						let description = document.createElement('div');

						if(typeof (parameters.description) !== 'undefined') {
							//description.innerHTML = parameters.description;
						}

						element.append(description);

						this.Data.append(element);
					});
				}
			} else if(Array.isArray(parameters)) {
				for(const [key, val] of Object.entries(parameters)) {
					let position = Number(key) + 1;
					let object = log.definition.Data[position];
					let element = document.createElement('ui-entry');
					this.setGrid(this.Data, element);

					console.log({ object, position, val });

					/* Index */
					let index = document.createElement('div');
					index.innerHTML = `${position}`;
					index.style.textAlign = 'center';
					element.append(index);

					/* Type */
					let type = document.createElement('div');
					type.innerHTML = this.createTypeBadges(val.type);
					element.append(type);

					/* Name */
					let name = document.createElement('string');
					name.innerHTML = val.name;
					element.append(name);

					/* Value */
					let value = document.createElement('div');
					value.innerHTML = object;
					value.style.overflow = 'hidden';
					value.style.textOverflow = 'ellipsis';
					value.style.whiteSpace = 'nowrap';
					value.style.minWidth = '0';
					element.append(value);

					/* Description */
					let description = document.createElement('div');

					if(typeof(val.description) !== 'undefined') {
						description.innerHTML = val.description;
					}

					element.append(description);

					this.Data.append(element);
				}
			}
		}

		if(typeof(log.hex) !== 'undefined') {

		}

		if(typeof(log.packet) !== 'undefined') {
			let raw = log.packet;

			const invisibleChars = {
				'\0': '\\0',
				'\x01': '\\x01',
				'\x02': '\\x02',
				'\x03': '\\x03',
				'\x04': '\\x04',
				'\x05': '\\x05',
				'\x06': '\\x06',
				'\x07': '\\x07',
				'\x08': '\\b',
				'\t': '\\t',
				'\n': '\\n',
				'\x0B': '\\v',
				'\x0C': '\\f',
				'\r': '\\r',
				'\x0E': '\\x0E',
				'\x0F': '\\x0F',
				'\x1B': '\\e',
				'\x7F': '\\x7F',
				'\u00A0': '\\u00A0',
				'\u200B': '\\u200B',
				'\u200C': '\\u200C',
				'\u200D': '\\u200D',
				'\u2028': '\\u2028',
				'\u2029': '\\u2029',
				'\uFEFF': '\\uFEFF'
			};

			for (const [char, label] of Object.entries(invisibleChars)) {
				const regex = new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '+', 'g');
				const replacement = char === '\n'
					? `<ui-char>${label}</ui-char>\n`
					: `<ui-char>${label}</ui-char>`;
				raw = raw.replace(regex, replacement);
			}

			this.RAW.innerHTML = raw;
		}
	}

	addEntry(container, content, additional) {
		const element = document.createElement('div');

		if(content instanceof HTMLElement) {
			element.append(content);
		} else {
			element.innerHTML = content;
		}

		if(additional) {
			element.append(additional);
		}

		container.append(element);

		return element;
	}

	setGrid(container, element) {
		element.style.gridTemplateColumns	= container.parentNode.querySelector('ui-header').style.gridTemplateColumns;
	}

	createTypeBadges(data) {
		const types = data.split('|');
		const badges = [];

		types.forEach((type) => {
			badges.push(`<span class="badge">${type.replace('[]', '')}</span>`);
		});

		return badges.join(' ');
	}
}());