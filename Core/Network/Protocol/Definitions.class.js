import FileSystem from 'node:fs/promises';
import Path from 'node:path';
import Definition from '../../Utils/Definition.class.js';

export default (new class Definitions {
	Ready	= false;
	Input	= {};
	Output	= {};
	
	constructor() {
		this.load().then(() => {
			this.Ready = true;
		}).catch((error) => {
			console.log('[ERROR]', error);
		});
	}
	
	load() {
		return new Promise((success, failure) => {
			[
				'Input',
				'Output'
			].forEach((target) => {
				let path	= Path.join('./Data/Definitions', target);
				
				FileSystem.readdir(path).then((files) => {
					let loaded = [];
					
					files.forEach((name) => {
						let file = Path.resolve(path, name);
						
						loaded.push(import('file:///' + file, {
							with: {
								type: 'json'
							}
						}).then((json) => {
							this[target][json.default.opcode] = new Definition(Path.basename(Path.basename(name), Path.extname(name)), json.default);
						}).catch(failure));
					});
					
					setTimeout(() => {
						Promise.all(loaded).then(success).catch(failure);
					}, 500);
				}).catch(failure);
			});
		});
	}
	
	isReady() {
		return this.Ready;
	}
	
	exists(target, opcode) {
		return (typeof(this[target][opcode]) !== 'undefined');
	}
	
	get(target, opcode) {
		if(!this.exists(target, opcode)) {
			return null;
		}
		
		return this[target][opcode];
	}
	
	resolve(target, opcode, parts) {
		if(!this.exists(target, opcode)) {
			return null;
		}
					
		let definition	= this.get(target, opcode);
		
		if(definition === null) {
			return null;
		}
		
		return definition.fill(parts);
	}
}());