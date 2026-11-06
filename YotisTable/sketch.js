// YOTI'S TABLE
// Read by feature: each section keeps its appearance and behavior together.
// The p5 callbacks below connect those sections to the game loop and mouse.

// 1. SHARED GAME SETTINGS
// ---------------------------------------------------------------------
const gameHeight = 940;
const calorieGoal = 2000;
// These affect both number colors and Yoti's arms.
const armThresholds = { protein: 100, carbs: 200 };
const carbWarning = 150;
const colors = {
  ink: "#533e35", muted: "#8a7161", paper: "#fff7eb", calories: "#d76d50"
};

// 2. P5 CALLBACKS: STARTUP, DRAWING, AND INPUT
// ---------------------------------------------------------------------

// p5 calls these automatically. Each sends work to the relevant feature.

function preload() {
  data = loadTable(url, "csv", "header");
  loadFoodImages();
  loadYotiImages();
}

function setup() {
  const canvas = createCanvas(960, gameHeight);
  canvas.parent("game");
  canvas.attribute("aria-label", "Yoti's Table. Drag food from a plate onto Yoti. Press R to restart.");
  canvas.attribute("tabindex", "0");
  textFont("Roboto");
  imageMode(CENTER);
  buildFoodGroups();
  resetGame();
}

function draw() {
  background(colors.paper);
  drawHeader();
  drawRestartButton();
  drawNutrition();
  drawCharacter();
  drawFeedingMessage();
  if (!isGameOver()) drawFoodOptions();
  else drawResults();
  drawDraggedFood();
}

function mousePressed() {
  if (handleRestartClick()) return;
  startFoodDrag();
}

function mouseReleased() {
  finishFoodDrag();
}

function keyPressed() {
  handleRestartKey();
}

//title text
function drawHeader() {
  noStroke();
  fill(colors.ink);
  textSize(40);
  textStyle(BOLD);
  textAlign(LEFT, BASELINE);
  text("Yoti's Table", 40, 83);
  fill(colors.muted);
  textSize(14);
  textStyle(NORMAL);
  textAlign(LEFT, BASELINE);
  text("Which will win, his hunger or his health?", 40, 110);
}

//restart button
const restartButton = { x: 800, y: 42, width: 120, height: 38 };

function drawRestartButton() {
  const button = restartButton;
  noStroke();
  fill("#f0e3ce");
  rect(button.x, button.y, button.width, button.height);
  fill(colors.ink);
  textSize(13);
  textStyle(BOLD);
  textAlign(CENTER, BASELINE);
  text("Restart", button.x + button.width / 2, button.y + 24);
}

function handleRestartClick() {
  const button = restartButton;
  const inside = mouseX >= button.x && mouseX <= button.x + button.width &&
    mouseY >= button.y && mouseY <= button.y + button.height;
  if (!inside) return false;
  resetGame();
  return true;
}

function resetGame() {
  resizeCanvas(960, gameHeight);
  totals = { calories: 0, protein: 0, carbs: 0 };
  eaten = [];
  options = [chooseFood(), chooseFood(), chooseFood()];
  dragging = -1;
  lastFedAt = -1000;
  roundStartedFrame = frameCount;
  smileFramesLeft = 0;
  message = "Feed Yoti by dragging some food to him!";
}

//shows nutrition amounts
function drawNutrition() {
  noStroke();
  fill("#f6e4cf");
  rect(40, 128, 880, 98);
  fill(colors.ink);
  textSize(12);
  textStyle(BOLD);
  textAlign(LEFT, BASELINE);
  text("Calories", 62, 153);
  fill(colors.calories);
  textSize(22);
  textStyle(BOLD);
  textAlign(RIGHT, BASELINE);
  text(round(totals.calories, 1) + " / " + round(calorieGoal, 1) + " kcal", 898, 156);
  fill("#e6cdb2");
  rect(62, 170, 836, 20);
  fill(colors.calories);
  const progress = constrain(totals.calories / calorieGoal, 0, 1);
  if (progress > 0) rect(62, 170, 836 * progress, 20);
  const metrics = [
    { key: "protein", title: "Protein", x: 40 },
    { key: "carbs", title: "Carbs", x: 685 }
  ];
  for (let metric of metrics) {
    const value = totals[metric.key];
    fill("#f4eddf");
    rect(metric.x, 267, 235, 122);
    fill(colors.muted);
    textSize(13);
    textStyle(BOLD);
    textAlign(LEFT, BASELINE);
    text(metric.title, metric.x + 16, 292);
    let numberColor = "#9b9890";
    if (metric.key === "carbs") {
      if (value >= armThresholds.carbs) numberColor = "#d45b50";
      else if (value >= carbWarning) numberColor = "#c29a24";
    } else {
      if (value > armThresholds.protein) numberColor = "#719171";
      else if (value > 0) numberColor = "#c29a24";
    }
    fill(numberColor);
    textSize(32);
    textStyle(BOLD);
    textAlign(LEFT, BASELINE);
    text(round(value, 1) + " g", metric.x + 16, 339);
  }
}

