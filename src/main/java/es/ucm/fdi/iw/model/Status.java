package es.ucm.fdi.iw.model;

import java.util.List;
import java.util.Map;

public class Status {
    /*JSON de ejemplo
    {
        momento: 'vampirosVotan',
        esDeDia: 1,
        users:[4,35,18,26,97,35],
        userIdRol:{
            4: 'vampiro',
            35: 'granjero',
            18: 'vampiro',
            26: 'bruja',
            97: 'granjero',
            35: 'granjero'
        },
        userIdAlive:{
            4: 1,
            35: 0,
            18: 0,
            26: 0,
            97: 1,
            35: 0
        },
        enamorados:[18,35],
        acciones: [
            {
                rol: 'vampiro',
                client: 18,
                victim: 97,
                action: ''
            }
        ]
    }
    */
    public String momento; //En que momento del juego estamos (turno)
    /*
    inLobby

    */
    public Integer esDeDia; //0 = si; 1 = no // Integer porque para Dani es mas facil que Boolean
    public List<Long> users; //Lista de Ids de los usuarios de la partida
    public Map<Long, String> userIdRol; //Map id de usuario con su rol correspondiente
    public Map<Long, Integer> userIdAlive; //0 = vivo; 1 = muerto //Map id de usuario para ver si esta vivo o muerto
    public List<Long> enamorados; //Contiene dos elementos que son el Id de los jugadores enamorados
    public List<Acciones> acciones; //Es un JSON y habria que pensar si crear otra clase para mapearlo

}