package br.senai.metaltech.service;

import br.senai.metaltech.model.Material;
import java.time.Instant;
import java.util.Optional;

/**
 * Estado por passagem, não por amostra. X02 inicia evento; X03 pode pulsar por
 * apenas ~60ms.
 */
public class Counter {
  private static final long EXIT_MS = 250;
  private static final long METAL_WINDOW_MS = 400;
  private boolean active = false, metallic = false;
  private Instant lastPresence, lastMetal;
  private int positives = 0;

  public synchronized Optional<Material> accept(Instant t, Integer cap, Integer ind) {
    // Falha de aquisição não equivale a ausência.
    if (ind != null && new InductiveSignal(ind).detected())
      lastMetal = t;
    if (cap == null || ind == null)
      return Optional.empty();
    Signal presenceSignal = new CapacitiveSignal(cap);
    boolean present = presenceSignal.detected();
    if (present) {
      positives++;
      if (!active && positives >= 2) {
        active = true;
        metallic = false;
      }
      if (active) {
        lastPresence = t;
        if (new InductiveSignal(ind).detected()
            || (lastMetal != null && Math.abs(t.toEpochMilli() - lastMetal.toEpochMilli()) <= METAL_WINDOW_MS))
          metallic = true;
      }
      return Optional.empty();
    }
    positives = 0;
    if (active && lastPresence != null && t.toEpochMilli() - lastPresence.toEpochMilli() >= EXIT_MS) {
      active = false;
      return Optional.of(metallic ? Material.METAL : Material.NON_METAL);
    }
    return Optional.empty();
  }

  public synchronized void reset() {
    active = false;
    metallic = false;
    positives = 0;
    lastPresence = null;
    lastMetal = null;
  }
}