//food data
const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwAS-B0K5BaULJHw7tFGcUA6J8T7Dm3bZLMgzqo94Dl_JsBFc6PzaKVkT1hi9bfQj20p8TFuatlMTh/pub?gid=1168895770&single=true&output=csv";
const categoryImages = {
  "Breads, cereals, fastfood,grains": "grains",
  "Dairy products": "dairy",
  "Desserts, sweets": "sweets",
  "Drinks,Alcohol, Beverages": "drinks",
  "Fish, Seafood": "seafood",
  "Fruits": "fruits",
  "Meat, Poultry": "meat",
  "Seeds and Nuts": "nuts",
  "Vegetables": "vegetables"
};
let data;
let foodImages = {};
let foodsByCategory = {};
let categories = [];

function loadFoodImages() {
  for (let category in categoryImages) {
    foodImages[category] = loadImage("assets/" + categoryImages[category] + ".png");
  }
}

function buildFoodGroups() {
  foodsByCategory = {};
  for (let row of data.rows) {
    const category = row.getString("Category").trim();
    // Only use the nine categories with food images.
    if (!categoryImages[category]) continue;
    const food = {
      name: row.getString("Food"),
      measure: row.getString("Measure"),
      category: category,
      calories: Number(row.getString("Calories").replace("t", "0")),
      protein: Number(row.getString("Protein").replace("t", "0")),
      carbs: Number(row.getString("Carbs").replace("t", "0"))
    };
    if (!foodsByCategory[category]) foodsByCategory[category] = [];
    foodsByCategory[category].push(food);
  }
  categories = Object.keys(foodsByCategory);
}

function chooseFood() {
  // Choose a category first to give every category the same chance.
  const category = random(categories);
  return random(foodsByCategory[category]);
}

//categories
const plates = [{ x: 505, y: 1835 }, { x: 1065, y: 1835 }, { x: 1620, y: 1835 }];
const categoryLabels = {
  "Breads, cereals, fastfood,grains": "Grains & breads",
  "Drinks,Alcohol, Beverages": "Drinks & beverages",
  "Meat, Poultry": "Meat & poultry"
};
let options = [];
let dragging = -1; // No food selected. Slots 0, 1, and 2 are the three plates.

function platePosition(slot) {
  return { x: art.x + plates[slot].x * art.scale, y: art.y + plates[slot].y * art.scale };
}

function drawFoodOption(food, slot) {
  const plate = platePosition(slot);
  const iconSize = insideFoodOption(slot, mouseX, mouseY) ? 64 * 1.2 : 64;
  if (dragging !== slot) image(foodImages[food.category], plate.x, plate.y - 6, iconSize, iconSize);
  noStroke();
  fill("#fffcf5");
  rect(plate.x - 85, 720, 170, 134);
  fill(colors.muted);
  textSize(10);
  textStyle(NORMAL);
  textAlign(CENTER, BASELINE);
  text(categoryLabels[food.category] || food.category, plate.x, 736);
  fill(colors.ink);
  textSize(12);
  textStyle(BOLD);
  textAlign(CENTER, TOP);
  textLeading(14);
  text(food.name, plate.x - 75, 746, 150);
  fill(colors.muted);
  textSize(10);
  textStyle(NORMAL);
  textLeading(12);
  text("Serving: " + food.measure, plate.x - 75, 790, 150);
  fill(colors.calories);
  textSize(14);
  textStyle(BOLD);
  textAlign(CENTER, BASELINE);
  text(round(food.calories, 1) + " kcal", plate.x, 827);
  fill(colors.muted);
  textSize(10);
  textStyle(NORMAL);
  textAlign(CENTER, BASELINE);
  text(round(food.protein, 1) + "g protein - " + round(food.carbs, 1) + "g carbs", plate.x, 845);
}

function drawFoodOptions() {
  for (let i = 0; i < options.length; i++) drawFoodOption(options[i], i);
}

function insideFoodOption(slot, x, y) {
  const plate = platePosition(slot);
  const onPlate = ((x - plate.x) / 82) ** 2 + ((y - plate.y) / 58) ** 2 <= 1;
  const onLabel = x >= plate.x - 85 && x <= plate.x + 85 && y >= 720 && y <= 854;
  return onPlate || onLabel;
}

function startFoodDrag() {
  if (isGameOver()) return;
  for (let i = 0; i < options.length; i++) {
    if (insideFoodOption(i, mouseX, mouseY)) {
      dragging = i;
      break;
    }
  }
}

function drawDraggedFood() {
  if (dragging !== -1) {
    image(foodImages[options[dragging].category], mouseX, mouseY, 64 * 1.2, 64 * 1.2);
  }
}

function finishFoodDrag() {
  if (dragging === -1) return;
  if (insideCharacter(mouseX, mouseY)) feed(dragging);
  dragging = -1;
}

