"use strict";
const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const Box2D = require("box2dweb-commonjs").Box2D;

// Initialize sound effects for the game
// const shroomSound = new Audio("./assets/eat.mp3"); // Sound for eating a mushroom
// const winSound = new Audio("./assets/win.mp3"); // Sound for winning the game

// Constants for grid dimensions
const CELL_WIDTH = 50; // Width of each cell in the grid
const CELL_HEIGHT = 50; // Height of each cell in the grid

// Arrays to hold various game objects
var groundTotal = 0; // Total ground value
var player; // Variable to hold the player object
var pole; // Variable to hold a pole object
var platforms = []; // Array to hold platform objects
var easelPlatforms = []; // Array to hold EaselJS platforms
var pipes = []; // Array to hold pipe objects
var easelPipes = []; // Array to hold EaselJS pipes
var shrooms = []; // Array to hold mushroom objects
var easelShrooms = []; // Array to hold EaselJS mushrooms

// Timer variables for level duration
let levelStartTime; // Time when the level started
let timeSpent = 0; // Total time spent in the level
let levelTimer; // Timer reference for updating the time spent

// Function to load a map from the specified file path
function loadMap(mapFilePath) {
  fetch("http://localhost:3000" + mapFilePath) // Fetch the map file from the server
    .then((response) => response.text()) // Convert the response to text
    .then((data) => {
      processMap(data); // Process the loaded map data
      // startTimer(); // Start the timer for the level
    })
    .catch((error) => console.error("Error loading map:", error)); // Log any errors
}

// Function to process the content of the map
function processMap(data) {
  const lines = data.split("\n"); // Split the map data into lines

  // Iterate through each line of the map
  lines.forEach((line, rowIndex) => {
    let colStart = -1; // Initialize variable to track the start of a platform

    // Iterate through each character in the line
    for (let colIndex = 0; colIndex < line.length; colIndex++) {
      const char = line[colIndex]; // Get the character at the current column

      if (char === "%") {
        // If the character is "%", it marks the start of a platform
        if (colStart === -1) {
          colStart = colIndex; // Mark the start position
        }
      } else if (char === "&") {
        createPipe(rowIndex, colIndex); // Create a pipe at the specified position
      } else if (char === "$") {
        createShroom(rowIndex, colIndex); // Create a mushroom at the specified position
      } else if (char === "*") {
        createEndPole(rowIndex, colIndex); // Create an end pole at the specified position
      } else {
        // If we reach the end of a platform
        if (colStart !== -1) {
          createPlatforms(rowIndex, colStart, colIndex - 1); // Create the platform from start to end
          colStart = -1; // Reset the start position
        }

        // Process other characters
        if (char === "P") {
          // If the character is "P", place the player
          placePlayer(rowIndex, colIndex);
        } else if (char === "#") {
          // If the character is "#", create ground
          createGround(rowIndex, colIndex);
          groundTotal += colIndex; // Update the total ground value
        }
      }
    }
  });
}

// Function to start the timer for the current level
function startTimer() {
  levelStartTime = performance.now(); // Record the start time
  levelTimer = setInterval(() => {
    timeSpent = Math.floor((performance.now() - levelStartTime) / 1000); // Update time spent every second
  }, 1000); // Timer interval set to 1 second
}

function createGround(row, col) {
  // Calculate the X and Y positions for the ground based on column and row
  const positionX = col * CELL_WIDTH + CELL_WIDTH / 2; // Centered X position
  const positionY = HEIGHT - CELL_HEIGHT / 2; // Y position at the bottom of the screen

  // Define a new static ground body and return it
  createb2dObj(
    `ground_${row}_${col}`, // Unique object ID
    positionX, // X position
    positionY, // Y position
    {
      width: 64, // Width of the ground
      height: 64,
    }, // Height of the ground
    false, // Not a circle shape
    true // Static object
  );
}

// Create a platform spanning from colStart to colEnd in the specified row
function createPlatforms(row, colStart, colEnd) {
  const platformHeight = 24; // Height of the platform
  const platformWidth = (colEnd - colStart + 1) * CELL_WIDTH; // Width based on start and end columns
  const positionX = ((colStart + colEnd + 1) / 2) * CELL_WIDTH; // Centered X position of the platform
  const positionY = row * CELL_HEIGHT + platformHeight / 2; // Centered Y position of the platform

  // Define a new static platform body and push it to the platforms array
  createb2dObj(
    `plat${row}_${colStart}_${colEnd}`, // Unique object ID
    positionX, // X position
    positionY, // Y position
    {
      width: platformWidth, // Width of the platform
      height: platformHeight,
    }, // Height of the platform
    false, // Not a circle shape
    true // Static object
  );
  // platforms.push(platform); // Add the platform to the platforms array
}

