const should = require("should");
const proxyquire = require("proxyquire");
const consoleLogger = proxyquire("../lib/console", {
    "./writeToConsole": fakeWriteToConsole,
    moment: function() {
        return {
            format: function() {
                return formatedDateString;
            }
        };
    }
});

let loggedMessage;
let formatedDateString;

function fakeWriteToConsole(message) {
    loggedMessage = message;
}

describe("Console Logger", () => {
    beforeEach(() => {
        loggedMessage = "";
        formatedDateString = "";
    });

    it("logs current time", () => {
        formatedDateString = "2015-07-02T11:28:30+01:00";

        new consoleLogger()({ level: "INFO", message: "TEST MESSAGE" });

        loggedMessage
            .substring(0, 27)
            .should.eql("[2015-07-02T11:28:30+01:00]");
    });

    it("logs level", () => {
        new consoleLogger()({ level: "INFO", message: "TEST MESSAGE" });

        loggedMessage.substring(0, 9).should.eql("[] [INFO]");
    });

    it("logs message", () => {
        new consoleLogger()({ level: "INFO", message: "TEST MESSAGE" });

        loggedMessage.should.eql("[] [INFO] TEST MESSAGE");
    });

    it("logs module if present", () => {
        new consoleLogger()({
            level: "INFO",
            module: "TEST MODULE",
            message: "TEST MESSAGE"
        });

        loggedMessage.should.eql("[] [INFO] [TEST MODULE] TEST MESSAGE");
    });

    it("logs data if present", () => {
        new consoleLogger()({
            level: "INFO",
            module: "TEST MODULE",
            message: "TEST MESSAGE",
            data: { a: 1, b: 2 }
        });

        loggedMessage.should.eql(
            "[] [INFO] [TEST MODULE] TEST MESSAGE, a: 1, b: 2"
        );
    });
});
