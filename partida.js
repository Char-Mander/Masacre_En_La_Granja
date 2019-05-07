actualRol= "VAMPIRE";
endGame=0;
numPlayers = 8;
players= [[]];
option = -1;
for(i=0; i<numPlayers; i++)
{
    players[i]=[];//player rol
    players[i][1]=0;//the player has played flag FOR DEBUG
}
players[0][0] = "VAMPIRE";
players[1][0] = "HUNTER";
players[2][0] = "FARMER";
players[3][0] = "FARMER";
players[4][0] = "FARMER";
players[5][0] = "VAMPIRE";
players[6][0] = "FARMER";
players[7][0] = "FARMER";

clientPlayer = 0;
clientRol = players[clientPlayer];
//nextRound();


function vote(player)
{

    if((actualRol == players[clientPlayer][0] || actualRol == "POPULAR_VOTATION") && players[clientPlayer][0] != "DEAD"){
        if(players[clientPlayer][1] == 0 && player != clientPlayer){

            switch(actualRol)
            {
                case "VAMPIRE":
                    vampirePlay(player);
                    break;
                case "HUNTER":
                    hunterPlay(player);
                    break;
                case "POPULAR_VOTATION":
                    popularPlay(player);
                    break;
                case "WITCH":
                    witchPlay(player);
                    break;
                    
            }
        }
    }
}

function witchPlay(objetive)
{
    if(option < 0){
        noteEntry("Select an action, Witch");
    }
    else{
        document.getElementById('controls').style.display = 'none';
        players[clientPlayer][1] = 1;
        playJSON = {
        rol: 'WITCH',
        client: clientPlayer,
        victim: objetive,
        action: option,
    }
    reciveStatus(recivePlay(JSON.stringify(playJSON)));//provisional
    }
}

function popularPlay(victim_)
{
    players[clientPlayer][1] = 1;
    //Envía jugada al servidor vía Ajax
    noteEntry("Your vote is for Player "+ (victim_+1));
    playJSON = {
        rol: 'POPULAR_VOTE',
        client: clientPlayer,
        victim: victim_,
    }
    reciveStatus(recivePlay(JSON.stringify(playJSON)));//provisional
}

function vampirePlay(victim_)
{
    players[clientPlayer][1] = 1;
    noteEntry("Your victim is Player "+ (victim_+1));
    //Envía jugada al servidor vía Ajax
    playJSON = {
        rol: 'VAMPIRE',
        client: clientPlayer,
        victim: victim_,
    }
    reciveStatus(recivePlay(JSON.stringify(playJSON)));//provisional

}

function hunterPlay(victim_)
{
    players[clientPlayer][1] = 1;
    //Envía jugada al servidor vía Ajax
    noteEntry("You shot Player "+ (victim_+1));
    playJSON = {
        rol: 'HUNTER',
        client: clientPlayer,
        victim: victim_,
    }
    reciveStatus(recivePlay(JSON.stringify(playJSON)));//provisional

}


/*function statusUpdate() {//Para consultar
    this.id = '';
    this.deaths = [];
    this.logs = [];
    this.newRol ='';
}*/

function reciveStatus(newStateJSON)//Actualiza el estado del cliente via websocket
{
    var newState = JSON.parse(newStateJSON);
    switch(newState.id)
    {
        case "VAMPIRES_VOTED":
            actualRol = newState.newRol;
            resetPlay();
            
            break;
        case "POPULAR_VOTED":
            actualRol = newState.newRol;
            resetPlay();
            break;
        case "HUNTER_SHOT":
            actualRol = newState.newRol;
            resetPlay();
            break;
        case "FARMERS_WON":
            actualRol="";
            noteEntry("The vampires have been eliminated. FARMERS WIN!");
            endGame =1;
            break;
        case "VAMPIRES_WON":
            actualRol="";
            noteEntry("The weak farmers have fallen. VAMPIRES WIN!");
            endGame=1;
            break;

    }
    if(newState.deaths.length >0) updateDeaths(newState.deaths);
    if(!endGame)printLogs(newState.logs);
}

function repeatPlay(rol)
{
    for (var i = 0; i < players.length; i++) {
        if(players[i][0] == rol){
            players[i][1] = 0;
        }
    }
}

function resetPlay()
{
    for (var i = 0; i < players.length; i++) {
        players[i][1] = 0;
    }
}

function updateDeaths(deaths)
{
    for(i=0; i < deaths.length; i++){
        players[deaths[i]][0] = "DEAD";
        noteEntry("Player "+ (deaths[i]+1) +" has died!");
        document.getElementById('player'+(deaths[i]+1)+'card').innerHTML = "DEAD";
    }
}

function logEntry(message)
{
    date= new Date();
    document.getElementById('log').innerHTML += "\n"+ date.getHours()+":"
                                                    + date.getMinutes()+":"
                                                    + date.getSeconds()+"  "
                                                    +message;
}
function noteEntry(message)
{
    document.getElementById('note').innerHTML = message;
}
function printLogs(logs)
{
    for(i =0; i< logs.length; i++){
        logEntry(logs[i]);
    }
}

document.getElementById("card1").addEventListener("click", function() 
{ vote(0);})
document.getElementById("card2").addEventListener("click", function() 
{ vote(1);})
document.getElementById("card3").addEventListener("click", function() 
{ vote(2);})
document.getElementById("card4").addEventListener("click", function() 
{ vote(3);})
document.getElementById("card5").addEventListener("click", function() 
{ vote(4);})
document.getElementById("card6").addEventListener("click", function() 
{ vote(5);})
document.getElementById("card7").addEventListener("click", function() 
{ vote(6);})
document.getElementById("card8").addEventListener("click", function() 
{ vote(7);})

document.getElementById("controlA").addEventListener("click", function() 
{ option = 1;})
document.getElementById("controlB").addEventListener("click", function() 
{ option = 2;})
document.getElementById("controlC").addEventListener("click", function() 
{ option = 0; vote(-1);)}

//FOR DEBUG
document.getElementById("player1").addEventListener("click", function() 
{ changePlayer(0);})
document.getElementById("player2").addEventListener("click", function() 
{ changePlayer(1);})
document.getElementById("player3").addEventListener("click", function() 
{ changePlayer(2);})
document.getElementById("player4").addEventListener("click", function() 
{ changePlayer(3);})
document.getElementById("player5").addEventListener("click", function() 
{ changePlayer(4);})
document.getElementById("player6").addEventListener("click", function() 
{ changePlayer(5);})
document.getElementById("player7").addEventListener("click", function() 
{ changePlayer(6);})
document.getElementById("player8").addEventListener("click", function() 
{ changePlayer(7);})


function changePlayer(player)
{
    clientPlayer = player;
    clientRol = players[clientPlayer][0];
    document.getElementById('plaNo').innerHTML = "You are Player " +(player+1);
    document.getElementById('plaRol').innerHTML = clientRol;
    if(clientRol == "WITCH" && actualRol == clientRol){
          document.getElementById('controls').style.display = 'flex';  
    }else{
         document.getElementById('controls').style.display = 'none';
    }

}

