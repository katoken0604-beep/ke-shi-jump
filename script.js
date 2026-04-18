const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const overlayText = document.getElementById("overlayText");
const restartButton = document.getElementById("restartButton");
const scoreElement = document.getElementById("score");
const bestScoreElement = document.getElementById("bestScore");

const images = {
  jumping: new Image(),
  landing: new Image(),
  walk: new Image(),
  logo: new Image(),
};
images.jumping.src = "jump.png";
images.landing.src = "land.png";
images.walk.src = "歩く.png";
images.logo.src = "けーし.png";

const walkSettings = {
  frameCount: 3,
  frameWidth: 512,
  frameHeight: 1024,
};

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
  console.log(`Canvas resized to ${state.width}x${state.height}`);
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
    state: "run",
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
  console.log("Game started");
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
  console.log("onTap called", { gameOver: state.gameOver, running: state.running });
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
  const wasInAir = !player.onGround;
  if (player.y >= groundY) {
    player.y = groundY;
    player.vy = 0;
    if (wasInAir) {
      player.state = "landing";
      player.landingTimer = 0;
    }
    player.onGround = true;
  }

  state.frameTime += delta;
  if (player.onGround && state.frameTime > 120) {
    state.frameTime = 0;
    state.frameIndex = (state.frameIndex + 1) % walkSettings.frameCount;
  }

  if (player.onGround) {
    if (player.state === "landing") {
      player.landingTimer += delta;
      if (player.landingTimer > 220) {
        player.state = "run";
      }
    } else {
      player.state = "run";
    }
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

  if (!state.player) {
    return;
  }

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
  let frame = images.walk;
  let sourceX = 0;
  let sourceY = 0;
  let sourceW = walkSettings.frameWidth;
  let sourceH = walkSettings.frameHeight;

  if (player.state === "jumping") {
    frame = images.jumping;
    sourceW = player.width;
    sourceH = player.height;
  } else if (player.state === "landing") {
    frame = images.landing;
    sourceW = player.width;
    sourceH = player.height;
  } else {
    sourceX = state.frameIndex * walkSettings.frameWidth;
    sourceW = walkSettings.frameWidth;
    sourceH = walkSettings.frameHeight;
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

  if (player.state === "jumping" || player.state === "landing") {
    const srcW = frame.naturalWidth || frame.width;
    const srcH = frame.naturalHeight || frame.height;
    ctx.drawImage(frame, 0, 0, srcW, srcH, drawX, drawY, drawW, drawH);
  } else {
    ctx.drawImage(frame, sourceX, sourceY, sourceW, sourceH, drawX, drawY, drawW, drawH);
  }
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

  // 中央上部にけーしロゴとスコア表示
  const logoSize = Math.min(180, width * 0.25);
  const logoX = width / 2 - logoSize / 2;
  const logoY = 20;
  ctx.drawImage(images.logo, logoX, logoY, logoSize, logoSize);

  const scoreText = `SCORE ${Math.floor(state.score)}`;
  const bestText = `BEST ${state.bestScore}`;
  ctx.font = `${Math.round(14 + width * 0.01)}px "Press Start 2P", sans-serif`;
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "rgba(0,0,0,0.85)";
  ctx.lineWidth = 5;
  ctx.strokeText(scoreText, width / 2, logoY + logoSize + 28);
  ctx.fillText(scoreText, width / 2, logoY + logoSize + 28);
  ctx.strokeText(bestText, width / 2, logoY + logoSize + 52);
  ctx.fillText(bestText, width / 2, logoY + logoSize + 52);
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
  canvas.addEventListener("click", onTap);
  canvas.addEventListener("touchstart", (event) => {
    event.preventDefault();
    onTap();
  }, { passive: false });
  restartButton.addEventListener("click", onTap);
  window.addEventListener("resize", resizeCanvas);
  
  let loadedCount = 0;
  const imageList = Object.values(images);
  const totalImages = imageList.length;
  
  const checkIfReady = () => {
    loadedCount += 1;
    console.log(`Image loaded: ${loadedCount}/${totalImages}`);
    if (loadedCount === totalImages) {
      console.log("All images loaded, ready to start");
      overlayText.textContent = "スタートを押してね";
      overlay.style.opacity = "0.9";
    }
  };
  
  imageList.forEach((img) => {
    if (img.complete && img.naturalHeight !== 0) {
      // Already loaded
      checkIfReady();
    } else {
      // Wait for load
      img.addEventListener("load", checkIfReady);
      img.addEventListener("error", (e) => {
        console.error("Failed to load image:", img.src, e);
        checkIfReady(); // Count as loaded anyway to not block
      });
    }
  });
  
  requestAnimationFrame(loop);
}

initialize();
