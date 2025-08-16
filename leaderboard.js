document.addEventListener("DOMContentLoaded", () => {
    const leaderboardTable = document.getElementById("leaderboardTable").querySelector("tbody");
    const backButton = document.getElementById("backButton");
    const clearButton = document.getElementById("clearButton");
    const params = new URLSearchParams(window.location.search);
    const debugFlag = params.get("debug");
    if (debugFlag === "true") {
        const msg = document.getElementById("debugMessage");
        if (msg) msg.style.display = "block";
    }

    // Charger les scores du local storage
    const scores = JSON.parse(localStorage.getItem("leaderboard")) || [];

    // Trier les scores du plus élevé au plus bas
    scores.sort((a, b) => b.score - a.score);

    const topScores = scores.slice(0, 10);

    // Afficher les scores dans le tableau
    topScores.forEach((entry, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${entry.name}</td>
            <td>${entry.score}</td>
            <td>${entry.lines}</td>
            <td>${entry.level}</td>
            <td>${entry.date}</td>
        `;
        leaderboardTable.appendChild(row);
    });

    // Bouton pour revenir au jeu
    backButton.addEventListener("click", () => {
        const debugQuery = debugFlag ? `?debug=${debugFlag}` : "";
        window.location.href = `index.html${debugQuery}`;
    });

    clearButton.addEventListener("click", () => {
        localStorage.removeItem("leaderboard");
        window.location.reload();
    });
});
