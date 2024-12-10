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
}

// Réinitialise une nouvelle pièce
function resetPiece() {
    currentPiece = getNextPiece();
    if (collide()) {
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
    resetPiece();
    clearLines();
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
        // Animation : faire clignoter les lignes
        let flashCount = 0;
        const flashInterval = setInterval(() => {
            flashCount++;
            linesToClear.forEach(y => {
                board[y] = flashCount % 2 === 0 ? Array(cols).fill(0) : Array(cols).fill(1);
            });
            drawBoard();

            if (flashCount === 6) {
                clearInterval(flashInterval);
                // Supprimer les lignes après l'animation
                linesToClear.forEach(y => {
                    board.splice(y, 1);
                    board.unshift(Array(cols).fill(0));
                });
                lines += linesToClear.length;
                score += linesToClear.length * 100;
            }
        }, 100);
    }
}

// Gère la fin du jeu
function gameOver() {
    const playerName = prompt("Game Over! Enter your name:");
    if (playerName) {
        saveScore(playerName, score);
    }
    resetGame();
}

// Sauvegarde le score dans le localStorage
function saveScore(playerName, score) {
    const leaderboard = JSON.parse(localStorage.getItem("leaderboard")) || [];
    leaderboard.push({ name: playerName, score: score });
    localStorage.setItem("leaderboard", JSON.stringify(leaderboard));
}

// Réinitialise le jeu
function resetGame() {
    board = Array.from({ length: rows }, () => Array(cols).fill(0));
    score = 0;
    lines = 0;
    resetPiece();
}

// Fait descendre la pièce
function dropPiece() {
    currentPiece.y++;
    if (collide()) {
        currentPiece.y--;
        merge();
    }
}

// Vérifie les collisions
function collide() {
    return currentPiece.shape.some((row, y) =>
        row.some((value, x) =>
            value &&
            (board[currentPiece.y + y] &&
                board[currentPiece.y + y][currentPiece.x + x]) !== 0
        )
    );
}

// Déplace la pièce courante
function movePiece(dir) {
    currentPiece.x += dir;
    if (collide()) {
        currentPiece.x -= dir;
    }
}

// Fait tourner la pièce
function rotatePiece() {
    const prevShape = currentPiece.shape.map(row => [...row]);
    currentPiece.shape = currentPiece.shape[0].map((_, i) =>
        currentPiece.shape.map(row => row[i]).reverse()
    );
    if (collide()) {
        currentPiece.shape = prevShape;
    }
}

// Dessine le plateau de jeu
function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    board.forEach((row, y) => row.forEach((value, x) => {
        if (value) {
            drawBlock(x, y, colors[value]);
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
    switch (e.key) {
        case "q":
            movePiece(-1);
            break;
        case "d":
            movePiece(1);
            break;
        case "z":
            rotatePiece();
            break;
        case "s":
            dropPiece();
            break;
    }
});

// Lancer le jeu à la fin du chargement de la page
document.addEventListener("DOMContentLoaded", initializeGame);