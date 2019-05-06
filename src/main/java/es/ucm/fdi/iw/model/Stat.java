package es.ucm.fdi.iw.model;

import javax.persistence.*;
import java.util.List;

/**
 * A general statistic, such as "number of games won"
 */
@Entity
public class Stat {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private long id;
	
	private String name;
	private String description;
	private String code;

	@OneToMany
	@JoinColumn(name="stat_id")
	private List<UserStat> userStats;

	public long getId() {
		return id;
	}

	public void setId(long id) {
		this.id = id;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}

	public String getCode() {
		return code;
	}

	public void setCode(String code) {
		this.code = code;
	}

	public List<UserStat> getUserStats() {
		return userStats;
	}

	public void setUserStats(List<UserStat> userStats) {
		this.userStats = userStats;
	}
}
