(new class UI {
	Logs 			= null;
	Filter 		= [ 'chat', 'card' ];
	Requests 		= null;
	Config 		= null;
	Users 			= null;
	Count		=  {
		Packets:	0,
		Requests:	0
	};

	constructor() {
		this.Logs		= document.querySelector('section[data-name="logs"] ui-list ui-data');
		this.Requests	= document.querySelector('section[data-name="requests"] ui-list ui-data');
		this.Config		= document.querySelector('[data-name="persistence"] ui-list#config ui-data');
		this.Users		= document.querySelector('[data-name="persistence"] ui-list#users ui-data');

		[
			'onLog',
			'onWebRequest',
			'onPersistenceConfig',
			'onPersistenceUsers'
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
					case 'filter':
						let exists = this.Filter.includes(value);

						/* Toggle Filter */
						if(exists) {
							this.Filter				= this.Filter.filter((filter) => filter !== value);
							current.dataset.active 	= 'false';
						} else {
							this.Filter.push(value);
							current.dataset.active	= 'true';
						}

						document.querySelectorAll(`ui-list ui-entry[data-filter="${value}"]`).forEach((element) => {
							element.dataset.show = (!exists ? 'true' : 'false');
						})
					break;
				}
			}
		});
	}

	getTimestamp(timestamp) {
		const ts = timestamp !== undefined
			? (typeof timestamp === 'bigint' ? Number(timestamp) : timestamp)
			: Date.now();

		const date = new Date(ts);
		const pad		= (n) => n.toString().padStart(2, '0');

		return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
	}

	onLog(data) {
		console.log('Packet', data);
		document.querySelector(`section[data-name="logs"] ui-list ui-header aside`).innerText = `${++this.Count.Packets} Packets`;

		const scrolling		= this.Logs.scrollTop + this.Logs.clientHeight + 20 >= this.Logs.scrollHeight;
		const entry	= document.createElement('ui-entry');

		this.setGrid(this.Logs, entry);

		if(data.serverTyp === 'CARD') {
			entry.dataset.filter	= 'card';
			entry.dataset.show		= this.Filter.includes('card') ? 'true' : 'false';
		} else {
			entry.dataset.filter	= 'chat';
			entry.dataset.show		= this.Filter.includes('chat') ? 'true' : 'false';
		}

		if(data.typ.toUpperCase() === 'SERVER') {
			entry.dataset.type	= 'INPUT';
		} else {
			entry.dataset.type	= 'OUTPUT';
		}

		/* Time */
		this.addEntry(entry, this.getTimestamp());

		/* Session */
		this.addEntry(entry, `<small>${data.session}</small>`);

		/* Data */
		if(!data.definition) {
			if(data.serverTyp === 'CARD') {
				console.error('###');

				this.addEntry(entry, `${data.generic.Name}`); // todo
			} else {
				this.addEntry(entry, data.packet.replace('\0', '\\0').replace('\n', '\\n').replace('\r', '\\r'));
			}
		} else {
			if(data.generic) {
				this.addEntry(entry, `<strong>${data.definition.Name}</strong>: ${data.generic.Name}`);
			} else {
				this.addEntry(entry, `<strong>${data.definition.Name}</strong>`);
			}
		}

		entry.addEventListener('dblclick', () => {
			window.api.action('log', 'open', data.packet);
		});

		this.Logs.append(entry);

		/* Scrolling */
		if(scrolling) {
			requestAnimationFrame(() => {
				this.Logs.scrollTop = this.Logs.scrollHeight;
			});
		}
	}

	onWebRequest(request) {
		console.log('Request', request);
		document.querySelector(`section[data-name="requests"] ui-list ui-header aside`).innerText = `${++this.Count.Requests} Requests`;

		const entry		= document.createElement('ui-entry');
		this.setGrid(this.Requests, entry);

		/* Timestamp */
		this.addEntry(entry, request.Headers);

		this.Requests.append(entry);
	}

	onPersistenceConfig(config) {
		console.log('Config', config);

		for(const [key, val] of Object.entries(config)) {
			const entry	= document.createElement('ui-entry');
			this.setGrid(this.Config, entry);

			/* Name */
			this.addEntry(entry, key);

			/* Value */
			this.addEntry(entry, val);

			this.Config.append(entry);
		}
	}

	onPersistenceUsers(users) {
		console.log('Users', users);

		for(const [key, user] of Object.entries(users)) {
			const entry	= document.createElement('ui-entry');

			this.setGrid(this.Users, entry);

			/* Nickname */
			this.addEntry(entry, user.userContext.nick);

			/* Token */
			this.addEntry(entry, user.userContext.deviceToken || '<i>No Token</i>');

			/* Password */
			this.addEntry(entry, user.userContext.password || '<i>No Password</i>');

			/* Last Login */
			this.addEntry(entry, this.getTimestamp(user.userContext.lastLogin));

			this.Users.append(entry);
		}
	}

	addEntry(container, content) {
		const element	= document.createElement('div');
		element.innerHTML				= content;
		container.append(element);
	}

	setGrid(container, element) {
		element.style.gridTemplateColumns	= container.parentNode.querySelector('ui-header').style.gridTemplateColumns;
	}
}());