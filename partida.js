actualRol= "VAMPIRE";
            actualTurn =-1;
            numPlayers = 8;
            players= [[]];
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
                    if(players[clientPlayer][1] == 0){
                        
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
                        }
                    }
                }
            }

            function popularPlay(victim_)
            {
                players[clientPlayer][1] = 1;
                //Envía jugada al servidor vía Ajax
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
                logEntry("You pray is Player "+ (victim_+1));
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
                    case "VAMPIRES_EVEN":
                        repeatPlay("VAMPIRE");
                        break;
                    case "VAMPIRES_VOTED":
                        actualRol = newState.newRol;
                        resetPlay();
                        break;
                    case "POPULAR_EVEN":
                        repeatPlay("VAMPIRE");
                        break;
                    case "POPULAR_VOTED":
                        actualRol = newState.newRol;
                        resetPlay();
                        break;
                    case "HUNTER_SHOT":
                        actualRol = newState.newRol;
                        resetPlay();
                        break;
                }
                if(newState.deaths.length >0) updateDeaths(newState.deaths);
                printLogs(newState.logs);
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

            }