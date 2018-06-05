//Dependencies
import config from 'config';
import io from 'socket.io-client';
import Logger from 'winston';
import EventEmitter from 'events';

//Local dependencies
import WorkRequest from './WorkRequest';

//Instantiated
const networkOptions = config.get(`network`);

const SocketClient = class SocketClient {
	constructor() {
		this._connected = false;
		this._socket = null;
		this._emitter = new EventEmitter();
	}

	////////////////////////
	// GETTERS AND SETTERS//
	////////////////////////

	get Connected() {
		return this._connected;
	}

	set WorkHandler(value) {
		if (typeof value !== `function`) {
			throw new Error(`WorkHandler must be of type function, but got "${typeof value}"`);
		}

		this._emitter.removeAllListeners(`work-received`);
		this._emitter.addListener(`work-received`, value);
	}

	////////////////////
	// PUBLIC METHODS //
	////////////////////

	connect() {
		//Preserve context
		const _this = this;
		
		_this._socket = io(networkOptions.serverUri);
		_this._setSocketHandlers();
	}

	////////////////////
	// PRIVATE METHODS//
	////////////////////

	_setSocketHandlers() {
		//Preserve context
		const _this = this;
		
		const socket = _this._socket;

		socket.on(`connect`, () => {
			Logger.info(`Connected to server at ${networkOptions.serverUri}`);
			_this._connected = true;
		});

		socket.on(`work`, (workDataString) => {
			Logger.debug(`Received new work request from server`);
			const workRequest = WorkRequest.fromString(workDataString);
			_this._emitter.emit(`work-received`, workRequest);
		});
	}
};

export { SocketClient };
export default SocketClient;
