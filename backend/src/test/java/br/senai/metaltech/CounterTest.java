package br.senai.metaltech;

import br.senai.metaltech.service.Counter;
import br.senai.metaltech.model.Material;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import java.time.Instant;

class CounterTest {
    @Test
    void metallicPulseRegistersExactlyOnce() {
        Counter c = new Counter();
        Instant t = Instant.parse("2026-11-11T21:00:00Z");
        int n = 0;
        for (int i = 0; i < 45; i++) {
            int cap = i >= 4 && i <= 25 ? 5000 : 500;
            int ind = i >= 10 && i <= 12 ? 10000 : 32736;
            if (c.accept(t.plusMillis(i * 30L), cap, ind).orElse(null) == Material.METAL)
                n++;
        }
        assertEquals(1, n);
    }

    @Test
    void nonmetalIsOneEventAcrossBriefGap() {
        Counter c = new Counter();
        Instant t = Instant.parse("2026-11-11T21:00:00Z");
        int n = 0;
        for (int i = 0; i < 55; i++) {
            boolean present = (i >= 4 && i <= 8) || (i >= 11 && i <= 25);
            if (c.accept(t.plusMillis(i * 30L), present ? 1900 : 500, 32736).orElse(null) == Material.NON_METAL)
                n++;
        }
        assertEquals(1, n);
    }
}
