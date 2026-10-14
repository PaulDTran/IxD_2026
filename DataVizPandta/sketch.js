let data;
let url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT00Qc_L-F4nsahy9ClEbvLf2HUrtxvfGvqMOYlvb2Ff5C-UAn5QEoUt4CtZXXGvOd9kDz-uyR_Wwyx/pub?gid=0&single=true&output=csv"

function setup() {
  createCanvas(1200, 1200);
}

function preload(){
  data = loadTable(url, "csv", "header");
  console.log(data);
}

function draw() {
  background(0);

  if(data){
    let numRows = data.getRowCount();
    let calories = data.getColumn("Calories");
    let sugar = data.getColumn("Sugar");
    let carbs = data.getColumn("Carbs");
    let sodium = data.getColumn("Sodium");
    let protein = data.getColumn("Protein");




    let names = data.getColumn("Food");

    for(let i=0; i<numRows; i++){
      let x=50;
      let y = 100 + i *150;
      let w = calories[i];
      let w2 = sugar[i];
      let w3 = carbs[i];
      let h = 10;

      //calories bar
      textAlign(LEFT);
      textStyle(NORMAL);
      
      textSize(12);
      fill(255);
      text("Calories", x, y-5);
      fill(150,0,0);
      rect(x,y,w,h);

      fill(255);
      text("Sugar", x, y+35);
      fill(0,0,150);
      rect(x,y+40,w2*10,h);

      fill(255);
      text("Carbs", x, y+75);
      fill(0,150,0);
      rect(x,y+80,w2*10,h);
      


      //names
      textAlign(LEFT);
      textStyle(BOLD);

      fill(255);
      textSize(16);
      text(names[i],x-5,y-30);

      textSize(20);
      textAlign(CENTER);
      text("Food",width/2,40);
      
    }

  }

}
