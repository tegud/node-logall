const _ = require('lodash');

const DEBUG = 'DEBUG';
const INFO = 'INFO';
const ERROR = 'ERROR';

const availableLevels = {};

availableLevels[DEBUG] = 0;
availableLevels[INFO] = 1;
availableLevels[ERROR] = 2;

let loggers = [CreateLogger({
    name: 'default',
    type: 'console',
    level: INFO
})];
let middlewares = [];

function CreateLogger(config) {
    if (!config.logger) {
        config.logger = require(`./lib/${config.type}`);
    }

    return {
        level: config.level,
        name: config.name,
        logger: new config.logger(config)
    };
}

function processMiddlewares(middlewares, logObject) {
    if (!middlewares.length) {
        return Promise.resolve(logObject);
    }

    const middleware = middlewares.shift();

    return ((() => new Promise(resolve => middleware(logObject, () => resolve())))())
        .then(() => processMiddlewares(middlewares, logObject));
}

function buildLogObject(level, module, message, data) {
    const logObject = {
        level: level,
        module: module,
        message: message,
        data: data
    };

    return processMiddlewares([...middlewares], logObject)
        .then(() => Promise.resolve(logObject));
}

function log(level, module, message, data) {
    return buildLogObject(level, module, message, data)
        .then(logObject => {
            _.chain(loggers)
                .filter(currentLogger => availableLevels[level] >= availableLevels[currentLogger.level])
                .invoke('logger', logObject)
                .value();

            return Promise.resolve();
        });
}

function buildLogger(module) {
    return _.reduce(availableLevels, (allLoggers, priority, level) => {
        allLoggers[`log${level.substring(0, 1)}${level.substring(1).toLowerCase()}`] = log.bind(undefined, level, module);

        return allLoggers;
    }, {});
}

function registerLogger(config, logger) {
    if (logger) {
        config.logger = logger;
    }

    loggers.push(CreateLogger(config));
}

function setLoggerLevel(logger, level) {
    const matchedLogger = _.chain(loggers).filter((currentLogger) => currentLogger.name === logger).first().value();

    if (!matchedLogger) {
        return;
    }

    matchedLogger.level = level;
}

function removeAll() {
    loggers = [];
    middlewares = [];
}

module.exports = _.merge({
    registerLogger: registerLogger,
    registerMiddleware: handler => middlewares.push(handler),
    removeAll: removeAll,
    setLoggerLevel: setLoggerLevel,
    log: log,
    forModule: buildLogger
},
    buildLogger());
