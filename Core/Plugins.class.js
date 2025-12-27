/**
 * @author  Bizarrus
 **/
import FileSystem from 'node:fs/promises';
import Path from 'node:path';

export default class Plugins {
	Plugins = new Map();

	constructor() {
		this.init();
	}

	async init() {
		console.log('[Plugins] Initialize...');

		try {
			const plugins = await FileSystem.readdir('./Plugins');

			const loadPromises = plugins.map(async (name) => {
				const paths = [
					Path.resolve('./Plugins', name, 'main.js'),
					Path.resolve('./Plugins', name, name + '.js'),
					Path.resolve('./Plugins', name)
				];

				let validPath = null;

				for(const path of paths) {
					try {
						await FileSystem.access(path);
						validPath = path;
						break;
					} catch {
						/* Do Nothing */
					}
				}

				if(!validPath) {
					console.error('[Plugins]', 'Can\'t find Plugin-Class from', name);
					return;
				}

				try {
					const Clazz			= await import('file:///' + validPath);
					const instance		= new Clazz.default(this);

					this.Plugins.set(name, instance);

					console.warn('[Plugins]', 'Initialized', name);
				} catch(error) {
					console.error('[Plugins]', 'Error loading', name, error);
				}
			});

			await Promise.all(loadPromises);
			console.log('[Plugins]', 'All plugins loaded');
		} catch(error) {
			console.error('[Plugins]', 'Error on Plugins-Loader:', error);
		}
	}

	onPacket(packet, definition) {
		for(const [name, plugin] of this.Plugins) {
			if(plugin.isEnabled() && typeof(plugin.onPacket) === 'function') {
				packet = plugin.onPacket(packet, definition);
			}
		}

		return packet;
	}

	onGeneric(packet) {
		for(const [name, plugin] of this.Plugins) {
			if(plugin.isEnabled() && typeof(plugin.onGeneric) === 'function') {
				packet = plugin.onGeneric(packet);
			}
		}

		return packet;
	}

	onRequest(id, data) {
		for(const [name, plugin] of this.Plugins) {
			if(plugin.isEnabled() && typeof(plugin.onRequest) === 'function') {
				if(!plugin.onRequest(id, data)) {
					return null;
				}
			}
		}

		return data;
	}

	onResponse(id, data) {
		for(const [name, plugin] of this.Plugins) {
			if(plugin.isEnabled() && typeof(plugin.onResponse) === 'function') {
				if(!plugin.onResponse(id, data)) {
					return null;
				}
			}
		}

		return data;
	}
}