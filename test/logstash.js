var should = require('should');
var proxyquire = require('proxyquire');
var dgram = require('dgram');
var net = require('net');
var logstashLogger = proxyquire('../lib/logstash', {
	'moment': () => {
		return {
			format: () => {
				return formattedDateTime;
			}
		};
	}
});
var _ = require('lodash');
var moment = require('moment');
var formattedDateTime;

describe('Logstash Logger', () => {
	describe('logs to udp', () => {
		it('formatted event is sent', done => {
			var logger = new logstashLogger({
				output: {
					transport: 'udp',
					host: '127.0.0.1',
					port: 9990
				},
				eventType: 'test_type'
			});

			var udpClient = dgram.createSocket("udp4");

			udpClient.bind(9990);

			udpClient.on("message", function messageReceived(msg) {
				var data = msg.toString('utf-8');
				var parsedData = JSON.parse(data);

				parsedData.should.eql({
					type: 'test_type',
					level: 'INFO',
					message: 'TEST MESSAGE'
				});

				udpClient.close();

				done();
			});

			logger({ level: 'INFO', message: 'TEST MESSAGE' });
		});
	});

	describe.skip('logs to tcp', () => {
		it('formatted event is sent', done => {
			var logger = new logstashLogger({
				output: {
					transport: 'tcp',
					host: '127.0.0.1',
					port: 9991
				},
				eventType: 'test_type'
			});

			var server = net.createServer(function(socket) {
				console.log('Client connected...')

				socket.on('data', function (msg) {
					console.log('DATA REC');
					var data = msg.toString('utf-8');
					var parsedData = JSON.parse(data);

					parsedData.should.eql({
						type: 'test_type',
						message: 'TEST MESSAGE'
					});

					server.close();

					done();
				});
			});

			server.on('error', function (e) {
				console.log('ERROR!!! ' + e.code);
			});

			server.listen(9991, '0.0.0.0', () => {
				console.log('listening...');
			});

			setTimeout(() => {
				console.log('Sending...');
				logger('INFO', undefined, 'TEST MESSAGE');
			}, 1000)
		});
	});

	describe('type can be defined by level', () => {
		var udpClient;

		beforeEach(() => {
			udpClient = dgram.createSocket("udp4");

			udpClient.bind(9990);
		});

		afterEach(() => {
			udpClient.close();
		});

		it('type prefix is prepended to lower case level', done => {
			var logger = new logstashLogger({
				output: {
					transport: 'udp',
					host: '127.0.0.1',
					port: 9990
				},
				eventType: {
					prefix: 'test_type_'
				}
			});

			udpClient.on("message", function messageReceived(msg) {
				var data = msg.toString('utf-8');
				var parsedData = JSON.parse(data);

				parsedData.should.eql({
					type: 'test_type_info',
					message: 'TEST MESSAGE'
				});


				done();
			});

			logger({ level: 'INFO', message: 'TEST MESSAGE' });
		});

		it('sets level', done => {
			var logger = new logstashLogger({
				output: {
					transport: 'udp',
					host: '127.0.0.1',
					port: 9990
				},
				eventType: {
					prefix: 'test_type_'
				}
			});

			udpClient.on("message", function messageReceived(msg) {
				var data = msg.toString('utf-8');
				var parsedData = JSON.parse(data);

				parsedData.should.eql({
					type: 'test_type_error',
					message: 'TEST MESSAGE'
				});

				done();
			});

			logger({ level: 'ERROR', message: 'TEST MESSAGE' });
		});

		it('sets level specific override', done => {
			var logger = new logstashLogger({
				output: {
					transport: 'udp',
					host: '127.0.0.1',
					port: 9990
				},
				eventType: {
					prefix: 'test_type_',
					overrides: {
						'error': 'errors'
					}
				}
			});

			udpClient.on("message", function messageReceived(msg) {
				var data = msg.toString('utf-8');
				var parsedData = JSON.parse(data);

				parsedData.should.eql({
					type: 'test_type_errors',
					message: 'TEST MESSAGE'
				});

				done();
			});

			logger({ level: 'ERROR', message: 'TEST MESSAGE' });
		});

		it('sets level property when type is string literal', done => {
			var logger = new logstashLogger({
				output: {
					transport: 'udp',
					host: '127.0.0.1',
					port: 9990
				},
				eventType: 'mytype'
			});

			udpClient.on("message", function messageReceived(msg) {
				var data = msg.toString('utf-8');
				var parsedData = JSON.parse(data);

				parsedData.should.eql({
					type: 'mytype',
					level: 'ERROR',
					message: 'TEST MESSAGE'
				});

				done();
			});

			logger({ level: 'ERROR', message: 'TEST MESSAGE' });
		});
	});

	describe('json codec', () => {
		var udpClient;
		var logger;

		beforeEach(() => {
			udpClient = dgram.createSocket("udp4");

			udpClient.bind(9990);

			logger = new logstashLogger({
				output: {
					transport: 'udp',
					host: '127.0.0.1',
					port: 9990
				},
				eventType: 'test_type'
			});

			formattedDateTime = '';
		});

		afterEach(() => {
			udpClient.close();
		});

		function handleMessage(done, expectation, msg) {
			var data = msg.toString('utf-8');
			var parsedData = JSON.parse(data);

			expectation(parsedData);

			done();
		}

		it('sets type', done => {
			udpClient.on("message", handleMessage.bind(undefined, done, function(parsedData) {
				parsedData.type.should.eql('test_type');
			}));

			logger({ level: 'ERROR', module: 'TEST MESSAGE' });
		});

		it('sets @timestamp', done => {
			formattedDateTime = '2015-07-02T19:06:56.078Z';

			udpClient.on("message", handleMessage.bind(undefined, done, function(parsedData) {
				parsedData['@timestamp'].should.eql('2015-07-02T19:06:56.078Z');
			}));

			logger({ level: 'ERROR', message: 'TEST MESSAGE' });
		});

		it('sets message', done => {
			udpClient.on("message", handleMessage.bind(undefined, done, function(parsedData) {
				parsedData.message.should.eql('TEST MESSAGE');
			}));

			logger({ level: 'ERROR', message: 'TEST MESSAGE' });
		});

		it('sets module', done => {
			udpClient.on("message", handleMessage.bind(undefined, done, function(parsedData) {
				parsedData.module.should.eql('TEST MODULE');
			}));

			logger({ level: 'ERROR', module: 'TEST MODULE', message: 'TEST MESSAGE' });
		});

		it('sets additionalProperties', done => {
			udpClient.on("message", handleMessage.bind(undefined, done, function(parsedData) {
				parsedData.a.should.eql(1);
			}));

			logger({ level: 'ERROR', message: 'TEST MESSAGE', data: { a: 1 } });
		});

		describe('sets additionalProperties with keywords', () => {
			it('does not overwrite message', done => {
				udpClient.on("message", handleMessage.bind(undefined, done, function(parsedData) {
					parsedData.message.should.eql('TEST MESSAGE');
				}));

				logger({ level: 'ERROR', message: 'TEST MESSAGE', data: { message: '1' } });
			});

			it('sets message as additionalMessage', done => {
				udpClient.on("message", handleMessage.bind(undefined, done, function(parsedData) {
					parsedData.additionalMessage.should.eql(1);
				}));

				logger({ level: 'ERROR', message: 'TEST MESSAGE', data: { message: 1 } });
			});

			it('does not overwrite @timestamp', done => {
				formattedDateTime = '2015-07-02T19:06:56.078Z';

				udpClient.on("message", handleMessage.bind(undefined, done, function(parsedData) {
					parsedData['@timestamp'].should.eql('2015-07-02T19:06:56.078Z');
				}));

				logger({ level: 'ERROR', message: 'TEST MESSAGE', data: { '@timestamp': '1' } });
			});

			it('sets message as additionalTimestamp', done => {
				udpClient.on("message", handleMessage.bind(undefined, done, function(parsedData) {
					parsedData.additionalTimestamp.should.eql(1);
				}));

				logger({ level: 'ERROR', message: 'TEST MESSAGE', data: { '@timestamp': 1 } });
			});
		});
	});

	describe('old logstash json codec', () => {
		var udpClient;
		var logger;

		beforeEach(() => {
			udpClient = dgram.createSocket("udp4");

			udpClient.bind(9990);

			logger = new logstashLogger({
				output: {
					transport: 'udp',
					host: '127.0.0.1',
					port: 9990
				},
				codec: 'oldlogstashjson',
				eventType: 'test_type'
			});

			formattedDateTime = '';
		});

		afterEach(() => {
			udpClient.close();
		});

		function handleMessage(done, expectation, msg) {
			var data = msg.toString('utf-8');
			var parsedData = JSON.parse(data);

			expectation(parsedData);

			done();
		}

		it('sets type', done => {
			udpClient.on("message", handleMessage.bind(undefined, done, function(parsedData) {
				parsedData['@type'].should.eql('test_type');
			}));

			logger({ level: 'ERROR', message: 'TEST MESSAGE' });
		});

		it('sets @timestamp', done => {
			formattedDateTime = '2015-07-02T19:06:56.078Z';

			udpClient.on("message", handleMessage.bind(undefined, done, function(parsedData) {
				parsedData['@timestamp'].should.eql('2015-07-02T19:06:56.078Z');
			}));

			logger({ level: 'ERROR', message: 'TEST MESSAGE' });
		});

		it('sets message', done => {
			udpClient.on("message", handleMessage.bind(undefined, done, function(parsedData) {
				parsedData['@message'].should.eql('TEST MESSAGE');
			}));

			logger({ level: 'ERROR', message: 'TEST MESSAGE' });
		});

		it('sets additionalProperties', done => {
			udpClient.on("message", handleMessage.bind(undefined, done, function(parsedData) {
				parsedData['@fields'].a.should.eql(1);
			}));

			logger({ level: 'ERROR', message: 'TEST MESSAGE', data: { a: 1 } });
		});
	});
});
