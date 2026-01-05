// ------------------------------
// GLOBAL STATE
// ------------------------------
let ALL_QUESTIONS = [];
let CURRENT_TEST = [];
let USER_ANSWERS = [];
let CURRENT_INDEX = 0;
let INCORRECT_QUESTIONS = [];
let SESSION_HISTORY = [];
let VIEWED_SESSION = null;

// ------------------------------
// LOAD ALL JSON FILES
// ------------------------------
async function loadQuestions() {
  const topics = [
    "rights",
    "history",
    "government",
    "geography",
    "symbols",
    "economy",
    "law",
    "indigenous"
  ];

  const promises = topics.map(t =>
    fetch(`questions/${t}.json`).then(res => res.json())
  );

  const results = await Promise.all(promises);
  ALL_QUESTIONS = results.flat();
}
// ------------------------------
// PERFECT SHUFFLE (FISHER–YATES)
// ------------------------------
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
// ------------------------------
// BALANCED SELECTION
// ------------------------------
function getBalancedQuestions(count) {
  // Group questions by topic
  const byTopic = {};
  ALL_QUESTIONS.forEach(q => {
    if (!byTopic[q.topic]) byTopic[q.topic] = [];
    byTopic[q.topic].push(q);
  });

  const topics = Object.keys(byTopic);
  const perTopic = Math.floor(count / topics.length);

  const selected = new Set();

  // Step 1: Pull evenly from each topic
  topics.forEach(topic => {
    const shuffled = shuffleArray([...byTopic[topic]]);
    const take = Math.min(perTopic, shuffled.length);

    for (let i = 0; i < take; i++) {
      selected.add(shuffled[i]);
    }
  });

  // Step 2: Fill remaining slots without duplicates
  const shuffledAll = shuffleArray([...ALL_QUESTIONS]);

  for (const q of shuffledAll) {
    if (selected.size >= count) break;
    selected.add(q);
  }

  // Step 3: Final perfect shuffle
  return shuffleArray([...selected]);
}
// ------------------------------
// RANDOM SELECTION
// ------------------------------
function getRandomQuestions(count) {
  return [...ALL_QUESTIONS]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}

// ------------------------------
// START TEST
// ------------------------------
function startTest() {
  const count = parseInt(document.getElementById("questionCount").value);
  const balanced = document.getElementById("balancedMode").checked;

  CURRENT_TEST = balanced
    ? getBalancedQuestions(count)
    : getRandomQuestions(count);

  USER_ANSWERS = Array(count).fill(null);
  CURRENT_INDEX = 0;

  showScreen("testScreen");
  renderQuestion();
  updateProgress();
}

// ------------------------------
// RENDER QUESTION
// ------------------------------
function renderQuestion() {
  const q = CURRENT_TEST[CURRENT_INDEX];

  document.getElementById("questionHeader").textContent =
    `Question ${CURRENT_INDEX + 1} of ${CURRENT_TEST.length}`;

  document.getElementById("questionText").textContent = q.question;

  const container = document.getElementById("optionsContainer");
  container.innerHTML = "";

q.options.forEach((opt, i) => {
    const div = document.createElement("div");
    div.className = "option";

    // Highlight if previously selected
    if (USER_ANSWERS[CURRENT_INDEX] === i) {
        div.classList.add("selected");
    }

    div.textContent = opt;

    div.onclick = () => {
        USER_ANSWERS[CURRENT_INDEX] = i;

        // Remove highlight from all options
        document.querySelectorAll(".option").forEach(o => o.classList.remove("selected"));

        // Highlight the clicked one
        div.classList.add("selected");
    };

    container.appendChild(div);
});


  document.getElementById("prevBtn").disabled = CURRENT_INDEX === 0;
  document.getElementById("nextBtn").classList.toggle(
    "hidden",
    CURRENT_INDEX === CURRENT_TEST.length - 1
  );
  document.getElementById("submitBtn").classList.toggle(
    "hidden",
    CURRENT_INDEX !== CURRENT_TEST.length - 1
  );
}

// ------------------------------
// NAVIGATION
// ------------------------------
document.getElementById("nextBtn").onclick = () => {
  CURRENT_INDEX++;
  updateProgress(); // ✅ now it updates only when Next is pressed
  renderQuestion();
};

document.getElementById("prevBtn").onclick = () => {
  CURRENT_INDEX--;
  renderQuestion();
};

// ------------------------------
// SUBMIT TEST
// ------------------------------
document.getElementById("submitBtn").onclick = () => {
  INCORRECT_QUESTIONS = [];

  CURRENT_TEST.forEach((q, i) => {
    if (USER_ANSWERS[i] !== q.correctIndex) {
      INCORRECT_QUESTIONS.push(q);
    }
  });

  const score = CURRENT_TEST.length - INCORRECT_QUESTIONS.length;

  document.getElementById("scoreText").textContent =
    `You scored ${score} / ${CURRENT_TEST.length}`;
SESSION_HISTORY.push({
  score: score,
  total: CURRENT_TEST.length,
  incorrect: INCORRECT_QUESTIONS.length,
  timestamp: new Date().toLocaleString(),
  questions: JSON.parse(JSON.stringify(CURRENT_TEST)),
  answers: [...USER_ANSWERS]
});

  updateProgress();
  showScreen("resultsScreen");
};

