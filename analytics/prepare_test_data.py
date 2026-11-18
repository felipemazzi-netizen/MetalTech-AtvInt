"""Reconstitui eventos da captura real e gera dados SINTÉTICOS do reservatório.
Evento inferido não é homologação final industrial; dados de tanque são 100% simulados.
"""
from pathlib import Path
import pandas as pd
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "data/captura_rapida_metaltech.csv"
OUTPUT = ROOT / "data"
df = pd.read_csv(INPUT, sep=";")
df["horario"] = pd.to_datetime(df.horario)
active = False
positives = 0
metal = False
last_metal = None
last_presence = None
records = []
for row in df.itertuples():
    t = row.horario
    cap = row.x02_dec
    ind = row.x03_dec
    if pd.notna(ind) and ind < 20000:
        last_metal = t
    if pd.isna(cap) or pd.isna(ind):
        continue
    if cap >= 1000:
        positives += 1
        if not active and positives >= 2:
            active = True
            metal = False
        if active:
            last_presence = t
            if (
                ind < 20000
                or last_metal is not None
                and abs((t - last_metal).total_seconds()) <= 0.4
            ):
                metal = True
    else:
        positives = 0
        if (
            active
            and last_presence is not None
            and (t - last_presence).total_seconds() >= 0.25
        ):
            active = False
            records.append(
                {
                    "horario": t.isoformat(),
                    "material": "METAL" if metal else "NON_METAL",
                    "origem": "INFERIDO_CAPTURA_REAL",
                }
            )
pd.DataFrame(records).to_csv(OUTPUT / "passagens_inferidas.csv", sep=";", index=False)
# Distâncias criadas para apresentação da fórmula: não são leituras X01.
times = pd.date_range("2026-11-11 21:14:24", periods=90, freq="2s")
raw = np.rint(
    817
    - 737 * np.linspace(0, 1, len(times))
    + 25 * np.sin(np.linspace(0, 5 * np.pi, len(times)))
).clip(80, 817).astype(int)
cm = 5 + (raw - 80) * 45 / 737
level = (50 - cm) * 100 / 45
levels = pd.DataFrame(
    {
        "horario": times,
        "raw_hex": [f"{r:04X}" for r in raw],
        "raw_decimal": raw,
        "distancia_cm": cm.round(2),
        "tank_level": level.round(2),
        "origem": "SIMULADO_EDUCACIONAL",
    }
)
levels.to_csv(OUTPUT / "reservatorio_virtual_simulado.csv", sep=";", index=False)
print(
    "Eventos de peças inferidos:",
    len(records),
    "| Arquivo de nível: SIMULADO, não é leitura física",
)
