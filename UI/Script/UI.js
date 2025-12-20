(new class UI {
	ChatLogs 		= null;
	CardLogs 		= null;
	Requests 		= null;
	Config 		= null;
	Users 			= null;
	Count		= 0;
	CountRequests= 0;

	constructor() {
		this.ChatLogs	= document.querySelector('section[data-name="chatLogs"] ui-list ui-data');
		this.CardLogs	= document.querySelector('section[data-name="cardLogs"] ui-list ui-data');
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
		document.querySelector(`section[data-name="${data.serverTyp.toLowerCase()}Logs"] ui-list ui-header aside`).innerText = `${++this.Count} Packets`;

		const scrolling		= this.ChatLogs.scrollTop + (data.serverTyp === 'CARD' ? this.CardLogs : this.ChatLogs).clientHeight + 20 >= (data.serverTyp === 'CARD' ? this.CardLogs : this.ChatLogs).scrollHeight;
		const entry	= document.createElement('ui-entry');

		this.setGrid((data.serverTyp === 'CARD' ? this.CardLogs : this.ChatLogs), entry);

		if(data.typ.toUpperCase() === 'SERVER') {
			entry.dataset.type				= 'INPUT';
		} else {
			entry.dataset.type				= 'OUTPUT';
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
			window.api.openLog(data.packet);
		});

		(data.serverTyp === 'CARD' ? this.CardLogs : this.ChatLogs).append(entry);

		/* Scrolling */
		if(scrolling) {
			requestAnimationFrame(() => {
				(data.serverTyp === 'CARD' ? this.CardLogs : this.ChatLogs).scrollTop = (data.serverTyp === 'CARD' ? this.CardLogs : this.ChatLogs).scrollHeight;
			});
		}
	}

	onWebRequest(request) {
		console.log('Request', request);
		document.querySelector(`section[data-name="requests"] ui-list ui-header aside`).innerText = `${++this.CountRequests} Requests`;

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