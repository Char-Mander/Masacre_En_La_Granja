package es.ucm.fdi.iw.control;

import es.ucm.fdi.iw.model.Acciones;
import es.ucm.fdi.iw.model.Game;
import es.ucm.fdi.iw.model.Status;
import es.ucm.fdi.iw.model.User;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.persistence.EntityManager;
import javax.script.Invocable;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;
import javax.servlet.http.HttpSession;
import javax.transaction.Transactional;

import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;

@RestController()
@RequestMapping("api")
public class ApiController {

	private static final Logger log = LogManager.getLogger(ApiController.class);

	@Autowired
	private EntityManager entityManager;

	@Autowired
	private IwSocketHandler iwSocketHandler;

	@PostMapping("chat/enviar")
	@Transactional
	public ResponseEntity<?> enviar(HttpSession session, @RequestBody String mensaje) {
		User user = (User) session.getAttribute("user"); // <-- este usuario no está conectado a la bd
		user = entityManager.find(User.class, user.getId()); // <-- obtengo usuario de la BD

		Game g = user.getActiveGame();

		List<User> users = new ArrayList<>(g.getUsers());
		String message = "{" + "\"chatMessage\": {" + "\"propietario\":\"" + user.getName() + "\"," + "\"mensaje\":\""
				+ mensaje + "\"}}";
		Status s = g.getStatusObj();
		String rolPropietario = s.players.get(user.getName());
		for (User u : users) {
			if (rolPropietario.equals("DEAD") && s.players.get(u.getName()).equals("DEAD")) {
				iwSocketHandler.sendText(u.getName(), message);
			} else if (s.dia == 1) {
				if (!rolPropietario.equals("DEAD") && !s.players.get(u.getName()).equals("DEAD")) {
					iwSocketHandler.sendText(u.getName(), message);
				}
			} else if (s.dia == 0) {
				if (rolPropietario.equals("VAMPIRO") && s.players.get(u.getName()).equals("VAMPIRO")) {
					iwSocketHandler.sendText(u.getName(), message);
				}
			}
		}
		log.debug("Mensaje enviado [{}]", mensaje);
		return ResponseEntity.status(HttpStatus.OK).build();
	}

	// Función para comprobar que el nombre del user que se va a registrar no existe
	@PostMapping("user/loginOk/{name}")
	public ResponseEntity<?> existingName(@PathVariable String name) {
		// Mirar en la base de datos mágicamente para ver si está creado
		Long usersWithLogin = entityManager.createNamedQuery("User.HasName", Long.class).setParameter("userName", name)
				.getSingleResult();
		// si creado
		if (usersWithLogin == 0)
			return ResponseEntity.status(HttpStatus.OK).build();
		return ResponseEntity.status(HttpStatus.NOT_ACCEPTABLE).build();
	}

