//Informacion de la partida
dia=0;//0 noche , 1 dia
players_= [];
players_[0] = "VAMPIRE";
players_[1] = "HUNTER";
players_[2] = "FARMER";
players_[3] = "FARMER";
players_[4] = "FARMER";
players_[5] = "VAMPIRE";
players_[6] = "FARMER";
players_[7] = "FARMER";
votation = [];
votes = [];

function statusUpdate() {
	this.id = '';
	this.deaths = [];
	this.logs = [];
	this.newRol ='';
}
/*Para consultar
playJSON = {
    rol: 'VAMPIRE',
    client: client,
    victim: victim_,
}
*/

function recivePlay(playJSON)//Tambien recibirá el estado de la partida
{
	//Se hactualiza la infromación de la partida desde la BD

	//Get the player, rol, and action of the play and process it
	var play = JSON.parse(playJSON);
	object = new statusUpdate();
	switch(play.rol)
	{
		case 'VAMPIRE':
			vampireMove(play, object); //Se le envía el nuevo estado al servidor
			return JSON.stringify(object);
			break;
		case 'HUNTER':
			hunterMove(play, object);
			return JSON.stringify(object);
			break;
		case 'POPULAR_VOTE':
			popularMove(play, object);
			return JSON.stringify(object);
			break;
	}
}

function popularMove(play, object)
{
	votation.push(play.victim);
	if(votation.length == countMaxVotes())
	{
		resetVotes();
		i =evenRepeatVotationCount();
		if(i<0)
		{
			//Repite Votacion
			object.logs.push("Votation tied and there is no time to vote again...");
			object.id = 'POPULAR_VOTED';
            startNight(object);
		}
		else
		{
			object.deaths.push(i);
            object.logs.push("The farmers decided hang Player "+ (play.victim+1));
			object.id = 'POPULAR_VOTED';
			startNight(object);
		}
		votation = [];
	}
	else {
		object.id = 'CONTINUE_VOTATION';
		object.logs.push("Player " + (play.client+1) +" voted Player " + (play.victim+1)+"!");
	}
}

function hunterMove(play, object)
{
	object.deaths.push(play.victim);
	object.id  = 'HUNTER_SHOT';
	object.logs.push("Player "+ (play.client+1) +" has shot Player "+ (play.victim+1) +"!")
	players_[play.client] = "DEAD";
	//El cazador muere
	object.deaths.push(play.client);
	if(dia){//Si le ha matado el pueblo, empieza la noche
		startNight(object);
	}
	else{//Si le han matado los vampiros, termina la noche
        endNight(object);
	}

}

function vampireMove(play, object)
{
	votation.push(play.victim);
	if(votation.length == countVampires())
	{
		resetVotes();
		i =evenRepeatVotationCount();
		if(i<0)
		{
			//Repite Votacion
			object.logs.push("Vampires couldn't decide who to kill!");
			object.id = 'VAMPIRES_VOTED';
            endNight(object);
		}
		else
		{
			object.deaths.push(i);
			object.id = 'VAMPIRES_VOTED';
			endNight(object);//Termina la noche (provisional, esto lo acabará haciendo la bruja)
		}
		votation = [];
	}
	else {object.id = 'CONTINUE_VOTATION'}
}

function evenRepeatVotationCount()
{
	greatest =-1;
    greatestVotes =-1;
    greatestEven = -1;
    for(i =0; i<votation.length; i++)
    {
    	votes[votation[i]]+=1;
    }
    for(i =0; i<votes.length; i++)
    {
        if(votes[i]>greatestVotes)
        {
            greatest = i;
            greatestVotes = votes[i];
        }
        else if(votes[i] == greatestVotes)
        {
        	greatestEven = greatestVotes;
        }
    }
    votes = [];
    if(greatestVotes == greatestEven)
    {
    	return -1;//Empate al mejor, se repite votacion
    }
    return greatest;//Mayoría
}


function endNight(object)
{
    processDeaths(object);
    if(object.newRol != "HUNTER"){
        dia = 1;
        object.newRol = "POPULAR_VOTATION";
        object.logs.push("The farmers wake up");
    }
	
	

}

function startNight(object)
{
    processDeaths(object);
    if(object.newRol != "HUNTER"){
        dia = 0;
        object.logs.push("The farmers go to bed...");
        object.newRol = "VAMPIRE";//Provisional, será el estrcito primer rol
    }
}

function processDeaths(object)
{
	for(i=0; i < object.deaths.length; i++){
		//Se recorren los jugadores que han muerto esa noche
		if(players_[object.deaths[i]] == "HUNTER" ){//Si el cazador muere, será su turno
			object.logs.push("Player " +(object.deaths[i]+1) + " was the Hunter, and wants retribution!");
			object.newRol = "HUNTER";
			object.deaths.splice(i,1);
		}
		else{
			object.logs.push("Player "+ (object.deaths[i]+1) +" has died!");
			//El jugador muere
			players_[object.deaths[i]] = "DEAD";
		}
	}
    checkWin(object);
}

function checkWin(object)//Comprueba si un bando ha ganado
{
	vampiresLeft = 0;
	farmersLeft = 0;
	for(i=0; i<players_.length; i++){
		if(players_[i] == "VAMPIRE"){vampiresLeft++;}
		else if(players_[i] != "DEAD"){farmersLeft++;}
	}
	if(vampiresLeft == 0){object.id = "FARMERS_WON";}
	else if(farmersLeft == 0){object.id = "VAMPIRES_WON";}
}

function countVotes()
{
    greatest =0;
    greatestVotes =0;
    for(i =0; i<votes.length; i++)
    {
        if(votes[i]>greatestVotes)
        {
            greatest = i;
            greatestVotes = votes[i];
        }
    }
    votes = [];
    return greatest;
}

function countMaxVotes()
{
	people =0;
	for(i=0; i<players_.length; i++){
		if(players_[i] != "DEAD"){
			people++;
		}
	}
	return people;
}

function countVampires()
{
	vampires =0;
	for(i=0; i<players_.length; i++){
		if(players_[i] == "VAMPIRE"){
			vampires++;
		}
	}
	return vampires;
}

function resetVotes()
{
    for(i =0; i < players.length; i++)
    {
        votes[i]=0;
    }
}