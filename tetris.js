const canvas = document.getElementById("tetrisCanvas");
const ctx = canvas.getContext("2d");
const holdCanvas = document.getElementById("holdCanvas");
const holdCtx = holdCanvas ? holdCanvas.getContext("2d") : null;
const nextCanvases = document.querySelectorAll(".next");
const nextCtxs = Array.from(nextCanvases).map(c => c.getContext("2d"));

const grid = 20; // Taille d'une cellule
const cols = canvas.width / grid;
const rows = canvas.height / grid;

let board = Array.from({ length: rows }, () => Array(cols).fill(0));
let currentPiece = null;
let nextPieces = [];
let dropCounter = 0;
let dropInterval;
let lastTime = 0;
let score = 0;
let lines = 0;
let gameRunning = true;
let isPaused = false;
let muted = false;
let holdPiece = null;
let holdUsed = false;
let lineClearAdUsed = false; // track if the 10 line clear option was used
let rocketShown = false; // track if rocket animation already launched
let isDebug = false; // debug mode flag

// Musique de fond
const music = new Audio("theme1.mp3");
music.loop = true; // Répéter la musique en boucle
let musicStarted = false;

const levelSpeeds = {
    1: 1000,
    2: 900,
    3: 800,
    4: 700,
    5: 600,
    6: 500,
    7: 400,
    8: 300,
    9: 200,
    10: 100,
};

const params = new URLSearchParams(window.location.search);
const startLevel = parseInt(params.get("level")) || 1;
dropInterval = levelSpeeds[startLevel] || 1000;
isDebug = params.get("debug") === "true";

const colors = {
    1: "#FF0D72",
    2: "#0DC2FF",
    3: "#0DFF72",
    4: "#F538FF",
    5: "#FF8E0D",
    6: "#FFE138",
    7: "#3877FF",
};

const shapes = {
    I: [[1, 1, 1, 1]],
    T: [[0, 2, 0], [2, 2, 2]],
    L: [[3, 0, 0], [3, 3, 3]],
    J: [[0, 0, 4], [4, 4, 4]],
    Z: [[5, 5, 0], [0, 5, 5]],
    S: [[0, 6, 6], [6, 6, 0]],
    O: [[7, 7], [7, 7]],
};

// Initialisation du jeu
function initializeGame() {
    resetPiece();
    update();

    // Ajouter un écouteur pour démarrer la musique lors de la première interaction utilisateur
    document.addEventListener("click", startMusic);
    document.addEventListener("keydown", startMusic);
    const muteButton = document.getElementById("muteButton");
    if (muteButton) {
        muteButton.addEventListener("click", toggleMute);
    }

    const clearButton = document.getElementById("clearLinesButton");
    if (clearButton) {
        clearButton.addEventListener("click", clearLastTenLines);
    }

    if (isDebug) {
        const debugMsg = document.getElementById("debugMessage");
        if (debugMsg) debugMsg.style.display = "block";
    }
}

// Fonction pour démarrer la musique après interaction utilisateur
function startMusic() {
    if (!musicStarted && !muted) {
        music.play();
        musicStarted = true;

        // Supprimer les écouteurs une fois que la musique a démarré
        document.removeEventListener("click", startMusic);
        document.removeEventListener("keydown", startMusic);
    }
}

// Réinitialise une nouvelle pièce
function resetPiece() {
    currentPiece = getNextPiece();
    if (collide(true)) {
        gameOver();
    }
    holdUsed = false;
    drawHoldPiece();
    drawNextPieces();
}

// Génère une nouvelle pièce depuis la file d'attente
function getNextPiece() {
    refillNextPieces();
    const next = nextPieces.shift();
    return {
        type: next,
        shape: shapes[next],
        x: Math.floor(cols / 2) - 1,
        y: 0,
    };
}

// Remplit le sac des prochaines pièces
function refillNextPieces() {
    while (nextPieces.length < 7) {
        nextPieces.push(...generateBag());
    }
}

