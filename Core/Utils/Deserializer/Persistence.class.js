import FileSystem from 'node:fs';
import { ObjectInputStream } from 'java-object-serialization';
import JavaArrayList from './Objects/JavaArrayList.class.js';
import JavaHashMap from './Objects/JavaHashMap.class.js';
import JavaBoolean from './Objects/JavaBoolean.class.js';
import JavaInteger from './Objects/JavaInteger.class.js';
import KnUserContext from './Objects/Knuddels/KnUserContext.class.js';
import KnServerSettings from './Objects/Knuddels/KnServerSettings.class.js';
import JavaEnum from './Objects/JavaEnum.class.js';

export default class Persistence {
	Types = {
		'java.util.ArrayList:8683452581122892189':		JavaArrayList,
		'java.util.HashMap:362498820763181265': 		JavaHashMap,
		'java.lang.Boolean:14780939874695183086': 		JavaBoolean,
		'java.lang.Integer:1360826667806852920': 		JavaInteger,
		'java.lang.Enum:0': 							JavaEnum,
		'base.UserContext:2688112087435020417': 		KnUserContext,
		'base.KnServerSettings:0':					 	KnServerSettings,
	};
	Config	= {};
	Users	= [];

	constructor() {
		for(const [className, type] of Object.entries(this.Types)) {
			const [name, serial] = className.split(':');
			ObjectInputStream.RegisterObjectClass(type, name, serial);
		}
	}

	load(file) {
		const buffer		= FileSystem.readFileSync(file);
		const stream	= new ObjectInputStream(buffer);
		const object					= stream.readObject();

		if(object.fields.has('persistence')) {
			for(const [key, value] of object.fields.get('persistence')) {
				if(key === null) {
					this.Config = this.#cleanObject(value.get(null));
				} else {
					for (const [nickname, data] of value) {
						this.Users.push({
							nickname,
							...this.#cleanObject(data)
						});
					}
				}
			}
		}
	}

	getConfig() {
		return this.Config;
	}

	getUsers() {
		return this.Users;
	}

	#cleanObject(object) {
		/* Maps */
		if(object instanceof Map) {
			const result = {};

			for(const [key, value] of object) {
				result[key] = this.#cleanObject(value);
			}

			return result;
		}

		/* Arrays */
		if(Array.isArray(object)) {
			return object.map(item => this.#cleanObject(item));
		}

		/* Enums */
		if(object && typeof(object) === 'object' && object.enumConstantName) {
			return object.enumConstantName;
		}

		/* Classes */
		if(object && typeof(object) === 'object' && object.constructor.name !== 'Object') {
			const cleaned = {};

			for(const [key, value] of Object.entries(object)) {
				if(!key.startsWith('_') && key !== 'constructor') {
					cleaned[key] = this.#cleanObject(value);
				}
			}

			return cleaned;
		}

		return object;
	}
}