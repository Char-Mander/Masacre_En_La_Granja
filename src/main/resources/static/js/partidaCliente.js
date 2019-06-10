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
                logEntry("El ocaso se acerca y con él la sed de sangre de los " +
                    "vampiros. Rezad vuestras plegarias.");
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
            case "VAMPIRO":
                vampiroPlay(player);
                break;
            case "CAZAVAMPIROS":
                cazavampirosPlay(player);
                break;
            case "BRUJA":
                brujaPlay(player);
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
function brujaPlay(objective) {
    console.log("Entrada en la funcion brujaPlay");
    var playJSON = {
        rol: 'BRUJA',
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
            noteEntry("Has votado ejecutar a " + victim_);
        }
        else {
            console.log("ALGO HA SALIDO MAL");
        }
    });
}

function vampiroPlay(victim_) {
    console.log("Entrada en vampiroPlay con victim_: " + victim_);

    var playJSON = {
        rol: 'VAMPIRO',
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
            noteEntry("Propones devorar a " + victim_);
            console.log("JUGADA ENVIADA");
        }
        else {
            console.log("ALGO HA SALIDO MAL");
        }
    });

}

function cazavampirosPlay(victim_) {
    console.log("Entrada en cazavampirosPlay con victim_: " + victim_);

    // players[clientPlayer][1] = 1;


    //Envía jugada al servidor vía Ajax

    var playJSON = {
        rol: 'CAZAVAMPIROS',
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
            noteEntry("Has disparado a " + victim_);
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
    case "VAMPIROS_WON":
    	logEntry("Las vísceras y entrañas de los granjeros se esparcen por " +
            "todo el pueblo y los vampiros disfrutan de su festín de sangre, " +
            "mientras eligen dónde será el próximo");
    	noteEntry("¡Los vampiros vuelven a ganar!");
        break;
    case "GRANJEROS_WON":
    	logEntry("Para sorpresa de todos, el último vampiro se deshace en " +
            "polvo y cenizas. Los granjeros respiran aliviados. Ya pueden volver" +
            "a morir por las causas habituales de siempre.");
    	noteEntry("Contra todo pronóstico, el pueblo gana.");
        break;
    case "TIE":
    	logEntry("El pueblo se queda en silencio, habitado únicamente por " +
            "buitres y fantasmas. Brujas, cazadores, vampiros y granjeros... " +
            "Todos han muerto.");
    	noteEntry("Todos sois perdedores. Solo gana el Ominoso.");
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
            case "VAMPIRO":
                icono = "\uD83E\uDDDB\u200D♂️";
                break;
            case "GRANJERO":
                icono = "\uD83D\uDC68\u200D\uD83C\uDF3E ";
                break;
            case "BRUJA":
                icono = "\uD83E\uDDD9\u200D♀️";
                break;
            case "CAZAVAMPIROS":
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