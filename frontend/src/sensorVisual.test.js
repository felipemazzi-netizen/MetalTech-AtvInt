import test from "node:test";
import assert from "node:assert/strict";
import {
  visualSensorState,
  virtualDistanceCm,
  virtualTankPercent,
} from "./sensorVisual.js";

test("sem peça não dispara sensores de classificação", () => {
  assert.deepEqual(visualSensorState(null), {
    x01: false,
    x02: false,
    x03: false,
  });
});
test("peça metálica ativa X02 e X03 na mesma zona", () => {
  assert.deepEqual(visualSensorState({ type: "metal", progress: 0.2 }), {
    x01: true,
    x02: true,
    x03: true,
  });
});
test("peça não metálica ativa X02, mas não X03", () => {
  assert.deepEqual(visualSensorState({ type: "nonmetal", progress: 0.2 }), {
    x01: true,
    x02: true,
    x03: false,
  });
});
test("X01 mede aproximação ao fim da esteira", () => {
  assert.equal(visualSensorState({ type: "metal", progress: 0.9 }).x01, true);
  assert.equal(virtualDistanceCm({ progress: 0 }), 50);
  assert.equal(virtualDistanceCm({ progress: 1 }), 5);
  assert.equal(virtualTankPercent(50), 0);
  assert.equal(virtualTankPercent(5), 100);
});
