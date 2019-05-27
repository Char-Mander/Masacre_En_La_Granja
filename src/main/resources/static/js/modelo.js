rolOrder = [];
rolOrder[0] = "VAMPIRE";
rolOrder[1] = "WITCH";

function statusUpdate() {
	this.id = '';
	this.deaths = [];
	this.logs = [];
	this.newRol = '';
	this.currentDeaths = [];
	this.votation = {};
	this.votes = {};
	this.dia = 0;//0 noche , 1 dia
	this.players = {};
	this.played = [];
}

function receivePlay(oldStateJSON, playJSON)//Tambien recibirá el estado de la partida
{
	//Se actualiza la infromación de la partida desde la BD
	var oldState = JSON.parse(oldStateJSON);
	//Get the player, rol, and action of the play and process it
	var play = JSON.parse(playJSON);
	object = new statusUpdate();
	object.currentDeaths = oldState.currentDeaths;
	object.dia = oldState.dia;
	object.players = oldState.players;
	object.votation = oldState.votes;
	object.played = oldState.played;
	switch (play.rol) {
		case 'VAMPIRE':
			vampireMove(play, object); //Se le envía el nuevo estado al servidor
			break;
		case 'HUNTER':
			hunterMove(play, object);
			break;
		case 'POPULAR_VOTE':
			popularMove(play, object);
			break;
		case 'WITCH':
			witchMove(play, object);
			break;
	}
	object.deaths = object.currentDeaths;
	object.acciones = oldState.acciones;
	object.acciones.push(play);

	var newStatus = {
		momento: object.id,
		dia: object.dia,
		players: object.players,
		acciones: object.acciones,
		currentDeaths: object.currentDeaths,
		votes: object.votation,
		played: object.played
	};

	return Java.to([JSON.stringify(object), JSON.stringify(newStatus)],"java.lang.String[]");
}

function witchMove(play, object) {
	if (play.action != 0) {
		if (play.action == 1) {//Bruja mata
			object.currentDeaths.push(play.victim);
			object.logs.push("The witch slayed Player " + play.victim + " tonight!");
		} else if (play.action == 2) {//Bruja revive
			object.currentDeaths = [];
			object.logs.push("The witch revived Player " + play.victim + " tonight!");
		}
	}
	object.id = 'WITCH_PLAYED';
	endNight(object); //La bruja acaba la noche    
}

function popularMove(play, object) {
	object.votation[play.victim]++;
	if (object.votation.length == countMaxVotes(object)) {
		resetVotes(object);
		i = evenRepeatVotationCount();
		if (i < 0) {
			//Repite Votacion
			object.logs.push("Votation tied and there is no time to vote again...");
		}
		else {
			object.currentDeaths.push(i);
			object.logs.push("The farmers decided hang Player " + play.victim);
		}
		object.id = 'POPULAR_VOTED';
		startNight(object);
		object.votation = [];
	}
	else {
		object.id = 'CONTINUE_VOTATION';
		object.logs.push("Player " + play.client + " voted Player " + play.victim + "!");
	}
}

function hunterMove(play, object) {
	object.currentDeaths.push(play.victim);
	object.id = 'HUNTER_SHOT';
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
	if(object.votation[play.victim] == null) object.votation[play.victim] = 1;
	else object.votation[play.victim]++;
	object.played[play.client] = 0;
	if (countNumVotes(object) == countRol("VAMPIRE",object)) {
		i = evenRepeatVotationCount(object);
		if (i == "") {
			object.logs.push("Vampires couldn't decide who to kill!");
			//object.id = 'REPEAT_NIGTH';???
		}
		else {
			object.currentDeaths.push(i);
			//object.id = 'VAMPIRES_VOTED';
		}
		object.id = 'VAMPIRES_VOTED';
		object.newRol = nextRol("VAMPIRE", object);
		playedYourTurn(object);
		object.votation = {};
	}
	else {
		object.id = 'CONTINUE_VOTATION';
	}
}

function evenRepeatVotationCount(object) {
	greatest = "";
	greatestVotes = -1;
	greatestEven = -1;

	for (i in object.votation) {
		if (object.votation[i] > greatestVotes) {
			greatest = i;
			greatestVotes = object.votation[i];
		} else if (object.votation[i] == greatestVotes) {
			greatestEven = greatestVotes;
		}
	}
	if (greatestVotes == greatestEven) {
		return "";//Empate
	}
	return greatest;//Mayoría
}

function nextRol(rol, object) {
	j = 0;
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
	if (object.newRol != "HUNTER") {
		object.dia = 1;
		object.newRol = "POPULAR_VOTATION";
		object.logs.push("The farmers wake up");
	}
	return "POPULAR_VOTATION";



}

function startNight(object) {
	processDeaths(object);
	if (object.newRol != "HUNTER") {
		object.dia = 0;
		object.logs.push("The farmers go to bed...");
		object.newRol = rolOrder[0];
		object.currentDeaths = [];
	}
}

function processDeaths(object) {
	for (i in object.currentDeaths) {
		if (object.players[object.currentDeaths[i]] == "HUNTER") {//Si el cazador muere, será su turno
			object.logs.push(object.currentDeaths[i] + " was the Hunter, and wants retribution!");
			object.newRol = "HUNTER";
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
	vampiresLeft = 0;
	farmersLeft = 0;
	for (i in object.players) {
		if (object.players[i] == "VAMPIRE") { vampiresLeft++; }
		else if (object.players[i] != "DEAD") { farmersLeft++; }
	}
	if (vampiresLeft == 0) { object.id = "FARMERS_WON"; }
	else if (farmersLeft == 0) { object.id = "VAMPIRES_WON"; }
}

function countNumVotes(object){
	num = 0;
	for(i in object.votation){
		num += object.votation[i];
	}
	return num;
}

function countMaxVotes(object) {
	people = 0;
	for (i in object.players) {
		if (object.players[i] != "DEAD") {
			people++;
		}
	}
	return people;
}
function countRol(rol, object) {
	people = 0;
	for (i in object.players) {
		if (object.players[i] == rol) {
			people++;
		}
	}
	return people;
}

function playedYourTurn(object){
	for(i in object.players){
		if (object.players[i] == object.newRol
			|| (object.newRol == "POPULAR_VOTATION" && object.players[i] != "DEAD"))
			
				object.played[i] = 1;
	}
}