package br.senai.metaltech.model;

import jakarta.persistence.*;

@Entity
@Table(name = "sensor_devices")
public class SensorDevice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true)
    private Integer port;
    @Column(name = "sensor_type", nullable = false, length = 40)
    private String sensorType;
    @Column(length = 255)
    private String description;

    protected SensorDevice() {
    }

    public SensorDevice(Integer port, String type, String description) {
        this.port = port;
        this.sensorType = type;
        this.description = description;
    }

    public Long getId() {
        return id;
    }

    public Integer getPort() {
        return port;
    }

    public String getSensorType() {
        return sensorType;
    }

    public String getDescription() {
        return description;
    }

    public void update(Integer port, String type, String description) {
        this.port = port;
        this.sensorType = type;
        this.description = description;
    }
}
