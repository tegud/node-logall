const DEBUG = "DEBUG";
const INFO = "INFO";
const ERROR = "ERROR";

const availableLevels = {};

availableLevels[DEBUG] = 0;
availableLevels[INFO] = 1;
availableLevels[ERROR] = 2;

let loggers = [
    CreateLogger({
        name: "default",
        type: "console",
        level: INFO
    })
];
let formatters = [];

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

function processFormatters(formatters, logObject) {
    if (!formatters.length) {
        return Promise.resolve(logObject);
    }

    const formatter = formatters.shift();

    return (() =>
        new Promise(resolve => formatter(logObject, () => resolve())))().then(
        () => processFormatters(formatters, logObject)
    );
}

function buildLogObject(level, module, message, data) {
    const logObject = {
        level: level,
        module: module,
        message: message,
        data: data
    };

    return processFormatters([...formatters], logObject).then(() =>
        Promise.resolve(logObject)
    );
}

function getLoggerLevel(currentLogger, logObject) {
    if (typeof currentLogger.level === "function") {
        return currentLogger.level(logObject);
    }
    return currentLogger.level;
}

function log(level, module, message, data) {
    return buildLogObject(level, module, message, data).then(logObject => {
        loggers
            .filter(
                currentLogger =>
                    availableLevels[level] >=
                    availableLevels[getLoggerLevel(currentLogger, logObject)]
            )
            .forEach(currentLogger => currentLogger.logger(logObject));

        return Promise.resolve();
    });
}

function buildLogger(module) {
    return Object.keys(availableLevels).reduce((allLoggers, level) => {
        allLoggers[
            `log${level.substring(0, 1)}${level.substring(1).toLowerCase()}`
        ] = log.bind(undefined, level, module);

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
    const matchedLoggers = loggers.filter(
        currentLogger => currentLogger.name === logger
    );

    if (!matchedLoggers.length) {
        return;
    }

    matchedLoggers[0].level = level;
}

function removeAll() {
    loggers = [];
    formatters = [];
}

module.exports = Object.assign(
    {
        registerLogger: registerLogger,
        registerFormatter: handler => formatters.push(handler),
        removeAll: removeAll,
        setLoggerLevel: setLoggerLevel,
        log: log,
        forModule: buildLogger
    },
    buildLogger()
);
