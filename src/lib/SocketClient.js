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

	set DeviceInfoRequestHandler(value) {
		if (typeof value !== `function`) {
			throw new Error(`DeviceInfoRequestHandler must be of type function, but got "${typeof value}"`);
		}

		this._emitter.removeAllListeners(`device-info-requested`);
		this._emitter.addListener(`device-info-requested`, value);
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

	send(eventName, data) {
		// preserve context
		const _this = this;
		
		if (_this.Connected !== true) {
			throw new Error(`Socket is not connected and is unable to send message to server.`);
		}

		if (data != null) {
			_this._socket.emit(eventName, data);
		} else {
			_this._socket.emit(eventName);
		}
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

		socket.on(`disconnect`, () => {
			Logger.info(`Lost connection to server`);
			_this._connected = false;
		});

		socket.on(`device-request`, () => {
			Logger.info(`Server requesting device info`);
			_this._emitter.emit(`device-info-requested`);
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
