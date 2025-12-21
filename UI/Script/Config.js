(new class Preview {
	constructor() {
		[
			'onClientConfig',
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
					case 'form':
						console.log('Form', value);
						//<form data-action="config:save">
						switch(value) {
							case 'save':
								// Fetch form data -> to JSON -> send to IPC
							break;
							case 'cancel':
								// Close window
							break;
						}
					break;
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

	onClientConfig(config) {
		console.log('Config', config);

		for(const [name, value] of Object.entries(config)) {
			let element = document.querySelector(`[name="${name}"]`);

			if(element instanceof HTMLInputElement) {
				element.value = value;
			} else if(element instanceof HTMLSelectElement) {
				element.value = value;
			} else if(element instanceof HTMLTextAreaElement) {
				element.value = value;
			} else {
				console.warn('Unknown element type:', element);
			}
		}
	}
}());