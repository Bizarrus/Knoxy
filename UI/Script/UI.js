(new class UI {
	Logs 		= null;
	Count	= 0;

	constructor() {
		this.Logs = document.querySelector('ui-logs ui-data');

		window.api.onLog((data) => this.onLog(data));
	}

	getTimestamp() {
		const date= new Date();
		const pad		= (n) => n.toString().padStart(2, '0');

		return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
	}

	onLog(data) {
		console.log(data);
		document.querySelector('ui-logs ui-header div:last-child').innerText = `${++this.Count} Packets`;

		const scrolling		= this.Logs.scrollTop + this.Logs.clientHeight + 20 >= this.Logs.scrollHeight;
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
			paket.innerHTML				= data.packet.replace('\0', '\\0').replace('\n', '\\n').replace('\r', '\\r');
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

		this.Logs.append(entry);

		/* Scrolling */
		if(scrolling) {
			requestAnimationFrame(() => {
				this.Logs.scrollTop = this.Logs.scrollHeight;
			});
		}
	}
}());