http = require('http');
var ip = require('ip');
var WebSocket = require('ws');
var WebSocketServer = require('websocket').server;
var clients = [];
var board = require('./Pieces');
var DEBUG = true;
var TIME_PER_TURNS = 10;
var timeLeft = 0;
var currentSide = "white";
var clientAlignment = {};
var blackCount = 0;
var whiteCount = 0;
var clientVotes = {};
var port = 5000;



board.initialiseBoard();

var server = http.createServer(function (request, response) {
});

server.listen(port, function () {
    console.log("I am running!");
});

wsServer = new WebSocketServer({
    httpServer: server
});

wsServer.on('request', function (request) {
    if (timerRunning === false) {
        startTimer();
    }

    var connection = request.accept('echo-protocol', request.origin);
    clients.push(connection);
    var id = clients.length - 1;
    console.log((new Date()) + ' Connection accepted [' + id + ']');
    connection.sendUTF(JSON.stringify("Welcome to the gameserver"));

    if (whiteCount > blackCount) {
        clientAlignment[id] = "black";
        blackCount++;
    } else {
        clientAlignment[id] = "white";
        whiteCount++;
    }

    connection.sendUTF(JSON.stringify({action: "color", color: clientAlignment[id]}))

    connection.on('message', function (message) {
        handleIncomingMessage(connection, message);
    });

    connection.on('close', function (reasonCode, description) {
        delete clients[id];
        if (clientAlignment[id] === "black") {
            blackCount--;
        } else {
            whiteCount--;
        }
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
});

var interval;
var timerRunning = false;

function startTimer() {
    stopTimer();
    timerRunning = true;
    interval = setInterval(countdownTimer, 1000);
}

function stopTimer() {
    if (interval !== null) {
        clearInterval(interval);
        timerRunning = false;
    }
}

function broadcastCurrentSide() {
    clients.forEach(function (client) {
        sendCurrentSide(client);
    });
}

function swapSide() {
    if (currentSide === "white") {
        currentSide = "black";
    } else {
        currentSide = "white";
    }
    broadcastCurrentSide();
}

function broadcastBoard() {
    clients.forEach(function (client) {
        sendBoard(client);
    });
}

function performMove() {
    var moves = sumVotes();
    if(moves.length === 0) return false;
    var move = moves[0].key;
    board.movePieceByCoord(move.split("-")[0], move.split("-")[1]);
    broadcastMove(move.split("-")[0], move.split("-")[1]);
    clientVotes = {};
    broadcastVotes();
    if(board.gameOver().isGameOver) {
        board.resetBoard();
        broadcastBoard();
    }
    return true;
}

function sortDictionaryByValue(dictionary) {
    var keys = Object.keys(dictionary);
    var i, len = keys.length;
    keys.sort();
    var sortedDict = [];
    for (i = 0; i < len; i++)
    {
        k = keys[i];
        sortedDict.push({'key': k, 'value':dictionary[k]});
    }
    return sortedDict;
}

function sumVotes() {
    var moves = {};
    for (var id in clientVotes) {
        if (clientVotes.hasOwnProperty(id)) {
            console.log(clientVotes[id]);
            if(clientVotes[id] in moves) {
                moves[clientVotes[id]] += 1;
            } else {
                moves[clientVotes[id]] = 1;
            }
        }
    }
    moves = sortDictionaryByValue(moves);
    return moves;
}

function sendMovesList(client, moves) {
    client.sendUTF(JSON.stringify({action: "movesList", moves: JSON.stringify(moves)}));
}

function broadcastVotes() {
    var moves = sumVotes();
    clients.forEach(function (client) {
        sendMovesList(client, moves);
    });

}

function countdownTimer() {
    if (timeLeft === 0) {
        timeLeft = TIME_PER_TURNS;
        if(performMove() === true) {
            swapSide();
        }
        broadcastTimeLeft();
        return;
    }
    timeLeft -= 1;
    broadcastTimeLeft();
}


function sendBoard(client) {
    client.sendUTF(JSON.stringify({action: "newBoard", board: JSON.stringify(board.getBoard())}));
}

function broadcastTimeLeft() {
    clients.forEach(function (client) {
        sendTimeLeft(client);
    })
}

function sendTimeLeft(client) {
    client.sendUTF(JSON.stringify({action: "timeLeft", time: timeLeft}));
}

function sendCurrentSide(client) {
    client.sendUTF(JSON.stringify({action: "currentSide", currentSide: currentSide}));
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

    if (message.action === "move") {
        voteMove(clients.indexOf(connection), message.oldLocation, message.newLocation)
    } else if (message.action === "newBoard") {
        sendBoard(connection);
    } else if (message.action === "timeLeft") {
        sendTimeLeft(connection);
    } else if (message.action === "currentSide") {
        sendCurrentSide(connection);
    }
}

function sendErrorMessage(client, message) {
    client.sendUTF(JSON.stringify({action: "error", message: message}))
}

function voteMove(id, oldLoc, newLoc) {
    if (clientAlignment[id] !== currentSide) sendErrorMessage(clients[id], "Not your turn yet");

    if(board.getColor(oldLoc+"-"+newLoc) === clientAlignment[id]) {
        if (board.isValidMove(oldLoc, newLoc)) {
            clientVotes[id] = oldLoc + "-" + newLoc;
            broadcastVotes();
        } else {
            sendErrorMessage(clients[id], "Invalid move");
        }
    } else {
        sendErrorMessage(clients[id], "You can only move " + clientAlignment[id] + " pieces");
    }
}

function isValidMessage(data) {
    try {
        JSON.parse(data);
    } catch (e) {
        return false;
    }
    return true;
}

function broadcastMove(oldLocation, newLocation) {
    clients.forEach(function (client) {
        client.sendUTF(JSON.stringify({action: "move", oldLocation: oldLocation, newLocation: newLocation}));
    });
}

var ws = new WebSocket('ws://' + 'localhost' + ':3333', 'echo-protocol');


function isValidMessage(data) {
    try {
        JSON.parse(data);
    } catch (e) {
        return false;
    }
    return true;
}

function handleServerMessage(event) {
    var message = JSON.parse(event.data);

    if(message.action === "error") {
        console.log(message.message);
    } else if (message.action === "connection") {
        ws.send(JSON.stringify({action: "hostdetails", type: "Chess", address:ip.address(), port:port}));
    }
}

ws.onopen = function (event) {
    //TODO Implement this on the backend
};

ws.addEventListener("message", function (e) {
    handleServerMessage(e);
});

console.log("Game server running at port 5000\n");