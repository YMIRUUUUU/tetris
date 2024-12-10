document.addEventListener("DOMContentLoaded", () => {
    const leaderboardTable = document.getElementById("leaderboardTable").querySelector("tbody");
    const backButton = document.getElementById("backButton");

    // Charger les scores du local storage
    const scores = JSON.parse(localStorage.getItem("leaderboard")) || [];

    // Trier les scores du plus élevé au plus bas
    scores.sort((a, b) => b.score - a.score);

    // Afficher les scores dans le tableau
    scores.forEach((entry, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${entry.name}</td>
            <td>${entry.score}</td>
        `;
        leaderboardTable.appendChild(row);
    });

    // Bouton pour revenir au jeu
    backButton.addEventListener("click", () => {
        window.location.href = "index.html"; // Retour à la page d'accueil ou au jeu
    });
});