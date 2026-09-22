let timer = 60;
let img;
let good;
let bad;
let previousImageNumber;
let currentImage;
let score = 0;
let pressed = false;
//let timerSpeed = 60

async function setup() {
  createCanvas(720,1280);
    //image loading
    junkfoodImg = await loadImage('/assets/junkfood.png');
    lazyImg = await loadImage('/assets/lazy.png');
    liftingImg = await loadImage('/assets/lifting.png');
    runningImg = await loadImage('/assets/running.png');
    good = [liftingImg, runningImg];
    bad = [junkfoodImg, lazyImg];  
    images = [liftingImg, runningImg, junkfoodImg, lazyImg];
    currentImage = random(images);

}



function draw() {
  background(225,255,225);


  //button curcle
  strokeWeight(10);
  stroke("Black");
  fill(255, 105, 97);
    if(mouseX >240 && mouseX < 500 && mouseY > 900 && mouseY < 1100){
      ellipse(width/2,height*.85, 170);
    }else{     
      ellipse(width/2,height*.85, 150);
   }

      
  textAlign(CENTER, CENTER);
  textSize(60);
  strokeWeight(5);
  textStyle(BOLD);
  fill("white");
  text("NO!", width/2, height*.85);
strokeWeight(0);
  
  textSize(100);
  fill(280);
  imageMode(CENTER);
  timeText();
  

  
//time for each image
  var barWidth = map(frameCount%60, 0, 59, 0, width);


	noStroke();

  //timer rectangle
	fill(150);
    if (timer > 0){
        fill(19, 152, 116);
    	rect(0, height/6, barWidth, 50 );	
    }

  // print(mouseX, mouseY);
}


function timeText(){

  fill("black");
  text(timer, width/2, height*.1);
  fill("black");
  textSize(40);
  text('SCORE: ' + score, width/2, height*.95);
  
  //print(frameCount%60)
  if (frameCount % 60 > 1 && timer > 0){
    image(currentImage, width/2, height/2);
  }


  if (frameCount % 60 == 0 && timer > 0) { // if the frameCount is divisible by 60, then a second has passed. it will stop at 0

    timer --;
    if(pressed == true && bad.includes(currentImage) == true)
    {
      score += 50;
    }else if(pressed == false && good.includes(currentImage) == true)
    {
      score +=50;
    }else{
      score -=25;
    }
    print(pressed);
    pressed=false;
    currentImage = random(images);


  }
  if (timer == 0) {

    if(score > 1500){
    fill("green");
    textSize(100);
    text("CONGRATS!", width/2, height*.6)
    }
    else{
    fill("red");
      textSize(100);
    text("GAME OVER", width/2, height*0.6);
    }
  }
}

function mousePressed() {

  if(mouseX >240 && mouseX < 500 && mouseY > 900 && mouseY < 1100){
    print("pressed inside")
    pressed = true;
  }
}