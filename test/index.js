var should = require('should');
var proxyquire = require('proxyquire');
var logging = proxyquire('../index', {
	'./lib/console': FakeLogger
});
var _ = require('lodash');
var moment = require('moment');

var loggedItems = [];

function FakeLogger() {
	return log => loggedItems.push(log)
}

describe('logall', () => {
	beforeEach(() => {
		loggedItems = [];
		logging.removeAll();
	});

	function registerLogger(...args) {
		logging.registerLogger(...args);

		return Promise.resolve();
	}

	function forModule(module) {
		return Promise.resolve(logging.forModule(module));
	}

	function setLogLevel(...args) {
		logging.setLoggerLevel(...args);

		return Promise.resolve();
	}

	function registerMiddleware(middleware) {
		logging.registerMiddleware(middleware);

		return Promise.resolve();
	}

	describe('externally defined logging module', () => {
		it('matching log level is logged', () => registerLogger({ level: 'INFO' }, FakeLogger)
			.then(() => logging.log('INFO', undefined, 'TEST MESSAGE'))
			.then(() => Promise.resolve(loggedItems[0].message))
			.should.eventually.eql('TEST MESSAGE'));

		it('lower log level is not logged', () => registerLogger({ level: 'INFO' }, FakeLogger)
			.then(() => logging.log('DEBUG', undefined, 'TEST MESSAGE'))
			.then(() => Promise.resolve(loggedItems.length))
			.should.eventually.eql(0));

		it('higher log level is logged', () => registerLogger({ level: 'INFO' }, FakeLogger)
			.then(() => logging.log('ERROR', undefined, 'TEST MESSAGE'))
			.then(() => Promise.resolve(loggedItems[0].message))
			.should.eventually.eql('TEST MESSAGE'));

		it('logs info', () => registerLogger({ level: 'INFO' }, FakeLogger)
			.then(() => logging.logInfo('TEST MESSAGE'))
			.then(() => Promise.resolve(loggedItems[0].level))
			.should.eventually.eql('INFO'));

		it('logs debug', () => registerLogger({ level: 'DEBUG' }, FakeLogger)
			.then(() => logging.logDebug('TEST MESSAGE'))
			.then(() => Promise.resolve(loggedItems[0].level))
			.should.eventually.eql('DEBUG'));

		it('logs error', () => registerLogger({ level: 'INFO' }, FakeLogger)
			.then(() => logging.logError('TEST MESSAGE'))
			.then(() => Promise.resolve(loggedItems[0].level))
			.should.eventually.eql('ERROR'));
	});

	describe('built in logging module', () => {
		it('matching log level is logged', () => registerLogger({ level: 'INFO', type: 'console' })
			.then(() => logging.log('INFO', undefined, 'TEST MESSAGE'))
			.then(() => Promise.resolve(loggedItems[0].message))
			.should.eventually.eql('TEST MESSAGE'));
	});

	describe('forModule', () => {
		it('sets module name', () => registerLogger({ level: 'INFO', type: 'console' })
			.then(() => forModule('TEST MODULE'))
			.then(logging => logging.logInfo('TEST MESSAGE'))
			.then(() => Promise.resolve(loggedItems[0].module))
			.should.eventually.eql('TEST MODULE'));

		it('logs info', () => registerLogger({ level: 'DEBUG', type: 'console' })
			.then(() => forModule('TEST MODULE'))
			.then(logging => logging.logInfo('TEST MESSAGE'))
			.then(() => Promise.resolve(loggedItems[0].level))
			.should.eventually.eql('INFO'));

		it('logs debug', () => registerLogger({ level: 'DEBUG', type: 'console' })
			.then(() => forModule('TEST MODULE'))
			.then(logging => logging.logDebug('TEST MESSAGE'))
			.then(() => Promise.resolve(loggedItems[0].level))
			.should.eventually.eql('DEBUG'));

		it('logs error', () => registerLogger({ level: 'DEBUG', type: 'console' })
			.then(() => forModule('TEST MODULE'))
			.then(logging => logging.logError('TEST MESSAGE'))
			.then(() => Promise.resolve(loggedItems[0].level))
			.should.eventually.eql('ERROR'));
	});

	describe('setLoggerLevel', () => {
		it('modifies the specified logger\'s level', () => registerLogger({ level: 'INFO', type: 'console', name: 'default' })
			.then(() => setLogLevel('default', 'DEBUG'))
			.then(() => logging.log('DEBUG', undefined, 'TEST MESSAGE'))
			.then(() => Promise.resolve(loggedItems[0].message))
			.should.eventually.eql('TEST MESSAGE'));
	});

	it('log sets data', () => registerLogger({ level: 'INFO', type: 'console', name: 'default' })
		.then(() => logging.log('INFO', undefined, 'TEST MESSAGE', { a: 1 }))
		.then(() => Promise.resolve(loggedItems[0].data))
		.should.eventually.eql({ a: 1 }));

	describe('registerMiddleware', () => {
		it('executes specified middleware when logging', () => registerLogger({ level: 'INFO', type: 'console' })
			.then(() => registerMiddleware((log, next) => {
				if(!log.data) {
					log.data = {};
				}

				log.data.x = 1;

				next();
			}))
			.then(() => logging.log('INFO', undefined, 'TEST MESSAGE', { a: 1 }))
			.then(() => Promise.resolve(loggedItems[0].data.x))
			.should.eventually.eql(1));
	});
});