// Génère un sac aléatoire (bag system)
function generateBag() {
    const bag = ["I", "T", "L", "J", "Z", "S", "O"];
    for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    return bag;
}

// Fusionne la pièce courante dans le plateau
function merge() {
    currentPiece.shape.forEach((row, y) =>
        row.forEach((value, x) => {
            if (value) {
                board[currentPiece.y + y][currentPiece.x + x] = value;
            }
        })
    );
    clearLines();
    resetPiece();
}

// Supprime les lignes complètes avec animation
function clearLines() {
    const linesToClear = [];
    board.forEach((row, y) => {
        if (row.every(cell => cell !== 0)) {
            linesToClear.push(y);
        }
    });

    if (linesToClear.length > 0) {
        const isTetris = linesToClear.length === 4; // Vérifie si c'est un Tetris
        const flashColor = isTetris ? "#FFD700" : "#FFFFFF"; // Or pour un Tetris, blanc pour le reste

        // Animation des lignes clignotantes
        let flashCount = 0;
        const flashInterval = setInterval(() => {
            flashCount++;
            linesToClear.forEach(y => {
                board[y] = flashCount % 2 === 0 ? Array(cols).fill(0) : Array(cols).fill(8); // 8 pour simuler un effet de clignotement
            });
            drawBoard(flashColor); // Dessine le plateau avec la couleur de flash

            if (flashCount === 6) {
                clearInterval(flashInterval);
                // Supprime les lignes après l'animation
                linesToClear.forEach(y => {
                    board.splice(y, 1);
                    board.unshift(Array(cols).fill(0));
                });

                // Met à jour le score et les lignes
                lines += linesToClear.length;
                score += isTetris ? 800 : linesToClear.length * 200; // 800 pour un Tetris, 200 par ligne normale
                updateScoreDisplay();
            }
        }, 100); // Clignotement toutes les 100ms
    }
}

// Met à jour l'affichage du score
function updateScoreDisplay() {
    const scoreElement = document.getElementById("score");
    const linesElement = document.getElementById("lines");
    if (scoreElement) scoreElement.textContent = `${score}`;
    if (linesElement) linesElement.textContent = `${lines}`;
    if (score >= 100000 && !rocketShown) {
        launchRocket();
    }
}

function saveScore() {
    const name = prompt("Enter your name:");
    if (!name) return;
    const leaderboard = JSON.parse(localStorage.getItem("leaderboard")) || [];
    leaderboard.push({
        name,
        score,
        lines,
        level: startLevel,
        date: new Date().toLocaleDateString(),
    });
    localStorage.setItem("leaderboard", JSON.stringify(leaderboard));
}

// Gère la fin du jeu
function gameOver() {
    gameRunning = false;
    music.pause();
    const finish = () => {
        saveScore();
        drawGameOverScreen();
    };
    if (lineClearAdUsed) {
        showAdvertisement(finish);
    } else {
        finish();
    }
}

// Affiche l'écran de Game Over avec des options
function drawGameOverScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "red";
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 40);

    ctx.fillStyle = "white";
    ctx.fillText("Press 'R' to Restart", canvas.width / 2, canvas.height / 2);
    ctx.fillText("Press 'M' to return to Menu", canvas.width / 2, canvas.height / 2 + 40);

    document.addEventListener("keydown", handleGameOverInput);
}

function handleGameOverInput(e) {
    if (e.key === "r" || e.key === "R") {
        document.removeEventListener("keydown", handleGameOverInput);
        resetGame();
    } else if (e.key === "m" || e.key === "M") {
        document.removeEventListener("keydown", handleGameOverInput);
        window.location.href = "index.html"; // Retour au menu principal
    }
}

// Réinitialise le jeu
function resetGame() {
    gameRunning = true;
    isPaused = false;
    board = Array.from({ length: rows }, () => Array(cols).fill(0));
    score = 0;
    lines = 0;
    lineClearAdUsed = false;
    rocketShown = false;
    resetPiece();
    update();
    if (!muted) music.play();
}

