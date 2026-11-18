import test from "node:test";
import assert from "node:assert/strict";
import { calculateDemoAnalytics } from "./demoAnalytics.js";

test("sem eventos: indicadores visíveis e reservatório vazio", () => {
  const result = calculateDemoAnalytics({ events: [], tankSamples: [0] });
  assert.equal(result.piecesPerMinuteMean, 0);
  assert.equal(result.piecesPerMinuteStdDev, 0);
  assert.equal(result.tankMedian, 0);
  assert.equal(result.tankOutliers, 0);
});

test("produção agrupa eventos por minuto e calcula desvio padrão populacional", () => {
  const result = calculateDemoAnalytics({
    events: [{ at: 120000 }, { at: 130000 }, { at: 180000 }],
    tankSamples: [0, 50, 100],
  });
  assert.equal(result.piecesPerMinuteMean, 1.5);
  assert.equal(result.piecesPerMinuteStdDev, 0.5);
  assert.equal(result.tankMedian, 50);
});

test("IQR identifica outlier apenas quando há amostras suficientes", () => {
  const result = calculateDemoAnalytics({
    events: [],
    tankSamples: [20, 20, 20, 20, 20, 20, 20, 95],
  });
  assert.equal(result.tankMedian, 20);
  assert.equal(result.tankOutliers, 1);
});

test("ignora amostras inválidas", () => {
  const result = calculateDemoAnalytics({
    events: [{ at: NaN }],
    tankSamples: [5, -2, 105, null, "20"],
  });
  assert.equal(result.piecesPerMinuteMean, 0);
  assert.equal(result.tankMedian, 5);
});
