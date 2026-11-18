/**
 * Estatísticas didáticas da simulação — calculadas exclusivamente no navegador.
 * O backend e o banco de produção nunca recebem estes eventos.
 */
export function calculateDemoAnalytics(demo) {
  const events = Array.isArray(demo?.events) ? demo.events : [];
  const countsByMinute = new Map();

  for (const event of events) {
    const timestamp = Number(event?.at);
    if (!Number.isFinite(timestamp) || timestamp < 0) continue;
    const minute = Math.floor(timestamp / 60000);
    countsByMinute.set(minute, (countsByMinute.get(minute) || 0) + 1);
  }

  // Mesmo critério exploratório do backend: somente minutos com produção.
  const rates = Array.from(countsByMinute.values());
  const piecesPerMinuteMean = rates.length
    ? rates.reduce((sum, value) => sum + value, 0) / rates.length
    : 0;
  const piecesPerMinuteStdDev = rates.length
    ? Math.sqrt(
        rates.reduce(
          (sum, value) => sum + (value - piecesPerMinuteMean) ** 2,
          0,
        ) / rates.length,
      )
    : 0;

  const levels = (Array.isArray(demo?.tankSamples) ? demo.tankSamples : [0])
    .map(Number)
    .filter((value) => Number.isFinite(value) && value >= 0 && value <= 100)
    .sort((a, b) => a - b);
  const medianOf = (values) => {
    if (!values.length) return null;
    const middle = Math.floor(values.length / 2);
    return values.length % 2
      ? values[middle]
      : (values[middle - 1] + values[middle]) / 2;
  };
  const tankMedian = medianOf(levels);

  // Regra de Tukey (1,5 × IQR), habilitada a partir de 4 amostras.
  // Não pressupõe que o reservatório virtual esteja calibrado fisicamente.
  let tankOutliers = 0;
  if (levels.length >= 4) {
    const middle = Math.floor(levels.length / 2);
    const lower = levels.slice(0, middle);
    const upper = levels.slice(levels.length % 2 ? middle + 1 : middle);
    const q1 = medianOf(lower);
    const q3 = medianOf(upper);
    const iqr = q3 - q1;
    const lowerFence = q1 - 1.5 * iqr;
    const upperFence = q3 + 1.5 * iqr;
    tankOutliers = levels.filter(
      (value) => value < lowerFence || value > upperFence,
    ).length;
  }

  return {
    piecesPerMinuteMean,
    piecesPerMinuteStdDev,
    tankMedian,
    tankOutliers,
    sampleCount: levels.length,
    eventCount: events.length,
  };
}