	@PostMapping("/game/receivePlay")
	@Transactional
	public ResponseEntity<?> receivePlay(HttpSession session, @RequestBody String jugada) {

		User user = (User) session.getAttribute("user"); // <-- este usuario no está conectado a la bd
		user = entityManager.find(User.class, user.getId()); // <-- obtengo usuario de la BD

		Game g = user.getActiveGame();
		if (g == null)
			return ResponseEntity.badRequest().build();
		/*
		 * INICIO SEGURIDAD!!!
		 */
		Status s = g.getStatusObj();
		Acciones a = s.accionesStringToObj(jugada);
		// Si nombre no coincide
		if (!user.getName().equals(a.client))
			return ResponseEntity.badRequest().build();
		// Si está muerto
		if (s.players.get(a.client).equals("DEAD"))
			return ResponseEntity.badRequest().build();
		// Si rol no coincide
		if (!s.players.get(user.getName()).equals(a.rol) && !a.rol.equals("POPULAR_VOTE"))
			return ResponseEntity.badRequest().build();
		// Si vampiro vota a vampiro por la noche
		if (a.rol.equals(s.players.get(a.victim)) && !a.rol.equals("POPULAR_VOTE") && !a.rol.equals("BRUJA"))
			return ResponseEntity.badRequest().build();
		// Si la víctima no existe o esta muerta
		if (!a.option.equals("0")) {
			boolean victimaValida = false;
			for (User i : g.getUsers()) {
				if (i.getName().equals(a.victim) && !s.players.get(a.victim).equals("DEAD")) {
					if (a.rol.equals("BRUJA") && a.option.equals("1")) {
						for (String mueriendo : s.currentDeaths) {
							if (a.victim.equals(mueriendo))
								return ResponseEntity.badRequest().build();
						}
					} else if (a.rol.equals("BRUJA") && a.option.equals("2") && s.currentDeaths.size() == 0)
						return ResponseEntity.badRequest().build();
					victimaValida = true;
					break;
				}
			}
			if (!victimaValida)
				return ResponseEntity.badRequest().build();
		}
		// Si no ha jugado ya
		if (s.played.get(user.getName()) == 0)
			return ResponseEntity.badRequest().build();
		// Si es la bruja y puede hacer esa accion
		if (a.rol.equals("BRUJA") && s.availableBrujaActions != 3) {
			if (s.availableBrujaActions == 2 && a.option.equals("1"))
				return ResponseEntity.badRequest().build();
			if (s.availableBrujaActions == 1 && a.option.equals("2"))
				return ResponseEntity.badRequest().build();
		}

		/*
		 * FIN SEGURIDAD!!!
		 */

		List<User> users = new ArrayList<>(g.getUsers());

		String[] result = procesarJugada(jugada, g.getStatus());
		if (result == null) 
			return ResponseEntity.badRequest().build();
		String nuevoEstado = result[1];
		log.info("NUEVO ESTADO --> " + nuevoEstado);
		String turnoAnterior = s.turno;
		g.setStatus(nuevoEstado);
		entityManager.persist(g);
		entityManager.flush();
		Status nuevoEstadoObj = g.getStatusObjFromString(nuevoEstado);
		if (nuevoEstadoObj.turno.equals("BRUJA") && !nuevoEstadoObj.turno.equals(turnoAnterior)
				&& nuevoEstadoObj.availableBrujaActions != 0) {
			// TRIPLE BARRA SI O SI
			// Hay que hacer doble escapado de las comillas
			// uno para el string y otro para el json
			String divBruja = "<div id=\\\"controls\\\" style=\\\"display:flex\\\"> "
					+ "<div class=\\\"haMuerto\\\" id=\\\"haMuerto\\\">"
					+ ((nuevoEstadoObj.currentDeaths.size() > 0) ? "Va a morir: " + nuevoEstadoObj.currentDeaths.get(0)
							: "Hoy no va a morir nadie")
					+ "</div>" + "<div id=\\\"AllControls\\\" class=\\\"control\\\">"
					+ "<div id=\\\"controlA\\\" class=\\\"control\\\">Matar</div>"
					+ "<div id=\\\"controlB\\\" class=\\\"control\\\">Proteger</div>"
					+ "<div id=\\\"controlC\\\" class=\\\"control\\\">Pasar</div>" + "</div>" + "</div>";
			String mensaje = "{" + "\"mostrarBruja\":{ \"divBruja\":\"" + divBruja + "\", \"availableBrujaActions\":"
					+ nuevoEstadoObj.availableBrujaActions + ", \"gonnaDie\": \""
					+ ((nuevoEstadoObj.currentDeaths.size() > 0) ? nuevoEstadoObj.currentDeaths.get(0) : null) + "\"}}";
			for (User u : users) {
				if (!g.getStatusObj().players.get(u.getName()).equals("BRUJA"))
					continue;
				iwSocketHandler.sendText(u.getName(), mensaje);
			}
		} else if (!nuevoEstadoObj.turno.equals(turnoAnterior) || nuevoEstadoObj.gameState.equals("FINISHED")) {
			String mensaje = "{" + "\"ocultarBruja\": \"a\"}";
			for (User u : users) {
				if (!g.getStatusObj().players.get(u.getName()).equals("BRUJA"))
					continue;
				iwSocketHandler.sendText(u.getName(), mensaje);
			}
		}

		if (nuevoEstadoObj.gameState.equals("FINISHED")) {
			String divFin = "<div id=\\\"finalizar_partida\\\" style=\\\"display:flex\\\">"
					+ "<form action=\\\"/user/searchGame\\\" method=\\\"GET\\\">"
					+ "<button type=\\\"submit\\\" id=\\\"finalizar\\\" class=\\\"boton\\\">Jugar otra vez</button>"
					+ "</form>" + "<form action=\\\"/user/\\\" method=\\\"GET\\\">"
					+ "<button type=\\\"submit\\\" id=\\\"perfil\\\" class=\\\"boton\\\">Volver al perfil</button>"
					+ "</form>" + "</div>";
			String mensaje = "{" + "\"mostrarFinPartida\":\"" + divFin + "\"}";
			for (User u : users) {
				iwSocketHandler.sendText(u.getName(), mensaje);
				if (g.getStatusObj().oldRols.get(u.getName()).equals("BRUJA"))
					iwSocketHandler.sendText(u.getName(), "{" + "\"ocultarBruja\": \"a\"}");
			}
		}

		String object = result[0];

		String message = "{" + "\"nuevoEstado\":" + object + "}";

		for (User u : users) {
			iwSocketHandler.sendText(u.getName(), message);
		}
		log.debug("Jugada enviada: [{}]", jugada);
		return ResponseEntity.status(HttpStatus.OK).build();
	}

	private String[] procesarJugada(String jugada, String state) {

		ScriptEngineManager manager = new ScriptEngineManager();
		ScriptEngine engine = manager.getEngineByName("JavaScript");
		// read script file
		try {
			engine.eval(new InputStreamReader(getClass().getResourceAsStream("/static/js/partidaServidor.js"))); // relativo
																													// a
			// src/main/resources
		} catch (ScriptException e) {
			log.warn("Error loading script", e);
		}

		Invocable inv = (Invocable) engine;
		String[] result = null;
		// call function from script file
		try {
			result = (String[]) inv.invokeFunction("receivePlay", state, jugada);
		} catch (NoSuchMethodException | ScriptException e) {
			log.warn("Error running script", e);
		}
		log.warn(result);
		return result;
	}

	@PostMapping("/game/getStatus")
	@Transactional
	public ResponseEntity<String> getGameStatus(HttpSession session) {

		User user = (User) session.getAttribute("user"); // <-- este usuario no está conectado a la bd
		user = entityManager.find(User.class, user.getId()); // <-- obtengo usuario de la BD

		Game g = user.getActiveGame();
		if (g == null)
			return ResponseEntity.badRequest().build();
		return ResponseEntity.ok(g.getStatus());
	}

	// Función para comprobar que la partida puede empezar
	@PostMapping("/lobby/startGameOk/{gameID}")
	@Transactional
	public ResponseEntity<?> enoughPlayers(@PathVariable String gameID) {
		// Mirar en la base de datos mágicamente para ver si está creado
		Game game = entityManager.createNamedQuery("Game.getGame", Game.class)
				.setParameter("gameID", Long.parseLong(gameID)).getSingleResult();

		if (game.canBegin())
			return ResponseEntity.status(HttpStatus.OK).build();
		return ResponseEntity.status(HttpStatus.NOT_ACCEPTABLE).build();
	}
}
