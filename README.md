<p align="center">
  <img width="200" height="200" src="UI/Assets/Logo.png" />
</p>

Knuddels Proxy only in JavaScript with integrated inspectors and plugin management, can be used for botting, analyzing, reverse engineering and some more.

#### Features
- Bypasses the (fake) security mechanism with their fake end-to-end decryption (defined by themselves as “our highest security standards”).
- Plugin-System to hook into network packets
- Packet inspector
- Java + Client-Version selector
- HTTP(s)-Request inspector
- Persistence inspector (internal database)

#### Plugin-Features
- [ ] Blocking tracking/advertising requests
- [ ] Remove Client-Blocking (if your account was banned)
- [ ] Image downloader
- [ ] Inject own data/commands into chat
- [ ] Fake private chats/rooms for screenshots

![](Screenshots/Preview.png?v3)

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
```javascript
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

	onPacket(packet, definition) {
		/*
		    Here you can modify/inspect the packet.
		    If you return "null" the packet will be ignored.    
		*/
		
		return packet;
	}

	onGeneric(packet) {
		/*
		    Here you can modify/inspect the packet of the generic protocol.
		    If you return "null" the packet will be ignored.    
		*/

		return packet;
	}

	onRequest(id, request) {
		/*
			All HTTP(s)-Requests will be hooked into this method.
		    If you return "false" the request will be ignored. Good for blocking tracking/advertising requests.
		*/
		return true;
	}

	onResponse(id, response) {
		/*
		 All HTTP(s)-Responses will be hooked into this method.
		 If you return "false" the request will be ignored. Good for blocking tracking/advertising requests.
		 */
		return true;
	}

	onCommand(command, args) {
		/*
		    Will be called, when a chat-command (/<command> <args>) is executed by the client.
		    If you return "true" the command, the command will not forwarded to the server.
		*/
		
	    return false;
	}
```
