package br.senai.metaltech.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "sensor_readings", indexes = { @Index(name = "idx_readings_time", columnList = "observed_at") })
public class SensorReading {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "observed_at", nullable = false)
    private Instant observedAt;
    @Column(name = "x01_raw")
    private Integer x01Raw;
    @Column(name = "x02_raw")
    private Integer x02Raw;
    @Column(name = "x03_raw")
    private Integer x03Raw;
    @Column(name = "distance_cm")
    private Double distanceCm;
    @Column(name = "tank_level")
    private Double tankLevel;

    protected SensorReading() {
    }

    public SensorReading(Instant t, Integer x1, Integer x2, Integer x3, Double cm, Double level) {
        observedAt = t;
        x01Raw = x1;
        x02Raw = x2;
        x03Raw = x3;
        distanceCm = cm;
        tankLevel = level;
    }

    public Long getId() {
        return id;
    }

    public Instant getObservedAt() {
        return observedAt;
    }

    public Integer getX01Raw() {
        return x01Raw;
    }

    public Integer getX02Raw() {
        return x02Raw;
    }

    public Integer getX03Raw() {
        return x03Raw;
    }

    public Double getDistanceCm() {
        return distanceCm;
    }

    public Double getTankLevel() {
        return tankLevel;
    }
}
