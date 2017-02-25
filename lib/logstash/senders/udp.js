const dgram = require('dgram');

module.exports = function udpSender(config) {
    const udpClient = dgram.createSocket("udp4");

    return data => {
        const message = JSON.stringify(data);

        udpClient.send(new Buffer(message), 0, message.length, config.port, config.host);
    }
};
