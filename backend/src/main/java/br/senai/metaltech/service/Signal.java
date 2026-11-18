package br.senai.metaltech.service;

/** Herança e polimorfismo: cada família de sensor interpreta um valor bruto. */
public abstract class Signal {
    private final int raw;

    protected Signal(int raw) {
        this.raw = raw;
    }

    public int getRaw() {
        return raw;
    }

    public abstract boolean detected();
}
