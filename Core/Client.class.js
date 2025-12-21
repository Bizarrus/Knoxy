import Persistence from './Utils/Deserializer/Persistence.class.js';
import FileSystem from 'node:fs';
import Path from 'node:path';
import Process from 'node:child_process';
import OS from 'node:os';

export default class Client {
	Path			= './Cache/Client';
	Stream		= 'alpha';
	InstallDir		= null;
	Java			= null;

	constructor() {
		this.InstallDir		= Path.join(OS.homedir(), 'Knuddels-Stapp');
		// @ToDo eigenes Java über Option anbieten?
		this.Java			= Path.join(this.InstallDir, 'CommonFiles', 'Java', 'bin', 'javaw.exe');
		this.Persistence	= new Persistence();

		if(!FileSystem.existsSync(this.Path)) {
			FileSystem.mkdirSync(this.Path, { recursive: true });
		}

		/* Loading StApp Persistence */
		this.Persistence.load(Path.join(this.Path, 'persistence2.data'));
	}

	getPersistence() {
		return this.Persistence;
	}

	open(port) {
		this.Process = Process.spawn(this.Java,  [
			'-noverify',
			'-client',
			'-jar',
			Path.join(this.InstallDir, 'kjupdate.jar'),
			'localhost',
			`${port}`,
			`updstream=${this.Stream}`
		], {
			cwd:			this.Path,
			detached:		true,
			stdio:			'pipe',
			windowsHide:	false
		});

		this.Process.unref();

		this.Process.stdout.on('data', (data) => {
			console.log('[Updater]:', data.toString());
		});

		this.Process.stderr.on('data', (data) => {
			console.error('[Updater Error]:', data.toString());
		});

		this.Process.on('exit', (code) => {
			console.log('Updater beendet mit Code:', code);
		});

		return this.Process;
	}
}