// Fait descendre la pièce
function dropPiece() {
    if (!gameRunning) return;

    currentPiece.y++;
    if (collide()) {
        currentPiece.y--;
        merge();
    }
}

function hardDrop() {
    if (!gameRunning) return;
    currentPiece.y = getGhostY();
    merge();
}

function holdCurrent() {
    if (holdUsed) return;
    if (!holdPiece) {
        holdPiece = currentPiece.type;
        currentPiece = getNextPiece();
    } else {
        const temp = holdPiece;
        holdPiece = currentPiece.type;
        currentPiece = {
            type: temp,
            shape: shapes[temp],
            x: Math.floor(cols / 2) - 1,
            y: 0,
        };
    }
    holdUsed = true;
    drawHoldPiece();
    drawNextPieces();
    if (collide(true)) gameOver();
}

// Vérifie les collisions
function collide(isSpawn = false) {
    return collideAt(currentPiece.shape, currentPiece.x, currentPiece.y, isSpawn);
}

// Déplace la pièce courante
function movePiece(dir) {
    if (!gameRunning) return;

    currentPiece.x += dir;
    if (collide()) {
        currentPiece.x -= dir;
    }
}

// Fait tourner la pièce
function rotatePiece() {
    if (!gameRunning) return;

    const prevShape = currentPiece.shape.map(row => [...row]);
    currentPiece.shape = currentPiece.shape[0].map((_, i) =>
        currentPiece.shape.map(row => row[i]).reverse()
    );
    if (collide()) {
        currentPiece.shape = prevShape;
    }
}

function collideAt(shape, posX, posY, isSpawn = false) {
    return shape.some((row, y) =>
        row.some((value, x) =>
            value && (
                posX + x < 0 ||
                posX + x >= cols ||
                posY + y >= rows ||
                (board[posY + y] && board[posY + y][posX + x]) !== 0 ||
                (isSpawn && posY + y < 0)
            )
        )
    );
}

function getGhostY() {
    let ghostY = currentPiece.y;
    while (!collideAt(currentPiece.shape, currentPiece.x, ghostY + 1)) {
        ghostY++;
    }
    return ghostY;
}

function togglePause() {
    if (!gameRunning) return;
    isPaused = !isPaused;
    if (isPaused) {
        drawPauseScreen();
    } else {
        lastTime = performance.now();
        update();
    }
}

function drawPauseScreen() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Paused", canvas.width / 2, canvas.height / 2);
    ctx.fillText("Press 'P' to resume", canvas.width / 2, canvas.height / 2 + 30);
}

function toggleMute() {
    muted = !muted;
    const muteButton = document.getElementById("muteButton");
    if (muted) {
        music.pause();
        if (muteButton) muteButton.textContent = "Unmute";
    } else {
        if (musicStarted) {
            music.play();
        }
        if (muteButton) muteButton.textContent = "Mute";
    }
}

// Dessine le plateau avec une couleur spéciale pour les animations
function drawBoard(flashColor = null) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    board.forEach((row, y) => row.forEach((value, x) => {
        if (value) {
            drawBlock(x, y, flashColor || colors[value]);
        }
    }));
    const ghostY = getGhostY();
    currentPiece.shape.forEach((row, y) => row.forEach((value, x) => {
        if (value) {
            ctx.fillStyle = "rgba(200,200,200,0.4)";
            ctx.fillRect((currentPiece.x + x) * grid, (ghostY + y) * grid, grid, grid);
            ctx.strokeStyle = "rgba(0,0,0,0.3)";
            ctx.strokeRect((currentPiece.x + x) * grid, (ghostY + y) * grid, grid, grid);
        }
    }));
    currentPiece.shape.forEach((row, y) => row.forEach((value, x) => {
        if (value) {
            drawBlock(currentPiece.x + x, currentPiece.y + y, colors[value]);
        }
    }));
}

