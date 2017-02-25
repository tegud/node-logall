const moment = require('moment');
const _ = require('lodash');

function setLevel(config, level, baseObject) {
    if (typeof config !== 'string') {
        return baseObject;
    }

    baseObject.level = level;

    return baseObject;
}

function getLogstashType(config, level) {
    if (typeof config === 'string') {
        return config;
    }

    level = level.toLowerCase();

    return config.prefix + _.get(config, `overrides.${level}`, level);
}

function mapConflictingDataProperties(data, baseObject) {
    if (!data) {
        return;
    }

    _.each(baseObject, (value, key) => {
        if (!data[key]) {
            return;
        }

        let newKey;

        if (key === '@timestamp') {
            newKey = 'additionalTimestamp';
        } else {
            newKey = `additional${key.substring(0, 1).toUpperCase()}${key.substring(1)}`;
        }

        data[newKey] = data[key];
    });

    return data;
}

function buildMessage(getType, codec, level, module, message, data) {
    return new Promise(resolve => {
        if (codec === 'oldlogstashjson') {
            if (!data) {
                data = {};
            }

            data.module = module;

            return resolve({
                '@timestamp': moment().format(),
                '@type': getType(level),
                '@message': message,
                '@fields': data
            });
        }

        const baseObject = {
            '@timestamp': moment().format(),
            type: getType(level),
            module: module,
            message: message
        };

        resolve(_.merge({}, mapConflictingDataProperties(data, baseObject), baseObject));
    });
}

module.exports = function LogstashLogger(config) {
    const send = new require(`./senders/${config.output.transport}`)(config.output);
    const getType = getLogstashType.bind(undefined, config.eventType);
    const buildMessageWithGetType = buildMessage.bind(undefined, getType, config.codec);

    return log => buildMessageWithGetType(log.level, log.module, log.message, log.data)
        .then(setLevel.bind(undefined, config.eventType, log.level))
        .then(send);
}
