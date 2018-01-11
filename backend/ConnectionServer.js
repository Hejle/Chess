http = require('http');
var WebSocketServer = require('websocket').server;
var clients = [];
var gameServ = [];
var DEBUG = false;
var port = undefined;
var game;

var server = http.createServer(function (request, response) {
});

server.listen(3333, function () {
    console.log("I am running!");
});

wsServer = new WebSocketServer({
    httpServer: server
});

wsServer.on('request', function (request) {
    var connection = request.accept('echo-protocol', request.origin);
    clients.push(connection);
    var id = clients.length - 1;
    console.log((new Date()) + ' Connection accepted [' + id + ']');

    connection.sendUTF(JSON.stringify({action: "connection"}))

    connection.on('message', function (message) {
        handleIncomingMessage(connection, message);
    });

    connection.on('close', function (reasonCode, description) {
        delete clients[id];
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
});

function handleIncomingMessage(connection, data) {
    if (!isValidMessage(data.utf8Data)) {
        if (DEBUG) console.log("INVALID: " + JSON.stringify(data.utf8Data));
        return;
    }
    var message = JSON.parse(data.utf8Data);
    if (DEBUG) {
        console.log("VALID: " + JSON.stringify(message));
        console.log(message.action);
    }
    if (message.action === "client") {
        sendGameServer(connection, message);
        console.log("Gameinfo sent")
    }
    if (message.action === "hostdetails") {
        console.log("Ip from msg: " + message.address)
        game = {type:message.type, address:message.address, port:message.port}
        gameServ.push(game);
    }
}

function sendGameServer(client, message) {
    //gameServ.forEach()
    client.sendUTF(JSON.stringify({action: "gameinfo", address: game.address, port: game.port}))
}

function sendErrorMessage(client, message) {
    client.sendUTF(JSON.stringify({action: "error", message: message}))
}

function isValidMessage(data) {
    try {
        JSON.parse(data);
    } catch (e) {
        return false;
    }
    return true;
}


console.log("Login server running at port 3333\n");