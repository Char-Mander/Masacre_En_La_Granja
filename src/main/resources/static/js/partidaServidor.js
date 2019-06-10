var rolOrder = ["VAMPIRO", "BRUJA"];
var cosasQuePasan = "";

function createStatus() {
	this.logs = [];
	this.turno = '';
	this.currentDeaths = [];
	this.votation = {};
	this.dia = 0;//0 noche , 1 dia
	this.players = {};
	this.oldRols = {};
	this.played = [];
	this.gameState = "";
	this.availableBrujaActions = 0; //0 = Ninguna, 1 = matar, 2 = revivir, 3 = ambas
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
	object.oldRols = oldState.oldRols;
	object.availableBrujaActions = oldState.availableBrujaActions;

	switch (play.rol) {
		case 'VAMPIRO':
			vampiroMove(play, object); //Se le envía el nuevo estado al servidor
			break;
		case 'CAZAVAMPIROS':
			cazavampirosMove(play, object);
			break;
		case 'POPULAR_VOTE':
			popularMove(play, object);
			break;
		case 'BRUJA':
			brujaMove(play, object);
			break;
	}

	object.acciones = oldState.acciones;
	object.acciones.push(play);

	var newStatus = {
		gameState: object.gameState,
		turno: object.turno,
		dia: object.dia,
		players: object.players,
		oldRols: object.oldRols,
		acciones: object.acciones,
		currentDeaths: object.currentDeaths,
		votes: object.votation,
		played: object.played,
		availableBrujaActions: object.availableBrujaActions
	};

	var deaths = {};
	for (var i in object.players) {
		if (object.players[i] == "DEAD" || object.gameState == "FINISHED") {
			deaths[i] = object.oldRols[i];
		}
	}

	var obj = {
		logs: object.logs,
		turno: object.turno,
		currentDeaths: object.currentDeaths,
		deaths: deaths
	}

	return Java.to([JSON.stringify(obj), JSON.stringify(newStatus), JSON.stringify(cosasQuePasan)], "java.lang.String[]");
}

// option 0 -> no hace nada
// option 1 -> mata al objetivo
// option 2 -> protege al jugador víctima de los vampiros
function brujaMove(play, object) {

	if (play.option == 1 && (object.availableBrujaActions == 1 || object.availableBrujaActions == 3)) {// La bruja mata
		var victimaCorrecta = 0;
		if (object.currentDeaths.length > 0) {
			if (play.victim != object.currentDeaths[0]) {
				victimaCorrecta = 1;
			}
		} else {
			victimaCorrecta = 1;
		}

		if (victimaCorrecta == 1) {
			object.availableBrujaActions = object.availableBrujaActions == 3 ? 2 : 0;
			object.currentDeaths.push(play.victim);
			object.logs.push("¡La bruja ha sacrificado a su primogénito en inefable ritual y ha obligado a " + play.victim + " apuñalar su corazón! ¡Temed el poder del Ominoso!");
		}
	}
	else if (play.option == 2 && (object.availableBrujaActions == 2 || object.availableBrujaActions == 3)) { // La bruja protege
		object.availableBrujaActions = object.availableBrujaActions == 3 ? 1 : 0;
		object.currentDeaths = object.currentDeaths.length == 1 ? [] : [object.currentDeaths[1]];
		object.logs.push("La bruja ha quemado los huesos de sus ancestros, implorando a su dios pagano que proteja el alma de " + play.victim + ". ¡Alabad todos al Ominoso!");
	}
	//Sin else para que si gasta sus opciones tambien haga end nigth
	if (play.option == 0 || object.availableBrujaActions == 0) { // La bruja no hace nada
	    if(object.players[object.currentDeaths[0]] == "CAZAVAMPIROS"){
            object.turno = "CAZAVAMPIROS";
            playedNextTurn(object);
        }
	    else {
            endNight(object);
        }
	}

}

function popularMove(play, object) {
	//Si la victima aun no ha sido votada le ponemos un 1, si ya lo ha sido le sumanos 1
	if (object.votation[play.victim] == null) object.votation[play.victim] = 1;
	else object.votation[play.victim]++;
	object.played[play.client] = 0;
	if (countNumVotes(object) == countMaxVotes(object)) {
		var i = mostVotedPlayer(object);
		if (i == "") {
			object.logs.push("Los aldeanos se pasan el día discutiendo sin " +
				"llegar a ningún consenso. Habéis perdido el tiempo.");
		} else {
			object.currentDeaths.push(i);
			object.logs.push("Los aldeanos sentencian a muerte a " + i
				+ ". Será decapitado y luego llenarán su boca de ajos y " +
				"estacarán su corazón (por si acaso).");
		}

		startNight(object);
		if (object.turno !== "CAZAVAMPIROS" && object.turno !== "VAMPIROS_WON" && object.turno !== "GRANJEROS_WON" && object.turno !== "TIE") {
			object.turno = "VAMPIRO";
		}
		playedNextTurn(object);
		object.votation = {};
	} else {
		object.logs.push(play.client + " piensa que " + play.victim + " debe morir.");
	}

}

