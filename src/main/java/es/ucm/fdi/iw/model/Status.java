package es.ucm.fdi.iw.model;

import java.io.IOException;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;

public class Status {

    public String gameState; 
    public String turno;
    public Integer dia; //0 = si; 1 = no
    public Map<String, String> players; // Map de nombre de jugador con su rol (que puede ser DEAD)
    public Map<String, String> oldRols; //	Map de nombre de jugador con su rol anterior (no puede ser DEAD; para desvelar el rol cuando un jugador muere)
    //public List<Long> enamorados; //Contiene dos elementos que son el Id de los jugadores enamorados
    public List<Acciones> acciones; //Es un JSON y habria que pensar si crear otra clase para mapearlo
    public List<String> currentDeaths; //Esto es para modelo.js // lista de nombres de los que estan muriendo
    public Map<String, Integer> votes; //Esto es para modelo.js // lista de nombres votados con recuento de votos
    public Map<String, Integer> played; // contiene todos los jugadores. Se mantiene a 0 (jugado). Se pone a 1 cuando se inicia un turno solo a los que pueden jugar.
    public Integer availableBrujaActions; //0 = Ninguna, 1 = matar, 2 = revivir, 3 = ambas

    public Acciones accionesStringToObj(String strAccion){
        ObjectMapper mapper = new ObjectMapper();
		Acciones a = null;
		try {
			a = mapper.readValue(strAccion, Acciones.class);
		} catch (IOException e) {
			e.printStackTrace();
		}
		return a;
    }
}