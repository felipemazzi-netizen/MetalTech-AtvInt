package br.senai.metaltech.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "pieces")
public class Piece {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private Material material;
    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    protected Piece() {
    }

    public Piece(Material material, Instant occurredAt) {
        this.material = material;
        this.occurredAt = occurredAt;
    }

    public Long getId() {
        return id;
    }

    public Material getMaterial() {
        return material;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }
}
