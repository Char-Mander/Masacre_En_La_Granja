package es.ucm.fdi.iw.control;

import es.ucm.fdi.iw.LocalData;
import es.ucm.fdi.iw.model.Game;
import es.ucm.fdi.iw.model.Status;
import es.ucm.fdi.iw.model.User;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.authentication.WebAuthenticationDetails;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.util.FileCopyUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import javax.persistence.EntityManager;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.transaction.Transactional;
import java.io.*;
import java.security.Principal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

@Controller()
@RequestMapping("user")
public class UserController {

	private static final Logger log = LogManager.getLogger(UserController.class);

	@Autowired
	private PasswordEncoder passwordEncoder;

	@Autowired
	private EntityManager entityManager;

	@Autowired
	private IwSocketHandler iwSocketHandler;

	@Autowired
	private LocalData localData;

	@Autowired
	private AuthenticationManager authenticationManager;

	@GetMapping("/{id}")
	public String getUser(@PathVariable long id, Model model, HttpSession session) {
		User u = entityManager.find(User.class, id);
		model.addAttribute("user", u);
		//log.info("Games of user: " + u.getGames());
		return "user";
	}

	@PostMapping("/{id}")
	@Transactional
	public String postUser(@PathVariable long id, @ModelAttribute User edited,
			@RequestParam(required = false) String pass2, Model model, HttpSession session) {
		User target = entityManager.find(User.class, id);
		model.addAttribute("user", target);

		User requester = (User) session.getAttribute("u");
		if (requester.getId() != target.getId() && !requester.hasRole("ADMIN")) {
			return "user";
		}

		// ojo: faltaria más validación
		if (edited.getPassword() != null && edited.getPassword().equals(pass2)) {
			target.setPassword(edited.getPassword());
		}
		target.setName(edited.getName());
		return "user";
	}

	@GetMapping(value = "/{id}/photo")
	public StreamingResponseBody getPhoto(@PathVariable long id, Model model) throws IOException {
		File f = localData.getFile("user", "" + id);
		InputStream in;
		if (f.exists()) {
			in = new BufferedInputStream(new FileInputStream(f));
		} else {
			in = new BufferedInputStream(
					getClass().getClassLoader().getResourceAsStream("static/img/unknown-user.jpg"));
		}
		return new StreamingResponseBody() {
			@Override
			public void writeTo(OutputStream os) throws IOException {
				FileCopyUtils.copy(in, os);
			}
		};
	}

	@PostMapping("/{id}/photo")
	public String postPhoto(@RequestParam("photo") MultipartFile photo, @PathVariable("id") String id, Model model,
			HttpSession session) {
		User target = entityManager.find(User.class, Long.parseLong(id));
		model.addAttribute("user", target);

		// check permissions
		User requester = (User) session.getAttribute("user");
		if (requester.getId() != target.getId() && !requester.hasRole("ADMIN")) {
			return "user";
		}

		log.info("Updating photo for user {}", id);
		File f = localData.getFile("user", id);
		if (photo.isEmpty()) {
			log.info("failed to upload photo: emtpy file?");
		} else {
			try (BufferedOutputStream stream = new BufferedOutputStream(new FileOutputStream(f))) {
				byte[] bytes = photo.getBytes();
				stream.write(bytes);
			} catch (Exception e) {
				log.info("Error uploading " + id + " ", e);
			}
			log.info("Successfully uploaded photo for {} into {}!", id, f.getAbsolutePath());
		}
		return "redirect:/user/" + id;
	}

	@GetMapping("/register")
	public String getRegister(Model model) {
		return "registro";
	}

	/**
	 * Registra a un usuario e inicia sesión automáticamente con el usuario creado.
	 * 
	 * @param model
	 * @param request
	 * @param principal
	 * @param userName     Nombre del usuario creado
	 * @param userPassword Contraseña introducida por el usuario
	 * @param session
	 * @return
	 */
	@PostMapping("/register")
	@Transactional
	public String register(Model model, HttpServletRequest request, Principal principal, @RequestParam String userName,
			@RequestParam String userPassword, @RequestParam String userPassword2,
			@RequestParam("userPhoto") MultipartFile userPhoto, HttpSession session) {

		Long usersWithLogin = entityManager.createNamedQuery("User.HasName", Long.class)
				.setParameter("userName", userName).getSingleResult();

		// if the user exists, or the password doesn't match
		// Comprobación de que las dos contraseñas insertadas son iguales
		if (usersWithLogin != 0 || !userPassword.equals(userPassword2)) {
			return "redirect:/user/register";
		}

		// Creación de un usuario
		String userPass = userPassword;
		User u = new User();
		u.setName(userName);
		u.setPassword(passwordEncoder.encode(userPass));
		u.setRole("USER");
		entityManager.persist(u);
		entityManager.flush();
		log.info("Creating & logging in student {}, with ID {} and password {}", userName, u.getId(), userPass);

		doAutoLogin(userName, userPassword, request);
		log.info("Created & logged in student {}, with ID {} and password {}", userName, u.getId(), userPass);

		if (!userPhoto.isEmpty()) {
			File f = localData.getFile("user", String.valueOf(u.getId()));
			try (BufferedOutputStream stream = new BufferedOutputStream(new FileOutputStream(f))) {
				byte[] bytes = userPhoto.getBytes();
				stream.write(bytes);
			} catch (Exception e) {
				log.info("Error uploading photo for user with ID {}", u.getId());
			}
			log.info("Successfully uploaded photo for {} into {}!", u.getId(), f.getAbsolutePath());
		}

		session.setAttribute("user", u);

		return "redirect:/user/" + u.getId();
	}