// Create an end pole at the specified row and column
function createEndPole(row, col) {
  // Calculate the X and Y positions for the end pole
  const positionX = col * CELL_WIDTH + CELL_WIDTH / 2; // Centered X position
  const positionY = row * CELL_HEIGHT + CELL_HEIGHT * 5.5; // Y position higher in the screen

  // Define a new static pole body
  createb2dObj(
    `pole_${row}_${col}`, // Unique object ID
    positionX, // X position
    positionY, // Y position
    {
      width: CELL_WIDTH, // Width of the pole
      height: CELL_HEIGHT,
    }, // Height of the pole
    false, // Not a circle shape
    true // Static object
  );
}

// Create a pipe at the specified row and column
function createPipe(row, col) {
  // Calculate the X and Y positions for the pipe
  const positionX = col * CELL_WIDTH + CELL_WIDTH / 2; // Centered X position
  const positionY = row * CELL_HEIGHT + CELL_HEIGHT * 5.5; // Y position higher in the screen

  // Define a new static pipe body and push it to the pipes array
  createb2dObj(
    `pipe_${row}_${col}`, // Unique object ID
    positionX, // X position
    positionY, // Y position
    { width: CELL_WIDTH, height: CELL_HEIGHT }, // Dimensions of the pipe
    false, // Not a circle shape
    true // Static object
  );
}

// Create a shroom (dynamic object) at the specified row and column
function createShroom(row, col) {
  // Calculate the X and Y positions for the shroom
  const positionX = col * CELL_WIDTH + CELL_WIDTH / 2; // Centered X position
  const positionY = row * CELL_HEIGHT + CELL_HEIGHT / 2; // Centered Y position

  // Define a new dynamic circle for the shroom and push it to the shrooms array
  createb2dObj(
    `shroom_${row}_${col}`, // Unique object ID
    positionX, // X position
    positionY, // Y position
    { radius: 30 }, // Radius of the shroom
    true, // Is a circle shape
    false // Not a static object
  );
}

// Place the player character at the specified row and column
function placePlayer(row, col) {
  // Define player dimensions
  const playerWidth = 72; // Width of the player
  const playerHeight = 140; // Height of the player

  // Create player with defined properties
  createb2dObj(
    "hero", // Object ID
    col * CELL_WIDTH + CELL_WIDTH, // Centered X position
    row * CELL_HEIGHT + CELL_HEIGHT, // Centered Y position
    {
      width: playerWidth, // Width of the player
      height: playerHeight,
    }, // Height of the player
    false, // Not a circle shape
    false // Not a static object
  );

  // player.GetBody().SetFixedRotation(true); // Prevent player rotation
}

let b2Vec2 = Box2D.Common.Math.b2Vec2; // Vector2 class for 2D coordinates
let b2BodyDef = Box2D.Dynamics.b2BodyDef; // Definition class for body
let b2Body = Box2D.Dynamics.b2Body; // Body class representing physical objects
let b2FixtureDef = Box2D.Dynamics.b2FixtureDef; // Definition class for fixtures
let b2World = Box2D.Dynamics.b2World; // World class for managing the simulation
let b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape; // Class for polygon shapes
let b2CircleShape = Box2D.Collision.Shapes.b2CircleShape; // Class for circle shapes
let b2DebugDraw = Box2D.Dynamics.b2DebugDraw; // Class for debugging visualizations

let connections = [];
let world;
const SCALE = 30;
const WIDTH = 40000;
const HEIGHT = 800;
let size = 50;
let fps = 80;
let interval;
let keyhit = false;
let key = "";

function createb2dObj(objid, x, y, dims, iscircle, isstatic) {
  let bodyDef = new b2BodyDef();
  bodyDef.type = isstatic ? b2Body.b2_staticBody : b2Body.b2_dynamicBody;
  // bodyDef.position.Set(x / SCALE, y / SCALE);
  bodyDef.position.x = x / SCALE;
  bodyDef.position.y = y / SCALE;

  let fixDef = new b2FixtureDef();
  fixDef.density = 1;
  fixDef.friction = 0.2;
  fixDef.restitution = 0.1;

  let width, height;

  if (iscircle) {
    fixDef.shape = new b2CircleShape(dims.radius / SCALE);
    width = dims.radius * 2;
    height = dims.radius * 2;
  } else {
    fixDef.shape = new b2PolygonShape();
    fixDef.shape.SetAsBox(dims.width / SCALE, dims.height / SCALE);
    width = dims.width;
    height = dims.height;
  }

  let thisobj = world.CreateBody(bodyDef).CreateFixture(fixDef);
  thisobj.GetBody().SetUserData({
    id: objid,
    width,
    height,
    circle: iscircle,
  });

  return thisobj;
}

