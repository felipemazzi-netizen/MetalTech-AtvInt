package br.senai.metaltech.service;

import br.senai.metaltech.model.*;
import br.senai.metaltech.repo.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.*;

@Service
public class IngestionService {
    private final ReadingRepository readings;
    private final PieceRepository pieces;
    private final TankCalibration tank;
    private final Counter counter = new Counter();

    public IngestionService(ReadingRepository readings, PieceRepository pieces, TankCalibration tank) {
        this.readings = readings;
        this.pieces = pieces;
        this.tank = tank;
    }

    public record Sample(Instant observedAt, String x01Hex, String x02Hex, String x03Hex) {
    }

    public record Result(long accepted, long registered) {
    }

    static Integer parse(String hex) {
        if (hex == null || hex.isBlank())
            return null;
        if (!hex.matches("(?i)[0-9a-f]{1,8}"))
            throw new IllegalArgumentException("Hex invalido: " + hex);
        long n = Long.parseLong(hex, 16);
        if (n > Integer.MAX_VALUE)
            throw new IllegalArgumentException("Hex fora do intervalo");
        return (int) n;
    }

    @Transactional
    public synchronized Result ingest(List<Sample> batch) {
        if (batch == null || batch.isEmpty() || batch.size() > 500)
            throw new IllegalArgumentException("Lote deve conter de 1 a 500 amostras");
        long n = 0;
        for (Sample sample : batch) {
            Instant t = sample.observedAt() == null ? Instant.now() : sample.observedAt();
            if (t.isAfter(Instant.now().plusSeconds(30)) || t.isBefore(Instant.now().minusSeconds(86400)))
                throw new IllegalArgumentException("Timestamp fora da janela");
            Integer x1 = parse(sample.x01Hex()), x2 = parse(sample.x02Hex()), x3 = parse(sample.x03Hex());
            Double cm = x1 == null ? null : tank.distanceCm(x1), level = x1 == null ? null : tank.levelPercent(x1);
            readings.save(new SensorReading(t, x1, x2, x3, cm, level));
            Optional<Material> material = counter.accept(t, x2, x3);
            if (material.isPresent()) {
                pieces.save(new Piece(material.get(), t));
                n++;
            }
        }
        return new Result(batch.size(), n);
    }
}
