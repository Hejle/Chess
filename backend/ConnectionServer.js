http = require('http');
var WebSocketServer = require('websocket').server;
var clients = [];
var gameServ = [];
var DEBUG = true;
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

function getGame(id) {
    var result = undefined;
    for (i = 0; i < gameServ.length; i++) {
        if (gameServ[i].id === id) {
            result = gameServ[i];
        }
    }
    return result;
}

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

    if (message.action === "pong") {
        var ms = Date.now() - message.time;
        getGame(message.id).ping = ms;
    }
    if (message.action === "client") {
        sendGameServer(connection, message);
        console.log("Gameinfo sent")
    }
    if (message.action === "hostdetails") {
        console.log("Ip from msg: " + message.address)
        var game = {type:message.type, address:message.address, port:message.port, id:gameServ.length, ping:250, players:0, connection:connection}
        gameServ.push(game);
    }
    if (message.action === "updatePlayers") {
        getGame(message.id).players = message.players;
    }

}

function sendGameServer(client, message) {
    gameServ.sort(function (a,b) {
        return a.ping - b.ping
    })
    var game = gameServ[0];
    for (i = 0; i < gameServ.length; i++) {
        if (gameServ[i].players%2==0 && gameServ[i].players<= 100); {
            game = gameServ[i];
        }
    }
    client.sendUTF(JSON.stringify({action: "gameinfo", address: game.address, port: game.port}))
}

function getPlayers(client, game) {
    client.sendUTF(JSON.stringify({action: "getPlayers", id: game.id}))
}

function testConnection(client, game) {
    client.sendUTF(JSON.stringify({action: "ping", id: game.id, time: Date.now()}))
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

setInterval(function () {
    for (i = 0; i < gameServ.length; i++) {
        getPlayers(gameServ[i].connection, gameServ[i]);
        testConnection(gameServ[i].connection, gameServ[i]);
    }

}, 6000);

console.log("Login server running at port 3333\n");