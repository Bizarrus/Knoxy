# Knoxy
Knuddels Proxy only in JavaScript with integrated inspectors and plugin management, can be used for botting, analyzing, reverse engineering and some more.

#### Features
- Bypasses the (fake) security mechanism with their fake end-to-end decryption (defined by themselves as “our highest security standards”).
- Plugin-System to hook into network packets
- Packet inspector

# Installation
> npm install

# Start Proxy-Server
> npm run proxy

# Start Knuddels-Client
> [!NOTE]
> Knuddels StandaloneApp must be installed

> npm run client

# Plugins-API
All plugins can be found in the plugins folder.

If you want to create a plugin, you can use two different ways:
1. Single-File (`/Plugins/<YourPluginName>.js`)
2. Multi-File (`/Plugins/<YourPluginName>/<YourPluginName>.js` or `/Plugins/<YourPluginName/main.js`)

The main-plugin files must be implemented the `Plugin` class, the Name of the class must be the same as the file/folder name.
```!javascript
// If you using single-file-plugins
import Plugin from '../Core/Plugin.class.js';
// If you using a plugin with an folder
import Plugin from '../../Core/Plugin.class.js';

export default class  extends Plugin {
    constructor() {
		super(); // Required to call the super-constructor!
	}
	
	onInit() {
	
	}

	onDestroy() {
	
	}

	onPacket(packet) {
		/*
		    Here you can modify/inspect the packet.
		    If you return "null" the packet will be ignored.    
		*/
		
		return packet;
	}

	onCommand(command, args) {
		/*
		    Will be called, when a chat-command (/<command> <args>) is executed by the client.
		    If you return "true" the command, the command will not forwarded to the server.
		*/
		
	    return false;
	}
```