//count meals eaten, add to array
let eaten = [];
let totals = { calories: 0, protein: 0, carbs: 0 };
let message = "Feed Yoti by dragging some food to him!";

function drawFeedingMessage() {
  noStroke();
  fill(colors.muted);
  textSize(12);
  textStyle(NORMAL);
  textAlign(CENTER, BASELINE);
  text(message, 480, height - 59);
}

function feed(slot) {
  if (isGameOver()) return;
  const food = options[slot];
  totals.calories += food.calories;
  totals.protein += food.protein;
  totals.carbs += food.carbs;
  eaten.push(food);
  lastFedAt = millis();
  smileFramesLeft = 50;
  message = "Yoti gobbled up " + food.name + "! More please!";
  if (!isGameOver()) options[slot] = chooseFood();
  else resizeCanvas(960, max(gameHeight, resultsY + resultPanelHeight() + 81));
}

function isGameOver() {
  return totals.calories >= calorieGoal;
}

//layer assets
const yotiLayers = ["Body", "Table", "Plates", "Normal_arms", "Fat_arms",
  "Muscular_arms", "Normal_face", "Blink_face", "Smile_face"];
const art = { width: 2064, height: 2752, scale: 0.32, x: 149.76, y: 65 };
const character = { x: 496, y: 385, radius: 112 };
let yotiImages = {};
let lastFedAt = -1000;
let roundStartedFrame = 0;
let smileFramesLeft = 0;

function loadYotiImages() {
  for (let name of yotiLayers) {
    yotiImages[name] = loadImage("assets/Yoti/" + name + ".png");
  }
}

function drawCharacter() {
  // Repeat every 120 frames: grow for 60 frames, then shrink for 60.
  const breathFrame = frameCount % 120;
  let breath;
  if (breathFrame < 60) breath = 1 + breathFrame * 0.0002;
  else breath = 1 + (120 - breathFrame) * 0.0002;
  const munch = max(0, 1 - (millis() - lastFedAt) / 300) * 0.012;
  const characterScale = breath + munch;
  const widthScale = 1 + constrain((totals.carbs - armThresholds.carbs) / 100, 0, 1) * 0.2;
  drawArtwork("Body", characterScale, widthScale);
  drawArtwork(faceLayer(), characterScale, widthScale);
  if (smileFramesLeft > 0) smileFramesLeft--;
  drawArtwork("Table");
  drawArtwork(armLayer(), characterScale, widthScale);
  drawArtwork("Plates");
}

function armLayer() {
  const proteinHigh = totals.protein > armThresholds.protein;
  const carbsHigh = totals.carbs >= armThresholds.carbs;
  if (proteinHigh && (!carbsHigh || totals.protein / armThresholds.protein >= totals.carbs / armThresholds.carbs)) return "Muscular_arms";
  return carbsHigh ? "Fat_arms" : "Normal_arms";
}

function faceLayer() {
  if (isGameOver() || smileFramesLeft > 0) return "Smile_face";
  // Blink for final 12 frames of each 252-frame cycle.
  return (frameCount - roundStartedFrame) % 252 >= 240 ? "Blink_face" : "Normal_face";
}

function drawArtwork(name, breathingScale = 1, widthScale = 1) {
  // Body, face, and arms share this pivot and image registration.
  const pivot = { x: 496, y: 430 };
  const centerX = art.x + art.width * art.scale / 2;
  const centerY = art.y + art.height * art.scale / 2;
  image(yotiImages[name],
    pivot.x + (centerX - pivot.x) * breathingScale * widthScale,
    pivot.y + (centerY - pivot.y) * breathingScale,
    art.width * art.scale * breathingScale * widthScale,
    art.height * art.scale * breathingScale);
}

function insideCharacter(x, y) {
  return dist(x, y, character.x, character.y) < character.radius;
}

//show table summary at end
const resultsY = 750;

function drawResults() {
  fill("#f1e5cd");
  rect(40, resultsY, 880, resultPanelHeight());
  noStroke();
  fill(colors.muted);
  textSize(11);
  textStyle(BOLD);
  textAlign(RIGHT, BASELINE);
  text("kcal          Protein        Carbs", 890, resultsY + 28);
  for (let i = 0; i < eaten.length; i++) {
    const y = resultsY + 57 + i * 25;
    const food = eaten[i];
    image(foodImages[food.category], 74, y - 5, 20, 20);
    fill(colors.ink);
    textSize(13);
    textStyle(NORMAL);
    textAlign(LEFT, BASELINE);
    text(food.name + " - " + food.measure, 96, y);
    fill(colors.ink);
    textSize(13);
    textStyle(NORMAL);
    textAlign(RIGHT, BASELINE);
    text(round(food.calories, 1), 691, y);
    text(round(food.protein, 1) + "g", 787, y);
    text(round(food.carbs, 1) + "g", 890, y);
  }
}

function resultPanelHeight() {
  return 56 + eaten.length * 25;
}
