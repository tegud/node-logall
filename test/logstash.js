const should = require("should");
const proxyquire = require("proxyquire");
const dgram = require("dgram");
const net = require("net");
const LogstashLogger = proxyquire("../lib/logstash", {
    moment: () => ({
        format: () => formattedDateTime
    })
});
const moment = require("moment");
let formattedDateTime;

describe("Logstash Logger", () => {
    let logger;

    afterEach(() => {
        logger.stop();
    });

    describe("logs to udp", () => {
        it("formatted event is sent", done => {
            logger = new LogstashLogger({
                output: {
                    transport: "udp",
                    host: "127.0.0.1",
                    port: 9990
                },
                eventType: "test_type"
            });

            const udpClient = dgram.createSocket("udp4");
            udpClient.bind(9990);
            udpClient.on("message", msg => {
                const data = msg.toString("utf-8");
                const parsedData = JSON.parse(data);

                parsedData.should.eql({
                    type: "test_type",
                    level: "INFO",
                    message: "TEST MESSAGE"
                });

                udpClient.close();

                done();
            });

            logger.log({ level: "INFO", message: "TEST MESSAGE" });
        });
    });

    describe("logs to tcp", () => {
        it("formatted event is sent", done => {
            logger = new LogstashLogger({
                output: {
                    transport: "tcp",
                    host: "127.0.0.1",
                    port: 9991
                },
                eventType: "test_type"
            });

            var server = net.createServer(socket => {
                socket.on("data", msg => {
                    const data = msg.toString("utf-8");
                    const parsedData = JSON.parse(data);

                    parsedData.should.eql({
                        type: "test_type",
                        level: "INFO",
                        message: "TEST MESSAGE"
                    });

                    server.close();

                    done();
                });
            });

            server.on("error", e => {
                console.log(`ERROR!!! ${e.code}`);
            });

            server.listen(9991, "0.0.0.0", () => {});

            setTimeout(() => {
                logger.log({ level: "INFO", message: "TEST MESSAGE" });
            }, 1000);
        });
    });

    describe("type can be defined by level", () => {
        let udpClient;

        beforeEach(() => {
            udpClient = dgram.createSocket("udp4");

            udpClient.bind(9990);
        });

        afterEach(() => {
            udpClient.close();
        });

        it("type prefix is prepended to lower case level", done => {
            const logger = new LogstashLogger({
                output: {
                    transport: "udp",
                    host: "127.0.0.1",
                    port: 9990
                },
                eventType: {
                    prefix: "test_type_"
                }
            });

            udpClient.on("message", msg => {
                const data = msg.toString("utf-8");
                const parsedData = JSON.parse(data);

                parsedData.should.eql({
                    type: "test_type_info",
                    message: "TEST MESSAGE"
                });

                done();
            });

            logger.log({ level: "INFO", message: "TEST MESSAGE" });
        });

        it("sets level", done => {
            const logger = new LogstashLogger({
                output: {
                    transport: "udp",
                    host: "127.0.0.1",
                    port: 9990
                },
                eventType: {
                    prefix: "test_type_"
                }
            });

            udpClient.on("message", msg => {
                const data = msg.toString("utf-8");
                const parsedData = JSON.parse(data);

                parsedData.should.eql({
                    type: "test_type_error",
                    message: "TEST MESSAGE"
                });

                done();
            });

            logger.log({ level: "ERROR", message: "TEST MESSAGE" });
        });

        it("sets level specific override", done => {
            const logger = new LogstashLogger({
                output: {
                    transport: "udp",
                    host: "127.0.0.1",
                    port: 9990
                },
                eventType: {
                    prefix: "test_type_",
                    overrides: {
                        error: "errors"
                    }
                }
            });

            udpClient.on("message", msg => {
                const data = msg.toString("utf-8");
                const parsedData = JSON.parse(data);

                parsedData.should.eql({
                    type: "test_type_errors",
                    message: "TEST MESSAGE"
                });

                done();
            });

            logger.log({ level: "ERROR", message: "TEST MESSAGE" });
        });

        it("sets level property when type is string literal", done => {
            const logger = new LogstashLogger({
                output: {
                    transport: "udp",
                    host: "127.0.0.1",
                    port: 9990
                },
                eventType: "mytype"
            });

            udpClient.on("message", msg => {
                const data = msg.toString("utf-8");
                const parsedData = JSON.parse(data);

                parsedData.should.eql({
                    type: "mytype",
                    level: "ERROR",
                    message: "TEST MESSAGE"
                });

                done();
            });

            logger.log({ level: "ERROR", message: "TEST MESSAGE" });
        });
    });

    describe("json codec", () => {
        let udpClient;

        beforeEach(() => {
            udpClient = dgram.createSocket("udp4");

            udpClient.bind(9990);

            logger = new LogstashLogger({
                output: {
                    transport: "udp",
                    host: "127.0.0.1",
                    port: 9990
                },
                eventType: "test_type"
            });

            formattedDateTime = "";
        });

        afterEach(() => {
            udpClient.close();
        });

        function handleMessage(done, expectation, msg) {
            const data = msg.toString("utf-8");
            const parsedData = JSON.parse(data);

            expectation(parsedData);

            done();
        }

        it("sets type", done => {
            udpClient.on(
                "message",
                handleMessage.bind(undefined, done, parsedData => {
                    parsedData.type.should.eql("test_type");
                })
            );

            logger.log({ level: "ERROR", module: "TEST MESSAGE" });
        });

        it("sets @timestamp", done => {
            formattedDateTime = "2015-07-02T19:06:56.078Z";

            udpClient.on(
                "message",
                handleMessage.bind(undefined, done, parsedData => {
                    parsedData["@timestamp"].should.eql(
                        "2015-07-02T19:06:56.078Z"
                    );
                })
            );

            logger.log({ level: "ERROR", message: "TEST MESSAGE" });
        });

        it("sets message", done => {
            udpClient.on(
                "message",
                handleMessage.bind(undefined, done, parsedData => {
                    parsedData.message.should.eql("TEST MESSAGE");
                })
            );

            logger.log({ level: "ERROR", message: "TEST MESSAGE" });
        });

        it("sets module", done => {
            udpClient.on(
                "message",
                handleMessage.bind(undefined, done, parsedData => {
                    parsedData.module.should.eql("TEST MODULE");
                })
            );

            logger.log({
                level: "ERROR",
                module: "TEST MODULE",
                message: "TEST MESSAGE"
            });
        });

        it("sets additionalProperties", done => {
            udpClient.on(
                "message",
                handleMessage.bind(undefined, done, parsedData => {
                    parsedData.a.should.eql(1);
                })
            );

            logger.log({
                level: "ERROR",
                message: "TEST MESSAGE",
                data: { a: 1 }
            });
        });

        describe("sets additionalProperties with keywords", () => {
            it("does not overwrite message", done => {
                udpClient.on(
                    "message",
                    handleMessage.bind(undefined, done, parsedData => {
                        parsedData.message.should.eql("TEST MESSAGE");
                    })
                );

                logger.log({
                    level: "ERROR",
                    message: "TEST MESSAGE",
                    data: { message: "1" }
                });
            });

            it("sets message as additionalMessage", done => {
                udpClient.on(
                    "message",
                    handleMessage.bind(undefined, done, parsedData => {
                        parsedData.additionalMessage.should.eql(1);
                    })
                );

                logger.log({
                    level: "ERROR",
                    message: "TEST MESSAGE",
                    data: { message: 1 }
                });
            });

            it("does not overwrite @timestamp", done => {
                formattedDateTime = "2015-07-02T19:06:56.078Z";

                udpClient.on(
                    "message",
                    handleMessage.bind(undefined, done, parsedData => {
                        parsedData["@timestamp"].should.eql(
                            "2015-07-02T19:06:56.078Z"
                        );
                    })
                );

                logger.log({
                    level: "ERROR",
                    message: "TEST MESSAGE",
                    data: { "@timestamp": "1" }
                });
            });

            it("sets message as additionalTimestamp", done => {
                udpClient.on(
                    "message",
                    handleMessage.bind(undefined, done, parsedData => {
                        parsedData.additionalTimestamp.should.eql(1);
                    })
                );

                logger.log({
                    level: "ERROR",
                    message: "TEST MESSAGE",
                    data: { "@timestamp": 1 }
                });
            });
        });
    });

    describe("old logstash json codec", () => {
        let udpClient;

        beforeEach(() => {
            udpClient = dgram.createSocket("udp4");

            udpClient.bind(9990);

            logger = new LogstashLogger({
                output: {
                    transport: "udp",
                    host: "127.0.0.1",
                    port: 9990
                },
                codec: "oldlogstashjson",
                eventType: "test_type"
            });

            formattedDateTime = "";
        });

        afterEach(() => {
            udpClient.close();
        });

        function handleMessage(done, expectation, msg) {
            const data = msg.toString("utf-8");
            const parsedData = JSON.parse(data);

            expectation(parsedData);

            done();
        }

        it("sets type", done => {
            udpClient.on(
                "message",
                handleMessage.bind(undefined, done, parsedData => {
                    parsedData["@type"].should.eql("test_type");
                })
            );

            logger.log({ level: "ERROR", message: "TEST MESSAGE" });
        });

        it("sets @timestamp", done => {
            formattedDateTime = "2015-07-02T19:06:56.078Z";

            udpClient.on(
                "message",
                handleMessage.bind(undefined, done, parsedData => {
                    parsedData["@timestamp"].should.eql(
                        "2015-07-02T19:06:56.078Z"
                    );
                })
            );

            logger.log({ level: "ERROR", message: "TEST MESSAGE" });
        });

        it("sets message", done => {
            udpClient.on(
                "message",
                handleMessage.bind(undefined, done, parsedData => {
                    parsedData["@message"].should.eql("TEST MESSAGE");
                })
            );

            logger.log({ level: "ERROR", message: "TEST MESSAGE" });
        });

        it("sets additionalProperties", done => {
            udpClient.on(
                "message",
                handleMessage.bind(undefined, done, parsedData => {
                    parsedData["@fields"].a.should.eql(1);
                })
            );

            logger.log({
                level: "ERROR",
                message: "TEST MESSAGE",
                data: { a: 1 }
            });
        });
    });
});
