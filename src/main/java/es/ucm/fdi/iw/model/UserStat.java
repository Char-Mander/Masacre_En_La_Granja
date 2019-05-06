package es.ucm.fdi.iw.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

import javax.persistence.*;

/**
 */
@Entity
public class UserStat implements Serializable {

	private static final long serialVersionUID = 1L;

	private Integer status;
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private long id;
	
	@ManyToOne
	private User user;
	
	@ManyToOne
	private Stat stat;

	public User getUser() {
		return user;
	}

	public void setUser(User user) {
		this.user = user;
	}

	public Stat getStat() {
		return stat;
	}

	public void setStat(Stat stat) {
		this.stat = stat;
	}

	public Integer getStatus() {
		return status;
	}

	public void setStatus(Integer status) {
		this.status = status;
	}
	
	
}
