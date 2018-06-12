//Dependencies
import _ from 'lodash';
import Promise from 'bluebird';
import Logger from 'winston';
import config from 'config';
import { exec } from 'child_process';

//Local dependencies
import DisplayDevice from './DisplayDevice';

//Instantiated
const nvsmiPath = config.get(`paths`).nvsmi;

const NVSMI = class NVSMI {
	constructor() {
		throw new Error(`NVSMI is a static class and cannot be instantiated!`);
	}

	////////////////////
	// PUBLIC METHODS //
	////////////////////

	static getDeviceList() {
		return NVSMI._execNvsmi([`-L`])
			.then((deviceBlockList) => {
				//Trim string, remove newlines, split the info block into an array of device info strings
				const rawDeviceInfoStrings = _.trim(deviceBlockList).split(`\r\n`).join(`\n`).split(`\n`);

				//Create DisplayDevice objects using the info strings
				const formattedDevices = rawDeviceInfoStrings.map((deviceInfoString) => new DisplayDevice(NVSMI._parseInfoString(deviceInfoString)));

				return Promise.resolve(formattedDevices);
			})
			.catch((err) => {
				Logger.error(`Encountered an error getting CUDA device list`);
				return Promise.reject(err);
			});
	}

	////////////////////
	// PRIVATE METHODS//
	////////////////////

	static _execNvsmi(args) {
		return new Promise((resolve, reject) => {
			let command = nvsmiPath;
			if (args.length > 0) {
				command = `${command} ${args.join(` `)}`;
			}

			exec(command, (err, stdout, stderr) => {
				if (err) {
					reject(err);
				} else {
					resolve(stdout);
				}
			});
		});
	}

	static _parseInfoString(infoString) {
		//Preserve context
		const _this = this;
		
		//Info strings should start with "GPU X:" where X is the device number
		//To get the index, slice the string from the 4th character to the first colon, and parse the resulting int
		const deviceIndex = parseInt(infoString.slice(4, infoString.indexOf(`:`)));

		//After the index portion, the device model string occurres between the first colon and "(UUID"
		const modelStartIndex = infoString.indexOf(`:`) + 2;
		const modelEndIndex = infoString.indexOf(`(`) - 1;

		const model = infoString.slice(modelStartIndex, modelEndIndex);

		//The device uuid occurrs between the "UUID:" portion and the closing parenthesis
		const uuidStartIndex = infoString.lastIndexOf(`:`) + 2;
		const uuidEndIndex = infoString.indexOf(`)`);

		const uuid = infoString.slice(uuidStartIndex, uuidEndIndex);

		return {
			deviceIndex,
			model,
			uuid,
		};
	}
};

export { NVSMI };
export default NVSMI;
