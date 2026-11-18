import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Camera,
  RotateCcw,
  Info,
  MousePointer2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

/*
 * MetalTech 4.0 — real-time interactive WebGL scene
 * No external 3D dependency, assets, network requests, or marker required.
 * Units are illustrative; this is a digital twin visualization, not metrology.
 */
const PI = Math.PI;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const V = {
  aluminum: [0.66, 0.73, 0.78],
  silver: [0.84, 0.88, 0.91],
  darkSteel: [0.27, 0.35, 0.41],
  belt: [0.068, 0.089, 0.105],
  beltRib: [0.13, 0.17, 0.19],
  frame: [0.32, 0.42, 0.49],
  blue: [0.13, 0.38, 0.75],
  cyan: [0.08, 0.81, 0.96],
  purple: [0.64, 0.43, 0.97],
  orange: [0.99, 0.36, 0.035],
  orangeTop: [1, 0.52, 0.09],
  black: [0.075, 0.083, 0.092],
  rubber: [0.18, 0.2, 0.22],
  white: [0.92, 0.94, 0.96],
  green: [0.1, 0.8, 0.4],
  gold: [0.95, 0.72, 0.19],
  air: [0.18, 0.67, 0.99],
  red: [0.9, 0.18, 0.21],
};
const NORMALS = [
  [0, 0, 1],
  [0, 0, -1],
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
];
const FACES = [
  [
    [-1, -1, 1],
    [1, -1, 1],
    [1, 1, 1],
    [-1, 1, 1],
  ],
  [
    [1, -1, -1],
    [-1, -1, -1],
    [-1, 1, -1],
    [1, 1, -1],
  ],
  [
    [1, -1, 1],
    [1, -1, -1],
    [1, 1, -1],
    [1, 1, 1],
  ],
  [
    [-1, -1, -1],
    [-1, -1, 1],
    [-1, 1, 1],
    [-1, 1, -1],
  ],
  [
    [-1, 1, 1],
    [1, 1, 1],
    [1, 1, -1],
    [-1, 1, -1],
  ],
  [
    [-1, -1, -1],
    [1, -1, -1],
    [1, -1, 1],
    [-1, -1, 1],
  ],
];
function boxMesh(w, h, d) {
  const p = [],
    n = [];
  FACES.forEach((face, i) => {
    [0, 1, 2, 0, 2, 3].forEach((j) => {
      const xyz = face[j];
      p.push((xyz[0] * w) / 2, (xyz[1] * h) / 2, (xyz[2] * d) / 2);
      n.push(...NORMALS[i]);
    });
  });
  return { positions: p, normals: n };
}
function cylinderMesh(radius, height, sides = 14, axis = "y") {
  const p = [],
    n = [];
  function add(pt, normal) {
    p.push(...pt);
    n.push(...normal);
  }
  // Rotacoes de determinante +1: preservam a orientacao das faces nos tres eixos.
  function orient(x, y, z) {
    return axis === "z" ? [x, -z, y] : axis === "x" ? [y, -x, z] : [x, y, z];
  }
  for (let i = 0; i < sides; i++) {
    const a = (i * PI * 2) / sides,
      b = ((i + 1) * PI * 2) / sides;
    const u = [Math.cos(a) * radius, Math.sin(a) * radius],
      v = [Math.cos(b) * radius, Math.sin(b) * radius];
    const A = orient(u[0], -height / 2, u[1]),
      B = orient(v[0], -height / 2, v[1]),
      C = orient(v[0], height / 2, v[1]),
      D = orient(u[0], height / 2, u[1]);
    const na = orient(Math.cos(a), 0, Math.sin(a)),
      nb = orient(Math.cos(b), 0, Math.sin(b));
    // Ordem anti-horaria observada de fora. Antes as faces eram invertidas
    // e o back-face culling removia metade da peca em varias vistas.
    [
      [A, na],
      [C, nb],
      [B, nb],
      [A, na],
      [D, na],
      [C, nb],
    ].forEach(([pt, no]) => add(pt, no));
    const up = orient(0, 1, 0),
      down = orient(0, -1, 0);
    [orient(0, height / 2, 0), C, D].forEach((pt) => add(pt, up));
    [orient(0, -height / 2, 0), A, B].forEach((pt) => add(pt, down));
  }
  return { positions: p, normals: n };
}
function identity() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}
function mul(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}
function scale(x, y, z) {
  const m = identity();
  m[0] = x;
  m[5] = y;
  m[10] = z;
  return m;
}
function move(x, y, z) {
  const m = identity();
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
}
function rotateY(a) {
  const c = Math.cos(a),
    s = Math.sin(a);
  return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
}
function rotateX(a) {
  const c = Math.cos(a),
    s = Math.sin(a);
  return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
}
function perspective(fov, aspect, near, far) {
  const f = 1 / Math.tan(fov / 2),
    r = 1 / (near - far);
  return [
    f / aspect,
    0,
    0,
    0,
    0,
    f,
    0,
    0,
    0,
    0,
    (far + near) * r,
    -1,
    0,
    0,
    2 * far * near * r,
    0,
  ];
}
function normalize(a) {
  const l = Math.hypot(...a) || 1;
  return a.map((v) => v / l);
}
function sub(a, b) {
  return a.map((v, i) => v - b[i]);
}
function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
function lookAt(eye, target) {
  const z = normalize(sub(eye, target)),
    x = normalize(cross([0, 1, 0], z)),
    y = cross(z, x);
  return [
    x[0],
    y[0],
    z[0],
    0,
    x[1],
    y[1],
    z[1],
    0,
    x[2],
    y[2],
    z[2],
    0,
    -x.reduce((s, v, i) => s + v * eye[i], 0),
    -y.reduce((s, v, i) => s + v * eye[i], 0),
    -z.reduce((s, v, i) => s + v * eye[i], 0),
    1,
  ];
}
function shader(gl, type, src) {
  const o = gl.createShader(type);
  gl.shaderSource(o, src);
  gl.compileShader(o);
  if (!gl.getShaderParameter(o, gl.COMPILE_STATUS))
    throw Error(gl.getShaderInfoLog(o));
  return o;
}
function createEngine(canvas) {
  const gl = canvas.getContext("webgl2", {
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance",
  });
  if (!gl) throw Error("WebGL2 indisponível neste navegador.");
  const vs = `#version 300 es
  precision highp float;
  in vec3 aPosition;in vec3 aNormal;
  uniform mat4 uMVP;uniform mat4 uModel;
  out vec3 vNormal;out vec3 vWorld;
  void main(){vec4 p=uModel*vec4(aPosition,1.);vWorld=p.xyz;vNormal=mat3(uModel)*aNormal;gl_Position=uMVP*vec4(aPosition,1.);}`;
  const fs = `#version 300 es
  precision highp float;
  in vec3 vNormal;in vec3 vWorld;
  uniform vec3 uColor;uniform float uEmit;
  out vec4 outColor;
  void main(){vec3 n=normalize(vNormal);vec3 light=normalize(vec3(-0.5,1.4,0.8));float d=max(dot(n,light),0.);float shade=0.43+0.53*d;float bounce=max(dot(n,normalize(vec3(0.7,0.3,-0.8))),0.)*0.15;vec3 c=uColor*(shade+bounce)+uColor*uEmit;float fog=clamp((length(vWorld)-4.)/17.,0.,.21);outColor=vec4(mix(c,vec3(.035,.065,.105),fog),1.);}`;
  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, shader(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
    throw Error(gl.getProgramInfoLog(prog));
  const loc = {
    p: gl.getAttribLocation(prog, "aPosition"),
    n: gl.getAttribLocation(prog, "aNormal"),
    mvp: gl.getUniformLocation(prog, "uMVP"),
    model: gl.getUniformLocation(prog, "uModel"),
    color: gl.getUniformLocation(prog, "uColor"),
    emit: gl.getUniformLocation(prog, "uEmit"),
  };
  const buffers = [];
  function upload(geo) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const b1 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b1);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(geo.positions),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(loc.p);
    gl.vertexAttribPointer(loc.p, 3, gl.FLOAT, false, 0, 0);
    const b2 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b2);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(geo.normals),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(loc.n);
    gl.vertexAttribPointer(loc.n, 3, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    buffers.push([vao, b1, b2]);
    return { vao, count: geo.positions.length / 3 };
  }
  const box = upload(boxMesh(1, 1, 1)),
    cylinderY = upload(cylinderMesh(1, 1, 16, "y")),
    cylinderX = upload(cylinderMesh(1, 1, 16, "x")),
    cylinderZ = upload(cylinderMesh(1, 1, 16, "z"));
  const models = [];
  const add = (mesh, x, y, z, sx, sy, sz, color, options = {}) => {
    const obj = { mesh, x, y, z, sx, sy, sz, color, emit: 0, ...options };
    models.push(obj);
    return obj;
  };
  const cube = (x, y, z, sx, sy, sz, color, options) =>
    add(box, x, y, z, sx, sy, sz, color, options);
  const cyl = (axis, x, y, z, r, length, color, options) =>
    add(
      axis === "x" ? cylinderX : axis === "z" ? cylinderZ : cylinderY,
      x,
      y,
      z,
      axis === "x" ? length : r,
      axis === "y" ? length : r,
      axis === "z" ? length : r,
      color,
      options,
    );
  const rail = (x, y, z, length, along = "z", color = V.aluminum) =>
    along === "z"
      ? cube(x, y, z, 0.105, 0.12, length, color)
      : cube(x, y, z, length, 0.12, 0.105, color);
  // platform and floor: all dimensions chosen as relative proportions of photographic reference
  cube(0, 0.04, 0, 3.45, 0.11, 5.8, V.frame);
  cube(0, 0.14, 0, 3.27, 0.085, 5.63, V.silver);
  for (let j = -1; j <= 1; j++) {
    rail(j * 1.5, 0.215, 0, 5.6);
  }
  for (let z = -2.65; z <= 2.68; z += 0.4)
    cube(0, 0.19, z, 3.15, 0.018, 0.045, V.aluminum);
  // 2 profile legs with braces, feet, casters
  for (const x of [-1.4, 1.4])
    for (const z of [-2.25, 2.25]) {
      cube(x, -0.48, z, 0.13, 0.95, 0.14, V.aluminum);
      cube(x, -0.87, z, 0.36, 0.07, 0.4, V.darkSteel);
      cyl("x", x, -0.96, z, 0.13, 0.1, V.black);
      cyl("x", x - 0.03, -0.96, z, 0.06, 0.13, V.silver);
    }
  for (const z of [-2.25, 2.25]) cube(0, -0.58, z, 2.85, 0.1, 0.1, V.aluminum);
  // black continuous belt, silver conveyor body, end rollers, longitudinal rails
  cube(0, 0.44, 0, 0.97, 0.2, 5.05, V.darkSteel);
  cube(0, 0.565, 0, 0.73, 0.055, 4.92, V.belt);
  rail(-0.52, 0.59, 0, 5.02, "z", V.silver);
  rail(0.52, 0.59, 0, 5.02, "z", V.silver);
  rail(-0.57, 0.39, 0, 5.12, "z", V.aluminum);
  rail(0.57, 0.39, 0, 5.12, "z", V.aluminum);
  for (const z of [-2.48, 2.48]) {
    cyl("x", 0, 0.52, z, 0.23, 1.08, V.black);
    cyl("x", 0, 0.52, z, 0.165, 1.1, V.darkSteel);
    cyl("x", -0.56, 0.52, z, 0.14, 0.08, V.silver);
    cyl("x", 0.56, 0.52, z, 0.14, 0.08, V.silver);
  }
  // short track ribs to show conveyor motion
  for (let i = 0; i < 32; i++)
    cube(0, 0.602, -2.38 + i * 0.153, 0.69, 0.006, 0.014, V.beltRib, {
      role: "rib",
      i,
    });
  // motor with housing and shaft
  cyl("x", 0.9, 0.43, -0.55, 0.3, 0.7, V.silver);
  cyl("x", 1.31, 0.43, -0.55, 0.24, 0.22, V.darkSteel);
  cube(1.24, 0.27, -0.55, 0.52, 0.16, 0.46, V.darkSteel);
  for (let i = 0; i < 7; i++)
    cube(1.05 + i * 0.07, 0.43, -0.55, 0.018, 0.46, 0.4, V.frame);
  // style pneumatic small diverters, simplified as backdrop
  for (const z of [0.2, 0.95, 1.7]) {
    cube(-1.03, 0.36, z, 0.83, 0.16, 0.23, V.aluminum);
    cube(-0.8, 0.5, z, 0.11, 0.28, 0.1, V.silver);
    cube(-0.5, 0.68, z, 0.59, 0.08, 0.11, V.darkSteel);
    cube(-0.29, 0.71, z, 0.1, 0.2, 0.35, V.silver);
  }
  // staggered three sorting channels at end (not sensors)
  for (const z of [1.2, 1.75, 2.3]) {
    cube(-1.02, 0.42, z, 0.92, 0.08, 0.46, V.silver, { angle: 0.1 });
    rail(-1.39, 0.51, z, 0.85, "z", V.aluminum);
  }
  // side electrical terminal blocks / orange IO modules on base
  cube(1.08, 0.31, 1.7, 0.95, 0.22, 0.86, V.darkSteel);
  cube(1.1, 0.46, 1.71, 0.78, 0.095, 0.64, V.blue);
  for (let i = 0; i < 6; i++)
    cube(0.8 + i * 0.12, 0.54, 1.64, 0.085, 0.035, 0.16, V.black);
  // front control module
  cube(-1.2, 0.38, -1.6, 0.66, 0.36, 0.6, V.aluminum);
  cube(-1.2, 0.571, -1.6, 0.55, 0.025, 0.49, V.white);
  for (let i = 0; i < 3; i++)
    cyl("y", -1.37 + i * 0.17, 0.595, -1.51, 0.058, 0.06, [0.13, 0.25, 0.32]);
  // Sensores X02/X03 laterais; X01 frontal, alinhado ao comprimento da correia
  const sensors = {};
  const orangeSensor = (id, x, y, z, axis = "x") => {
    cube(x, y - 0.15, z, 0.18, 0.33, 0.18, V.darkSteel);
    cube(x, y - 0.01, z, 0.54, 0.11, 0.12, V.silver);
    // sensor housing (orange, boxy on model)
    const body = cube(x, y + 0.15, z, 0.47, 0.3, 0.34, V.orange, {
      sensor: id,
    });
    cube(x, y + 0.308, z, 0.39, 0.026, 0.28, V.orangeTop);
    cube(x + 0.26, y + 0.15, z, 0.06, 0.23, 0.25, V.black);
    cube(x + 0.3, y + 0.15, z, 0.045, 0.15, 0.17, V.gold);
    cube(x - 0.27, y + 0.14, z, 0.08, 0.2, 0.14, V.black);
    sensors[id] = {
      body,
      led: cube(x - 0.12, y + 0.32, z, 0.075, 0.032, 0.06, V.green, {
        indicator: id,
      }),
    };
  };
  orangeSensor("X02", 0.88, 0.84, -1.49);
  orangeSensor("X03", 0.88, 1.28, -1.49);
  // X01: sensor instalado de FRENTE para a esteira, na saida (z positivo).
  // A lente olha longitudinalmente para z negativo, contra o movimento da peca.
  // Suporte tipo cantilever vindo do lado direito, sem bloquear a correia.
  cube(0.74, 0.72, 2.78, 0.12, 0.9, 0.14, V.darkSteel);
  cube(0.42, 1.12, 2.78, 0.76, 0.12, 0.14, V.silver);
  const frontalBody = cube(0, 0.92, 2.83, 0.48, 0.32, 0.44, V.orange, {
    sensor: "X01",
  });
  cube(0, 1.093, 2.83, 0.4, 0.025, 0.34, V.orangeTop);
  cyl("z", 0, 0.92, 2.56, 0.155, 0.12, V.black); // aro frontal
  cyl("z", 0, 0.92, 2.485, 0.102, 0.025, V.darkSteel); // lente voltada para -z
  cyl("z", 0, 0.92, 3.09, 0.07, 0.14, V.black); // cabo traseiro
  sensors.X01 = {
    body: frontalBody,
    led: cube(-0.14, 1.11, 2.83, 0.07, 0.025, 0.07, V.green, {
      indicator: "X01",
    }),
  };
  // Linha de medicao frontal: marcas didaticas ao longo do eixo z.
  // O comprimento fisico (m) foi normalizado para a escala de 5-50 cm.
  for (let i = 0; i < 9; i++)
    cube(0, 0.895, 2.19 - i * 0.5, 0.02, 0.016, 0.11, [0.2, 0.36, 0.32], {
      role: "beam",
    });
  // diagonal tubes and cables (blue, green) as cylinders along world axes approximation
  for (const z of [-1.49]) {
    cyl("z", 1.27, 0.51, z + 0.21, 0.025, 0.43, V.air);
    cube(1.42, 0.28, z + 0.4, 0.035, 0.42, 0.045, V.air);
  }
  // ground reference grid
  for (let i = -6; i <= 6; i++) {
    cube(i * 0.55, -1.03, 0, 0.008, 0.005, 8.0, [0.09, 0.17, 0.24]);
    cube(0, -1.03, i * 0.55, 7.0, 0.005, 0.008, [0.09, 0.17, 0.24]);
  }
  // Uma unica malha cilindrica FECHADA, com tampas superior e inferior.
  // A base encosta na correia; sem topo flutuante e sem opacidade parcial.
  const piece = cyl("y", 0, 0.797, -2.3, 0.24, 0.39, V.gold, { role: "piece" });
  const scene = { models, sensors, piece, gl, box, cylinderY };
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  function render(view, orbit, pieceState, pulses, options = {}) {
    const w = Math.max(1, canvas.clientWidth),
      h = Math.max(1, canvas.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.round(w * dpr),
      ch = Math.round(h * dpr);
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
    gl.viewport(0, 0, cw, ch);
    gl.clearColor(0.028, 0.047, 0.079, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(prog);
    const eye = [
      orbit.target[0] +
        orbit.distance * Math.sin(orbit.azimuth) * Math.cos(orbit.elevation),
      orbit.target[1] + orbit.distance * Math.sin(orbit.elevation),
      orbit.target[2] +
        orbit.distance * Math.cos(orbit.azimuth) * Math.cos(orbit.elevation),
    ];
    const vp = mul(
      perspective((43 * PI) / 180, w / h, 0.05, 70),
      lookAt(eye, orbit.target),
    );
    const now = performance.now();
    const running = options.running !== false;
    for (const model of models) {
      if (model.role === "rib")
        model.z =
          -2.38 +
          ((((model.i * 0.153 + (running ? now / 3100 : 0)) % 4.9) + 4.9) %
            4.9);
      if (model.role === "piece") {
        if (!pieceState) {
          continue;
        }
        model.z = -2.32 + pieceState.progress * 4.57;
        const metal = pieceState.type === "metal";
        model.color = metal ? V.gold : V.blue;
      }
      if (model.sensor) {
        model.emit = 0;
        model.color = V.orange;
      }
      // Caixa laranja permanece fixa: apenas o LED verde acende na detecção.
      if (model.indicator) {
        model.emit = pulses[model.indicator] ? 1.1 : 0;
        model.color = pulses[model.indicator] ? V.green : [0.025, 0.17, 0.075];
      }
      const mat = mul(
        move(model.x, model.y, model.z),
        scale(model.sx, model.sy, model.sz),
      );
      gl.uniformMatrix4fv(loc.model, false, new Float32Array(mat));
      gl.uniformMatrix4fv(loc.mvp, false, new Float32Array(mul(vp, mat)));
      gl.uniform3fv(loc.color, new Float32Array(model.color));
      gl.uniform1f(loc.emit, model.emit || 0);
      gl.bindVertexArray(model.mesh.vao);
      gl.drawArrays(gl.TRIANGLES, 0, model.mesh.count);
    }
    gl.bindVertexArray(null);
    return { vp, width: w, height: h, eye };
  }
  function destroy() {
    buffers.forEach(([vao, b1, b2]) => {
      gl.deleteVertexArray(vao);
      gl.deleteBuffer(b1);
      gl.deleteBuffer(b2);
    });
    gl.deleteProgram(prog);
  }
  return { render, destroy, scene };
}
function project(point, vp, w, h) {
  const [x, y, z] = point;
  const px = vp[0] * x + vp[4] * y + vp[8] * z + vp[12],
    py = vp[1] * x + vp[5] * y + vp[9] * z + vp[13],
    pw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
  if (pw <= 0) return null;
  return {
    x: ((px / pw) * 0.5 + 0.5) * w,
    y: (1 - ((py / pw) * 0.5 + 0.5)) * h,
  };
}
const defaultOrbit = {
  azimuth: -0.74,
  elevation: 0.68,
  distance: 9.6,
  target: [0, 0.17, 0],
};
const sensors3d = [
  { id: "X01", label: "Distância frontal", point: [0, 1.12, 2.83] },
  { id: "X02", label: "Capacitivo", point: [0.85, 1.35, -1.49] },
  { id: "X03", label: "Indutivo", point: [0.85, 1.8, -1.49] },
];
export default function Conveyor3D({
  activePiece,
  pulses = {},
  connectionMode,
  apiOnline,
  demoMode,
  onDemoMetal,
  onDemoNonMetal,
  onDemoReset,
  tankLevel,
  distanceCm,
  pieceTypeLabel,
}) {
  // Contrato único de IDs: o App usa x01/x02/x03, a cena 3D usa X01/X02/X03.
  // Normalizamos aqui para que LEDs, cores dos modelos e painel recebam o mesmo estado.
  const sensorSignals = {
    X01: Boolean(pulses.x01 ?? pulses.X01),
    X02: Boolean(pulses.x02 ?? pulses.X02),
    X03: Boolean(pulses.x03 ?? pulses.X03),
  };
  const canvasRef = useRef(null),
    engineRef = useRef(null),
    frameRef = useRef(null),
    orbitRef = useRef({ ...defaultOrbit, target: [...defaultOrbit.target] }),
    dragRef = useRef(null),
    propsRef = useRef(null);
  const [labels, setLabels] = useState({}),
    [selected, setSelected] = useState("X02"),
    [view, setView] = useState("Perspectiva"),
    [autoRotate, setAutoRotate] = useState(false),
    [error, setError] = useState(""),
    [fps, setFps] = useState(null);
  // Guarda o horário da última indicação visual para que pulsos curtos
  // não desapareçam sem deixar rastro no painel de diagnóstico.
  const [lastIndication, setLastIndication] = useState({});
  const [pulseUntil, setPulseUntil] = useState({});
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);
  // Mantém a indicação perceptível por 1,4 s após um pulso curto.
  // Somente feedback VISUAL; não modifica aquisição real nem contagens.
  const visibleSignals = {
    X01: sensorSignals.X01 || (pulseUntil.X01 ?? 0) > clock,
    X02: sensorSignals.X02 || (pulseUntil.X02 ?? 0) > clock,
    X03: sensorSignals.X03 || (pulseUntil.X03 ?? 0) > clock,
  };
  useEffect(() => {
    const current = new Date().toLocaleTimeString("pt-BR");
    const updates = {};
    const until = {};
    const now = Date.now();
    for (const id of ["X01", "X02", "X03"]) {
      if (sensorSignals[id]) {
        updates[id] = current;
        until[id] = now + 1400;
      }
    }
    if (Object.keys(updates).length) {
      setLastIndication((old) => ({ ...old, ...updates }));
      setPulseUntil((old) => ({ ...old, ...until }));
    }
  }, [sensorSignals.X01, sensorSignals.X02, sensorSignals.X03]);
  useEffect(() => {
    if (demoMode) setLastIndication({});
  }, [demoMode]);
  const showLabels = true;
  propsRef.current = {
    activePiece,
    pulses: visibleSignals,
    autoRotate,
    connectionMode,
  };
  useEffect(() => {
    let cancelled = false,
      raf = 0,
      last = performance.now(),
      lastUi = 0,
      frames = 0,
      fpsStart = performance.now();
    try {
      engineRef.current = createEngine(canvasRef.current);
    } catch (err) {
      setError(err.message || "Falha ao iniciar WebGL.");
      return;
    }
    function tick(now) {
      if (cancelled) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const orbit = orbitRef.current;
      if (propsRef.current.autoRotate && !dragRef.current)
        orbit.azimuth += dt * 0.14;
      let piece = propsRef.current.activePiece;
      if (piece) {
        const p = clamp(piece.progress ?? 0, 0, 1);
        piece = { ...piece, progress: p };
      }
      const out = engineRef.current.render(
        null,
        orbit,
        piece,
        propsRef.current.pulses,
        { running: true },
      );
      if (now - lastUi > 110) {
        lastUi = now;
        const result = {};
        for (const s of sensors3d)
          result[s.id] = project(s.point, out.vp, out.width, out.height);
        setLabels(result);
      }
      frames++;
      if (now - fpsStart > 1500) {
        setFps(Math.round((frames * 1000) / (now - fpsStart)));
        frames = 0;
        fpsStart = now;
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);
  function setCamera(type) {
    const presets = {
      Perspectiva: [-0.74, 0.68, 9.6],
      Superior: [0, 1.48, 9.2],
      Frontal: [0, 0.12, 9.4],
      Lateral: [PI / 2, 0.3, 9.4],
    };
    const [az, el, dist] = presets[type];
    orbitRef.current = {
      azimuth: az,
      elevation: el,
      distance: dist,
      target: [0, 0.17, 0],
    };
    setView(type);
  }
  function onPointerDown(ev) {
    if (ev.button !== 0 && ev.pointerType === "mouse") return;
    ev.currentTarget.setPointerCapture(ev.pointerId);
    dragRef.current = {
      x: ev.clientX,
      y: ev.clientY,
      moved: false,
      pan: ev.shiftKey,
    };
  }
  function onPointerMove(ev) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = ev.clientX - drag.x,
      dy = ev.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
    drag.x = ev.clientX;
    drag.y = ev.clientY;
    const o = orbitRef.current;
    if (drag.pan) {
      const rate = o.distance * 0.0015;
      o.target = [
        clamp(o.target[0] - dx * rate, -4, 4),
        clamp(o.target[1] + dy * rate, -1.5, 3),
        o.target[2],
      ];
    } else {
      o.azimuth -= dx * 0.007;
      o.elevation = clamp(o.elevation + dy * 0.007, 0.08, 1.54);
    }
    setView("Livre");
  }
  function onPointerUp(ev) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag?.moved) {
      const r = canvasRef.current.getBoundingClientRect();
      const x = ev.clientX - r.left,
        y = ev.clientY - r.top;
      const near = sensors3d
        .map((s) => ({ id: s.id, pos: labels[s.id] }))
        .filter((s) => s.pos)
        .sort(
          (a, b) =>
            Math.hypot(x - a.pos.x, y - a.pos.y) -
            Math.hypot(x - b.pos.x, y - b.pos.y),
        )[0];
      if (near && Math.hypot(x - near.pos.x, y - near.pos.y) < 48)
        setSelected(near.id);
    }
  }
  function zoom(amount) {
    orbitRef.current.distance = clamp(
      orbitRef.current.distance + amount,
      4.5,
      17,
    );
  }
  function screenshot() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = "metaltech-ra-gemeo-digital.png";
    a.href = canvas.toDataURL("image/png");
    a.click();
  }
  const shown =
    connectionMode === "ONLINE" && apiOnline && !demoMode
      ? "API CONECTADA"
      : demoMode
        ? "SIMULAÇÃO"
        : "SEM API";
  const details = {
    X01: "Sensor FRONTAL, alinhado ao eixo da correia e voltado para a peça que se aproxima. Simulação: de cerca de 50 cm no começo até 5 cm perto da lente. Isso representa o nível virtual do reservatório.",
    X02: "Capacitivo: confirma presença da peça independentemente do material.",
    X03: "Indutivo: distingue peças metálicas quando o evento é confirmado.",
  };
  const active =
    activePiece?.type === "metal"
      ? "Metálica"
      : activePiece?.type === "nonmetal"
        ? "Não metálica"
        : "—";
  return (
    <section
      className="space-y-4"
      aria-label="RA — gêmeo digital tridimensional da bancada"
    >
      <div className="rounded-2xl border border-cyan-500/25 bg-slate-900/75 p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-black text-slate-100 flex gap-2 items-center">
              <Box className="w-5 h-5 text-cyan-300" /> RA — Gêmeo digital
              interativo
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Modelo 3D WebGL da bancada, feito a partir das fotos. Gire,
              aproxime e explore livremente.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span
              className={`px-3 py-1.5 rounded-full border text-xs font-bold ${demoMode ? "text-amber-200 bg-amber-500/10 border-amber-500/50" : apiOnline ? "text-emerald-200 bg-emerald-500/10 border-emerald-500/40" : "text-slate-300 bg-slate-800 border-slate-700"}`}
            >
              {shown}
            </span>
            <span className="px-3 py-1.5 text-xs rounded-full border border-slate-700 bg-slate-950/70 text-slate-400">
              WebGL · {fps == null ? "—" : `${fps} FPS`}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center mb-3">
          {["Perspectiva", "Superior", "Frontal", "Lateral"].map((mode) => (
            <button
              key={mode}
              onClick={() => setCamera(mode)}
              className={`text-xs px-3 py-2 rounded-lg border font-semibold ${view === mode ? "bg-cyan-500/15 border-cyan-400 text-cyan-200" : "bg-slate-950 border-slate-700 text-slate-400 hover:text-white"}`}
            >
              {mode}
            </button>
          ))}
          <button
            onClick={() => setAutoRotate((v) => !v)}
            className={`text-xs px-3 py-2 rounded-lg border ${autoRotate ? "border-cyan-400 text-cyan-300" : "border-slate-700 text-slate-400"}`}
          >
            <RotateCcw className="inline w-3.5 h-3.5 mr-1" />
            {autoRotate ? "Parar giro" : "Giro automático"}
          </button>
          <button
            onClick={() => zoom(-0.8)}
            aria-label="Aproximar"
            className="px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-300"
          >
            <ZoomIn size={15} />
          </button>
          <button
            onClick={() => zoom(0.8)}
            aria-label="Afastar"
            className="px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-300"
          >
            <ZoomOut size={15} />
          </button>
          <button
            onClick={screenshot}
            aria-label="Salvar imagem da maquete"
            title="Salvar imagem da maquete"
            className="px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-300"
          >
            <Camera size={15} />
          </button>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_265px] gap-4">
          <div
            className="relative rounded-xl overflow-hidden border border-slate-700 bg-[#07101e] min-h-[400px] sm:min-h-[540px]"
            style={{ touchAction: "none" }}
          >
            {error ? (
              <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-amber-200">
                {error} Use Chrome ou Edge atualizado, com aceleração de
                hardware.
              </div>
            ) : null}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={() => {
                dragRef.current = null;
              }}
              onWheel={(ev) => {
                ev.preventDefault();
                zoom(ev.deltaY > 0 ? 0.35 : -0.35);
              }}
            />
            <div className="absolute top-3 left-3 pointer-events-none rounded-lg bg-slate-950/75 border border-slate-700/60 px-3 py-2 text-[11px] text-cyan-100 tracking-wider font-bold">
              METALTECH · ESTAÇÃO EDUCACIONAL
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2 pointer-events-none text-[11px] text-slate-200">
              <span className="rounded-lg bg-slate-950/75 border border-slate-700/60 px-2 py-1">
                <MousePointer2 size={12} className="inline mr-1" />
                Arraste para girar
              </span>
              <span className="rounded-lg bg-slate-950/75 border border-slate-700/60 px-2 py-1">
                Scroll ou +/-: zoom · Shift+arrastar: mover
              </span>
              <span className="rounded-lg bg-slate-950/75 border border-slate-700/60 px-2 py-1">
                Toque nos sensores
              </span>
            </div>
            {showLabels
              ? sensors3d.map(
                  (s) =>
                    labels[s.id] && (
                      <button
                        key={s.id}
                        onClick={() => setSelected(s.id)}
                        style={{
                          position: "absolute",
                          left: clamp(
                            labels[s.id].x,
                            18,
                            (canvasRef.current?.clientWidth || 800) - 48,
                          ),
                          top: clamp(
                            labels[s.id].y - 32,
                            44,
                            (canvasRef.current?.clientHeight || 520) - 40,
                          ),
                          transform: "translate(-50%,-100%)",
                        }}
                        className={`px-2 py-1 pointer-events-auto rounded-md border text-[11px] font-black shadow-lg ${selected === s.id ? "bg-orange-500 text-slate-950 border-orange-300" : "bg-slate-950/85 border-orange-500/50 text-orange-300"}`}
                      >
                        {s.id}
                      </button>
                    ),
                )
              : null}
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
              <div className="text-xs uppercase tracking-widest text-orange-300 font-bold">
                Sensores IO-Link destacados
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                {sensors3d.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelected(s.id)}
                    className={`text-xs font-bold px-3 py-2 rounded-lg border ${selected === s.id ? "border-orange-300 bg-orange-500/20 text-orange-200" : "border-slate-700 bg-slate-950 text-slate-400"}`}
                  >
                    {s.id}
                  </button>
                ))}
              </div>
              <h3 className="text-slate-100 font-bold text-base mt-3">
                {selected} · {sensors3d.find((s) => s.id === selected)?.label}
              </h3>
              <p className="text-sm mt-1 text-slate-400 leading-relaxed">
                {details[selected]}
              </p>
              <div
                className={`mt-3 text-xs font-bold ${visibleSignals[selected] ? "text-emerald-300" : "text-slate-500"}`}
              >
                {visibleSignals[selected]
                  ? selected === "X01"
                    ? "● MEDINDO DISTÂNCIA"
                    : "● PEÇA DETECTADA"
                  : selected === "X01"
                    ? distanceCm == null
                      ? "○ SEM LEITURA X01"
                      : "○ AGUARDANDO PEÇA"
                    : "○ SEM DETECÇÃO AGORA"}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                {lastIndication[selected]
                  ? `Última indicação visual: ${lastIndication[selected]}`
                  : "Nenhuma indicação visual registrada nesta sessão"}
              </div>
              <div
                className="grid grid-cols-3 gap-2 mt-4"
                aria-label="LEDs verdes de detecção"
              >
                {["X01", "X02", "X03"].map((id) => (
                  <div
                    key={id}
                    className="rounded-md bg-slate-950/70 border border-slate-700/80 px-1.5 py-2 flex flex-col gap-1.5 items-center"
                  >
                    <span className="text-[10px] text-slate-400 font-bold">
                      {id}
                    </span>
                    <span
                      className={`w-3 h-3 rounded-full transition-all duration-100 ${visibleSignals[id] ? "bg-green-400 shadow-[0_0_15px_4px_rgba(74,222,128,0.6)]" : "bg-green-950 border border-green-900"}`}
                    />
                    <span
                      className={`text-[9px] font-bold ${visibleSignals[id] ? "text-green-300" : "text-slate-500"}`}
                    >
                      {visibleSignals[id] ? "DETECTOU" : "INATIVO"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Peça animada", active],
                ["Última peça", pieceTypeLabel],
                [
                  "Nível virtual",
                  tankLevel == null ? "—" : `${Math.round(tankLevel)}%`,
                ],
                [
                  "Distância X01",
                  distanceCm == null
                    ? "—"
                    : `${Number(distanceCm).toFixed(1)} cm`,
                ],
              ].map(([name, value]) => (
                <div
                  key={name}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"
                >
                  <div className="text-[11px] text-slate-500">{name}</div>
                  <div className="text-sm font-bold text-slate-100 mt-1">
                    {value}
                  </div>
                </div>
              ))}
            </div>
            {demoMode ? (
              <div className="space-y-2 rounded-xl border border-amber-500/20 bg-amber-950/10 p-3">
                <div className="text-xs font-semibold text-amber-300">
                  Acionar demonstração
                </div>
                <button
                  onClick={onDemoMetal}
                  className="block w-full py-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-200 text-sm font-bold hover:bg-cyan-500/20"
                >
                  + Peça metálica
                </button>
                <button
                  onClick={onDemoNonMetal}
                  className="block w-full py-2 rounded-lg border border-violet-500/40 bg-violet-500/10 text-violet-200 text-sm font-bold hover:bg-violet-500/20"
                >
                  + Peça não metálica
                </button>
                <button
                  onClick={onDemoReset}
                  className="block w-full py-2 rounded-lg border border-slate-700 bg-slate-950 text-slate-400 text-xs"
                >
                  Zerar demonstração
                </button>
              </div>
            ) : null}
            <div className="text-xs text-slate-400 leading-relaxed border border-slate-800 rounded-xl bg-slate-950/60 p-3">
              <Info size={14} className="inline mr-1 text-cyan-300" /> Em modo
              conectado, os eventos confirmados pela API disparam animações
              **reconstruídas**. Não há encoder nem posição contínua da peça; a
              geometria e o tempo do movimento são ilustrativos. O X01 mede pela
              frente, não lateralmente.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
