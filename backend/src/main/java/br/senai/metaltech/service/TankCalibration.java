package br.senai.metaltech.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Ajuste linear calibrado por dois pontos: hex 0x0050 -> 5cm; 0x0331 -> 50cm.
 * Não interpretar diretamente bruto como mm sem confirmar a documentação IODD.
 */
@Component
public class TankCalibration {
    private final int empty, full;

    public TankCalibration(@Value("${metaltech.tank-empty-raw:817}") int empty,
            @Value("${metaltech.tank-full-raw:80}") int full) {
        if (empty == full)
            throw new IllegalArgumentException("Calibracao invalida");
        this.empty = empty;
        this.full = full;
    }

    public double distanceCm(int raw) {
        return Math.max(5, Math.min(50, 5.0 + (raw - full) * 45.0 / (empty - full)));
    }

    public double levelPercent(int raw) {
        return Math.max(0, Math.min(100, (50 - distanceCm(raw)) * 100.0 / 45.0));
    }
}