	@GetMapping("/login")
	public String getLogin(Model model) {
		return "iniciosesion";
	}

	@PostMapping("/login")
	@Transactional
	public String login(Model model, HttpServletRequest request, Principal principal, @RequestParam String userName,
			@RequestParam CharSequence userPassword, HttpSession session) {

		Long usersWithLogin = entityManager.createNamedQuery("User.HasName", Long.class)
				.setParameter("userName", userName).getSingleResult();

		// if the user exists, we check the if the password is correct
		if (usersWithLogin != 0) {
			// Se saca la constraseña del usuario que se está loggeando
			String pass = entityManager.createNamedQuery("User.Password", String.class)
					.setParameter("userName", userName).getSingleResult();

			// Se compara la contraseña introducida con la contraseña cifrada de la BD
			boolean correct = passwordEncoder.matches(userPassword, pass);
			log.info("The passwords match: {}", correct);
			if (correct) {
				User u = entityManager.createNamedQuery("User.ByName", User.class).setParameter("userName", userName)
						.getSingleResult();

				session.setAttribute("user", u);
				return "redirect:/user/" + u.getId(); // Devuelve el usuario loggeado
			} else {
				return "redirect:/user/login";
			}
		}

		return "redirect:/user/register";
	}

	@GetMapping("/logout")
	public String logout(Model model, HttpSession session) {
		session.setAttribute("user", null);
		return "redirect:/user/login";
	}

	@GetMapping("/searchGame")
	public String searchGame() {
		return "buscarPartida";
	}

	/**
	 * Non-interactive authentication; user and password must already exist
	 * 
	 * @param username
	 * @param password
	 * @param request
	 */
	private void doAutoLogin(String username, String password, HttpServletRequest request) {
		try {
			// Must be called from request filtered by Spring Security, otherwise
			// SecurityContextHolder is not updated
			UsernamePasswordAuthenticationToken token = new UsernamePasswordAuthenticationToken(username, password);
			token.setDetails(new WebAuthenticationDetails(request));
			Authentication authentication = authenticationManager.authenticate(token);
			log.debug("Logging in with [{}]", authentication.getPrincipal());
			SecurityContextHolder.getContext().setAuthentication(authentication);
		} catch (Exception e) {
			SecurityContextHolder.getContext().setAuthentication(null);
			log.error("Failure in autoLogin", e);
		}
	}

	/*
	 * ELIMINAR ANTES DE LA ENTREGA
	 */
	@GetMapping("/gameStarted")
	public String probarGameStarted(Model model, HttpSession session) {
		String json = "{\"momento\": \"inLobby\",\"esDeDia\": 1,\"users\":[4,35,18,26,97,35],\"userIdRol\":{\"4\": \"vampiro\",\"35\": \"granjero\",\"18\": \"vampiro\",\"26\": \"bruja\",\"97\": \"granjero\",\"35\": \"granjero\"},\"userIdAlive\":{\"4\": 1,\"35\": 0,\"18\": 0,\"26\": 0,\"97\": 1,\"35\": 0},\"enamorados\":[18,35],\"acciones\": [{\"rol\": \"vampiro\",\"client\": 18,\"victim\": 97,\"action\": \"\"}]}";
		Game g = new Game();
		g.setStatus(json);
		log.debug(g.getStatus());
		Boolean empezada = g.started();
		model.addAttribute("empezada", empezada);
		model.addAttribute("game", g);
		return "pruebas/partidaEmpezada";
	}

	/*
	 * DEJARLO DE MOMENTO ELIMINAR ANTES DE LA ENTREGA
	 */
	@GetMapping("/pruebaChat")
	@Transactional
	public String pruebaChat(Model model, HttpSession session) {
		Game g = new Game();
		List<User> users = new ArrayList<User>();
		User tor = entityManager.createNamedQuery("User.ByName", User.class).setParameter("userName", "tor")
				.getSingleResult();
		User mac = entityManager.createNamedQuery("User.ByName", User.class).setParameter("userName", "mac")
				.getSingleResult();
		users.add(tor); 
		users.add(mac); 
		g.setUsers(users);
		
		Status s = new Status();
		s.dia = 0;
		s.momento = "ingame";
		s.players = new HashMap<Long, String>();
		s.players.put((long) 1, "VAMPIRE");
		s.players.put((long) 2, "VAMPIRE");

		g.setStatus(g.getStatusStringFromObj(s));
		List<Game> lg = new ArrayList<Game>(); lg.add(g);
		tor.setGames(lg);
		mac.setGames(lg);
		entityManager.persist(g);
		entityManager.persist(tor);
		entityManager.persist(mac);
		entityManager.flush();

		model.addAttribute("game", g);
		session.setAttribute("game", g);

		return "pruebas/pruebaChat";
	}
}
