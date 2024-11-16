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
let WIDTH = 40000;
let HEIGHT = 800;
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
  followHero(); // Call the followHero function to adjust the camera
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
  let playstand = false;
  socket.on("objdata", function (data) {
    // console.log(data);
    const groundimg = loader.getResult("ground"); // Get the ground image from the loader

    for (let i in data) {
      if (!initialised && data[i].id.startsWith("ground")) {
        easelground = makeHorizontalTile(loader.getResult("ground"), WIDTH, 64);
        easelground.x = 0;
        easelground.y = HEIGHT - groundimg.height;

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
        hero.y = data[i].y;
        stage.addChild(hero);
      } else if (!initialised && data[i].id.startsWith("plat")) {
        easelplatform = makeHorizontalTile(
          loader.getResult("plat1"),
          data[i].objwidth * 1.45,
          data[i].objheight
        );
        easelplatform.x = data[i].x - data[i].objwidth;
        easelplatform.y = data[i].y - data[i].objheight;
        stage.addChild(easelplatform);
      } else if (!initialised && data[i].id.startsWith("pipe")) {
        const pipeimg = loader.getResult("pipe"); // Load pipe image
        easelpipe = makeBitmap(
          loader.getResult("pipe"),
          pipeimg.width,
          pipeimg.height,
          0
        );
        easelpipe.x = data[i].x;
        easelpipe.y = data[i].y + pipeimg.height / 15;
        stage.addChild(easelpipe);
      } else if (!initialised && data[i].id.startsWith("shroom")) {
        const shroomsimg = loader.getResult("shroom"); // Load shroom image
        const shroomsWidth = shroomsimg.width; // Get shroom width
        const shroomsHeight = shroomsimg.height; // Get shroom height

        // Create a visual representation of the shroom
        const shroomsVisual = makeBitmap(
          shroomsimg,
          shroomsWidth / 2, // Scale down width
          shroomsHeight / 2 // Scale down height
        );

        shroomsVisual.x = data[i].x;
        shroomsVisual.y = data[i].y + shroomsimg.height * 3.2;
        stage.addChild(shroomsVisual);
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

        if (playstand) {
          hero.gotoAndPlay("stand");
        }
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
    if (data.animation === "stand") {
      playstand = true;
    } else {
      playstand = false;
      hero.scaleX = data.scaleX;
      hero.gotoAndPlay(data.animation);
    }
  });
}

init();

$(document).keydown(function (e) {
  socket.emit("keypress", { key: e.key });
});

$(document).keyup(function (e) {
  socket.emit("keyrelease", { key: e.key });
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

// VIEWPORT
let initialised = false;
let animationcomplete = false;

// Function to adjust the camera to follow the hero (player)
function followHero() {
  // Get the player's current position in the world, scaled to canvas size
  const playerPosX = hero.x; // Scale X position
  const playerPosY = hero.y; // Scale Y position

  // Get the dimensions of the viewport (canvas)
  const viewportWidth = stage.canvas.width; // Width of the canvas
  const viewportHeight = stage.canvas.height; // Height of the canvas

  // Calculate camera offsets to keep the player centered in the viewport
  const offsetX = viewportWidth / 2 - playerPosX; // Horizontal offset
  const offsetY = viewportHeight / 2 - playerPosY; // Vertical offset

  // Set boundaries for the camera to avoid moving beyond the world limits
  const minOffsetX = -WIDTH + viewportWidth; // Minimum X offset (left boundary)
  const maxOffsetX = 0; // Maximum X offset (right boundary)
  const minOffsetY = -HEIGHT + viewportHeight; // Minimum Y offset (top boundary)
  const maxOffsetY = 0; // Maximum Y offset (bottom boundary)

  // Clamp the calculated camera position within the world limits
  const finalOffsetX = Math.max(minOffsetX, Math.min(maxOffsetX, offsetX)); // Final X offset within bounds
  const finalOffsetY = Math.max(minOffsetY, Math.min(maxOffsetY, offsetY)); // Final Y offset within bounds

  // Apply the camera translation to the stage to keep the player centered
  stage.x = finalOffsetX; // Set the X position of the stage
  stage.y = finalOffsetY; // Set the Y position of the stage
}
