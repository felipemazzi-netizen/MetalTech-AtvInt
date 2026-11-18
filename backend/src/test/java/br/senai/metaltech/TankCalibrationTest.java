package br.senai.metaltech;

import br.senai.metaltech.service.TankCalibration;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class TankCalibrationTest {
    @Test
    void endpoints() {
        TankCalibration c = new TankCalibration(817, 80);
        assertEquals(5, c.distanceCm(80), .01);
        assertEquals(50, c.distanceCm(817), .01);
        assertEquals(100, c.levelPercent(80), .01);
        assertEquals(0, c.levelPercent(817), .01);
    }
}
