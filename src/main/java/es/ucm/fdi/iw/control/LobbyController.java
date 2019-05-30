package es.ucm.fdi.iw.control;

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

    @Autowired
    private IwSocketHandler iwSocketHandler;

    @Transactional
    public void addUserToGame(User user, Game game) {
        if (!game.getUsers().contains(user)) { // Añadimos al usuario si no está ya dentro
            game.addUser(user);
            user.getGames().add(game);
            entityManager.persist(user);
            entityManager.persist(game);
            entityManager.flush();
            List<User> users = new ArrayList<>(game.getUsers());
            String message = "{\"newPlayer\": \" " + user.getName() + " \" }";
            for (User u : users) {
                if (u == user)
                    continue;
                iwSocketHandler.sendMessageLobby(u.getName(), message);
            }
        }
    }

    @Transactional
    @GetMapping("/newgame")
    public String newGame(HttpSession session) {
        User user = (User) session.getAttribute("user");
        user = entityManager.find(User.class, user.getId());
        Game activeGame = user.getActiveGame();
        
        if (activeGame != null) {
            return "redirect:/game/";
        }
        
        Game game = new Game();
        game.setCreationTime(Date.valueOf(LocalDate.now()));
        game.initLobby();
        addUserToGame(user, game);
        return "redirect:/lobby/" + game.getId();
    }

    @GetMapping("/{idGame}")
    @Transactional
    public String showLobby(Model model, @PathVariable String idGame) {
        Game game = entityManager.find(Game.class, Long.parseLong(idGame));
        return getLobby(model, game);
    }

    @PostMapping("/{idGame}")
    @Transactional
    public String showLobbyPost(Model model, @PathVariable String idGame) {
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
            model.addAttribute("errorMessage", "¡Esa partida no existe!");
            return "elegirPartida";
        } else if (game.started()) {
             model.addAttribute("errorMessage", "¡La partida ya ha empezado!");
            return "elegirPartida";
        } else {
            User user = (User) session.getAttribute("user");
            user = entityManager.find(User.class, user.getId());
    
            addUserToGame(user, game);
            return getLobby(model, game);
        }
    }

    @PostMapping("/{idGame}/leave")
    @Transactional
    public String leaveLobby(HttpSession session, @PathVariable String idGame) {
        User user = (User) session.getAttribute("user");
        Game game = entityManager.find(Game.class, Long.parseLong(idGame));

        if (game != null && !game.started()) {
            user = entityManager.find(User.class, user.getId());
            game.getUsers().remove(user);
            user.getGames().remove(game);
            entityManager.persist(user);
            entityManager.persist(game);
            entityManager.flush();
    
            List<User> users = new ArrayList<>(game.getUsers());
            String message = "{\"removePlayer\": \"" + user.getName() + "\" }";
            for (User u : users) {
                if (u != user) {
                    iwSocketHandler.sendMessageLobby(u.getName(), message);
                }
            }
        }

        return "redirect:/user/searchGame";
    }
  
    @GetMapping("select")
    public String showSelect() {
        return "elegirPartida";
    }

    @PostMapping("select")
    @Transactional
    public String selectGame(Model model, HttpSession session, @RequestParam String gameID) {
        return joinLobby(model, session, gameID);
    }

    @GetMapping("/random")
    @Transactional
    public String randomGame(Model model, HttpSession session) {
        List<Game> games = entityManager.createNamedQuery("Game.all", Game.class).getResultList();
        Iterator<Game> iterator = games.iterator();
        Game game = null;

        while(iterator.hasNext()) {
        	Game g = iterator.next();
        	if(!g.started())
        		game = g;
        }

        if (game != null) {
            return joinLobby(model, session, String.valueOf(game.getId()));
        } else { // Si no hay un juego disponible, entonces lo crea
            return newGame(session);
        }
    }
}
