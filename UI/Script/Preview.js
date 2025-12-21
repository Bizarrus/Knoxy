(new class Preview {
	RAW = null;

	constructor() {
		this.RAW		= document.querySelector('section[data-name="raw"] ui-scroll');

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
						window.api.toggleDevTools();
					break;
				}
			}
		});
	}

	onLog(raw) {
		// @ToDo add more characters
		raw = raw.replace(/[\0]+/g, '<ui-char>\\0</ui-char>');
		raw = raw.replace(/[\r]+/g, '<ui-char>\\r</ui-char>');
		raw = raw.replace(/[\n]+/g, '<ui-char>\\n</ui-char>\n');

		this.RAW.innerHTML = raw;
	}
}());