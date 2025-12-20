(new class UI {
	ChatLogs 	= null;
	CardLogs 	= null;
	Config 	= null;
	Users 		= null;
	Count	= 0;

	constructor() {
		this.ChatLogs	= document.querySelector('section[data-name="chatLogs"] ui-list ui-data');
		this.CardLogs	= document.querySelector('section[data-name="cardLogs"] ui-list ui-data');
		this.Config		= document.querySelector('[data-name="persistence"] ui-list#config ui-data');
		this.Users		= document.querySelector('[data-name="persistence"] ui-list#users ui-data');

		window.api.onLog((data) => this.onLog(data));
		window.api.onPersistenceConfig((data) => this.onPersistenceConfig(data));
		window.api.onPersistenceUsers((data) => this.onPersistenceUsers(data));
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
		document.querySelector(`section[data-name="${data.serverTyp.toLowerCase()}Logs"] ui-list ui-header div:last-child`).innerText = `${++this.Count} Packets`;

		const scrolling		= this.ChatLogs.scrollTop + (data.serverTyp === 'CARD' ? this.CardLogs : this.ChatLogs).clientHeight + 20 >= (data.serverTyp === 'CARD' ? this.CardLogs : this.ChatLogs).scrollHeight;
		const entry	= document.createElement('ui-entry');

		if(data.typ.toUpperCase() === 'SERVER') {
			entry.dataset.type				= 'INPUT';
		} else {
			entry.dataset.type				= 'OUTPUT';
		}

		/* Time */
		const timestamp	= document.createElement('div');
		timestamp.innerHTML				= this.getTimestamp();
		entry.append(timestamp);

		/* Session */
		const session 	= document.createElement('div');
		session.innerHTML 				= `<small>${data.session}</small>`;
		entry.append(session);

		/* Data */
		const paket		= document.createElement('div');

		if(!data.definition) {
			if(data.serverTyp === 'CARD') {
				console.error('###');
				paket.innerHTML				+= `${data.generic.Name}`; // todo
			} else {
				paket.innerHTML				= data.packet.replace('\0', '\\0').replace('\n', '\\n').replace('\r', '\\r');
			}
		} else {
			paket.innerHTML 			= `<strong>${data.definition.Name}</strong>`;

			if(data.generic) {
				paket.innerHTML			+= `: ${data.generic.Name}`;
			}
		}

		entry.append(paket);

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

	onPersistenceConfig(config) {
		console.log('Config', config);

		for(const [key, val] of Object.entries(config)) {
			const entry	= document.createElement('ui-entry');

			/* Name */
			const name	= document.createElement('div');
			name.innerHTML				= key;
			entry.append(name);

			/* Value */
			const value	= document.createElement('div');
			value.innerHTML				= val;
			entry.append(value);

			this.Config.append(entry);
		}
	}

	onPersistenceUsers(users) {
		console.log('Users', users);

		for(const [key, user] of Object.entries(users)) {
			const entry	= document.createElement('ui-entry');

			/* Nickname */
			const name	= document.createElement('div');
			name.innerHTML				= user.userContext.nick;
			entry.append(name);

			/* Token */
			const token	= document.createElement('div');
			token.innerHTML				= user.userContext.deviceToken || '<i>No Token</i>';
			entry.append(token);

			/* Password */
			const password	= document.createElement('div');
			password.innerHTML				= user.userContext.password || '<i>No Password</i>';
			entry.append(password);

			/* Last Login */
			const lastLogin	= document.createElement('div');
			lastLogin.innerHTML				= this.getTimestamp(user.userContext.lastLogin);
			entry.append(lastLogin);

			this.Users.append(entry);
		}
	}
}());