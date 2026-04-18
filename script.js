const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const overlayText = document.getElementById("overlayText");
const restartButton = document.getElementById("restartButton");
const scoreElement = document.getElementById("score");
const bestScoreElement = document.getElementById("bestScore");

const images = {
  beforeJump: new Image(),
  jumping: new Image(),
  landing: new Image(),
  run: new Image(),
};
images.beforeJump.src = "jump_before.png";
images.jumping.src = "jump.png";
images.landing.src = "land.png";
images.run.src = "run.png";

const settings = {
  groundHeight: 140,
  gravity: 0.85,
  jumpStrength: -18,
  groundY: 0,
  obstacleSpeed: 6.5,
  obstacleFrequency: 1400,
  tileSize: 32,
};

const state = {
  width: 0,
  height: 0,
  dpi: window.devicePixelRatio || 1,
  player: null,
  obstacles: [],
  score: 0,
  bestScore: Number(localStorage.getItem("ke-shi-best") || 0),
  lastObstacleTime: 0,
  running: false,
  frameTime: 0,
  frameIndex: 0,
  gameOver: false,
};

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  state.width = rect.width;
  state.height = rect.height;
  canvas.width = rect.width * state.dpi;
  canvas.height = rect.height * state.dpi;
  ctx.setTransform(state.dpi, 0, 0, state.dpi, 0, 0);
}

function createPlayer() {
  const width = 80;
  const height = 96;
  return {
    x: 50,
    y: state.height - settings.groundHeight - height,
    width,
    height,
    vy: 0,
    onGround: true,
    state: "beforeJump",
    landingTimer: 0,
  };
}

function startGame() {
  state.obstacles = [];
  state.score = 0;
  state.lastObstacleTime = 0;
  state.frameTime = 0;
  state.frameIndex = 0;
  state.gameOver = false;
  state.player = createPlayer();
  overlayText.textContent = "タップでジャンプ";
  overlay.style.opacity = "0.9";
  state.running = true;
}

function gameOver() {
  if (!state.gameOver) {
    state.gameOver = true;
    state.running = false;
    overlayText.textContent = "ゲームオーバー！もう一度タップ";
    overlay.style.opacity = "0.95";
    if (state.score > state.bestScore) {
      state.bestScore = state.score;
      localStorage.setItem("ke-shi-best", state.bestScore);
    }
  }
}

function onTap() {
  if (state.gameOver) {
    startGame();
    return;
  }
  if (!state.running) {
    startGame();
    return;
  }
  if (state.player.onGround) {
    state.player.vy = settings.jumpStrength;
    state.player.onGround = false;
    state.player.state = "jumping";
    overlay.style.opacity = "0";
  }
}

function update(delta) {
  if (!state.running) return;

  const player = state.player;
  player.vy += settings.gravity * (delta / 16);
  player.y += player.vy;

  const groundY = state.height - settings.groundHeight - player.height;
  if (player.y >= groundY) {
    player.y = groundY;
    player.vy = 0;
    player.onGround = true;
    player.state = "running";
  }

  state.frameTime += delta;
  if (player.onGround && state.frameTime > 150) {
    state.frameTime = 0;
    state.frameIndex = (state.frameIndex + 1) % 2;
  }

  if (player.onGround) {
    player.state = "beforeJump";
    player.landingTimer = 0;
  } else if (player.vy > 5) {
    player.state = "landing";
  } else {
    player.state = "jumping";
  }

  if (Date.now() - state.lastObstacleTime > settings.obstacleFrequency) {
    state.obstacles.push({
      x: state.width + 20,
      width: 56,
      height: 72,
      y: state.height - settings.groundHeight - 72,
    });
    state.lastObstacleTime = Date.now();
  }

  state.obstacles.forEach((obstacle) => {
    obstacle.x -= settings.obstacleSpeed * (delta / 16);
  });
  state.obstacles = state.obstacles.filter((obstacle) => obstacle.x + obstacle.width > -20);

  state.obstacles.forEach((obstacle) => {
    if (
      player.x < obstacle.x + obstacle.width - 10 &&
      player.x + player.width - 12 > obstacle.x &&
      player.y < obstacle.y + obstacle.height - 10 &&
      player.y + player.height - 10 > obstacle.y
    ) {
      gameOver();
    }
  });

  state.score += delta * 0.012;
  scoreElement.textContent = Math.floor(state.score);
  bestScoreElement.textContent = state.bestScore;
}

function draw() {
  const width = state.width;
  const height = state.height;

  ctx.clearRect(0, 0, width, height);

  // マリオ1面風背景
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#5da3d5");
  gradient.addColorStop(1, "#87ceeb");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // グリッド状ブロック地面
  ctx.fillStyle = "#2d5016";
  const groundY2 = height - settings.groundHeight;
  ctx.fillRect(0, groundY2, width, settings.groundHeight);

  // ブロックパターン
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  for (let x = 0; x < width; x += settings.tileSize) {
    for (let y = groundY2; y < height; y += settings.tileSize) {
      if ((Math.floor(x / settings.tileSize) + Math.floor(y / settings.tileSize)) % 2 === 0) {
        ctx.fillRect(x, y, settings.tileSize, settings.tileSize);
      }
    }
  }

  ctx.save();
  const player = state.player;
  let frame;
  
  if (player.state === "jumping") {
    frame = images.jumping;
  } else if (player.state === "landing") {
    frame = images.landing;
  } else {
    frame = state.frameIndex === 0 ? images.beforeJump : images.run;
  }
  
  const drawX = player.x;
  const drawY = player.y;
  const drawW = player.width;
  const drawH = player.height;

  ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
  const shadowWidth = drawW * 0.75;
  const shadowHeight = 12;
  ctx.beginPath();
  ctx.ellipse(drawX + drawW / 2, height - settings.groundHeight + 5, shadowWidth, shadowHeight, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.drawImage(frame, drawX, drawY, drawW, drawH);
  ctx.restore();

  state.obstacles.forEach((obstacle) => {
    ctx.fillStyle = "#cd3e3e";
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    
    // ブロック表現
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(obstacle.x + 4, obstacle.y + 4, obstacle.width - 8, obstacle.height - 8);
    
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 2;
    ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
  });

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  for (let i = 0; i < 5; i += 1) {
    const stripeX = (i * 120 + (Date.now() / 18) % 120) % width;
    ctx.fillRect(stripeX, height - settings.groundHeight - 22, 70, 8);
  }
}

let lastTime = 0;
function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const delta = Math.min(timestamp - lastTime, 40);
  lastTime = timestamp;

  update(delta);
  draw();
  requestAnimationFrame(loop);
}

function initialize() {
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("click", onTap);
  window.addEventListener("touchstart", (event) => {
    event.preventDefault();
    onTap();
  }, { passive: false });
  restartButton.addEventListener("click", () => onTap());
  
  let loadedCount = 0;
  const imageList = Object.values(images);
  const totalImages = imageList.length;
  
  const handleImageLoad = () => {
    loadedCount += 1;
    if (loadedCount === totalImages) {
      startGame();
    }
  };
  
  imageList.forEach((img) => {
    img.addEventListener("load", handleImageLoad);
    img.addEventListener("error", () => {
      console.error("Failed to load image:", img.src);
    });
  });
  requestAnimationFrame(loop);
}

initialize();
