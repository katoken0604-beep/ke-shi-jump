const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const overlayText = document.getElementById("overlayText");
const restartButton = document.getElementById("restartButton");
const scoreElement = document.getElementById("score");
const bestScoreElement = document.getElementById("bestScore");

const images = {
  run1: new Image(),
  run2: new Image(),
};
images.run1.src = "けーし.png";
images.run2.src = "けーし2.png";

const settings = {
  groundHeight: 110,
  gravity: 0.9,
  jumpStrength: -18,
  groundY: 0,
  obstacleSpeed: 7,
  obstacleFrequency: 1600,
  obstacleWidth: 48,
  obstacleHeight: 64,
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
  const width = 72;
  const height = 80;
  return {
    x: 60,
    y: state.height - settings.groundHeight - height,
    width,
    height,
    vy: 0,
    onGround: true,
    state: "running",
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
  if (player.onGround && state.frameTime > 140) {
    state.frameTime = 0;
    state.frameIndex = (state.frameIndex + 1) % 2;
  }

  if (player.state === "running") {
    player.y += Math.sin(Date.now() / 150) * 0.6;
  }

  if (Date.now() - state.lastObstacleTime > settings.obstacleFrequency) {
    state.obstacles.push({
      x: state.width + 20,
      width: settings.obstacleWidth,
      height: settings.obstacleHeight,
      y: state.height - settings.groundHeight - settings.obstacleHeight,
    });
    state.lastObstacleTime = Date.now();
  }

  state.obstacles.forEach((obstacle) => {
    obstacle.x -= settings.obstacleSpeed * (delta / 16);
  });
  state.obstacles = state.obstacles.filter((obstacle) => obstacle.x + obstacle.width > -20);

  state.obstacles.forEach((obstacle) => {
    if (
      player.x < obstacle.x + obstacle.width - 8 &&
      player.x + player.width - 12 > obstacle.x &&
      player.y < obstacle.y + obstacle.height - 6 &&
      player.y + player.height > obstacle.y + 8
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

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#2c5cac");
  gradient.addColorStop(0.55, "#15213d");
  gradient.addColorStop(1, "#08101d");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#0f1626";
  ctx.fillRect(0, height - settings.groundHeight, width, settings.groundHeight);

  ctx.save();
  const player = state.player;
  const frame = player.state === "jumping" ? images.run2 : state.frameIndex === 0 ? images.run1 : images.run2;
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
    ctx.fillStyle = "#f45c58";
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(obstacle.x + 8, obstacle.y + 8, obstacle.width - 16, obstacle.height - 16);
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
  if (images.run2.complete && images.run1.complete) {
    startGame();
  } else {
    let loadedCount = 0;
    Object.values(images).forEach((img) => {
      img.addEventListener("load", () => {
        loadedCount += 1;
        if (loadedCount === Object.keys(images).length) {
          startGame();
        }
      });
    });
  }
  requestAnimationFrame(loop);
}

initialize();
