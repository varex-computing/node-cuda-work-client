//Dependencies
import _ from 'lodash';
import Promise from 'bluebird';
import config from 'config';
import Logger from 'winston';

//Local dependencies
import NVSMI from './lib/NVSMI';
import SocketClient from './lib/SocketClient';

//Instantiated
const PLUGIN_START = `node-cuda-`;
const PLUGIN_END = `-client-plugin`;

let socket = null;
let devices = [];
const plugins = {};

const App = class App {
	constructor() {
		throw new Error(`App is a static class and cannot be instantiated!`);
	}

	////////////////////////
	// GETTERS AND SETTERS//
	////////////////////////

	static get Plugins() {
		return plugins;
	}

	static get Devices() {
		return devices;
	}

	////////////////////
	// PUBLIC METHODS //
	////////////////////

	static start() {
		//Load plugins
		App._loadPlugins();

		return Promise.join(
			NVSMI.getDeviceList(),
		)
			.then(([deviceList]) => {
				devices = deviceList;
				App._createSocket();
			})
			.catch((err) => {
				Logger.error(`Encountered an error initializing the client`);
				throw err;
			});
	}

	////////////////////
	// PRIVATE METHODS//
	////////////////////

	static _loadPlugins() {
		const enabledPlugins = config.get(`plugins`);

		enabledPlugins.forEach((pluginName) => {
			Logger.debug(`Loading plugin ${pluginName}`);
			const moduleName = `${PLUGIN_START}${pluginName}${PLUGIN_END}`;
			const pluginModule = require(moduleName); //eslint-disable-line global-require

			plugins[pluginName] = pluginModule;
		});

		Logger.info(`Loaded ${enabledPlugins.length} plugins`);
	}

	static _createSocket() {
		socket = new SocketClient();
		socket.connect();
		socket.WorkHandler = App._handleWorkReceived;
		socket.DeviceInfoRequestHandler = App._handleDeviceRequest;
	}

	static _handleDeviceRequest() {
		Logger.info(`Sending device data to server...`);
		socket.send(`device-info`, devices.map((device) => device.getStatus()));
	}

	static _handleWorkReceived(workRequest) {

	}
};

export { App };
export default App;
