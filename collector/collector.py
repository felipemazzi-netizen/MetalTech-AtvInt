"""MetalTech AL1300 -> Spring Boot. Somente LEITURA do IO-Link Master.

- X02/X03 aquisição em paralelo, sem aguardar X01;
- X01 opcional, com frequência menor;
- erros de rede geram null (nunca zero = ausência);
- o backend consolida eventos e impede contagem por amostra;
- replay CSV disponível para teste acadêmico (persiste no banco real).
"""
import argparse
import concurrent.futures
import csv
from datetime import datetime, timezone
import json
import os
import sys
import threading
import time
from urllib import request

MASTER = os.getenv("MASTER_URL", "http://10.110.12.41").rstrip("/")
API = os.getenv("API_URL", "http://localhost:8080").rstrip("/")
KEY = os.getenv("INGEST_API_KEY", "")
_thread = threading.local()


def read_port(port, timeout):
    path = f"/iolinkmaster/port[{port}]/iolinkdevice/pdin/getdata"
    try:
        # urllib envia os colchetes da URI sem globbing do curl.
        req = request.Request(
            MASTER + path,
            headers={"Connection": "close", "Accept": "application/json"},
        )
        with request.urlopen(req, timeout=timeout) as resp:
            data = json.load(resp)
        if data.get("code") != 200:
            raise ValueError(f"IoT Core retornou code={data.get('code')}")
        value = str(data["data"]["value"]).strip().upper()
        int(value, 16)
        return value
    except Exception as exc:
        print(f"[AVISO] X0{port}: {type(exc).__name__}: {exc}", file=sys.stderr)
        return None


def post_batch(batch):
    if not KEY:
        raise RuntimeError("Defina INGEST_API_KEY no PowerShell (mesma chave do .env)")
    req = request.Request(
        API + "/api/ingest",
        data=json.dumps({"samples": batch}).encode("utf-8"),
        headers={"Content-Type": "application/json", "X-Ingest-Key": KEY},
        method="POST",
    )
    with request.urlopen(req, timeout=10) as response:
        return json.load(response)


def run_live(interval, timeout, distance, distance_every, batch_size):
    print(
        f"MetalTech: AL1300={MASTER} API={API} | X02/X03 ao vivo; "
        f'X01={"ligado" if distance else "desligado"}'
    )
    batch = []
    last_flush = time.monotonic()
    failures = 0
    cycle = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        try:
            while True:
                start = time.monotonic()
                futures = {p: executor.submit(read_port, p, timeout) for p in (2, 3)}
                if distance and cycle % distance_every == 0:
                    futures[1] = executor.submit(read_port, 1, timeout)
                values = {p: f.result() for p, f in futures.items()}
                stamp = datetime.now(timezone.utc).isoformat()
                if any(values.get(p) is not None for p in (2, 3, 1)):
                    batch.append(
                        {
                            "observedAt": stamp,
                            "x01Hex": values.get(1),
                            "x02Hex": values.get(2),
                            "x03Hex": values.get(3),
                        }
                    )
                    failures = 0
                else:
                    failures += 1
                    if failures == 5 or failures % 20 == 0:
                        print(
                            f"[AVISO] {failures} ciclos sem resposta; "
                            "verificar acesso ao AL1300",
                            file=sys.stderr,
                        )
                cycle += 1
                if batch and (
                    len(batch) >= batch_size or time.monotonic() - last_flush >= 1
                ):
                    try:
                        result = post_batch(batch)
                        print(
                            f"[API] {result} | amostras={len(batch)} | "
                            f"ciclo={1000 * (time.monotonic() - start):.0f} ms"
                        )
                        batch.clear()
                    except Exception as exc:
                        print(f"[ERRO API] lote não enviado: {exc}", file=sys.stderr)
                        # Não fingir sucesso. A fila em RAM é limitada; produção
                        # requer fila persistente.
                        if len(batch) > 500:
                            print(
                                "[AVISO] Buffer cheio; 250 amostras antigas descartadas",
                                file=sys.stderr,
                            )
                            batch = batch[-250:]
                    last_flush = time.monotonic()
                remaining = interval - (time.monotonic() - start)
                if remaining > 0:
                    time.sleep(remaining)
        except KeyboardInterrupt:
            if batch:
                try:
                    print("[API] lote final:", post_batch(batch))
                except Exception as exc:
                    print("[ERRO] lote final não enviado:", exc, file=sys.stderr)
            print("Captura finalizada")


def replay(csv_path, speed, batch_size):
    if speed <= 0:
        raise ValueError("--speed deve ser positivo")
    with open(csv_path, encoding="utf-8-sig", newline="") as fp:
        rows = list(csv.DictReader(fp, delimiter=";"))
    if not rows:
        raise ValueError("CSV vazio")
    first = datetime.fromisoformat(rows[0]["horario"])
    base = datetime.now(timezone.utc)
    batch = []
    previous = None
    for row in rows:
        t = datetime.fromisoformat(row["horario"])
        if previous is not None:
            time.sleep(min(1, max(0, (t - previous).total_seconds() / speed)))
        previous = t
        batch.append(
            {
                "observedAt": (base + (t - first)).isoformat(),
                "x01Hex": row.get("x01_hex") or None,
                "x02Hex": row.get("x02_hex") or None,
                "x03Hex": row.get("x03_hex") or None,
            }
        )
        if len(batch) >= batch_size:
            print("[REPLAY]", post_batch(batch))
            batch = []
    if batch:
        print("[REPLAY]", post_batch(batch))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--replay",
        help="Reproduz um CSV no banco atual. Pode DUPLICAR peças se repetido.",
    )
    ap.add_argument("--speed", type=float, default=1.0)
    ap.add_argument(
        "--interval",
        type=float,
        default=0.08,
        help="Intervalo mínimo por ciclo, segundos",
    )
    ap.add_argument(
        "--timeout", type=float, default=1.5, help="Timeout de requisição ao AL1300"
    )
    ap.add_argument(
        "--distance", action="store_true", help="Habilita a leitura X01 opcional"
    )
    ap.add_argument(
        "--distance-every", type=int, default=10, help="Amostra X01 a cada N ciclos"
    )
    ap.add_argument("--batch-size", type=int, default=20)
    args = ap.parse_args()
    if (
        not 1 <= args.batch_size <= 500
        or args.distance_every < 1
        or args.interval < 0.01
    ):
        ap.error("batch-size: 1..500, distance-every >=1, interval >=0.01")
    if args.replay:
        replay(args.replay, args.speed, args.batch_size)
    else:
        run_live(
            args.interval,
            args.timeout,
            args.distance,
            args.distance_every,
            args.batch_size,
        )
