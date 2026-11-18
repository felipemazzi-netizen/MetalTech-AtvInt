package br.senai.metaltech.service;

public final class InductiveSignal extends Signal {
    public InductiveSignal(int raw) {
        super(raw);
    }

    @Override
    public boolean detected() {
        return getRaw() < 20000;
    }
}
