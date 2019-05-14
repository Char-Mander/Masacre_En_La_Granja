const handleNewPlayer = (name) => {
	addNewPlayerToLobby(name);
}

/**
 * Añade un nuevo jugador al lobby del juego que va a empezar
 * 
 * @param name Nombre del jugador a añadir
 * @returns
 */
function addNewPlayerToLobby(name) {
	const miembros = document.getElementsByClassName("miembros");
	miembros[0].innerHTML = miembros[0].innerHTML + "<td>" + name + "</td>";
}


const handleChatMessage = (chatMessage) => {
	receiveChatMessage(chatMessage);
}

/**
 * Muestra el mensaje recibido por la pantalla del chat
 * 
 * @param message Mensaje que se muestra por pantalla
 * @returns
 */
function receiveChatMessage(message) {
	const lineOutput = document.getElementById("recibido");
	lineOutput.value = lineOutput.value + '\n' + message.propietario + ": " + message.mensaje;
}

/**
 * Distingue entre un mensaje del chat y la adición de un nuevo
 * jugador al lobby de la partida.
 * 
 * Formato del JSON de mensaje de chat:
 * 	{ "chatMessage": {"propietario": "nombre", "mensaje": "hola"} }
 * 
 * Formato del JSON de nuevo jugador:
 * 	{ "newPlayer": "nombre" }
 * 
 */
const handleMessage = (o) => {
	console.log(o);
	if (o.newPlayer) handleNewPlayer(o.newPlayer);
	if (o.chatMessage) handleChatMessage(o.chatMessage);
}

window.addEventListener('load', () => {
	if (config.socketUrl !== false) {
		ws.initialize(config.socketUrl);
	}
	
	window.setInterval(() => { }, 5000);
});

/**
			 * WebSocket API, which only works once initialized
			 */
const ws = {

	/**
	 * WebSocket, or null if none connected
	 */
	socket: null,

	/**
	 * Default action when text is received. 
	 * @returns
	 */
	receive: (text) => {
		console.log("just in:", text);
	try {
		const o = JSON.parse(text);
		handleMessage(o);
	} catch (e) {
		console.log("...not json: ", e);
	}
	},

	/**
	 * Attempts to establish communication with the specified
	 * web-socket endpoint. If successfull, will call 
	 * @returns
	 */
	initialize: (endpoint) => {
		try {
			ws.socket = new WebSocket(endpoint);
			ws.socket.onmessage = (e) => ws.receive(e.data);
			console.log("Connected to WS '" + endpoint + "'")
		} catch (e) {
			console.log("Error, connection to WS '" + endpoint + "' FAILED: ", e);
		}
	}
}
