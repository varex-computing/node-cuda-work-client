//Dependencies
import _ from 'lodash';
import moment from 'moment';
import EventEmitter from 'events';

//Local dependencies
import App from './../App';

//Instantiated

const WorkRequest = class WorkRequest {
	constructor() {
		this._status = `received`;
		this._emitter = new EventEmitter();
	}

	////////////////////////
	// GETTERS AND SETTERS//
	////////////////////////

	get Plugin() {
		return this._plugin;
	}

	get TaskName() {
		return this._taskName;
	}

	get Priority() {
		return this._priority;
	}

	get Received() {
		return this._received;
	}

	get Started() {
		return this._started;
	}

	get Finished() {
		return this._finished;
	}

	get Status() {
		return this._status;
	}

	set StatusUpdateHandler(value) {
		if (typeof value !== `function`) {
			throw new Error(`StatusUpdateHandler must be of type function, but got "${typeof value}"`);
		}

		this._emitter.removeAllListeners(`status-update`);
		this._emitter.addListener(`status-update`, value);
	}

	set ErrorHandler(value) {
		if (typeof value !== `function`) {
			throw new Error(`ErrorHandler must be of type function, but got "${typeof value}"`);
		}

		this._emitter.removeAllListeners(`error`);
		this._emitter.addListener(`error`, value);
	}

	////////////////////
	// PUBLIC METHODS //
	////////////////////

	assignToGpu(gpuIndex) {
		//Preserve context
		const _this = this;
		
		const gpu = App.Devices.find((device) => device.DeviceIndex === gpuIndex);
		const processConfig = WorkRequest.getProcessConfig(_this);

		_this._updateStatus(`started`);
		_this._started = moment.now();

		gpu.startWork(processConfig)
			.then(() => {
				_this._updateStatus(`finished`);
				_this._finished = moment.now();
			})
			.catch((err) => {
				_this._handleError(err);
			});
	}

	////////////////////
	// PRIVATE METHODS//
	////////////////////

	_updateStatus(status) {
		//Preserve context
		const _this = this;
		
		_this._status = status;
		_this._emitter.emit(`status-update`, _this);
	}

	_handleError(err) {
		//Preserve context
		const _this = this;
		
		_this._emitter.emit(`error`, err);
		_this._updateStatus(`error`);
	}

	////////////////////
	// STATIC METHODS //
	////////////////////

	static fromString(workString) {
		const requestData = JSON.parse(workString);
		const request = new WorkRequest();

		if (!_.has(App.Plugins, requestData.plugin)) {
			throw new Error(`Server requested work for plugin ${requestData.plugin} but that plugin is not loaded on this client!`);
		}

		request._plugin = App.Plugins[requestData.plugin];
		request._taskName = requestData.task;
		request._priority = request._plugin.Config.priority;
		
		request._received = moment.now();

		return request;
	}

	static getProcessConfig(workRequest) {
		const taskConfig = workRequest.Plugin.Tasks[workRequest.TaskName];
		const processConfig = {
			name: workRequest._taskName,
			startCommand: taskConfig.Command,
			gpuArg: taskConfig.GpuArg,
			args: taskConfig.Args,
		};

		return processConfig;
	}
};

export { WorkRequest };
export default WorkRequest;
