
const $ = id => document.getElementById(id);

const STORAGE = "enigma_progress_v1";

let data = JSON.parse(localStorage.getItem(STORAGE) || "{}");

data.points ??= 0;
data.solved ??= [];
data.daily ??= {};
data.streak ??= 0;
data.bestStreak ??= 0;
data.lastDate ??= null;

let currentPuzzle;
let hintsUsed = 0;
let completed = false;
let mode = "daily";

const today = new Date().toLocaleDateString("en-CA");

function save() {
    localStorage.setItem(STORAGE, JSON.stringify(data));
}

function normalize(text) {
    return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function updateStats() {
    $("points").innerHTML =
        `${data.points} <small>PTS</small>`;

    $("solved").textContent = data.solved.length;
    $("streak").textContent = data.streak;
    $("bestStreak").textContent = data.bestStreak;
}

function dailyPuzzle() {
    const date = new Date();
    const start = new Date(date.getFullYear(), 0, 0);
    const day = Math.floor((date - start) / 86400000);

    return PUZZLES[day % PUZZLES.length];
}

function loadPuzzle(puzzle, gameMode = "daily") {
    currentPuzzle = puzzle;
    mode = gameMode;

    hintsUsed = 0;
    completed = false;

    $("caseNumber").textContent =
        `CASE FILE / ${puzzle.id}`;

    $("category").textContent = puzzle.category;
    $("gameTitle").textContent = puzzle.title;
    $("puzzleTitle").textContent = puzzle.title;
    $("description").textContent = puzzle.description;
    $("message").textContent = puzzle.message;
    $("clue").textContent = puzzle.clue;

    $("answer").value = "";
    $("answer").disabled = false;
    $("answerForm").style.display = "block";

    $("feedback").textContent = "";
    $("feedback").className = "";

    $("hintBox").style.display = "none";
    $("solutionBox").style.display = "none";

    const alreadySolved = gameMode === "daily"
        ? Boolean(data.daily[today])
        : data.solved.includes(puzzle.id);

    $("status").textContent =
        alreadySolved ? "COMPLETED" : "ACTIVE";

    if (alreadySolved) {
        completed = true;
        $("answer").disabled = true;
        $("answerForm").style.display = "none";
        $("feedback").textContent = "This dossier has already been completed.";
        $("feedback").className = "success";
        $("solutionBox").style.display = "block";
        $("solutionBox").textContent =
            `SOLUTION: ${puzzle.answer}. ${puzzle.explanation}`;
    }
}

function submitAnswer(event) {
    event.preventDefault();

    if (completed) return;

    const guess = normalize($("answer").value);
    const answer = normalize(currentPuzzle.answer);

    if (!guess) return;

    if (guess !== answer) {
        $("feedback").textContent =
            "Incorrect. Study the evidence and try again.";
        $("feedback").className = "";
        return;
    }

    completed = true;

    const base = {
        NOVICE: 100,
        INTERMEDIATE: 150,
        ADVANCED: 200
    }[currentPuzzle.difficulty] || 100;

    const earned = Math.max(25, base - hintsUsed * 25);

    data.points += earned;

    if (!data.solved.includes(currentPuzzle.id)) {
        data.solved.push(currentPuzzle.id);
    }

    if (mode === "daily") {
        data.daily[today] = true;

        if (data.lastDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const yesterdayKey =
                yesterday.toLocaleDateString("en-CA");

            data.streak =
                data.lastDate === yesterdayKey
                    ? data.streak + 1
                    : 1;

            data.lastDate = today;

            data.bestStreak = Math.max(
                data.bestStreak,
                data.streak
            );
        }
    }

    save();
    updateStats();

    $("answer").disabled = true;
    $("answerForm").style.display = "none";

    $("status").textContent = "COMPLETED";

    $("feedback").textContent =
        `Correct! You earned ${earned} society points.`;

    $("feedback").className = "success";

    $("solutionBox").style.display = "block";
    $("solutionBox").textContent =
        `SOLUTION: ${currentPuzzle.answer}. ${currentPuzzle.explanation}`;
}

function showHint() {
    if (completed || hintsUsed >= 1) return;

    hintsUsed++;

    $("hintBox").style.display = "block";
    $("hintBox").textContent =
        `FIELD INTELLIGENCE: ${currentPuzzle.hint}`;
}

function showSolution() {
    if (completed) return;

    $("solutionBox").style.display = "block";
    $("solutionBox").textContent =
        `SOLUTION: ${currentPuzzle.answer}. ${currentPuzzle.explanation}`;

    $("answerForm").style.display = "none";
    $("answer").disabled = true;

    completed = true;

    if (mode === "daily") {
        data.daily[today] = "revealed";
        save();
    }
}

function renderPractice() {
    const game = $("dossier");

    const list = PUZZLES.map(puzzle => `
        <button class="practice-item" data-id="${puzzle.id}">
            <span>${puzzle.id} — ${puzzle.title}</span>
            <small>${puzzle.difficulty}</small>
        </button>
    `).join("");

    $("gameTitle").textContent = "Practice the craft";

    game.innerHTML = `
        <div class="case-number">TRAINING ARCHIVE</div>
        <h3>Select a dossier</h3>
        <div class="practice-list">${list}</div>
    `;

    game.querySelectorAll("[data-id]").forEach(button => {
        button.addEventListener("click", () => {
            const puzzle = PUZZLES.find(
                p => p.id === button.dataset.id
            );

            location.reload();
        });
    });
}

function renderRecords() {
    const game = $("dossier");

    const records = data.solved.map(id => {
        const puzzle = PUZZLES.find(p => p.id === id);

        return puzzle
            ? `<div class="record-item">${puzzle.title} <span>COMPLETED</span></div>`
            : "";
    }).join("");

    $("gameTitle").textContent = "Your society record";

    game.innerHTML = `
        <div class="case-number">MEMBER ARCHIVE</div>
        <h3>Your achievements</h3>
        ${records || "<p>No completed dossiers yet.</p>"}
    `;
}

$("answerForm").addEventListener("submit", submitAnswer);
$("hintButton").addEventListener("click", showHint);
$("solutionButton").addEventListener("click", showSolution);

document.querySelectorAll(".nav-btn").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".nav-btn")
            .forEach(b => b.classList.remove("active"));

        button.classList.add("active");

        const view = button.dataset.view;

        if (view === "daily") {
            loadPuzzle(dailyPuzzle(), "daily");
        }

        if (view === "practice") {
            renderPractice();
        }

        if (view === "records") {
            renderRecords();
        }
    });
});

$("date").textContent =
    new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
    });

updateStats();
loadPuzzle(dailyPuzzle());

