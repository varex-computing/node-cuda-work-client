//Dependencies
import _ from 'lodash';
import Logger from 'winston';

//Read config
import config from 'config';

//Specify global logging options
const logConfig = config.get(`logging`);
if (logConfig.filename != null && _.trim(logConfig.filename).length > 0) {
	Logger.add(Logger.transports.File, { filename: logConfig.filename });
}

export { App } from './App';
