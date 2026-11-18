package br.senai.metaltech.service;

public final class CapacitiveSignal extends Signal {
    public CapacitiveSignal(int raw) {
        super(raw);
    }

    @Override
    public boolean detected() {
        return getRaw() >= 1000;
    }
}
