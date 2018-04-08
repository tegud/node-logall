const net = require("net");

module.exports = function tcpSender(config) {
    const client = new net.Socket();

    client.on("error", e => console.log(`Client error: ${e.message}`));

    client.connect(config.port, config.host, () => console.log("connected..."));

    return {
        send: data => client.write(JSON.stringify(data)),
        stop: () => {
            client.end();
            return Promise.resolve();
        }
    };
};
