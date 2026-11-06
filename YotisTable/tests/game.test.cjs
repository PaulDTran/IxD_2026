// Run with: node tests/game.test.cjs
// Tests game behavior with the real CSV, without needing a browser or packages.
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const path = require("node:path");
const root = path.resolve(__dirname, "..");

// Read quoted CSV fields correctly (category names themselves contain commas).
function parseCSV(source) {
  const records = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') {
      if (quoted && source[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field); field = "";
    } else if ((char === "\r" || char === "\n") && !quoted) {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(field);
      if (row.some(Boolean)) records.push(row);
      row = []; field = "";
    } else field += char;
  }
  if (field || row.length) { row.push(field); records.push(row); }
  return records;
}
const records = parseCSV(fs.readFileSync(path.join(root, "nutrients.csv"), "utf8"));
const columns = records.shift();
const table = {
  columns,
  rows: records.map(cells => ({ getString: column => cells[columns.indexOf(column)] ?? "" }))
};
let seed = 42;
let now = 2000;
const context = {
  console,
  random: items => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return items[Math.floor(seed / 4294967296 * items.length)]; },
  millis: () => now,
  dist: (x, y, a, b) => Math.hypot(x - a, y - b),
  constrain: (v, min, max) => Math.max(min, Math.min(max, v)),
  max: Math.max,
  round: (value, decimals = 0) => Math.round(value * 10 ** decimals) / 10 ** decimals,
  NORMAL: "normal", BOLD: "bold", LEFT: "left", RIGHT: "right", CENTER: "center", TOP: "top", BASELINE: "baseline",
  mouseX: 0, mouseY: 0, key: "", height: 940, frameCount: 0
};
// Drawing stubs also catch NaN/Infinity reaching any rendering function.
let foodsOnPlates = 0;
let drawnImages = [];
let drawnRects = [];
let drawnText = [];
context.resizeCanvas = (width, height) => { context.height = height; };
for (const method of ["background", "fill", "noStroke", "rect", "image", "textFont", "textSize", "textStyle", "textAlign", "textLeading", "text"]) {
  context[method] = (...args) => {
    if (method === "image" && args[3] === 64 && args[4] === 64) foodsOnPlates++;
    if (method === "image") drawnImages.push(args);
    if (method === "rect") drawnRects.push(args);
    if (method === "text") drawnText.push(args[0]);
    for (const value of args) if (typeof value === "number") assert.ok(Number.isFinite(value), method + " received an invalid number");
  };
}
vm.createContext(context);
const sketchSource = fs.readFileSync(path.join(root, "sketch.js"), "utf8");
const p5Source = fs.readFileSync(path.join(root, "libraries/p5.min.js"), "utf8");
// Custom helper names must not conflict with p5's global functions.
for (const match of sketchSource.matchAll(/^function (\w+)/gm)) {
  if (match[1] !== "draw") {
    assert.ok(!p5Source.includes("prototype." + match[1] + "="), "Helper conflicts with p5: " + match[1]);
  }
}
vm.runInContext(sketchSource, context);
context.testTable = table;
const run = code => vm.runInContext(code, context);
const snapshot = code => JSON.parse(JSON.stringify(run(code)));
context.loadTable = (source, ...args) => {
  assert.equal(source, run("url"));
  assert.deepEqual(args, ["csv", "header"]);
  return table;
};
context.loadImage = source => {
  assert.ok(fs.existsSync(path.join(root, source)), "Missing image: " + source);
  return { source };
};
run("preload();");

run("buildFoodGroups(); resetGame();");

run("draw();");
assert.equal(foodsOnPlates, 3, "The first frame must place three foods on the three plates");
for (let slot = 0; slot < 3; slot++) {
  const plate = snapshot(`platePosition(${slot})`);
  assert.ok(drawnImages.some(args => args[1] === plate.x && args[2] === plate.y - 6 && args[3] === 64));
}
assert.ok(drawnText.includes("Yoti's Table"));
assert.ok(!drawnText.some(text => /data|experiment|CSV/.test(text)), "The game copy should use Yoti's theme");
const mainBar = drawnRects.find(rect => rect[0] === 62 && rect[1] === 170);
assert.ok(mainBar && mainBar[2] === 836, "Calories must remain the main progress bar");
assert.ok(!drawnRects.some(rect => rect[1] === 334 && rect[2] === 203), "Protein and carbs should use numbers instead of bars");
assert.equal(run("categories.length"), 9);
assert.equal(run("Object.values(foodsByCategory).flat().length"), 270);
assert.equal(run("categories.includes('Soups') || categories.includes('Jams, Jellies')"), false);

// Distribution catches accidentally choosing uniformly from all CSV rows.
const counts = run(`(() => {
  const counts = Object.fromEntries(categories.map(c => [c, 0]));
  for (let i = 0; i < 90000; i++) counts[chooseFood().category]++;
  return counts;
})()`);
for (const count of Object.values(counts)) assert.ok(Math.abs(count - 10000) < 600, "Categories should have equal probability");

// A missed drag preserves both options and totals.
const beforeMiss = snapshot("({ options, totals, eaten })");
run("mouseX = platePosition(0).x; mouseY = platePosition(0).y; mousePressed();");
assert.equal(run("dragging"), 0);
run("mouseX = 20; mouseY = 300; mouseReleased();");
assert.equal(run("dragging"), -1);
assert.deepEqual(snapshot("({ options, totals, eaten })"), beforeMiss);

