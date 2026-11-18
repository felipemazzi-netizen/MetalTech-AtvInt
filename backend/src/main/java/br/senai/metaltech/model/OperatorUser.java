package br.senai.metaltech.model;

import jakarta.persistence.*;

@Entity
@Table(name = "operator_users")
public class OperatorUser {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true, length = 80)
    private String username;
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;
    @Column(nullable = false)
    private String role;

    protected OperatorUser() {
    }

    public OperatorUser(String username, String passwordHash, String role) {
        this.username = username;
        this.passwordHash = passwordHash;
        this.role = role;
    }

    public Long getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getRole() {
        return role;
    }
}
