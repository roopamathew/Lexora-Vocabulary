(function () {
  "use strict";

  let state = window.LexoraStorage.load();

  const difficulties = ["Easy", "Medium", "Hard", "Advanced"];

  const partsOfSpeech = [
    "Noun",
    "Verb",
    "Adjective",
    "Adverb",
    "Phrase",
    "Idiom",
    "Other"
  ];

  const reviewIntervals = {
    easy: 7,
    good: 3,
    hard: 1,
    again: 0
  };

  let flashIndex = 0;
  let flashWords = [];
  let randomMode = false;
  let selectedSpeechVoice = null;
  let speechFallbackAnnounced = false;
  let speakingWord = "";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) =>
    Array.from(document.querySelectorAll(selector));

  const els = {
    themeToggle: $("#themeToggle"),

    accountEmail: $("#accountEmail"),
    accountButton: $("#accountButton"),
    authModal: $("#authModal"),
    authEmail: $("#authEmail"),
    authPassword: $("#authPassword"),
    signInButton: $("#signInButton"),
    signUpButton: $("#signUpButton"),
    closeAuth: $("#closeAuth"),

    toast: $("#toast"),

    wordForm: $("#wordForm"),
    wordId: $("#wordId"),
    word: $("#word"),
    meaning: $("#meaning"),
    example: $("#example"),
    synonyms: $("#synonyms"),
    antonyms: $("#antonyms"),
    partOfSpeech: $("#partOfSpeech"),
    category: $("#category"),
    customCategory: $("#customCategory"),
    difficulty: $("#difficulty"),
    notes: $("#notes"),
    dateLearned: $("#dateLearned"),
    favorite: $("#favorite"),
    formTitle: $("#formTitle"),

    searchInput: $("#searchInput"),
    alphabetFilter: $("#alphabetFilter"),
    categoryFilter: $("#categoryFilter"),
    difficultyFilter: $("#difficultyFilter"),
    sortFilter: $("#sortFilter"),

    libraryList: $("#libraryList"),

    dashboardStats: $("#dashboardStats"),
    wordDayText: $("#wordDayText"),
    wordDayMeaning: $("#wordDayMeaning"),
    wordDayMeta: $("#wordDayMeta"),
    attentionMessage: $("#attentionMessage"),
    dashboardBadges: $("#dashboardBadges"),

    flashcard: $("#flashcard"),
    flashWord: $("#flashWord"),
    flashBack: $("#flashBack"),
    flashProgress: $("#flashProgress"),

    calendarGrid: $("#calendarGrid"),
    calendarDetails: $("#calendarDetails"),

    statisticsGrid: $("#statisticsGrid"),
    weeklyGraph: $("#weeklyGraph"),
    allBadges: $("#allBadges"),

    viewTitle: $("#viewTitle"),

    reminderModal: $("#reminderModal")
  };

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function addDays(dateString, days) {
    const date = new Date(`${dateString}T12:00:00`);
    date.setDate(date.getDate() + days);

    return date.toISOString().slice(0, 10);
  }

  function daysBetween(fromDate, toDate) {
    const from = new Date(`${fromDate}T00:00:00`);
    const to = new Date(`${toDate}T00:00:00`);

    return Math.floor((to - from) / 86400000);
  }

  function save() {
    window.LexoraStorage.save(state);
  }

  function uid() {
    return `word-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`;
  }

  function toast(message) {
    if (!els.toast) {
      console.log(message);
      return;
    }

    els.toast.textContent = message;
    els.toast.classList.add("show");

    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {
      els.toast.classList.remove("show");
    }, 2400);
  }

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .trim();
  }

  function formatDate(value) {
    if (!value) return "Never";

    return new Date(`${value}T12:00:00`)
      .toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
  }

  function setTheme(theme) {
    state.theme = theme;

    document.documentElement.dataset.theme = theme;

    if (els.themeToggle) {
      els.themeToggle.textContent =
        theme === "dark"
          ? "Light Mode"
          : "Dark Mode";
    }

    save();
  }

  function populateSelect(
    select,
    values,
    selected
  ) {
    if (!select) return;

    select.innerHTML = values
      .map(
        (value) =>
          `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`
      )
      .join("");

    if (selected) {
      select.value = selected;
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function refreshSelects() {
    populateSelect(
      els.partOfSpeech,
      partsOfSpeech
    );

    populateSelect(
      els.category,
      [...state.categories, "Custom Category"]
    );

    populateSelect(
      els.difficulty,
      difficulties
    );

    if (els.categoryFilter) {
      els.categoryFilter.innerHTML =
        `<option value="">All Categories</option>` +
        state.categories
          .map(
            (category) =>
              `<option>${escapeHtml(category)}</option>`
          )
          .join("");
    }

    if (els.difficultyFilter) {
      els.difficultyFilter.innerHTML =
        `<option value="">All Difficulty</option>` +
        difficulties
          .map(
            (difficulty) =>
              `<option>${escapeHtml(difficulty)}</option>`
          )
          .join("");
    }

    if (els.alphabetFilter) {
      els.alphabetFilter.innerHTML =
        `<option value="">All Letters</option>` +
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
          .split("")
          .map(
            (letter) =>
              `<option>${letter}</option>`
          )
          .join("");
    }
  }

  function emptyForm() {
    if (!els.wordForm) return;

    els.wordForm.reset();

    els.wordId.value = "";
    els.dateLearned.value = today();

    els.formTitle.textContent =
      "Add a new word";

    populateSelect(
      els.category,
      [...state.categories, "Custom Category"]
    );
  }

  function currentCategory() {
    const custom =
      els.customCategory.value.trim();

    if (custom) {
      if (
        !state.categories.includes(custom)
      ) {
        state.categories.push(custom);
      }

      return custom;
    }

    return els.category.value ===
      "Custom Category"
      ? "General"
      : els.category.value;
  }

  function readForm() {
    const learned =
      els.dateLearned.value || today();

    return {
      id: els.wordId.value || uid(),

      word: els.word.value.trim(),

      meaning: els.meaning.value.trim(),

      example: els.example.value.trim(),

      synonyms: els.synonyms.value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),

      antonyms: els.antonyms.value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),

      partOfSpeech:
        els.partOfSpeech.value,

      category: currentCategory(),

      difficulty:
        els.difficulty.value,

      notes: els.notes.value.trim(),

      dateLearned: learned,

      favorite:
        els.favorite.checked,

      createdAt:
        new Date().toISOString(),

      reviews: 0,

      lastReviewed: "",

      nextReview: learned
    };
  }

  function submitWord(event) {
    event.preventDefault();

    const formWord = readForm();

    if (
      !formWord.word ||
      !formWord.meaning
    ) {
      return toast(
        "Word and meaning are required."
      );
    }

    const existingIndex =
      state.words.findIndex(
        (item) =>
          item.id === formWord.id
      );

    if (existingIndex >= 0) {
      const old =
        state.words[existingIndex];

      state.words[existingIndex] =
        Object.assign(
          {},
          old,
          formWord,
          {
            createdAt:
              old.createdAt,

            reviews:
              old.reviews,

            lastReviewed:
              old.lastReviewed,

            nextReview:
              old.nextReview
          }
        );

      toast("Vocabulary updated.");
    } else {
      state.words.push(formWord);

      incrementHistory(
        formWord.dateLearned,
        "learned",
        formWord.word
      );

      toast("Vocabulary saved.");
    }

    save();

    refreshAll();

    emptyForm();

    showView("library");
  }

  function incrementHistory(
    date,
    type,
    word
  ) {
    const key = date || today();

    state.history[key] =
      state.history[key] || {
        learned: 0,
        reviewed: 0,
        learnedWords: [],
        reviewedWords: []
      };

    state.history[key][type] += 1;

    state.history[key][
      `${type}Words`
    ].push(word);
  }

  function editWord(id) {
    const item =
      state.words.find(
        (word) => word.id === id
      );

    if (!item) return;

    els.wordId.value = item.id;
    els.word.value = item.word;
    els.meaning.value = item.meaning;
    els.example.value = item.example;

    els.synonyms.value =
      item.synonyms.join(", ");

    els.antonyms.value =
      item.antonyms.join(", ");

    els.partOfSpeech.value =
      item.partOfSpeech;

    populateSelect(
      els.category,
      [
        ...state.categories,
        "Custom Category"
      ],
      item.category
    );

    els.customCategory.value =
      state.categories.includes(
        item.category
      )
        ? ""
        : item.category;

    els.difficulty.value =
      item.difficulty;

    els.notes.value = item.notes;

    els.dateLearned.value =
      item.dateLearned;

    els.favorite.checked =
      item.favorite;

    els.formTitle.textContent =
      `Edit ${item.word}`;

    showView("add");
  }

  function deleteWord(id) {
    const item =
      state.words.find(
        (word) => word.id === id
      );

    if (!item) return;

    if (
      !confirm(
        `Delete "${item.word}" from your library?`
      )
    ) {
      return;
    }

    state.words =
      state.words.filter(
        (word) => word.id !== id
      );

    save();

    refreshAll();

    toast("Word deleted.");
  }

  function reviewWord(
    id,
    quality
  ) {
    const item =
      state.words.find(
        (word) => word.id === id
      );

    if (!item) return;

    item.reviews += 1;

    item.lastReviewed =
      today();

    item.nextReview =
      addDays(
        today(),
        reviewIntervals[quality]
      );

    incrementHistory(
      today(),
      "reviewed",
      item.word
    );

    save();

    refreshAll();

    toast(
      `Next review: ${formatDate(
        item.nextReview
      )}.`
    );
  }
    function getFilteredWords() {
    const search =
      normalize(els.searchInput?.value);

    const category =
      els.categoryFilter?.value || "";

    const difficulty =
      els.difficultyFilter?.value || "";

    const letter =
      els.alphabetFilter?.value || "";

    let words = [...state.words];

    if (search) {
      words = words.filter((item) =>
        [
          item.word,
          item.meaning,
          item.example,
          item.category,
          item.partOfSpeech,
          ...(item.synonyms || []),
          ...(item.antonyms || [])
        ]
          .join(" ")
          .toLowerCase()
          .includes(search)
      );
    }

    if (category) {
      words = words.filter(
        (item) =>
          item.category === category
      );
    }

    if (difficulty) {
      words = words.filter(
        (item) =>
          item.difficulty === difficulty
      );
    }

    if (letter) {
      words = words.filter(
        (item) =>
          normalize(item.word)
            .startsWith(
              normalize(letter)
            )
      );
    }

    const sort =
      els.sortFilter?.value || "newest";

    words.sort((a, b) => {
      if (sort === "alphabetical") {
        return a.word.localeCompare(
          b.word
        );
      }

      if (sort === "oldest") {
        return (
          new Date(a.createdAt) -
          new Date(b.createdAt)
        );
      }

      if (sort === "favorite") {
        return (
          Number(b.favorite) -
          Number(a.favorite)
        );
      }

      return (
        new Date(b.createdAt) -
        new Date(a.createdAt)
      );
    });

    return words;
  }

  function renderLibrary() {
    if (!els.libraryList) return;

    const words =
      getFilteredWords();

    if (!words.length) {
      els.libraryList.innerHTML = `
        <div class="empty-state">
          <h3>No vocabulary found</h3>
          <p>
            Add a new word or change your filters.
          </p>
        </div>
      `;

      return;
    }

    els.libraryList.innerHTML =
      words
        .map(
          (item) => `
          <article class="word-card">
            <div class="word-card-main">
              <div class="word-card-heading">
                <h3>
                  ${escapeHtml(item.word)}
                </h3>

                ${
                  item.favorite
                    ? `<span class="favorite-mark">★</span>`
                    : ""
                }
              </div>

              <p class="meaning">
                ${escapeHtml(
                  item.meaning
                )}
              </p>

              ${
                item.example
                  ? `
                  <p class="example">
                    "${escapeHtml(
                      item.example
                    )}"
                  </p>
                `
                  : ""
              }

              <div class="word-tags">
                <span>
                  ${escapeHtml(
                    item.partOfSpeech
                  )}
                </span>

                <span>
                  ${escapeHtml(
                    item.category
                  )}
                </span>

                <span>
                  ${escapeHtml(
                    item.difficulty
                  )}
                </span>
              </div>

              ${
                item.synonyms?.length
                  ? `
                  <p class="word-extra">
                    <strong>Synonyms:</strong>
                    ${escapeHtml(
                      item.synonyms.join(", ")
                    )}
                  </p>
                `
                  : ""
              }

              ${
                item.antonyms?.length
                  ? `
                  <p class="word-extra">
                    <strong>Antonyms:</strong>
                    ${escapeHtml(
                      item.antonyms.join(", ")
                    )}
                  </p>
                `
                  : ""
              }
            </div>

            <div class="word-card-actions">
              <button
                class="small-button"
                data-action="review"
                data-id="${item.id}"
              >
                Review
              </button>

              <button
                class="small-button"
                data-action="edit"
                data-id="${item.id}"
              >
                Edit
              </button>

              <button
                class="small-button danger"
                data-action="delete"
                data-id="${item.id}"
              >
                Delete
              </button>
            </div>
          </article>
        `
        )
        .join("");
  }

  function renderDashboard() {
    const total =
      state.words.length;

    const favorites =
      state.words.filter(
        (item) => item.favorite
      ).length;

    const reviewed =
      state.words.filter(
        (item) => item.lastReviewed
      ).length;

    const due =
      state.words.filter(
        (item) =>
          !item.nextReview ||
          item.nextReview <= today()
      ).length;

    if (els.dashboardStats) {
      els.dashboardStats.innerHTML = `
        <div class="stat-card">
          <span>Total Words</span>
          <strong>${total}</strong>
        </div>

        <div class="stat-card">
          <span>Due Today</span>
          <strong>${due}</strong>
        </div>

        <div class="stat-card">
          <span>Reviewed</span>
          <strong>${reviewed}</strong>
        </div>

        <div class="stat-card">
          <span>Favorites</span>
          <strong>${favorites}</strong>
        </div>
      `;
    }

    renderWordOfDay();
    renderAttentionMessage();
  }

  function renderWordOfDay() {
    if (
      !els.wordDayText ||
      !els.wordDayMeaning
    ) {
      return;
    }

    if (!state.words.length) {
      els.wordDayText.textContent =
        "Add your first word";

      els.wordDayMeaning.textContent =
        "Your Word of the Day will appear here.";

      if (els.wordDayMeta) {
        els.wordDayMeta.textContent = "";
      }

      return;
    }

    const index =
      Math.floor(
        Date.now() / 86400000
      ) % state.words.length;

    const item =
      state.words[index];

    els.wordDayText.textContent =
      item.word;

    els.wordDayMeaning.textContent =
      item.meaning;

    if (els.wordDayMeta) {
      els.wordDayMeta.textContent =
        `${item.partOfSpeech} • ${item.category}`;
    }
  }

  function renderAttentionMessage() {
    if (!els.attentionMessage) return;

    const due =
      state.words.filter(
        (item) =>
          !item.nextReview ||
          item.nextReview <= today()
      );

    if (!state.words.length) {
      els.attentionMessage.textContent =
        "Start building your vocabulary today.";

      return;
    }

    if (due.length) {
      els.attentionMessage.textContent =
        `${due.length} word${
          due.length === 1 ? "" : "s"
        } ready for review.`;

      return;
    }

    els.attentionMessage.textContent =
      "Great job! You are up to date.";
  }

  function getReviewWords() {
    return state.words.filter(
      (item) =>
        !item.nextReview ||
        item.nextReview <= today()
    );
  }

  function prepareFlashcards() {
    flashWords =
      getReviewWords();

    if (!flashWords.length) {
      flashWords =
        [...state.words];
    }

    flashIndex = 0;

    renderFlashcard();
  }

  function renderFlashcard() {
    if (
      !els.flashWord ||
      !els.flashBack ||
      !els.flashProgress
    ) {
      return;
    }

    if (!flashWords.length) {
      els.flashWord.textContent =
        "No words available";

      els.flashBack.textContent =
        "Add vocabulary to begin studying.";

      els.flashProgress.textContent =
        "0 / 0";

      return;
    }

    if (randomMode) {
      flashIndex =
        Math.floor(
          Math.random() *
            flashWords.length
        );
    }

    const item =
      flashWords[flashIndex];

    els.flashWord.textContent =
      item.word;

    els.flashBack.innerHTML = `
      <h3>
        ${escapeHtml(item.meaning)}
      </h3>

      ${
        item.example
          ? `
          <p>
            "${escapeHtml(
              item.example
            )}"
          </p>
        `
          : ""
      }

      <p>
        <strong>Category:</strong>
        ${escapeHtml(item.category)}
      </p>

      <p>
        <strong>Difficulty:</strong>
        ${escapeHtml(item.difficulty)}
      </p>
    `;

    els.flashProgress.textContent =
      `${flashIndex + 1} / ${
        flashWords.length
      }`;
  }

  function nextFlashcard() {
    if (!flashWords.length) return;

    if (!randomMode) {
      flashIndex =
        (flashIndex + 1) %
        flashWords.length;
    }

    els.flashcard?.classList.remove(
      "flipped"
    );

    renderFlashcard();
  }

  function previousFlashcard() {
    if (!flashWords.length) return;

    flashIndex =
      (
        flashIndex -
        1 +
        flashWords.length
      ) %
      flashWords.length;

    els.flashcard?.classList.remove(
      "flipped"
    );

    renderFlashcard();
  }

  function reviewCurrentFlashcard(
    quality
  ) {
    if (!flashWords.length) return;

    const item =
      flashWords[flashIndex];

    reviewWord(
      item.id,
      quality
    );

    nextFlashcard();
  }
    function renderCalendar() {
    if (!els.calendarGrid) return;

    const days = [];

    for (let offset = 20; offset >= 0; offset--) {
      const date = addDays(today(), -offset);
      const history = state.history[date] || {
        learned: 0,
        reviewed: 0
      };

      days.push({
        date,
        learned: history.learned || 0,
        reviewed: history.reviewed || 0
      });
    }

    els.calendarGrid.innerHTML = days
      .map((day) => {
        const total =
          day.learned + day.reviewed;

        let level = "level-0";

        if (total >= 1) level = "level-1";
        if (total >= 3) level = "level-2";
        if (total >= 6) level = "level-3";
        if (total >= 10) level = "level-4";

        return `
          <button
            class="calendar-day ${level}"
            data-date="${day.date}"
            title="${day.date}"
          >
            ${new Date(
              `${day.date}T12:00:00`
            ).getDate()}
          </button>
        `;
      })
      .join("");
  }

  function showCalendarDetails(date) {
    if (!els.calendarDetails) return;

    const history =
      state.history[date] || {
        learned: 0,
        reviewed: 0,
        learnedWords: [],
        reviewedWords: []
      };

    els.calendarDetails.innerHTML = `
      <h3>${formatDate(date)}</h3>

      <p>
        <strong>Learned:</strong>
        ${history.learned || 0}
      </p>

      <p>
        <strong>Reviewed:</strong>
        ${history.reviewed || 0}
      </p>

      ${
        history.learnedWords?.length
          ? `
          <p>
            <strong>Words learned:</strong>
            ${escapeHtml(
              history.learnedWords.join(", ")
            )}
          </p>
        `
          : ""
      }

      ${
        history.reviewedWords?.length
          ? `
          <p>
            <strong>Words reviewed:</strong>
            ${escapeHtml(
              history.reviewedWords.join(", ")
            )}
          </p>
        `
          : ""
      }
    `;
  }

  function renderStatistics() {
    if (!els.statisticsGrid) return;

    const total =
      state.words.length;

    const favorites =
      state.words.filter(
        (item) => item.favorite
      ).length;

    const totalReviews =
      state.words.reduce(
        (sum, item) =>
          sum + (item.reviews || 0),
        0
      );

    const categories =
      new Set(
        state.words.map(
          (item) => item.category
        )
      ).size;

    els.statisticsGrid.innerHTML = `
      <div class="stat-card">
        <span>Total Vocabulary</span>
        <strong>${total}</strong>
      </div>

      <div class="stat-card">
        <span>Total Reviews</span>
        <strong>${totalReviews}</strong>
      </div>

      <div class="stat-card">
        <span>Favorites</span>
        <strong>${favorites}</strong>
      </div>

      <div class="stat-card">
        <span>Categories Used</span>
        <strong>${categories}</strong>
      </div>
    `;

    renderWeeklyGraph();
  }

  function renderWeeklyGraph() {
    if (!els.weeklyGraph) return;

    const data = [];

    for (let offset = 6; offset >= 0; offset--) {
      const date =
        addDays(today(), -offset);

      const history =
        state.history[date] || {
          learned: 0,
          reviewed: 0
        };

      data.push({
        date,
        learned:
          history.learned || 0,
        reviewed:
          history.reviewed || 0
      });
    }

    const maximum = Math.max(
      1,
      ...data.map(
        (item) =>
          item.learned +
          item.reviewed
      )
    );

    els.weeklyGraph.innerHTML = data
      .map((item) => {
        const total =
          item.learned +
          item.reviewed;

        const height =
          Math.max(
            6,
            (total / maximum) * 100
          );

        const label =
          new Date(
            `${item.date}T12:00:00`
          )
            .toLocaleDateString(
              undefined,
              {
                weekday: "short"
              }
            );

        return `
          <div class="graph-column">
            <div
              class="graph-bar"
              style="height:${height}%"
              title="${item.date}: ${total} activities"
            ></div>

            <span>${label}</span>
          </div>
        `;
      })
      .join("");
  }

  function renderBadges() {
    const badges = [
      {
        id: "first-word",
        title: "First Step",
        description:
          "Save your first vocabulary word.",
        unlocked:
          state.words.length >= 1
      },

      {
        id: "ten-words",
        title: "Word Collector",
        description:
          "Save 10 vocabulary words.",
        unlocked:
          state.words.length >= 10
      },

      {
        id: "fifty-words",
        title: "Vocabulary Builder",
        description:
          "Save 50 vocabulary words.",
        unlocked:
          state.words.length >= 50
      },

      {
        id: "first-review",
        title: "Reviewer",
        description:
          "Complete your first review.",
        unlocked:
          state.words.some(
            (item) =>
              item.reviews > 0
          )
      },

      {
        id: "hundred-reviews",
        title: "Study Master",
        description:
          "Complete 100 reviews.",
        unlocked:
          state.words.reduce(
            (sum, item) =>
              sum +
              (item.reviews || 0),
            0
          ) >= 100
      }
    ];

    const html = badges
      .map(
        (badge) => `
        <div
          class="badge ${
            badge.unlocked
              ? "unlocked"
              : "locked"
          }"
        >
          <h3>
            ${
              badge.unlocked
                ? "🏆"
                : "🔒"
            }
            ${badge.title}
          </h3>

          <p>
            ${badge.description}
          </p>
        </div>
      `
      )
      .join("");

    if (els.dashboardBadges) {
      els.dashboardBadges.innerHTML =
        html;
    }

    if (els.allBadges) {
      els.allBadges.innerHTML =
        html;
    }
  }

  function refreshAll() {
    renderDashboard();
    renderLibrary();
    prepareFlashcards();
    renderCalendar();
    renderStatistics();
    renderBadges();
  }

  function showView(name) {
    $$(".view").forEach((view) => {
      view.classList.toggle(
        "active",
        view.id === `view-${name}`
      );
    });

    $$("[data-view]").forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.view === name
      );
    });

    if (els.viewTitle) {
      const titles = {
        dashboard: "Dashboard",
        add: "Add Vocabulary",
        library: "Vocabulary Library",
        flashcards: "Flashcards",
        calendar: "Study Calendar",
        statistics: "Statistics"
      };

      els.viewTitle.textContent =
        titles[name] || "Lexora";
    }

    if (name === "flashcards") {
      prepareFlashcards();
    }

    if (name === "calendar") {
      renderCalendar();
    }

    if (name === "statistics") {
      renderStatistics();
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function speakText(text) {
    if (
      !("speechSynthesis" in window)
    ) {
      toast(
        "Speech is not supported in this browser."
      );

      return;
    }

    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(
        text
      );

    const voices =
      window.speechSynthesis.getVoices();

    if (selectedSpeechVoice) {
      const voice =
        voices.find(
          (item) =>
            item.name ===
            selectedSpeechVoice
        );

      if (voice) {
        utterance.voice = voice;
      }
    }

    utterance.rate = 0.9;

    window.speechSynthesis.speak(
      utterance
    );
  }

  function initSpeechVoices() {
    if (
      !("speechSynthesis" in window)
    ) {
      return;
    }

    const loadVoices = () => {
      const voices =
        window.speechSynthesis.getVoices();

      if (!voices.length) return;

      const preferred =
        voices.find((voice) =>
          /^en/i.test(voice.lang)
        );

      if (preferred) {
        selectedSpeechVoice =
          preferred.name;
      }
    };

    loadVoices();

    window.speechSynthesis.onvoiceschanged =
      loadVoices;
  }
    function updateAccountUI() {
    if (
      !window.LexoraCloud ||
      !els.accountEmail ||
      !els.accountButton
    ) {
      return;
    }

    const cloudStatus =
      window.LexoraCloud.status();

    if (cloudStatus.user) {
      els.accountEmail.textContent =
        cloudStatus.user.email ||
        "Signed in";

      els.accountButton.textContent =
        "Sign Out";
    } else {
      els.accountEmail.textContent =
        "Local mode";

      els.accountButton.textContent =
        "Sign In / Sync";
    }
  }

  function openAuthModal() {
    if (!els.authModal) return;

    els.authModal.classList.remove(
      "hidden"
    );
  }

  function closeAuthModal() {
    if (!els.authModal) return;

    els.authModal.classList.add(
      "hidden"
    );

    if (els.authPassword) {
      els.authPassword.value = "";
    }
  }

  async function loadOrSyncCloudData() {
    const cloudState =
      await window.LexoraCloud.restoreCloudState();

    if (
      cloudState &&
      cloudState.words &&
      cloudState.words.length
    ) {
      const useCloud = confirm(
        "Cloud vocabulary found. Load your saved cloud vocabulary?"
      );

      if (useCloud) {
        state = cloudState;

        window.LexoraStorage.replaceState(
          state
        );

        refreshSelects();
        refreshAll();

        toast(
          "Cloud vocabulary loaded successfully."
        );
      }
    } else {
      await window.LexoraStorage
        .syncToCloud();

      toast(
        "Your vocabulary has been backed up to the cloud."
      );
    }

    updateAccountUI();
  }

  async function handleSignIn() {
    const email =
      els.authEmail.value.trim();

    const password =
      els.authPassword.value;

    if (!email || !password) {
      toast(
        "Please enter your email and password."
      );

      return;
    }

    try {
      els.signInButton.disabled = true;

      els.signInButton.textContent =
        "Signing in...";

      await window.LexoraCloud.signIn(
        email,
        password
      );

      await loadOrSyncCloudData();

      closeAuthModal();

      toast(
        "Successfully signed in."
      );
    } catch (error) {
      console.error(error);

      toast(
        error.message ||
          "Unable to sign in."
      );
    } finally {
      els.signInButton.disabled =
        false;

      els.signInButton.textContent =
        "Sign In";
    }
  }

  async function handleSignUp() {
    const email =
      els.authEmail.value.trim();

    const password =
      els.authPassword.value;

    if (!email || !password) {
      toast(
        "Please enter your email and password."
      );

      return;
    }

    if (password.length < 6) {
      toast(
        "Password must contain at least 6 characters."
      );

      return;
    }

    try {
      els.signUpButton.disabled =
        true;

      els.signUpButton.textContent =
        "Creating...";

      const result =
        await window.LexoraCloud.signUp(
          email,
          password
        );

      if (result.session) {
        await loadOrSyncCloudData();

        closeAuthModal();

        toast(
          "Account created and vocabulary synced."
        );
      } else {
        toast(
          "Account created. Please check your email and confirm your account."
        );
      }
    } catch (error) {
      console.error(error);

      toast(
        error.message ||
          "Unable to create account."
      );
    } finally {
      els.signUpButton.disabled =
        false;

      els.signUpButton.textContent =
        "Create Account";
    }
  }

  async function handleAccountButton() {
    if (!window.LexoraCloud) {
      toast(
        "Cloud connection is not available."
      );

      return;
    }

    const cloudStatus =
      window.LexoraCloud.status();

    if (cloudStatus.user) {
      try {
        await window.LexoraCloud.signOut();

        updateAccountUI();

        toast(
          "Signed out successfully."
        );
      } catch (error) {
        console.error(error);

        toast(
          error.message ||
            "Unable to sign out."
        );
      }
    } else {
      openAuthModal();
    }
  }

  function bindEvents() {
    els.wordForm?.addEventListener(
      "submit",
      submitWord
    );

    els.themeToggle?.addEventListener(
      "click",
      () => {
        setTheme(
          state.theme === "dark"
            ? "light"
            : "dark"
        );
      }
    );

    $$(".nav-button[data-view]")
      .forEach((button) => {
        button.addEventListener(
          "click",
          () =>
            showView(
              button.dataset.view
            )
        );
      });

    els.searchInput?.addEventListener(
      "input",
      renderLibrary
    );

    els.categoryFilter?.addEventListener(
      "change",
      renderLibrary
    );

    els.difficultyFilter?.addEventListener(
      "change",
      renderLibrary
    );

    els.alphabetFilter?.addEventListener(
      "change",
      renderLibrary
    );

    els.sortFilter?.addEventListener(
      "change",
      renderLibrary
    );

    els.libraryList?.addEventListener(
      "click",
      (event) => {
        const button =
          event.target.closest(
            "[data-action]"
          );

        if (!button) return;

        const id =
          button.dataset.id;

        const action =
          button.dataset.action;

        if (action === "edit") {
          editWord(id);
        }

        if (action === "delete") {
          deleteWord(id);
        }

        if (action === "review") {
          reviewWord(
            id,
            "good"
          );
        }
      }
    );

    els.flashcard?.addEventListener(
      "click",
      () => {
        els.flashcard.classList.toggle(
          "flipped"
        );
      }
    );

    $("#flashNext")?.addEventListener(
      "click",
      nextFlashcard
    );

    $("#flashPrevious")?.addEventListener(
      "click",
      previousFlashcard
    );

    $("#reviewAgain")?.addEventListener(
      "click",
      () =>
        reviewCurrentFlashcard(
          "again"
        )
    );

    $("#reviewHard")?.addEventListener(
      "click",
      () =>
        reviewCurrentFlashcard(
          "hard"
        )
    );

    $("#reviewGood")?.addEventListener(
      "click",
      () =>
        reviewCurrentFlashcard(
          "good"
        )
    );

    $("#reviewEasy")?.addEventListener(
      "click",
      () =>
        reviewCurrentFlashcard(
          "easy"
        )
    );

    $("#randomFlashcards")?.addEventListener(
      "click",
      () => {
        randomMode = !randomMode;

        toast(
          randomMode
            ? "Random mode enabled."
            : "Random mode disabled."
        );

        renderFlashcard();
      }
    );

    els.calendarGrid?.addEventListener(
      "click",
      (event) => {
        const button =
          event.target.closest(
            "[data-date]"
          );

        if (!button) return;

        showCalendarDetails(
          button.dataset.date
        );
      }
    );

    $("#speakWord")?.addEventListener(
      "click",
      () => {
        if (els.word?.value.trim()) {
          speakingWord =
            els.word.value.trim();

          speakText(
            speakingWord
          );
        }
      }
    );

    $("#closeReminder")?.addEventListener(
      "click",
      () =>
        els.reminderModal?.classList.add(
          "hidden"
        )
    );

    if (els.accountButton) {
      els.accountButton.addEventListener(
        "click",
        handleAccountButton
      );
    }

    if (els.closeAuth) {
      els.closeAuth.addEventListener(
        "click",
        closeAuthModal
      );
    }

    if (els.signInButton) {
      els.signInButton.addEventListener(
        "click",
        handleSignIn
      );
    }

    if (els.signUpButton) {
      els.signUpButton.addEventListener(
        "click",
        handleSignUp
      );
    }
  }

  function showDailyReminder() {
    if (
      !els.reminderModal ||
      !state.words.length
    ) {
      return;
    }

    const due =
      getReviewWords();

    if (!due.length) {
      return;
    }

    els.reminderModal.classList.remove(
      "hidden"
    );
  }

  function init() {
    setTheme(
      state.theme || "light"
    );

    initSpeechVoices();

    refreshSelects();

    emptyForm();

    bindEvents();

    refreshAll();

    setTimeout(
      showDailyReminder,
      700
    );

    updateAccountUI();

    if (window.LexoraCloud) {
      window.LexoraCloud
        .init()
        .then(() => {
          updateAccountUI();
        })
        .catch((error) => {
          console.error(
            "Cloud initialization error:",
            error
          );
        });
    }
  }

  init();

})();
