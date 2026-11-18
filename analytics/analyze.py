"""Relatório completo de Ciência de Dados MetalTech; explicita origens dos dados.
Uso: python analytics/analyze.py --readings data/captura_rapida_metaltech.csv
 --pieces data/passagens_inferidas.csv --tank data/reservatorio_virtual_simulado.csv
"""
import argparse
from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt


def stats(series):
    s = pd.Series(series, dtype=float).dropna()
    if s.empty:
        return {
            "n": 0,
            "media": None,
            "mediana": None,
            "moda": None,
            "desvio_padrao": None,
            "q1": None,
            "q3": None,
            "outliers_IQR": 0,
        }
    q1, q3 = s.quantile([0.25, 0.75])
    iqr = q3 - q1
    return {
        "n": int(len(s)),
        "media": round(float(s.mean()), 3),
        "mediana": round(float(s.median()), 3),
        "moda": float(s.mode().iloc[0]),
        "desvio_padrao": round(float(s.std(ddof=1)), 3) if len(s) > 1 else 0.0,
        "q1": float(q1),
        "q3": float(q3),
        "outliers_IQR": int(((s < q1 - 1.5 * iqr) | (s > q3 + 1.5 * iqr)).sum()),
    }


def saveplot(fig, name, output):
    fig.tight_layout()
    fig.savefig(output / name, dpi=145)
    plt.close(fig)


def analyze(readings, pieces, tank, output):
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    d = pd.read_csv(readings, sep=";")
    d.horario = pd.to_datetime(d.horario)
    fig, ax = plt.subplots(figsize=(10, 4))
    d.plot(x="horario", y=["x02_dec", "x03_dec"], ax=ax)
    ax.set_title("Dados reais: sensores X02 / X03")
    ax.set_ylabel("Palavra de processo (decimal)")
    saveplot(fig, "sensores_reais.png", output)
    piece_stats = "Não fornecido"
    tank_stats = "Não fornecido"
    tank_origin = "Não fornecido"
    piece_origin = "Não fornecido"
    if pieces:
        p = pd.read_csv(pieces, sep=";")
        p.horario = pd.to_datetime(p.horario)
        piece_origin = (
            ", ".join(p.origem.unique()) if "origem" in p else "não declarada"
        )
        counts = p.material.value_counts().reindex(["METAL", "NON_METAL"], fill_value=0)
        fig, ax = plt.subplots(figsize=(6, 4))
        counts.plot.bar(ax=ax)
        ax.set_title("Contagem por tipo — eventos inferidos")
        ax.set_ylabel("Peças")
        saveplot(fig, "pecas_por_tipo.png", output)
        timeline = (
            p.set_index("horario")
            .resample("1min")
            .material.value_counts()
            .unstack(fill_value=0)
            .reindex(columns=["METAL", "NON_METAL"], fill_value=0)
        )
        timeline["total"] = timeline.sum(axis=1)
        fig, ax = plt.subplots(figsize=(9, 4))
        timeline[["METAL", "NON_METAL"]].plot(ax=ax, marker="o")
        ax.set_title("Contagem de peças por minuto")
        ax.set_ylabel("Peças/min")
        saveplot(fig, "pecas_por_minuto.png", output)
        piece_stats = stats(timeline["total"])
        timeline.to_csv(output / "contagens_por_minuto.csv")
    if tank:
        r = pd.read_csv(tank, sep=";")
        r.horario = pd.to_datetime(r.horario)
        tank_origin = (
            ", ".join(r.origem.unique()) if "origem" in r else "não declarada"
        )
        # O mesmo código analisa nível real caso a entrada futura seja telemetria validada.
        if r.tank_level.notna().any():
            tank_stats = stats(r.tank_level)
            fig, ax = plt.subplots(figsize=(9, 4))
            r.plot(x="horario", y="tank_level", ax=ax, legend=False)
            ax.axhline(85, linestyle="--", label="Alerta 85%")
            ax.legend()
            ax.set_title("Nível de reservatório (%) — " + tank_origin)
            ax.set_ylabel("%")
            saveplot(fig, "nivel_linha.png", output)
            fig, ax = plt.subplots(figsize=(7, 4))
            r.tank_level.hist(ax=ax, bins=16)
            ax.set_title("Histograma de nível — " + tank_origin)
            ax.set_xlabel("%")
            saveplot(fig, "nivel_histograma.png", output)
            fig, ax = plt.subplots(figsize=(5, 4))
            ax.boxplot(r.tank_level.dropna())
            ax.set_title("Boxplot de nível — " + tank_origin)
            ax.set_ylabel("%")
            saveplot(fig, "nivel_boxplot.png", output)
    report = f"""# Relatório de Ciência de Dados — MetalTech

## Fontes e integridade

- Sensores X02/X03: **CSV capturado na bancada**, {len(d)} leituras de {d.horario.min()} até {d.horario.max()}.
- Peças: **{piece_origin}**. Eventos calculados por debounce a partir de amostras reais, não aferição certificada.
- Nível de reservatório: **{tank_origin}**. Se SIMULADO_EDUCACIONAL, as séries de tanque NÃO são leituras físicas de X01.

## 1. Estatística descritiva de produção por minuto

{piece_stats}

## 2. Estatística descritiva do nível de reservatório (%)

{tank_stats}

## 3. Estatística da aquisição (valores brutos)

- Capacitivo X02: {stats(d.x02_dec)}
- Indutivo X03: {stats(d.x03_dec)}

## 4. Gráficos

- `pecas_por_tipo.png`, `pecas_por_minuto.png` — produção.
- `nivel_linha.png`, `nivel_histograma.png`, `nivel_boxplot.png` — nível, com origem claramente identificada.
- `sensores_reais.png` — comparação de leituras brutas X02 e X03.

## 5. Outliers e alertas

Aplicado método IQR: fora de [Q1−1,5×IQR, Q3+1,5×IQR]. **Alerta de nível ≥85%** somente para medições calibradas e recentes; não ativar alarme industrial por dados simulados.

## 6. Conclusão

A sequência validada da captura contém três peças metálicas e três não metálicas. O indutivo gera pulsos curtos, exigindo coleta paralela e agregação temporal. A correção da contagem depende da posição e velocidade das peças. O reservatório usa modelo de calibração com duas referências; obter mais medidas reais X01 antes de homologar escala.
"""
    (output / "RELATORIO.md").write_text(report, encoding="utf8")
    return report


if __name__ == "__main__":
    a = argparse.ArgumentParser()
    a.add_argument("--readings", required=True)
    a.add_argument("--pieces")
    a.add_argument("--tank")
    a.add_argument("--output", default="analytics/output")
    args = a.parse_args()
    print(analyze(args.readings, args.pieces, args.tank, args.output))
