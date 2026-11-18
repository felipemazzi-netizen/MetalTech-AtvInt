package br.senai.metaltech.repo;

import br.senai.metaltech.model.SensorReading;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ReadingRepository extends JpaRepository<SensorReading, Long> {
    Optional<SensorReading> findTopByDistanceCmIsNotNullOrderByObservedAtDesc();

    List<SensorReading> findTop1000ByOrderByObservedAtDesc();

    List<SensorReading> findByObservedAtAfterOrderByObservedAtAsc(Instant t);
}
