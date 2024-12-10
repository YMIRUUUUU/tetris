const canvas = document.getElementById("tetrisCanvas");
const ctx = canvas.getContext("2d");

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
}

// Fonction pour démarrer la musique après interaction utilisateur
function startMusic() {
    if (!musicStarted) {
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
}

// Génère une nouvelle pièce depuis la file d'attente
function getNextPiece() {
    refillNextPieces();
    const next = nextPieces.shift();
    return {
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
    if (scoreElement) scoreElement.textContent = `Score: ${score}`;
    if (linesElement) linesElement.textContent = `Lines: ${lines}`;
}

// Gère la fin du jeu
function gameOver() {
    gameRunning = false;
    music.pause();
    drawGameOverScreen();
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
    board = Array.from({ length: rows }, () => Array(cols).fill(0));
    score = 0;
    lines = 0;
    resetPiece();
    update();
    music.play();
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

// Vérifie les collisions
function collide(isSpawn = false) {
    return currentPiece.shape.some((row, y) =>
        row.some((value, x) =>
            value &&
            (board[currentPiece.y + y] &&
                board[currentPiece.y + y][currentPiece.x + x]) !== 0 ||
            (isSpawn && currentPiece.y + y < 0) // Vérifie si la pièce atteint le plafond
        )
    );
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

// Dessine le plateau avec une couleur spéciale pour les animations
function drawBoard(flashColor = null) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    board.forEach((row, y) => row.forEach((value, x) => {
        if (value) {
            drawBlock(x, y, flashColor || colors[value]);
        }
    }));
    currentPiece.shape.forEach((row, y) => row.forEach((value, x) => {
        if (value) {
            drawBlock(currentPiece.x + x, currentPiece.y + y, colors[value]);
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

// Met à jour l'état du jeu
function update(time = 0) {
    if (!gameRunning) return;

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
    }
});

// Lancer le jeu à la fin du chargement de la page
document.addEventListener("DOMContentLoaded", initializeGame);