function drawDOMObj() {
  let ret = [];

  for (let b = world.GetBodyList(); b; b = b.GetNext()) {
    for (let f = b.GetFixtureList(); f; f = f.GetNext()) {
      let id = f.GetBody().GetUserData().id;
      let x = Math.round(f.GetBody().GetPosition().x * SCALE);
      let y = Math.round(f.GetBody().GetPosition().y * SCALE);
      let r = Math.round(f.GetBody().GetAngle() * 100) / 100;
      let iscircle = f.GetBody().GetUserData().iscircle;
      let objwidth = Math.round(f.GetBody().GetUserData().width);
      let objheight = Math.round(f.GetBody().GetUserData().height);
      ret.push({
        id,
        x,
        y,
        r,
        iscircle,
        objwidth,
        objheight,
      });
    }
  }
  return ret;
}

function update() {
  world.Step(1 / fps, 10, 10);

  if (keyhit) {
    keyhit = false;
    if (key === "ArrowLeft" || key === "a") {
      goleft();
    } else if (key === "ArrowRight" || key === "d") {
      goright();
    } else if (key === "ArrowUp" || key === "w") {
      jump();
    }
  }

  io.sockets.emit("objdata", drawDOMObj());
  world.ClearForces();
}

function init() {
  world = new b2World(new b2Vec2(0, 9.81), false);

  interval = setInterval(function () {
    update();
  }, 1000 / fps);

  update();
}

// Keyboard input
function stopleftright() {
  for (let b = world.GetBodyList(); b; b = b.GetNext()) {
    for (let f = b.GetFixtureList(); f; f = f.GetNext()) {
      if (f.GetBody().GetUserData().id === "hero") {
        f.GetBody().SetLinearVelocity(
          new b2Vec2(0, f.GetBody().GetLinearVelocity().y)
        );
        io.sockets.emit("hero", { animation: "stand" });
      }
    }
  }
}

function goright() {
  for (let b = world.GetBodyList(); b; b = b.GetNext()) {
    for (let f = b.GetFixtureList(); f; f = f.GetNext()) {
      if (f.GetBody().GetUserData().id === "hero") {
        f.GetBody().SetLinearVelocity(
          new b2Vec2(9, f.GetBody().GetLinearVelocity().y)
        );
        io.sockets.emit("hero", { scaleX: 1, animation: "run" });
      }
    }
  }
}

function goleft() {
  for (let b = world.GetBodyList(); b; b = b.GetNext()) {
    for (let f = b.GetFixtureList(); f; f = f.GetNext()) {
      if (f.GetBody().GetUserData().id === "hero") {
        f.GetBody().SetLinearVelocity(
          new b2Vec2(-9, f.GetBody().GetLinearVelocity().y)
        );
        io.sockets.emit("hero", { scaleX: -1, animation: "run" });
      }
    }
  }
}

function jump() {
  for (let b = world.GetBodyList(); b; b = b.GetNext()) {
    for (let f = b.GetFixtureList(); f; f = f.GetNext()) {
      if (f.GetBody().GetUserData().id === "hero") {
        f.GetBody().SetLinearVelocity(
          new b2Vec2(f.GetBody().GetLinearVelocity().x, -9)
        );
        io.sockets.emit("hero", { animation: "jump" });
      }
    }
  }
}

app.use(express.static("public"));
app.use("/js", express.static(__dirname + "public/js"));
app.use("/css", express.static(__dirname + "public/css"));
app.use("/assets", express.static(__dirname + "public/assets"));

http.listen(3000, function () {
  console.log("Server is running on port 3000");
  io.on("connection", function (socket) {
    connections.push(socket);
    console.log("Connected: %s sockets connected", connections.length);

    socket.on("disconnect", function (data) {
      connections.splice(connections.indexOf(socket), 1);
      console.log("Disconnected: %s sockets connected", connections.length);
    });

    socket.on("send message", function (data) {
      io.sockets.emit("new message", { msg: data });
    });

    socket.on("keypress", (e) => {
      keyhit = true;
      key = e.key;
    });

    socket.on("keyrelease", (e) => {
      keyhit = false;
      stopleftright();
    });

    socket.on("map", function (data) {
      loadMap(data.map);
    });
  });
});

init();
