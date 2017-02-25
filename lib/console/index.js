const moment = require('moment');
const _ = require('lodash');
const writeToConsole = require('./writeToConsole');

function generateDataText(data) {
    if (!data) {
        return '';
    }

    const kvpStrings = _.chain(data).map((value, key) => {
        if (!value) {
            return;
        }

        return `${key}: ${value}`;
    }).filter(value => value).value();

    if (!kvpStrings.length) {
        return;
    }

    return `, ${kvpStrings.join(', ')}`;
}

module.exports = function ConsoleLogger() {
    return log => {
        const moduleString = log.module ? ` [${log.module}]` : '';
        return writeToConsole(`[${moment().format()}] [${log.level}]${moduleString} ${log.message}${generateDataText(log.data)}`);
    };
}
