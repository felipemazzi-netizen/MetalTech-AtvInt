package br.senai.metaltech.repo;

import br.senai.metaltech.model.SensorDevice;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SensorDeviceRepository extends JpaRepository<SensorDevice, Long> {
}
