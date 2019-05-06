package es.ucm.fdi.iw.control;

import es.ucm.fdi.iw.LocalData;
import es.ucm.fdi.iw.model.Game;
import es.ucm.fdi.iw.model.User;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import javax.persistence.EntityManager;
import javax.servlet.http.HttpSession;
import javax.transaction.Transactional;
import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

@Controller
@RequestMapping("lobby")
public class LobbyController {
    
    private static final Logger log = LogManager.getLogger(LobbyController.class);
    
    @Autowired
    private EntityManager entityManager;
    
    @Transactional
    public void addUserToGame(HttpSession session, Game game) {
        User user = (User) session.getAttribute("user");     // <-- este usuario no está conectado a la bd
        user = entityManager.find(User.class, user.getId()); // <-- obtengo usuario de la BD
  
        if(!game.getUsers().contains(user)) { // Añadimos al usuario si no está ya dentro
            game.addUser(user);
            user.getGames().add(game);
            entityManager.persist(user);
            entityManager.persist(game);
            entityManager.flush();
        }
        
        if(game.canBegin()) {
            game.init();
        }
    }
    
    @Transactional
    @GetMapping("/newgame")
    public String newGame(HttpSession session) {
        Game game = new Game();
        game.setCreationTime(Date.valueOf(LocalDate.now()));
        game.initLobby();
        addUserToGame(session, game);
        return "redirect:/lobby/" + game.getId();
    }
    
    @GetMapping("/{idGame}")
    @Transactional
    public String showLobby(Model model, @PathVariable String idGame) {
        Game game = entityManager.find(Game.class, Long.parseLong(idGame));
        return getLobby(model, game);
    }
    
    @Transactional
    public String getLobby(Model model, Game game) {
        model.addAttribute("game", game);
        
        if (game != null) { // Si el juego exite
            log.info("El juego existe");
            List<User> users = new ArrayList<>(game.getUsers());
            model.addAttribute("jugadores", users);
        } else {
            log.info("El juego no existe");
        }
    
        return "lobby";
    }
    
    @GetMapping("/{idGame}/join")
    @Transactional
    public String joinLobby(Model model, HttpSession session, @PathVariable String idGame) {
        Game game = entityManager.find(Game.class, Long.parseLong(idGame));
        
        if (game == null) {
            return "redirect:/user/searchGame"; //TODO mensaje de error
        } else if (game.started()){
            return "redirect:/user/searchGame"; //TODO mensaje de error
        } else {
            addUserToGame(session, game);
            return getLobby(model, game);
        }
    }
    
    @PostMapping("/{idGame}/leave")
    @Transactional
    public String leaveLobby(HttpSession session, @PathVariable String idGame) {
        User user = (User) session.getAttribute("user");
        Game game = entityManager.find(Game.class, Long.parseLong(idGame));
        
        log.info("HOLA");
        if(game != null && !game.started()) {
            log.info("QUE TAL");
            user = entityManager.find(User.class, user.getId());
            log.info("ADIOS");
            game.getUsers().remove(user);
            user.getGames().remove(game);
            entityManager.persist(user);
            entityManager.persist(game);
            entityManager.flush();
        }
        
        return "redirect:/user/searchGame";
    }
    
    @GetMapping("select")
    public String showSelect() {
        return "elegirPartida";
    }
    
    @PostMapping("select")
    public String selectGame(@RequestParam String gameID) {
        return "redirect:/lobby/" + gameID + "/join";
    }
    
    @GetMapping("/random")
    @Transactional
    public String randomGame() {
        List<Game> games = entityManager.createNamedQuery("Game.all", Game.class).getResultList();
        Iterator<Game> iterator = games.iterator();
        Game game = null;
        
        if (iterator.hasNext()) {
            game = iterator.next();
            while (iterator.hasNext() && game.started()) {
                game = iterator.next();
            }
        }
        
        if (game != null) {
            return "redirect:/lobby/" + game.getId() + "/join";
        } else { // Si no hay un juego disponible, entonces lo crea
            return "redirect:/lobby/newgame";
        }
    }
}
