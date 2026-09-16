let answerResults = ["yes", "no", "maybe"]
let answer = 8;
let myButton;

function setup() {
  let canvas = createCanvas(500, 700);
  canvas.parent('test');
  background(220);
}

function draw() {


  //8ball graphic
  fill(0);
  ellipse(width/2, 300, 300);
  fill("white");
  ellipse(width/2,280,190, 180);

  //answer text
  fill(0);
  textSize(50);
 
  //scale(1.2, 1.0); // Scale X by 1.0 (normal width), scale Y by 2.0 (double height)
  textAlign(CENTER);
  textStyle(BOLD);
  
  //text("8", width/2, 310);
  //text(answerResults[int(random(3))], width/2, 310);
  text(answer, width/2, 290);
  
  console.log(mouseX, mouseY);
  //button

if (mouseX >175 && mouseX < 325 && mouseY > 505 && mouseY < 595){
  fill("cyan");
}else{
  fill(255);
}
  rectMode(CENTER);
  noStroke();
  rect(width/2, 550, 150, 90)
  fill(0);
  textSize(32);
  text("Ask Me", width/2,560)
}

function mousePressed() {

  if(mouseX >175 && mouseX < 325 && mouseY > 505 && mouseY < 595){
  answer = random(answerResults);
  //answer = answerResults[int(random(3))];
  }
}