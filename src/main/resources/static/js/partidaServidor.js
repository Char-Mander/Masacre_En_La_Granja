var rolOrder = ["VAMPIRE", "WITCH"];
var cosasQuePasan = "";

function createStatus() {
	this.logs = [];
	this.turno = '';
	this.currentDeaths = [];
	this.votation = {};
	this.dia = 0;//0 noche , 1 dia
	this.players = {};
	this.played = [];
	this.gameState = "";
	this.availableWitchActions = 0; //0 = Ninguna, 1 = matar, 2 = revivir, 3 = ambas
}

function receivePlay(oldStateJSON, playJSON) //También recibirá el estado de la partida
{
	//Se actualiza la infromación de la partida desde la BD
	var oldState = JSON.parse(oldStateJSON);
	//Get the player, rol, and action of the play and process it
	var play = JSON.parse(playJSON);
	var object = new createStatus();

	object.currentDeaths = oldState.currentDeaths;
	object.dia = oldState.dia;
	object.players = oldState.players;
	object.votation = oldState.votes;
	object.played = oldState.played;
	object.gameState = oldState.gameState;
	object.turno = oldState.turno;
	object.availableWitchActions = oldState.availableWitchActions;

	switch (play.rol) {
		case 'VAMPIRE':
			vampireMove(play, object); //Se le envía el nuevo estado al servidor
			break;
		case 'HUNTER':
			hunterMove(play, object);
			break;
		case 'POPULAR_VOTE':
			object.turno = oldState.turno;
			popularMove(play, object);
			break;
		case 'WITCH':
			witchMove(play, object);
			break;
	}

	object.acciones = oldState.acciones;
	object.acciones.push(play);

	var newStatus = {
		gameState: object.gameState,
		turno: object.turno,
		dia: object.dia,
		players: object.players,
		acciones: object.acciones,
		currentDeaths: object.currentDeaths,
		votes: object.votation,
		played: object.played,
		availableWitchActions: object.availableWitchActions
	};

	return Java.to([JSON.stringify(object), JSON.stringify(newStatus), JSON.stringify(cosasQuePasan)], "java.lang.String[]");
}

// action 0 -> no hace nada
// action 1 -> mata al objetivo
// action 2 -> protege al jugador víctima de los vampiros
function witchMove(play, object) {
	if (play.action === 0) { // La bruja no hace nada
		endNight(object);
	} else if (play.action === 1 && play.objective !== object.currentDeaths[0]) {// La bruja mata
		object.availableWitchActions = object.availableWitchActions == 3 ? 2 : 0;
		object.currentDeaths.push(play.victim);
		object.logs.push("The witch invoked the powers of Hell and forced " + play.objective + " to stab their own heart! You all shall fear the Dark Lord!");
	} else if (play.action === 2) { // La bruja protege
		object.availableWitchActions = object.availableWitchActions == 3 ? 1 : 0;
		object.currentDeaths = [];
		object.logs.push("The witch begged to her unholy god and protected " + play.objective + "'s soul ! Hail the Dark Lord!");
	}

}

function popularMove(play, object) {
	//Si la victima aun no ha sido votada le ponemos un 1, si ya lo ha sido le sumanos 1
	if (object.votation[play.victim] == null) object.votation[play.victim] = 1;
	else object.votation[play.victim]++;
	if (countNumVotes(object) == countMaxVotes(object)) {
		var i = mostVotedPlayer(object);
		if (i == "") {
			object.played[play.client] = 0;
			object.logs.push("Votation tied and there is no time to vote again...");
		}
		else {
			object.currentDeaths.push(i);
			object.logs.push("The farmers decided to hang Player " + play.victim);
		}

		startNight(object);
		object.turno = "VAMPIRE";
		playedNextTurn(object);
		object.votation = {};
	}
	else {
		object.logs.push("Player " + play.client + " voted Player " + play.victim + "!");
	}

}

function hunterMove(play, object) {
	object.currentDeaths.push(play.victim);
	object.turno = 'HUNTER_SHOT';
	object.logs.push("Player " + play.client + " has shot Player " + play.victim + "!")
	object.players[play.client] = "DEAD";
	//El cazador muere
	object.currentDeaths.push(play.client);
	if (object.dia) {//Si le ha matado el pueblo, empieza la noche
		startNight(object);
	}
	else {//Si le han matado los vampiros, termina la noche
		endNight(object);
	}

}

