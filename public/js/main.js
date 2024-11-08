let socket = io();

/****
 * EaselJS Globals
 */

let easelCan,
  easelCtx,
  loader,
  stage,
  stageheight,
  stagewidth,
  easelground,
  hero,
  easelplatform,
  easelpipe,
  easelshroom,
  easelpole;
let objs = [];
let timestamps = [];
let framerate = 60;
let datastamps = [];

let R2D = 180 / Math.PI;

function init() {
  easelCan = document.getElementById("easelcan");
  easelCtx = easelCan.getContext("2d");
  stage = new createjs.Stage(easelCan);
  stage.snapPixelsEnabled = true;
  stagewidth = stage.canvas.width;
  stageheight = stage.canvas.height;

  let manifest = [
    { src: "./assets/hero.png", id: "hero" },
    { src: "./assets/ground.png", id: "ground" },
    { src: "./assets/sky.png", id: "sky" },
    { src: "./assets/hill1.png", id: "hill1" },
    { src: "./assets/hill2.png", id: "hill2" },
    { src: "./assets/platform.png", id: "plat1" },
    { src: "./assets/pipe.png", id: "pipe" },
    { src: "./assets/shroom.png", id: "shroom" },
    { src: "./assets/pole.png", id: "pole" },
  ];

  socket.emit("map", { map: "/assets/map1.txt" });
  loader = new createjs.LoadQueue(false);
  loader.addEventListener("complete", handleComplete);
  loader.loadManifest(manifest, true);
}

function tick(e) {
  const now = performance.now(); // Get the current time

  // Remove timestamps older than one second from the times array
  while (timestamps.length > 0 && timestamps[0] <= now - 1000) {
    timestamps.shift(); // Remove the oldest timestamp
  }

  timestamps.push(now); // Add the current timestamp to the array

  // Determine the frames per second (FPS) based on the number of timestamps
  if (timestamps.length < 45) {
    fps = 30; // If less than 45 frames, set FPS to 30
  } else if (timestamps.length < 75) {
    fps = 60; // If less than 75 frames, set FPS to 60
  } else if (timestamps.length < 105) {
    fps = 90; // If less than 105 frames, set FPS to 90
  } else if (timestamps.length < 130) {
    fps = 120; // If less than 130 frames, set FPS to 120
  } else if (timestamps.length < 160) {
    fps = 144; // If less than 160 frames, set FPS to 144
  } else {
    fps = 280; // If 160 frames or more, set FPS to 280
  }

  // Update the HTML elements with the current FPS and score
  $("#fps").html("Framerate: " + fps); // Display the current FPS
  //   $("#score").html("Score: " + score); // Display the current score
  //   update(); // Call the update function to update game state
  stage.update(e); // Update the stage to reflect changes
}

function handleComplete() {
  let easelbackground = makeBitmap(
    loader.getResult("sky"),
    stagewidth,
    stageheight + 220
  );
  easelbackground.x = 0;
  easelbackground.y = 0;

  stage.addChild(easelbackground);

  createjs.Ticker.framerate = framerate;
  createjs.Ticker.timingMode = createjs.Ticker.RAF;
  createjs.Ticker.addEventListener("tick", tick);

  let initialised = false;
  socket.on("objdata", function (data) {
    // console.log(data);
    for (let i in data) {
      if (!initialised && data[i].id.startsWith("ground")) {
        easelground = makeHorizontalTile(
          loader.getResult("ground"),
          data[i].objwidth,
          data[i].objheight
        );
        easelground.x = data[i].x - 25;
        easelground.y = data[i].y - 35;

        stage.addChild(easelground);
      } else if (!initialised && data[i].id === "hero") {
        // Create the hero sprite
        const spritesheet = new createjs.SpriteSheet({
          framerate: 60, // Set framerate for animations
          images: [loader.getResult("hero")], // Load hero image
          frames: {
            regX: 82,
            regY: 144,
            width: 165,
            height: 292,
            count: 64, // Total number of frames in the sprite sheet
          },
          animations: {
            stand: [56, 57, "stand", 1], // Animation definitions
            run: [0, 34, "run", 1.5],
            jump: [26, 63, "stand", 1],
          },
        });

        // Create the hero sprite instance
        hero = new createjs.Sprite(spritesheet, "stand"); // Start with the "stand" animation
        hero.snapToPixel = true; // Align the sprite to pixel grid

        hero.x = data[i].x;
        hero.y = data[i].y - 25;
        stage.addChild(hero);
      } else if (!initialised && data[i].id.startsWith("plat")) {
        easelplatform = makeHorizontalTile(
          loader.getResult("plat1"),
          data[i].objwidth,
          data[i].objheight
        );
        easelplatform.x = data[i].x;
        easelplatform.y = data[i].y;
        stage.addChild(easelplatform);
      } else if (!initialised && data[i].id.startsWith("pipe")) {
        easelpipe = makeBitmap(
          loader.getResult("pipe"),
          data[i].objwidth,
          data[i].objheight,
          0
        );
        easelpipe.x = data[i].x;
        easelpipe.y = data[i].y;
        stage.addChild(easelpipe);
      } else if (!initialised && data[i].id.startsWith("shroom")) {
        easelshroom = makeBitmap(
          loader.getResult("shroom"),
          data[i].objwidth,
          data[i].objheight,
          0
        );
        easelshroom.x = data[i].x;
        easelshroom.y = data[i].y;
        stage.addChild(easelshroom);
      } else if (!initialised && data[i].id.startsWith("pole")) {
        easelpole = makeBitmap(
          loader.getResult("pole"),
          data[i].objwidth,
          data[i].objheight,
          0
        );
        easelpole.x = data[i].x;
        easelpole.y = data[i].y;
        stage.addChild(easelpole);
      } else if (initialised && data[i].id === "hero") {
        console.log(data[i]);
        hero.x = data[i].x;
        hero.y = data[i].y;
      }
    }

    const now = performance.now();
    while (datastamps.length > 0 && datastamps[0] <= now - 1000) {
      datastamps.shift();
    }
    datastamps.push(now);
    document.getElementById("datarate").innerHTML =
      " datarate: " + datastamps.length;

    initialised = true;
  });

  socket.on("hero", function (data) {
    console.log(data);
    hero.scaleX = data.scaleX;
    hero.gotoAndPlay(data.animation);
  });
}

init();

$(document).keyup(function (e) {
  socket.emit("keypress", { key: e.key });
});

/****
 * Easel Helper Function
 */

function makeBitmap(ldrimg, b2x, b2y, yadjust = 0) {
  const theimage = new createjs.Bitmap(ldrimg);
  const scalex = (b2x * 2) / theimage.image.naturalWidth;
  const scaley = (b2y * 2) / theimage.image.naturalHeight;
  theimage.scaleX = scalex;
  theimage.scaleY = scaley;
  theimage.regX = theimage.image.width / 2;
  theimage.regY = theimage.image.height / 2 - yadjust;
  theimage.snapToPixel = true;
  return theimage;
}

function makeHorizontalTile(ldrimg, fillw, tilew) {
  const theimage = new createjs.Shape();
  theimage.graphics
    .beginBitmapFill(ldrimg)
    .drawRect(0, 0, fillw + ldrimg.width, ldrimg.height);
  theimage.tileW = tilew;
  theimage.snapToPixel = true;
  return theimage;
}