// A valid drop adds exactly that serving and preserves the other two slots.
const original = snapshot("options");
run("mouseX = platePosition(0).x; mouseY = platePosition(0).y; mousePressed(); mouseX = character.x; mouseY = character.y; mouseReleased();");
assert.equal(run("eaten.length"), 1);
assert.deepEqual(snapshot("totals"), {
  calories: original[0].calories, protein: original[0].protein, carbs: original[0].carbs
});
assert.deepEqual(snapshot("options[1]"), original[1]);
assert.deepEqual(snapshot("options[2]"), original[2]);
run("draw();");

// Whole servings cross the calorie threshold; food count does not end a round.
run("resetGame();");
for (let i = 0; i < 15; i++) {
  run("options[1] = foodsByCategory[categories[0]][0]; feed(1);");
}
assert.equal(run("eaten.length"), 15);
assert.equal(run("totals.calories"), 1950);
assert.equal(run("isGameOver()"), false);
run("options[1] = foodsByCategory[categories[0]][0]; feed(1); draw();");
assert.equal(run("eaten.length"), 16);
assert.equal(run("totals.calories"), 2080);
assert.equal(run("isGameOver()"), true);
assert.ok(context.height > 940, "The full final menu must fit on the expanded canvas");
const final = snapshot("({ totals, eaten, options })");
run("feed(0); key = '3'; keyPressed(); mouseX = platePosition(0).x; mouseY = platePosition(0).y; mousePressed(); mouseX = character.x; mouseY = character.y; mouseReleased();");
assert.deepEqual(snapshot("({ totals, eaten, options })"), final);
assert.deepEqual(final.totals, final.eaten.reduce((sum, food) => ({
  calories: sum.calories + food.calories,
  protein: sum.protein + food.protein,
  carbs: sum.carbs + food.carbs
}), { calories: 0, protein: 0, carbs: 0 }));

// Reaching exactly 2,000 also ends the round.
run("resetGame(); totals.calories = 1870; options[0] = foodsByCategory[categories[0]][0]; feed(0);");
assert.equal(run("totals.calories"), 2000);
assert.equal(run("isGameOver()"), true);

// Every Yoti export has the same registration canvas.
for (const name of run("yotiLayers")) {
  const bytes = fs.readFileSync(path.join(root, "assets", "Yoti", name + ".png"));
  assert.equal(bytes.readUInt32BE(16), 2064);
  assert.equal(bytes.readUInt32BE(20), 2752);
}
function renderYoti(protein, carbs, calories = 0) {
  drawnImages = [];
  run(`totals = { calories: ${calories}, protein: ${protein}, carbs: ${carbs} }; drawCharacter();`);
  return drawnImages.map(args => ({ name: path.basename(args[0].source, ".png"), geometry: args.slice(1) }));
}
run("resetGame();");
const normal = renderYoti(0, 0);
assert.deepEqual(normal.map(layer => layer.name), ["Body", "Normal_face", "Table", "Normal_arms", "Plates"]);
assert.ok(renderYoti(101, 0).some(layer => layer.name === "Muscular_arms"));
assert.ok(renderYoti(0, 200).some(layer => layer.name === "Fat_arms"));
assert.ok(renderYoti(101, 300).some(layer => layer.name === "Fat_arms"));
assert.ok(renderYoti(180, 210).some(layer => layer.name === "Muscular_arms"));
// All moving character parts share identical image registration and scaling.
const aligned = renderYoti(0, 0).filter(layer => ["Body", "Normal_face", "Normal_arms"].includes(layer.name));
assert.deepEqual(aligned[0].geometry, aligned[1].geometry);
assert.deepEqual(aligned[0].geometry, aligned[2].geometry);
const fixedTable = normal.find(layer => layer.name === "Table").geometry;
context.frameCount = run("roundStartedFrame") + 245;
const blinking = renderYoti(0, 0);
assert.ok(blinking.some(layer => layer.name === "Blink_face"));
assert.deepEqual(blinking.find(layer => layer.name === "Table").geometry, fixedTable);
assert.notDeepEqual(blinking.find(layer => layer.name === "Body").geometry, normal[0].geometry);
context.frameCount = run("roundStartedFrame") + 252;
assert.ok(renderYoti(0, 0).some(layer => layer.name === "Normal_face"));
const finished = renderYoti(150, 0, 2000);
assert.ok(finished.some(layer => layer.name === "Smile_face"));
assert.ok(finished.some(layer => layer.name === "Table"));
assert.ok(finished.some(layer => layer.name === "Plates"));
assert.ok(!finished.some(layer => layer.name === "Blink_face"));
context.frameCount = run("roundStartedFrame") + 245;
assert.ok(renderYoti(150, 0, 2000).some(layer => layer.name === "Smile_face"));
now = 2000;

// Large values still render with finite, bounded geometry.
run("totals = { calories: 20000, protein: 500, carbs: 2000 }; drawNutrition(); drawCharacter();");
run("key = 'r'; keyPressed();");
assert.deepEqual(snapshot("totals"), { calories: 0, protein: 0, carbs: 0 });
assert.equal(run("eaten.length"), 0);
assert.equal(run("options.length"), 3);
assert.equal(context.height, 940);
run("feed(1); mouseX = 860; mouseY = 60; mousePressed();");
assert.equal(run("eaten.length"), 0);
run("draw();");

console.log("PASS: image paths, CSV loading, category balance, dragging, calorie ending, summary, arms, faces, aligned animation, restart.");