function vampireMove(play, object) {
	//Si la victima aun no ha sido votada le ponemos un 1, si ya lo ha sido le sumanos 1
	if (object.votation[play.victim] == null) object.votation[play.victim] = 1;
	else object.votation[play.victim]++;
	object.played[play.client] = 0;
	if (countNumVotes(object) == countRol("VAMPIRE", object)) {
		var i = mostVotedPlayer(object);
		if (i == "") {
			object.logs.push("Vampires couldn't decide who to kill!");
		}
		else {
			object.currentDeaths.push(i);
		}
		object.logs.push("Vampires choosed their prey...")
		object.turno = nextRol("VAMPIRE", object);
		playedNextTurn(object);
		object.votation = {};
	}

}

function mostVotedPlayer(object) {
	var name = "";
	var max = 0;
	var draw = 0;

	for (var i in object.votation) {
		if (object.votation[i] > max) {
			name = i;
			max = object.votation[i];
			draw = 0;
		} else if (object.votation[i] == max) {
			draw = 1;
		}
	}

	if (draw == 1) {
		return ""; // Empate
	}

	return name; // Jugador más votado
}

function nextRol(rol, object) {
	var j = 0;
	while (j < rolOrder.length) {
		if (rol == rolOrder[j]) {
			break;
		}
		j++;
	}
	if (j >= rolOrder.length - 1) {
		return endNight(object);
	}
	else {
		j++;
		while (j < rolOrder.length) {
			if (countRol(rolOrder[j], object) > 0) {
				return rolOrder[j];
			}
			j++;
		}
		return endNight(object);
	}

}

function endNight(object) {
	processDeaths(object);

	if (object.turno == "FARMERS_WON" || object.turno == "VAMPIRES_WON") {
		return object.turno;
	}

	if (object.turno != "HUNTER") {
		object.dia = 1;
		object.turno = "POPULAR_VOTATION";
		for (var i in object.players) {
			if (object.players[i] != "DEAD") {
				object.played[i] = 1;
			}
		}
		object.logs.push("The farmers wake up");
	}


	return "POPULAR_VOTATION";
}

function startNight(object) {
	processDeaths(object);
	if (object.turno != "HUNTER") {
		object.dia = 0;
		object.logs.push("The farmers go to bed...");
		object.turno = rolOrder[0];
		object.currentDeaths = [];
	}
}

function processDeaths(object) {
	for (var i in object.currentDeaths) {
		if (object.players[object.currentDeaths[i]] == "HUNTER") {//Si el cazador muere, será su turno
			object.logs.push(object.currentDeaths[i] + " was the Hunter, and wants retribution!");
			object.turno = "HUNTER";
			object.currentDeaths.splice(i, 1);
		}
		else {
			object.logs.push((object.currentDeaths[i] + " has died!"));
			//El jugador muere
			object.players[object.currentDeaths[i]] = "DEAD";
		}
	}
	checkWin(object);
}

function checkWin(object)//Comprueba si un bando ha ganado
{
	var vampiresLeft = 0;
	var farmersLeft = 0;
	for (var i in object.players) {
		if (object.players[i] == "VAMPIRE") {
			vampiresLeft++;
		}
		else if (object.players[i] != "DEAD") {
			farmersLeft++;
			cosasQuePasan += "Ha entrado en farmersLeft '\n'";
		}
	}
	if (vampiresLeft == 0) {
		object.turno = "FARMERS_WON";
		object.gameState = "FINISHED";
	}
	else if (farmersLeft == 0) {
		object.turno = "VAMPIRES_WON";
		object.gameState = "FINISHED";
	}

}

function countNumVotes(object) {
	var num = 0;
	for (var i in object.votation) {
		num += object.votation[i];
	}
	return num;
}

function countMaxVotes(object) {
	var people = 0;
	for (var i in object.players) {
		if (object.players[i] != "DEAD") {
			people++;
		}
	}
	return people;
}
function countRol(rol, object) {
	var people = 0;
	for (var i in object.players) {
		if (object.players[i] == rol) {
			people++;
		}
	}
	return people;
}

function playedNextTurn(object) {
	for (var i in object.players) {
		if ((object.players[i] == object.turno)
			|| (object.turno == "POPULAR_VOTATION" && object.players[i] != "DEAD"))
			object.played[i] = 1;
	}
}