package es.ucm.fdi.iw.control;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import javax.persistence.EntityManager;
import javax.servlet.http.HttpSession;
import javax.transaction.Transactional;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import es.ucm.fdi.iw.model.Acciones;
import es.ucm.fdi.iw.model.Game;
import es.ucm.fdi.iw.model.Item;
import es.ucm.fdi.iw.model.Status;
import es.ucm.fdi.iw.model.User;

@Controller
@RequestMapping("stat")
public class StatController {

    private static final Logger log = LogManager.getLogger(RootController.class);

    @Autowired
    private IwSocketHandler iwSocketHandler;

    @Autowired
    private EntityManager entityManager;

    @PostMapping("/")
    @Transactional
    public String countGanadas(Model model, HttpSession session) {

        User user = (User) session.getAttribute("user"); // <-- este usuario no está conectado a la bd
        user = entityManager.find(User.class, user.getId()); // <-- obtengo usuario de la BD

        List<Item> us = new ArrayList<>();
        List<User> users = entityManager.createNamedQuery("User.All", User.class).getResultList();
        for(User u: users){
            List<Game> games = u.getGames();

            int ganadas = 0;
            int perdidas = 0;
            int empatadas = 0;
    
            for (Game g : games) {
                Status s = g.getStatusObj();
                if (s.gameState.equals("FINISHED")) {
                    if (s.turno.equals("VAMPIROS_WON") && s.oldRols.get(u.getName()).equals("VAMPIRO")) {
                        ganadas++;
                    } else if (s.turno.equals("GRANJEROS_WON") && !s.oldRols.get(u.getName()).equals("VAMPIRO")) {
                        ganadas++;
                    } else if (s.turno.equals("TIE")) {
                        empatadas++;
                    } else {
                        perdidas++;
                    }
                }
            }

            
            Item i = new Item();
            i.wins = ganadas;
            i.losts = perdidas;
            i.name = u.getName();
            i.average = (100*ganadas/(perdidas+empatadas));

            us.add(i);
    
        }
        us = burbuja(us);
        List<Item> fin = new ArrayList<>();
        for(int i=0; i<10; i++){
            Item item = us.get(i);
            item.pos = i+1;
            fin.add(item);
        }
        model.addAttribute("item", fin);
        return "estadisticasGlobales";

    }

    private static List<Item> burbuja(List<Item> A) {
        int i, j, aux;
        for (i = 0; i < A.size() - 1; i++) {
            for (j = 0; j < A.size() - i - 1; j++) {
                if (A.get(j + 1).wins < A.get(j).wins) {
                    aux = A.get(j + 1).wins;
                    A.get(j + 1).wins = A.get(j).wins;
                    A.get(j).wins = aux;
                }
            }
        }
        return A;
    }
}