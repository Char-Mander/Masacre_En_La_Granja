package es.ucm.fdi.iw.model;

import java.io.IOException;
import java.sql.Date;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Random;

import javax.persistence.*;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import es.ucm.fdi.iw.control.RootController;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

/**
 */
@Entity
@NamedQueries({ @NamedQuery(name = "Game.all", query = "SELECT x FROM Game x"),

		@NamedQuery(name = "Game.getGame", query = "SELECT g FROM Game g WHERE g.id = :gameID"),

				@NamedQuery(name = "Game.active", query = "SELECT g FROM Game g WHERE g.status NOT LIKE '%finished%'")
			})
public class Game {
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private long id;
	private Date creationTime;
	private String password; // null si la partida no es privada

	@Column(length = 4096)
	private String status; // JSON que se mapea a clase Status

	@ManyToMany(mappedBy = "games")
	private List<User> users = new ArrayList<>();

	public Game() {
	}
	
	public static String getIcon(String rol) {
		String icon = "";
		
		if (rol.equals("VAMPIRE")) {
			icon = "\uD83E\uDDDB\u200D♂️";
		} else if (rol.equals("FARMER")) {
			icon = "\uD83D\uDC68\u200D\uD83C\uDF3E ";
		} else if (rol.equals("WITCH")) {
			icon = "\uD83E\uDDD9\u200D♀️";
		} else if (rol.equals("HUNTER")) {
			icon = "\uD83C\uDFF9";
		} else {
			icon = "⚰";
		}
		
		return icon;
	}
	
	public boolean allowAccess(String _password) {
		return password.equals(_password);
	}

	public long getId() {
		return id;
	}

	public void setId(long id) {
		this.id = id;
	}

	public Date getCreationTime() {
		return creationTime;
	}

	public void setCreationTime(Date creation_time) {
		this.creationTime = creation_time;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public void setUsers(List<User> users) {
		this.users = users;
	}

	public List<User> getUsers() {
		return users;
	}

	public void addUser(User user) {
		users.add(user);
	}

	public void removeUser(User user) {
		users.remove(user);
	}

	public String getPassword() {
		return password;
	}

	public void setPassword(String password) {
		this.password = password;
	}

	public Status getStatusObj(){
		ObjectMapper mapper = new ObjectMapper();
		Status s = null;
		try {
			s = mapper.readValue(this.status, Status.class);
		} catch (IOException e) {
			e.printStackTrace();
		}
		return s;
	}

	public Status getStatusObjFromString(String str){
		ObjectMapper mapper = new ObjectMapper();
		Status s = null;
		try {
			s = mapper.readValue(str, Status.class);
		} catch (IOException e) {
			e.printStackTrace();
		}
		return s;
	}

	public String getStatusStringFromObj(Status s){
		String st = "";
		ObjectMapper mapper = new ObjectMapper();
		try {
            st = mapper.writeValueAsString(s);
        } catch (JsonProcessingException e) {
            e.printStackTrace();
		}
		return st;
	}

	public void initLobby() {
        ObjectMapper mapper = new ObjectMapper();
        Status st = new Status();
        st.gameState = "inLobby";
    
        try {
            status = mapper.writeValueAsString(st);
        } catch (JsonProcessingException e) {
            e.printStackTrace();
        }
    }

	/**
	 * @return a boolean telling if the game has started
	 */
	public boolean started() {
		Status s = this.getStatusObj();
		return !s.gameState.equals("inLobby");
	}

	public Boolean finished(){
		Status s = this.getStatusObj();
		return s.gameState.equals("FINISHED");
	}
	
	public boolean equals(Object other) {
		return  other instanceof Game && id == ((Game) other).id;
	}
    
    public boolean canBegin() {
        return users.size() >= 2;
    }

    public void init() {
        Status st = new Status();
		st.turno = "VAMPIRE";
		st.gameState = "INGAME";
        st.dia = 0;
        st.currentDeaths = new ArrayList<>();
        st.votes = new HashMap<>();
        st.acciones = new ArrayList<>();
        st.played = new HashMap<>();
		st.players = new HashMap<>();
		st.availableWitchActions = 3;
        
        String[] roles = initialRoles();
        Random random = new Random();
        
        for(User user : users) {
            int pos;
            
            if (users.size() != st.players.size()) {
                pos = random.nextInt(users.size() - st.players.size());
            } else {
                pos = 0;
            }
            
            st.players.put(user.getName(), roles[pos]);
            
            if(roles[pos].equals("VAMPIRE")) {
            	st.played.put(user.getName(), 1);
			} else {
            	st.played.put(user.getName(), 0);
			}
            
            roles[pos] = roles[users.size() - st.players.size()];
        }
        
    	status = getStatusStringFromObj(st);
    }
    
    private String[] initialRoles() {
        int count = 0;
        String[] roles = new String[users.size()];
        
        for(; count < 1 || count < users.size() / 4; ++count) {
            roles[count] = "VAMPIRE";
        }

		roles[count] = "WITCH";
		++count;
/*        roles[count] = "HUNTER";
        ++count;
*/
        
        for(; count < users.size(); ++count) {
            roles[count] = "FARMER";
        }
        
        return roles;
    }
}
