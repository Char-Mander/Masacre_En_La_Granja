var turno = "";
var currentDeaths = [];
var option = -1;
var deaths = {};

function cargarPartida() {
    console.log("Entrada en cargarPartida");
    var deads = document.getElementsByClassName("deathInfo");
    for (var i = 0; i < deads.length; i++)
        deads[i].style.display = "none";

    const headers = {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": config.csrf.value
    };
    const params = {
        method: 'POST',
        headers: headers
    };

    fetch("/api/game/getStatus", params).then((response) => {
        if (response.status == 200) {
            response.text().then(function (text) {
                logEntry("Night falls, the farmers go to bed, vampires rise...");
                console.log("Status leído del getStatus: " + text);
                var status = JSON.parse(text);
                currentDeaths = status.currentDeaths;
                console.log(status.played);
                turno = status.turno;
            });
        }
        else {
            console.log("NO HA SIDO POSIBLE CARGAR LA PARTIDA");
        }
    });

    for (var p in players) {
        if (players[p] == clientPlayer) continue;
        document.getElementById(players[p] + "Card")
            .addEventListener("click", vote(players[p]));
    }
}

function vote(player) {
    console.log("Entrada en la función vote con player: " + player);
    return function () {
        switch (turno) {
            case "VAMPIRE":
                vampirePlay(player);
                break;
            case "HUNTER":
                hunterPlay(player);
                break;
            case "WITCH":
                witchPlay(player);
                break;
            case "POPULAR_VOTATION":
                popularPlay(player);
                break;
        }
    }
}

// Option 0 -> no hace nada
// Option 1 -> mata al objetivo
// Option 2 -> protege al jugador víctima de los vampiros
function witchPlay(objective) {
    console.log("Entrada en la funcion witchPlay");
    var playJSON = {
        rol: 'WITCH',
        client: clientPlayer,
        victim: objective,
        option: "" + option
    };

    var text = JSON.stringify(playJSON);
    const headers = {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": config.csrf.value
    };
    const params = {
        method: 'POST',
        headers: headers,
        body: text
    };
    fetch("/api/game/receivePlay", params).then((response) => {
        if (response.status == 200) console.log("JUGADA ENVIADA");
        else {
            console.log("ALGO HA SALIDO MAL");
        }
    })
}

function popularPlay(victim_) {
    console.log("Entrada en popularPlay con victim_: " + victim_);

    var playJSON = {
        rol: 'POPULAR_VOTE',
        client: clientPlayer,
        victim: victim_,
        option: ""
    };
    var text = JSON.stringify(playJSON);
    console.log("Jugada enviada: " + text);
    const headers = {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": config.csrf.value
    };
    const params = {
        method: 'POST',
        headers: headers,
        body: text
    };

    fetch("/api/game/receivePlay", params).then((response) => {
        if (response.status == 200) {
            console.log("JUGADA ENVIADA");
            noteEntry("Your vote is for " + victim_);
        }
        else {
            console.log("ALGO HA SALIDO MAL");
        }
    });
}

function vampirePlay(victim_) {
    console.log("Entrada en vampirePlay con victim_: " + victim_);

    var playJSON = {
        rol: 'VAMPIRE',
        client: clientPlayer,
        victim: victim_,
        option: ""
    };
    var text = JSON.stringify(playJSON);
    const headers = {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": config.csrf.value
    };
    const params = {
        method: 'POST',
        headers: headers,
        body: text
    };

    fetch("/api/game/receivePlay", params).then((response) => {
        if (response.status == 200) {
            noteEntry("Your victim is " + victim_);
            console.log("JUGADA ENVIADA");
        }
        else {
            console.log("ALGO HA SALIDO MAL");
        }
    });

}

function hunterPlay(victim_) {
    console.log("Entrada en hunterPlay con victim_: " + victim_);

    // players[clientPlayer][1] = 1;


    //Envía jugada al servidor vía Ajax

    var playJSON = {
        rol: 'HUNTER',
        client: clientPlayer,
        victim: victim_,
        option: ""
    }

    var text = JSON.stringify(playJSON);

    const headers = {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": config.csrf.value
    };

    const params = {
        method: 'POST',
        headers: headers,
        body: text
    };

    fetch("/api/game/receivePlay", params).then((response) => {
        if (response.status == 200) {
            noteEntry("You shot " + victim_);
            console.log("JUGADA ENVIADA");
        }
        else {
            console.log("ALGO HA SALIDO MAL");
        }
    });
}


function receiveStatus(newState)//Actualiza el estado del cliente via websocket
{
    console.log("Nuevo estado recibido con turno: " + newState.turno);
    printLogs(newState.logs);
    turno = newState.turno;
    currentDeaths = newState.currentDeaths;
    deaths = newState.deaths;

    updateDeaths(deaths);

    switch (turno) {
    case "VAMPIRES_WON":    	
    	logEntry("The weak farmers have fallen...");
    	noteEntry("VAMPIRES WIN!");
        break;
    case "FARMERS_WON":
    	logEntry("The vampires have been eliminated.");
    	noteEntry("FARMERS WIN!");
        break;
    case "TIE":
    	logEntry("The farmers and vampires befriended each other!");
    	noteEntry("PEACE! LOVE!");
        break;
    }

}

function updateDeaths(deaths) {
    console.log("Entrada en updateDeaths");
    console.log("Array de jugadores: " + deaths);
    for (var p in deaths) {
        document.getElementById(p + 'Death').style.display = 'flex';
        document.getElementById(p + 'Death').style.alignSelf = 'center';
        document.getElementById(p + 'Death').innerHTML = deaths[p];

        var icono;
        switch (deaths[p]) {
            case "VAMPIRE":
                icono = "\uD83E\uDDDB\u200D♂️";
                break;
            case "FARMER":
                icono = "\uD83D\uDC68\u200D\uD83C\uDF3E ";
                break;
            case "WITCH":
                icono = "\uD83E\uDDD9\u200D♀️";
                break;
            case "HUNTER":
                icono = "\uD83C\uDFF9";
                break;
        }

        document.getElementById(p + 'Card').style.backgroundColor = 'transparent';
        document.getElementById(p + 'Card').innerHTML = icono;
    }
}


function logEntry(message) {
    date = new Date();
    document.getElementById('log').innerHTML += "\n" + date.getHours() + ":"
        + date.getMinutes() + ":"
        + date.getSeconds() + "  "
        + message;
    
    document.getElementById('log').scrollTop = document.getElementById('log').scrollHeight;
}

function noteEntry(message) {
    console.log("Entrada en noteEntry");
    document.getElementById('note').innerHTML = message;
}

function printLogs(logs) {
    for (i = 0; i < logs.length; i++) {
        logEntry(logs[i]);
    }
}

cargarPartida();