// ------------------------------
// RETRY INCORRECT
// ------------------------------
document.getElementById("retryIncorrectBtn").onclick = () => {
  CURRENT_TEST = [...INCORRECT_QUESTIONS];
  USER_ANSWERS = Array(CURRENT_TEST.length).fill(null);
  CURRENT_INDEX = 0;

  showScreen("testScreen");
  renderQuestion();
  updateProgress();
};

// ------------------------------
// REVIEW MODE
// ------------------------------
document.getElementById("reviewBtn").onclick = () => {
  showScreen("reviewScreen");
  renderReview("all");
};

document.querySelectorAll("#reviewFilters button").forEach(btn => {
  btn.onclick = () => renderReview(btn.dataset.filter);
});

document.getElementById("backToResultsBtn").onclick = () => {
  showScreen("resultsScreen");
};
document.getElementById("sessionBackBtn").onclick = () => {
  showScreen("historyScreen");
};

document.getElementById("sessionReviewBtn").onclick = () => {
  CURRENT_TEST = VIEWED_SESSION.questions;
  USER_ANSWERS = VIEWED_SESSION.answers;
  CURRENT_INDEX = 0;

  showScreen("reviewScreen");
  renderReview("all");
};

// ------------------------------
// HISTORY BUTTONS
// ------------------------------
document.getElementById("viewHistoryBtn").onclick = () => {
  renderHistory();
  showScreen("historyScreen");
};

document.getElementById("backFromHistoryBtn").onclick = () => {
  showScreen("resultsScreen");
};


function renderReview(filter) {
  const container = document.getElementById("reviewContainer");
  container.innerHTML = "";

  CURRENT_TEST.forEach((q, i) => {
    const correct = USER_ANSWERS[i] === q.correctIndex;

    if (filter === "correct" && !correct) return;
    if (filter === "incorrect" && correct) return;

    const div = document.createElement("div");
    div.className = "reviewItem";
    div.classList.add(correct ? "correct" : "incorrect");

    div.innerHTML = `
      <p><strong>Q${i + 1}:</strong> ${q.question}</p>
      <p><strong>Your answer:</strong> ${q.options[USER_ANSWERS[i]] ?? "None"}</p>
      <p><strong>Correct answer:</strong> ${q.options[q.correctIndex]}</p>
      <p><em>${q.explanation}</em></p>
    `;

    container.appendChild(div);
  });

}

// ------------------------------
// RENDER HISTORY
// ------------------------------
function renderHistory() {
  const list = document.getElementById("historyList");
  list.innerHTML = "";

  if (SESSION_HISTORY.length === 0) {
    list.textContent = "No sessions recorded yet.";
    return;
  }

SESSION_HISTORY.forEach((entry, i) => {
  const div = document.createElement("div");
  div.className = "history-entry";
  div.innerHTML = `
    <strong>Session ${i + 1}</strong><br>
    Score: ${entry.score} / ${entry.total}<br>
    Incorrect: ${entry.incorrect}<br>
    Time: ${entry.timestamp}<br>
    <button class="viewDetailsBtn" data-index="${i}">View Details</button>
    <hr>
  `;
  list.appendChild(div);
});

// Attach handlers
document.querySelectorAll(".viewDetailsBtn").forEach(btn => {
  btn.onclick = () => {
    const index = btn.dataset.index;
    VIEWED_SESSION = SESSION_HISTORY[index];
    showSessionSummary();
  };
});

}
// ------------------------------
// SESSION SUMMARY
// ------------------------------
function showSessionSummary() {
  document.getElementById("sessionSummaryText").innerHTML = `
    Score: ${VIEWED_SESSION.score} / ${VIEWED_SESSION.total}<br>
    Incorrect: ${VIEWED_SESSION.incorrect}<br>
    Time: ${VIEWED_SESSION.timestamp}
  `;
  showScreen("sessionSummaryScreen");
}

// ------------------------------
// PROGRESS BAR
// ------------------------------
function updateProgress() {
  const answered = USER_ANSWERS.filter(a => a !== null).length;
  const percent = (answered / CURRENT_TEST.length) * 100;
  document.getElementById("progressBar").style.width = percent + "%";
}


// ------------------------------
// SCREEN SWITCHING
// ------------------------------
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// ------------------------------
// STARTUP
// ------------------------------
document.getElementById("startBtn").onclick = startTest;
document.getElementById("restartBtn").onclick = () => showScreen("startScreen");
document.getElementById("backToStartBtn").onclick = () => showScreen("startScreen");

loadQuestions();
