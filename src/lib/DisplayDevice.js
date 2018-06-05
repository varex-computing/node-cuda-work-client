//Dependencies
import { exec } from 'child_process';
import Logger from 'winston';
import moment from 'moment';

const DisplayDevice = class DisplayDevice {
	constructor(deviceInfo) {
		this._deviceIndex = deviceInfo.deviceIndex;
		this._model = deviceInfo.model;
		this._uuid = deviceInfo.uuid;

		this._process = null;
		this._processConfig = null;
		this._lastWorkChange = moment.now();
	}

	////////////////////////
	// GETTERS AND SETTERS//
	////////////////////////

	get DeviceIndex() {
		return this._deviceIndex;
	}

	get Model() {
		return this._model;
	}

	get UUID() {
		return this._uuid;
	}

	get WorkProcess() {
		return this._process;
	}

	get LastWorkChange() {
		return this._lastWorkChange;
	}

	////////////////////
	// PUBLIC METHODS //
	////////////////////

	startWork(processConfig) {
		//Preserve context
		const _this = this;

		if (_this._process != null && _this._processConfig != null) {
			return Promise.reject(new Error(`Failed to start work ${processConfig.name} on device ${_this._deviceIndex}: device already working`));
		}

		_this._processConfig = processConfig;
		
		return new Promise((resolve, reject) => {
			let command = processConfig.startCommand;

			if (processConfig.gpuArg == null || !processConfig.gpuArg.includes(`{GPUID}`)) {
				return reject(new Error(`Work config ${processConfig.name} has an invalid gpuArg specified.`));
			}

			//Append the gpuArg, replacing {GPUID} with this device's ID to execude only on this device
			command = `${command} ${processConfig.gpuArg.replace(`{GPUID}`, _this._deviceIndex)}`;

			//Append the arguments specified in the config
			if (processConfig.args.length > 0) {
				command = `${command} ${processConfig.args.join(` `)}`;
			}
			Logger.info(`Starting work "${processConfig.name}" on GPU ${_this._deviceIndex}`);
			Logger.debug(`Running command ${command}`);

			_this._process = exec(command, (err, stdout, stderr) => {
				if (err) {
					reject(err);
				} else {
					Logger.info(`Finished work "${processConfig.name}" on GPU ${_this._deviceIndex}`);
					resolve(stdout);
				}

				_this._process = null;
				_this._processConfig = null;
			});

			_this._lastWorkChange = moment.now();
		});
	}

	stopWork() {
		//Preserve context
		const _this = this;

		if (_this._process == null) {
			throw new Error(`Failed to stop work on device ${_this._deviceIndex}: no work process running!`);
		}
		
		Logger.info(`Attempting to end work "${_this._processConfig.name}" on device ${_this._deviceIndex}`);
		if (_this._processConfig.killSignal != null) {
			_this._process.kill(_this._processConfig.killSignal);
		} else {
			_this._process.kill();
		}
	}

	////////////////////
	// PRIVATE METHODS//
	////////////////////

	////////////////////
	// STATIC METHODS //
	////////////////////

};

export { DisplayDevice };
export default DisplayDevice;
