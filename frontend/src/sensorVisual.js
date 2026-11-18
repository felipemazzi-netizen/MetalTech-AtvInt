/**
 * Zonas DIDÁTICAS do gêmeo digital, normalizadas para progresso 0..1.
 * X02 e X03 estão juntos perto do início da esteira; X01 mede frontalmente
 * a aproximação da peça até a saída. Não equivalem aos bits físicos do AL1300.
 */
export const clampProgress = (value) =>
  Math.max(0, Math.min(1, Number(value) || 0));

export function visualSensorState(piece) {
  if (!piece) return { x01: false, x02: false, x03: false };
  const p = clampProgress(piece.progress);
  const inClassificationZone = p >= 0.13 && p <= 0.33;
  return {
    x01: p >= 0.05 && p <= 1,
    x02: inClassificationZone,
    x03: inClassificationZone && piece.type === "metal",
  };
}

/** Apenas para demonstrar o reservatório virtual, não é conversão de leitura real. */
export function virtualDistanceCm(piece, fallbackCm = 50) {
  if (!piece) return Number(fallbackCm);
  return 50 - 45 * clampProgress(piece.progress);
}

export function virtualTankPercent(distanceCm) {
  const level = ((50 - Number(distanceCm)) * 100) / 45;
  return Math.round(Math.max(0, Math.min(100, level)));
}