function cazavampirosMove(play, object) {
//La víctima muere
	object.currentDeaths.push(play.victim);
	object.turno = 'CAZAVAMPIROS_SHOT';

	object.played[play.client] = 0;
	object.logs.push("Con sus últimas fuerzas, " + play.client +
		" vacía el cargador de su fiel winchester sobre " + play.victim + ".");

//El cazador muere
	object.players[play.client] = "DEAD";
	object.currentDeaths.push(play.client);

	if(object.dia == 1){
		startNight(object);
	}else{
		endNight(object);
	}

	playedNextTurn(object);
	object.votation = {};

}

function vampiroMove(play, object) {
	//Si la victima aun no ha sido votada le ponemos un 1, si ya lo ha sido le sumanos 1
	if (object.votation[play.victim] == null) object.votation[play.victim] = 1;
	else object.votation[play.victim]++;
	object.played[play.client] = 0;
	if (countNumVotes(object) == countRol("VAMPIRO", object)) {
		var i = mostVotedPlayer(object);
		if (i == "") {
			object.logs.push("Los vampiros han sido demasiado sibaritas esta" +
				"noche (parece que hoy ayunarán).");
		} else {
			object.currentDeaths.push(i);
			object.logs.push(play.victim + ", puedes correr, puedes suplicar, puedes " +
				"tratar inútilmente de esconderte, pero no escaparás de tu destino. " +
				"Los vampiros te acechan y cada vez los oyes más cerca. Reza lo que sepas.");
		}
		object.turno = nextRol("VAMPIRO", object);
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
	}//j rol por el que vamos
	if (j >= rolOrder.length - 1) {
		return endNight(object);
	}//si es el ultimo entonces end night
	else {
		j++;
		while (j < rolOrder.length) {
			if (countRol(rolOrder[j], object) > 0) {
				// si la bruja ya no puede jugar mas nos la saltamos
				if (rolOrder[j] == "BRUJA" && object.availableBrujaActions == 0) {
					j++;
					continue;
				}
				return rolOrder[j];
			}
			j++;
		}//siguiente rol o si no end night
		return endNight(object);
	}

}

function endNight(object) {
	processDeaths(object);

	if (object.turno == "GRANJEROS_WON" || object.turno == "VAMPIROS_WON" || object.turno == "TIE") {
		return object.turno;
	}

	if (object.turno != "CAZAVAMPIROS") {
		object.dia = 1;
		object.turno = "POPULAR_VOTATION";
		for (var i in object.players) {
			if (object.players[i] != "DEAD") {
				object.played[i] = 1;
			}
		}
		object.logs.push("Los primeros rayos de sol se asoman por el horizonte " +
			"y los aldeanos pueden seguir un día más con sus miserables vidas.");
	}
	else return "CAZAVAMPIROS";

	return "POPULAR_VOTATION";
}

function startNight(object) {
	processDeaths(object);
	if (object.turno != "CAZAVAMPIROS" && object.turno != "GRANJEROS_WON" && object.turno != "VAMPIROS_WON" && object.turno != "TIE") {
		object.dia = 0;
		object.logs.push("El ocaso se acerca y con él la sed de sangre de los " +
			"vampiros. Rezad vuestras plegarias.");
		object.turno = rolOrder[0];
	}
}

function processDeaths(object) {
	for (var i in object.currentDeaths) {
		if (object.players[object.currentDeaths[i]] == "CAZAVAMPIROS") {//Si el cazador muere, será su turno
			object.logs.push("¡Idiotas! " + object.currentDeaths[i] + " era un " +
				"famoso cazavampiros y no morirá sin oponer resistencia hasta su " +
				"último aliento." );
			object.turno = "CAZAVAMPIROS";
			playedNextTurn(object);
			object.currentDeaths.splice(i, 1);
		} else {
			object.logs.push((object.currentDeaths[i] + " ha muerto."));
			//El jugador muere
			object.players[object.currentDeaths[i]] = "DEAD";
		}
	}
	object.currentDeaths = [];
	checkWin(object);
}

function checkWin(object)//Comprueba si un bando ha ganado
{
	var cazavampirosAlive = false;
	var vampirosLeft = 0;
	var granjerosLeft = 0;
	for (var i in object.players) {
		if (object.players[i] == "VAMPIRO") {
			vampirosLeft++;
		}
		else if (object.players[i] != "DEAD") {
			if (object.players[i] == "CAZAVAMPIROS") {
				cazavampirosAlive = true;
			}
			granjerosLeft++;
			cosasQuePasan += "Ha entrado en granjerosLeft '\n'";
		}
	}

	if (vampirosLeft == 0) {
		object.turno = "GRANJEROS_WON";
		object.gameState = "FINISHED";
	} else if (cazavampirosAlive && granjerosLeft == 1 && vampirosLeft == 1) {
		object.turno = "TIE";
		object.gameState = "FINISHED";
	}
	else if (granjerosLeft == 0) {
		object.turno = "VAMPIROS_WON";
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
		else {
			object.played[i] = 0;
		}
	}
}
