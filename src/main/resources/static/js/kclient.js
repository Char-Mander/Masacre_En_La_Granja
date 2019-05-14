function addNewPlayerToLobby(name) {
	const miembros = document.getElementsByClassName("miembros");
	miembros[0].innerHTML = miembros[0].innerHTML + "<td>" + name + "</td>";
}

function reciveChatMessage(message) {
	const lineOutput = document.getElementById("recibido");
	lineOutput.value = lineOutput.value + '\n' + message.propietario + ": " + message.mensaje;
}

const handleNewPlayer = (name) => {
	addNewPlayerToLobby(name);
}

const handleChatMessage = (chatMessage) => {
	reciveChatMessage(chatMessage);
}

const handleNuevoEstado = (newState) => {
	reciveStatus(newState);
}

const handleMessage = (o) => {
	console.log(o);
	if (o.newPlayer) handleNewPlayer(o.newPlayer);
	if (o.chatMessage) handleChatMessage(o.chatMessage);
	if (o.nuevoEstado) handleNuevoEstado(o.nuevoEstado);
}

window.addEventListener('load', () => {
	if (config.socketUrl !== false) {
		ws.initialize(config.socketUrl);
	}
	ws.receive = (text) => {
		console.log("just in:", text);
		try {
			const o = JSON.parse(text);
			handleMessage(o);
		} catch (e) {
			console.log("...not json: ", e);
		}
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
	 * Sends a string to the server via the websocket.
	 * @param {string} text to send 
	 * @returns nothing
	 */
	send: (text) => {
		if (ws.socket != null) {
			ws.socket.send(text);
		}
	},

	/**
	 * Default action when text is received. 
	 * @returns
	 */
	receive: (text) => {
		console.log(text);
		obj = JSON.parse(text);
		handleMessage(obj);
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

/**
 * Actions to perform once the page is fully loaded
 */
window.addEventListener('load', () => {
	if (config.socketUrl !== false) {
		ws.initialize(config.socketUrl);
	}

});