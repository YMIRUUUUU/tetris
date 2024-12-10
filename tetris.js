const canvas = document.getElementById("tetrisCanvas");
const ctx = canvas.getContext("2d");

const grid = 20;
const cols = canvas.width / grid;
const rows = canvas.height / grid;

let board = Array.from({ length: rows }, () => Array(cols).fill(0));
let currentPiece;
let nextPieces = [];
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let score = 0;
let lines = 0;

const colors = {
    1: "#FF0D72", // I
    2: "#0DC2FF", // T
    3: "#0DFF72", // L
    4: "#F538FF", // J
    5: "#FF8E0D", // Z
    6: "#FFE138", // S
    7: "#3877FF", // O
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

// Bag System for Random Generator
function generateBag() {
    const bag = ["I", "T", "L", "J", "Z", "S", "O"];
    for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    return bag;
}

// Remplir le sac des prochaines pièces
function refillNextPieces() {
    while (nextPieces.length < 7) {
        nextPieces.push(...generateBag());
    }
}

// Obtenir la prochaine pièce du sac
function getNextPiece() {
    refillNextPieces();
    const next = nextPieces.shift();
    return {
        shape: shapes[next],
        x: Math.floor(cols / 2) - 1,
        y: 0,
    };
}

// Initialisation de la première pièce
function resetPiece() {
    currentPiece = getNextPiece();
    if (collide()) {
        resetGame(); // Si la nouvelle pièce entre en collision immédiatement, on réinitialise le jeu
    }
}

// Gestion des collisions
function collide() {
    return currentPiece.shape.some((row, y) =>
        row.some((value, x) =>
            value &&
            (board[currentPiece.y + y] &&
                board[currentPiece.y + y][currentPiece.x + x]) !== 0
        )
    );
}

// Fusionne la pièce dans le tableau principal
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

// Supprime les lignes complètes
function clearLines() {
    const linesToClear = board.filter(row => row.every(cell => cell !== 0));
    const clearedLines = linesToClear.length;

    if (clearedLines > 0) {
        board = board.filter(row => row.some(cell => cell === 0));
        while (board.length < rows) {
            board.unshift(Array(cols).fill(0));
        }
        score += calculateScore(clearedLines);
        lines += clearedLines;
        updateStats();
    }
}

// Calcul du score selon les lignes complétées
function calculateScore(linesCleared) {
    switch (linesCleared) {
        case 1: return 100;
        case 2: return 300;
        case 3: return 500;
        case 4: return 800; // Tetris!
        default: return 0;
    }
}

// Mise à jour des stats
function updateStats() {
    document.getElementById("score").textContent = score;
    document.getElementById("lines").textContent = lines;
}

// Déplacement de la pièce
function movePiece(dir) {
    currentPiece.x += dir;
    if (collide()) {
        currentPiece.x -= dir;
    }
}

// Rotation de la pièce
function rotatePiece() {
    const prevShape = currentPiece.shape.map(row => [...row]);
    currentPiece.shape = currentPiece.shape[0].map((_, i) =>
        currentPiece.shape.map(row => row[i]).reverse()
    );
    if (collide()) {
        currentPiece.shape = prevShape;
    }
}

// Faire tomber la pièce
function dropPiece() {
    currentPiece.y++;
    if (collide()) {
        currentPiece.y--;
        merge(); // La pièce est immédiatement fusionnée lorsqu'elle touche quelque chose
    }
}

// Dessine le tableau principal
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

// Réinitialisation du jeu
function resetGame() {
    board = Array.from({ length: rows }, () => Array(cols).fill(0));
    score = 0;
    lines = 0;
    dropInterval = 1000;
    updateStats();
    resetPiece();
}

// Mise à jour des états
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

// Écoute des touches
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

// Lancement du jeu
resetPiece();
update();