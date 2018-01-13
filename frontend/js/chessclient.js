var board;
var init = function () {
    var cfg = {
        draggable: true,
        dropOffBoard: 'snapback', // this is the default
        position: 'start',
        onDrop: onDrop
    };
    board = ChessBoard('board', cfg);
    board.on
};
$(document).ready(init);


var onDrop = function (newLocation, oldLocation, source, spiece, position, orientation) {
    if (oldLocation === newLocation) return;
    sendMove(oldLocation, newLocation);
    return 'snapback';
};

function updateTimer(timeLeft) {
    document.getElementById("time").innerHTML = timeLeft + " seconds";
}

var wa = new WebSocket('ws://' + window.location.hostname + ':3333', 'echo-protocol');
var ws;


function sendMove(oldLoc, newLoc) {
    var message = JSON.stringify({action: "move", oldLocation: newLoc, newLocation: oldLoc});
    ws.send(message);
}

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

    if (message.action === "move") {
        board.move(message.oldLocation + "-" + message.newLocation);
    } else if (message.action === "newBoard") {
        console.log(JSON.parse(message.board))
        board.position(JSON.parse(message.board));
    } else if (message.action === "timeLeft") {
        updateTimer(message.time);
    } else if(message.action === "error") {
        alert(message.message);
    } else if(message.action === "currentSide") {
        document.getElementById("currentSide").innerHTML = message.currentSide;
    } else if(message.action === "movesList") {
        document.getElementById("movesList").innerHTML = "";
        var parsedMoves = JSON.parse(message.moves);
        for (var move in parsedMoves) {
            if (parsedMoves.hasOwnProperty(move)) {
                document.getElementById("movesList").innerHTML += "<p>" + parsedMoves[move].key + ": " + parsedMoves[move].value + " votes </p>";
            }
        }
    } else if(message.action === "color") {
        document.getElementById("color").innerHTML = "Your color is " + message.color;
    }
}

function requestTime() {
    ws.send(JSON.stringify({action: "timeLeft"}));
}

function requestCurrentSide() {
    ws.send(JSON.stringify({action: "currentSide"}));
}

function requestBoard() {
    ws.send(JSON.stringify({action: "newBoard"}));
}

function setupWs() {
    ws.onopen = function (event) {
        //TODO Implement this on the backend
        requestTime();
        requestCurrentSide();
        requestBoard();
        closeConnectionServer();
    };

    ws.addEventListener("message", function (e) {
        handleServerMessage(e);
    });
}

wa.addEventListener("message", function (e) {
    handleLoginMessage(e);
});

function closeConnectionServer() {
    wa.close();
}

function handleLoginMessage(event) {
    var message = JSON.parse(event.data);
    if(message.action === "connection") {
        wa.send(JSON.stringify({action: "client", game: "chess"}));
    } else if(message.action === "gameinfo") {
        ws = new WebSocket('ws://' + message.address + ':' + message.port, 'echo-protocol');
        setupWs();
    }
}