function drawNextPieces() {
    if (nextCtxs.length === 0) return;
    nextCtxs.forEach(ctx => ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height));
    nextCtxs.forEach((ctx, idx) => {
        const pieceType = nextPieces[idx];
        if (!pieceType) return;
        const shape = shapes[pieceType];
        shape.forEach((row, y) => row.forEach((value, x) => {
            if (value) {
                const color = colors[value];
                ctx.fillStyle = color;
                ctx.fillRect(x * grid, y * grid, grid, grid);
                ctx.strokeStyle = "black";
                ctx.strokeRect(x * grid, y * grid, grid, grid);
            }
        }));
    });
}

function drawHoldPiece() {
    if (!holdCtx) return;
    holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
    if (!holdPiece) return;
    const shape = shapes[holdPiece];
    shape.forEach((row, y) => row.forEach((value, x) => {
        if (value) {
            const color = colors[value];
            holdCtx.fillStyle = color;
            holdCtx.fillRect(x * grid, y * grid, grid, grid);
            holdCtx.strokeStyle = "black";
            holdCtx.strokeRect(x * grid, y * grid, grid, grid);
        }
    }));
}

// Dessine un bloc individuel
function drawBlock(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * grid, y * grid, grid, grid);
    ctx.strokeStyle = "black";
    ctx.strokeRect(x * grid, y * grid, grid, grid);
}

// Supprime les 10 lignes du bas en échange d'une pub finale
function clearLastTenLines() {
    if (!gameRunning) return;
    board.splice(rows - 10, 10);
    for (let i = 0; i < 10; i++) {
        board.unshift(Array(cols).fill(0));
    }
    lineClearAdUsed = true;
    drawBoard();
}

// Affiche une pub d'une minute avant l'ecran de Game Over
function showAdvertisement(callback) {
    const overlay = document.createElement('div');
    overlay.className = 'ad-overlay';
    overlay.innerHTML = '<p>Publicité... <span id="adTimer">60</span>s</p>';
    document.body.appendChild(overlay);
    let remaining = 60;
    const interval = setInterval(() => {
        remaining--;
        document.getElementById('adTimer').textContent = remaining;
        if (remaining <= 0) {
            clearInterval(interval);
            overlay.remove();
            callback();
        }
    }, 1000);
}

// Anime une fusee lorsque le score atteint 100000
function launchRocket() {
    rocketShown = true;
    const rocket = document.createElement('div');
    rocket.className = 'rocket';
    rocket.textContent = '🚀';
    document.body.appendChild(rocket);
    requestAnimationFrame(() => {
        rocket.style.bottom = '110%';
    });
    setTimeout(() => rocket.remove(), 3000);
}

// Force la creation d'un Tetris pour le debug
function forceTetris() {
    for (let y = rows - 4; y < rows; y++) {
        board[y] = Array(cols).fill(1);
    }
    clearLines();
}

// Met à jour l'état du jeu
function update(time = 0) {
    if (!gameRunning) return;
    if (isPaused) {
        requestAnimationFrame(update);
        return;
    }

    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;

    if (dropCounter > dropInterval) {
        dropPiece();
        dropCounter = 0;
    }

    drawBoard();
    requestAnimationFrame(update);
}

// Gestion des contrôles clavier
document.addEventListener("keydown", (e) => {
    if (!gameRunning) return;

    switch (e.key) {
        case "q":
        case "ArrowLeft":
            movePiece(-1);
            break;
        case "d":
        case "ArrowRight":
            movePiece(1);
            break;
        case "z":
        case "ArrowUp":
            rotatePiece();
            break;
        case "s":
        case "ArrowDown":
            dropPiece();
            break;
        case " ":
            hardDrop();
            break;
        case "Shift":
        case "c":
        case "C":
            holdCurrent();
            break;
        case "p":
        case "P":
            togglePause();
            break;
        case "m":
        case "M":
            toggleMute();
            break;
        case "l":
        case "L":
            clearLastTenLines();
            break;
    }

    if (isDebug) {
        if (e.key === 't' || e.key === 'T') {
            forceTetris();
        }
        if (e.key === 'r' || e.key === 'R') {
            launchRocket();
        }
    }
});

// Lancer le jeu à la fin du chargement de la page
document.addEventListener("DOMContentLoaded", initializeGame);