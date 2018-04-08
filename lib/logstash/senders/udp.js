const dgram = require("dgram");

module.exports = function udpSender(config) {
    const udpClient = dgram.createSocket("udp4");

    return {
        send: data => {
            const message = JSON.stringify(data);

            udpClient.send(
                new Buffer(message),
                0,
                message.length,
                config.port,
                config.host
            );
        },
        stop: () => {
            udpClient.close();
            return Promise.resolve();
        }
    };
};
