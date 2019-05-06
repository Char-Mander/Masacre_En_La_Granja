package es.ucm.fdi.iw.model;

import java.io.IOException;
import java.sql.Date;
import java.util.ArrayList;
import java.util.List;

import javax.persistence.*;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 */
@Entity
@NamedQueries({ @NamedQuery(name = "Game.all", query = "SELECT x FROM Game x") })
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

	public void initLobby() {
        ObjectMapper mapper = new ObjectMapper();
        Status st = new Status();
        st.momento = "inLobby";
    
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
		ObjectMapper mapper = new ObjectMapper();
		Boolean haEmpezado = false;
		try {
			Status aux = mapper.readValue(this.status, Status.class);
			haEmpezado = aux.momento.equals("inLobby");
		} catch (IOException e) {
			e.printStackTrace();
		}
		return !haEmpezado;
	}
	
	public boolean equals(Object other) {
		return  other instanceof Game && id == ((Game) other).id;
	}
    
    public boolean canBegin() {
        return users.size() >= 8;
    }
    
    public void init() {
        // TODO faltan cosas para inicializar realmente la partida
        ObjectMapper mapper = new ObjectMapper();
        Status st = new Status();
        st.momento = "playing";
        try {
            status = mapper.writeValueAsString(st);
        } catch (JsonProcessingException e) {
            e.printStackTrace();
        }
    }
}
