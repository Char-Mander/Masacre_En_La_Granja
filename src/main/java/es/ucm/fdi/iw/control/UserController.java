package es.ucm.fdi.iw.control;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.security.Principal;

import javax.persistence.EntityManager;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.transaction.Transactional;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.util.FileCopyUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.authentication.WebAuthenticationDetails;

import es.ucm.fdi.iw.LocalData;
import es.ucm.fdi.iw.model.User;

@Controller()
@RequestMapping("user")
public class UserController {
	
	private static final Logger log = LogManager.getLogger(UserController.class);
	
	@Autowired 
	private PasswordEncoder passwordEncoder;
	
	@Autowired 
	private EntityManager entityManager;
	
	@Autowired
	private LocalData localData;
	
	@Autowired 
	private AuthenticationManager authenticationManager;

	@GetMapping("/{id}")
	public String getUser(@PathVariable long id, Model model, HttpSession session) {
		User u = entityManager.find(User.class, id);
		model.addAttribute("user", u);
		return "user";
	}

	@PostMapping("/{id}")
	@Transactional
	public String postUser(@PathVariable long id, 
			@ModelAttribute User edited, 
			@RequestParam(required=false) String pass2,
			Model model, HttpSession session) {
		User target = entityManager.find(User.class, id);
		model.addAttribute("user", target);
		
		User requester = (User)session.getAttribute("u");
		if (requester.getId() != target.getId() &&
				! requester.hasRole("ADMIN")) {			
			return "user";
		}
		
		// ojo: faltaria más validación
		if (edited.getPassword() != null && edited.getPassword().equals(pass2)) {
			target.setPassword(edited.getPassword());
		}		
		target.setName(edited.getName());
		return "user";
	}	
	
	@GetMapping(value="/{id}/photo")
	public StreamingResponseBody getPhoto(@PathVariable long id, Model model) throws IOException {		
		File f = localData.getFile("user", ""+id);
		InputStream in;
		if (f.exists()) {
			in = new BufferedInputStream(new FileInputStream(f));
		} else {
			in = new BufferedInputStream(getClass().getClassLoader()
					.getResourceAsStream("static/img/unknown-user.jpg"));
		}
		return new StreamingResponseBody() {
			@Override
			public void writeTo(OutputStream os) throws IOException {
				FileCopyUtils.copy(in, os);
			}
		};
	}
	
	@PostMapping("/{id}/photo")
	public String postPhoto(@RequestParam("photo") MultipartFile photo,
			@PathVariable("id") String id, Model model, HttpSession session){
		User target = entityManager.find(User.class, Long.parseLong(id));
		model.addAttribute("user", target);
		
		// check permissions
		User requester = (User)session.getAttribute("u");
		if (requester.getId() != target.getId() &&
				! requester.hasRole("ADMIN")) {			
			return "user";
		}
		
		log.info("Updating photo for user {}", id);
		File f = localData.getFile("user", id);
		if (photo.isEmpty()) {
			log.info("failed to upload photo: emtpy file?");
		} else {
			try (BufferedOutputStream stream =
					new BufferedOutputStream(new FileOutputStream(f))) {
				byte[] bytes = photo.getBytes();
				stream.write(bytes);
			} catch (Exception e) {
				log.info("Error uploading " + id + " ", e);
			}
			log.info("Successfully uploaded photo for {} into {}!", id, f.getAbsolutePath());
		}
		return "user";
	}
	
	
	@GetMapping("/register")
	public String getEnter(Model model) {
		return "registro";
	}
	
	/**
	 * Registra a un usuario e inicia sesión automáticamente con el usuario creado.
	 * @param model
	 * @param request
	 * @param principal
	 * @param userName	Nombre del usuario creado
	 * @param userPassword	Contraseña introducida por el usuario
	 * @param session
	 * @return
	 */
	@PostMapping("/register")
	@Transactional
	public String register(Model model, HttpServletRequest request, Principal principal, @RequestParam String userName,
			@RequestParam String userPassword, @RequestParam String userPassword2, HttpSession session) {

		Long usersWithLogin = entityManager.createNamedQuery("User.HasName", Long.class)
				.setParameter("userName", userName).getSingleResult();
		
		// if the user exists, we have a problem
		if (usersWithLogin != 0) {
			return "user";	// Crear una plantilla que muestre información del usuario logeado
		}

		//	Comprobación de que las dos contraseñas insertadas son iguales
		if(!userPassword.equals(userPassword2)) {
			return "redirect:/user/register";
		}
		
		// Creación de un usuario
		String userPass = passwordEncoder.encode(userPassword);
		User u = new User();
		u.setName(userName);
		u.setPassword(passwordEncoder.encode(userPass));
		u.setRole("USER");
		entityManager.persist(u);
		entityManager.flush();
		log.info("Creating & logging in student {}, with ID {} and password {}", userName, u.getId(), userPass);

		doAutoLogin(userName, userPassword, request);
		log.info("Created & logged in student {}, with ID {} and password {}", userName, u.getId(), userPass);
		
		session.setAttribute("user", u);

		return "redirect:/user/" + u.getId();
	}
	
	/**
	 * Non-interactive authentication; user and password must already exist
	 * @param username
	 * @param password
	 * @param request
	 */
	private void doAutoLogin(String username, String password, HttpServletRequest request) {
	    try {
	        // Must be called from request filtered by Spring Security, otherwise SecurityContextHolder is not updated
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
	
}
