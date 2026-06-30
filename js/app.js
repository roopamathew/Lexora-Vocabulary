(function () {
  "use strict";

  const state = window.LexoraStorage.load();
  const difficulties = ["Easy", "Medium", "Hard", "Advanced"];
  const partsOfSpeech = ["Noun", "Verb", "Adjective", "Adverb", "Phrase", "Idiom", "Other"];
  const reviewIntervals = { easy: 7, good: 3, hard: 1, again: 0 };
  let flashIndex = 0;
  let flashWords = [];
  let randomMode = false;
  let selectedSpeechVoice = null;
  let speechFallbackAnnounced = false;
  let speakingWord = "";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  const els = {
    viewTitle: $("#viewTitle"),
    dashboardStats: $("#dashboardStats"),
    wordForm: $("#wordForm"),
    formTitle: $("#formTitle"),
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
    searchInput: $("#searchInput"),
    alphabetFilter: $("#alphabetFilter"),
    categoryFilter: $("#categoryFilter"),
    difficultyFilter: $("#difficultyFilter"),
    sortFilter: $("#sortFilter"),
    libraryList: $("#libraryList"),
    flashcard: $("#flashcard"),
    flashWord: $("#flashWord"),
    flashBack: $("#flashBack"),
    flashProgress: $("#flashProgress"),
    calendarGrid: $("#calendarGrid"),
    calendarDetails: $("#calendarDetails"),
    statisticsGrid: $("#statisticsGrid"),
    weeklyGraph: $("#weeklyGraph"),
    dashboardBadges: $("#dashboardBadges"),
    allBadges: $("#allBadges"),
    attentionMessage: $("#attentionMessage"),
    wordDayText: $("#wordDayText"),
    wordDayMeaning: $("#wordDayMeaning"),
    wordDayMeta: $("#wordDayMeta"),
    toast: $("#toast"),
    reminderModal: $("#reminderModal"),
    themeToggle: $("#themeToggle")
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
    return `word-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => els.toast.classList.remove("show"), 2400);
  }

  function normalize(value) {
    return String(value || "").toLowerCase().trim();
  }

  function formatDate(value) {
    if (!value) return "Never";
    return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function setTheme(theme) {
    state.theme = theme;
    document.documentElement.dataset.theme = theme;
    els.themeToggle.textContent = theme === "dark" ? "Light Mode" : "Dark Mode";
    save();
  }

  function populateSelect(select, values, selected) {
    select.innerHTML = values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
    if (selected) select.value = selected;
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
    populateSelect(els.partOfSpeech, partsOfSpeech);
    populateSelect(els.category, [...state.categories, "Custom Category"]);
    populateSelect(els.difficulty, difficulties);
    els.categoryFilter.innerHTML = `<option value="">All Categories</option>${state.categories.map((category) => `<option>${escapeHtml(category)}</option>`).join("")}`;
    els.difficultyFilter.innerHTML = `<option value="">All Difficulty</option>${difficulties.map((difficulty) => `<option>${escapeHtml(difficulty)}</option>`).join("")}`;
    els.alphabetFilter.innerHTML = `<option value="">All Letters</option>${"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => `<option>${letter}</option>`).join("")}`;
  }

  function emptyForm() {
    els.wordForm.reset();
    els.wordId.value = "";
    els.dateLearned.value = today();
    els.formTitle.textContent = "Add a new word";
    populateSelect(els.category, [...state.categories, "Custom Category"]);
  }

  function currentCategory() {
    const custom = els.customCategory.value.trim();
    if (custom) {
      if (!state.categories.includes(custom)) state.categories.push(custom);
      return custom;
    }
    return els.category.value === "Custom Category" ? "General" : els.category.value;
  }

  function readForm() {
    const learned = els.dateLearned.value || today();
    return {
      id: els.wordId.value || uid(),
      word: els.word.value.trim(),
      meaning: els.meaning.value.trim(),
      example: els.example.value.trim(),
      synonyms: els.synonyms.value.split(",").map((item) => item.trim()).filter(Boolean),
      antonyms: els.antonyms.value.split(",").map((item) => item.trim()).filter(Boolean),
      partOfSpeech: els.partOfSpeech.value,
      category: currentCategory(),
      difficulty: els.difficulty.value,
      notes: els.notes.value.trim(),
      dateLearned: learned,
      favorite: els.favorite.checked,
      createdAt: new Date().toISOString(),
      reviews: 0,
      lastReviewed: "",
      nextReview: learned
    };
  }

  function submitWord(event) {
    event.preventDefault();
    const formWord = readForm();
    if (!formWord.word || !formWord.meaning) return toast("Word and meaning are required.");
    const existingIndex = state.words.findIndex((item) => item.id === formWord.id);
    if (existingIndex >= 0) {
      const old = state.words[existingIndex];
      state.words[existingIndex] = Object.assign({}, old, formWord, {
        createdAt: old.createdAt,
        reviews: old.reviews,
        lastReviewed: old.lastReviewed,
        nextReview: old.nextReview
      });
      toast("Vocabulary updated.");
    } else {
      state.words.push(formWord);
      incrementHistory(formWord.dateLearned, "learned", formWord.word);
      toast("Vocabulary saved.");
    }
    save();
    refreshAll();
    emptyForm();
    showView("library");
  }

  function incrementHistory(date, type, word) {
    const key = date || today();
    state.history[key] = state.history[key] || { learned: 0, reviewed: 0, learnedWords: [], reviewedWords: [] };
    state.history[key][type] += 1;
    state.history[key][`${type}Words`].push(word);
  }

  function editWord(id) {
    const item = state.words.find((word) => word.id === id);
    if (!item) return;
    els.wordId.value = item.id;
    els.word.value = item.word;
    els.meaning.value = item.meaning;
    els.example.value = item.example;
    els.synonyms.value = item.synonyms.join(", ");
    els.antonyms.value = item.antonyms.join(", ");
    els.partOfSpeech.value = item.partOfSpeech;
    populateSelect(els.category, [...state.categories, "Custom Category"], item.category);
    els.customCategory.value = state.categories.includes(item.category) ? "" : item.category;
    els.difficulty.value = item.difficulty;
    els.notes.value = item.notes;
    els.dateLearned.value = item.dateLearned;
    els.favorite.checked = item.favorite;
    els.formTitle.textContent = `Edit ${item.word}`;
    showView("add");
  }

  function deleteWord(id) {
    const item = state.words.find((word) => word.id === id);
    if (!item) return;
    if (!confirm(`Delete "${item.word}" from your library?`)) return;
    state.words = state.words.filter((word) => word.id !== id);
    save();
    refreshAll();
    toast("Word deleted.");
  }

  function reviewWord(id, quality) {
    const item = state.words.find((word) => word.id === id);
    if (!item) return;
    item.reviews += 1;
    item.lastReviewed = today();
    item.nextReview = addDays(today(), reviewIntervals[quality]);
    incrementHistory(today(), "reviewed", item.word);
    save();
    refreshAll();
    toast(`Next review: ${formatDate(item.nextReview)}.`);
  }

  function detectSpeechVoice(showFallbackMessage) {
    if (!("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    const britishVoices = voices.filter((voice) => normalize(voice.lang).startsWith("en-gb"));
    const englishVoices = voices.filter((voice) => normalize(voice.lang).startsWith("en-"));
    selectedSpeechVoice = pickBestVoice(britishVoices) || pickBestVoice(englishVoices) || null;
    if (!britishVoices.length && englishVoices.length && showFallbackMessage && !speechFallbackAnnounced) {
      toast("British English voice is not installed on this device. Using the closest available English voice.");
      speechFallbackAnnounced = true;
    }
    return selectedSpeechVoice;
  }

  function pickBestVoice(voices) {
    if (!voices.length) return null;
    return [...voices].sort((a, b) => voiceScore(b) - voiceScore(a))[0];
  }

  function voiceScore(voice) {
    const name = normalize(voice.name);
    let score = 0;
    if (name.includes("uk") || name.includes("great britain") || name.includes("united kingdom")) score += 4;
    if (name.includes("google") || name.includes("microsoft") || name.includes("apple")) score += 2;
    if (voice.localService) score += 1;
    return score;
  }

  function setSpeakingState(word, active, sourceButton) {
    speakingWord = active ? word : "";
    $$(".speak-button").forEach((button) => {
      button.disabled = active;
      button.classList.toggle("speaking", active && button === sourceButton);
    });
  }

  function speakWord(word, sourceButton) {
    if (!word) return;
    if (!("speechSynthesis" in window)) {
      toast("Speech is not supported on this browser.");
      return;
    }
    if (speakingWord) return;
    const voice = detectSpeechVoice(true);
    const voicesLoaded = window.speechSynthesis.getVoices().length > 0;
    if (!voice && voicesLoaded) {
      toast("No English speech voice is installed on this device.");
      return;
    }
    if (!voice && !voicesLoaded) {
      toast("Speech voices are still loading. Try again in a moment.");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.voice = voice;
    utterance.lang = voice.lang || "en-GB";
    utterance.rate = 0.9;
    utterance.onend = () => setSpeakingState(word, false, sourceButton);
    utterance.onerror = () => {
      setSpeakingState(word, false, sourceButton);
      toast("Pronunciation could not be played.");
    };
    setSpeakingState(word, true, sourceButton);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function initSpeechVoices() {
    if (!("speechSynthesis" in window)) return;
    detectSpeechVoice(false);
    window.speechSynthesis.onvoiceschanged = () => detectSpeechVoice(false);
  }

  function dashboardMetrics() {
    const now = today();
    const totalReviews = state.words.reduce((sum, word) => sum + word.reviews, 0);
    const due = state.words.filter((word) => !word.nextReview || word.nextReview <= now).length;
    const learnedToday = state.words.filter((word) => word.dateLearned === now).length;
    const reviewedToday = state.words.filter((word) => word.lastReviewed === now).length;
    const target = Math.max(100, state.words.length + due);
    return {
      total: state.words.length,
      learnedToday,
      reviewedToday,
      streak: calculateStreak(),
      totalReviews,
      due,
      progress: Math.min(100, Math.round((state.words.length / target) * 100))
    };
  }

  function calculateStreak() {
    let cursor = new Date(`${today()}T12:00:00`);
    let streak = 0;
    while (true) {
      const key = cursor.toISOString().slice(0, 10);
      const activity = state.history[key];
      if (!activity || activity.learned + activity.reviewed === 0) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function renderDashboard() {
    const metrics = dashboardMetrics();
    const cards = [
      ["Total vocabulary", metrics.total],
      ["Words added today", metrics.learnedToday],
      ["Words reviewed today", metrics.reviewedToday],
      ["Learning streak", `${metrics.streak} days`],
      ["Total revisions", metrics.totalReviews],
      ["Upcoming reviews", metrics.due],
      ["Progress", `${metrics.progress}%`]
    ];
    els.dashboardStats.innerHTML = cards.map(([label, value]) => `<article class="stat-card"><span>${label}</span><strong>${value}</strong></article>`).join("");
    const dayWord = getWordOfDay();
    els.wordDayText.textContent = dayWord ? dayWord.word : "Add your first word";
    els.wordDayMeaning.textContent = dayWord ? dayWord.meaning : "Your vocabulary journey starts with one useful word.";
    els.wordDayMeta.textContent = dayWord ? `${dayWord.category} - ${dayWord.difficulty}` : "";
    els.attentionMessage.textContent = getAttentionMessage();
    renderBadges(els.dashboardBadges, true);
  }

  function getWordOfDay() {
    if (!state.words.length) return null;
    const index = new Date().getDate() % state.words.length;
    return [...state.words].sort((a, b) => a.word.localeCompare(b.word))[index];
  }

  function getAttentionMessage() {
    if (!state.words.length) return "Add words to unlock smart revision prompts.";
    const now = today();
    const candidate = [...state.words].sort((a, b) => {
      const daysA = a.lastReviewed ? daysBetween(a.lastReviewed, now) : 999;
      const daysB = b.lastReviewed ? daysBetween(b.lastReviewed, now) : 999;
      return daysB - daysA || a.reviews - b.reviews;
    })[0];
    if (!candidate.lastReviewed) return `This word needs your attention: "${candidate.word}" has not been reviewed yet.`;
    return `You have not reviewed "${candidate.word}" for ${daysBetween(candidate.lastReviewed, now)} days.`;
  }

  function filteredWords() {
    const query = normalize(els.searchInput.value);
    const letter = els.alphabetFilter.value;
    const category = els.categoryFilter.value;
    const difficulty = els.difficultyFilter.value;
    let items = state.words.filter((item) => {
      const haystack = normalize([item.word, item.meaning, item.category, item.example, item.notes].join(" "));
      return (!query || haystack.includes(query))
        && (!letter || item.word.toUpperCase().startsWith(letter))
        && (!category || item.category === category)
        && (!difficulty || item.difficulty === difficulty);
    });
    const sort = els.sortFilter.value;
    if (sort === "least") items.sort((a, b) => a.reviews - b.reviews);
    if (sort === "most") items.sort((a, b) => b.reviews - a.reviews);
    if (sort === "due") items.sort((a, b) => (a.nextReview || "").localeCompare(b.nextReview || ""));
    if (sort === "favorite") items = items.filter((item) => item.favorite);
    if (sort === "az") items.sort((a, b) => a.word.localeCompare(b.word));
    if (sort === "recent") items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return items;
  }

  function renderLibrary() {
    const items = filteredWords();
    if (!items.length) {
      els.libraryList.innerHTML = `<article class="panel"><h2>No vocabulary found</h2><p class="muted">Add a word or adjust your filters.</p></article>`;
      return;
    }
    const groups = items.reduce((acc, item) => {
      const letter = item.word.charAt(0).toUpperCase();
      acc[letter] = acc[letter] || [];
      acc[letter].push(item);
      return acc;
    }, {});
    els.libraryList.innerHTML = Object.keys(groups).sort().map((letter) => `
      <section class="letter-section">
        <h2>${letter}</h2>
        <div class="word-card-grid">${groups[letter].map(wordCard).join("")}</div>
      </section>
    `).join("");
  }

  function wordCard(item) {
    return `
      <article class="word-card scroll-reveal">
        <div class="panel-heading">
          <h3>${escapeHtml(item.word)}</h3>
          <button class="icon-button" data-action="favorite" data-id="${item.id}" title="Favourite" type="button">${item.favorite ? "Starred" : "Star"}</button>
        </div>
        <p>${escapeHtml(item.meaning)}</p>
        <div class="chip-row">
          <span class="chip">${escapeHtml(item.category)}</span>
          <span class="chip difficulty">${escapeHtml(item.difficulty)}</span>
          <span class="chip">${escapeHtml(item.partOfSpeech)}</span>
        </div>
        <div class="card-meta">
          <span class="chip">Learned ${formatDate(item.dateLearned)}</span>
          <span class="chip">${item.reviews} reviews</span>
          <span class="chip">Last ${formatDate(item.lastReviewed)}</span>
          <span class="chip">Next ${formatDate(item.nextReview)}</span>
        </div>
        <div class="word-actions">
          <button class="ghost-button small" data-action="edit" data-id="${item.id}" type="button">Edit</button>
          <button class="ghost-button small" data-action="delete" data-id="${item.id}" type="button">Delete</button>
          <button class="primary-button small" data-action="review" data-id="${item.id}" type="button">Review</button>
          <button class="ghost-button small speak-button" data-action="speak" data-id="${item.id}" type="button" aria-label="Pronounce ${escapeHtml(item.word)}">&#128266; Pronounce</button>
        </div>
      </article>
    `;
  }

  function buildFlashWords() {
    flashWords = [...state.words].sort((a, b) => {
      const dueCompare = (a.nextReview || "").localeCompare(b.nextReview || "");
      return dueCompare || a.reviews - b.reviews;
    });
    if (randomMode) shuffle(flashWords);
    flashIndex = Math.min(flashIndex, Math.max(0, flashWords.length - 1));
  }

  function renderFlashcard() {
    buildFlashWords();
    const item = flashWords[flashIndex];
    els.flashcard.classList.remove("flipped");
    if (!item) {
      els.flashWord.textContent = "No words yet";
      els.flashBack.innerHTML = "<p>Add vocabulary to start flashcards.</p>";
      els.flashProgress.textContent = "0 / 0";
      return;
    }
    els.flashWord.textContent = item.word;
    els.flashBack.innerHTML = `
      <h2>${escapeHtml(item.word)}</h2>
      <p><strong>Meaning:</strong> ${escapeHtml(item.meaning)}</p>
      <p><strong>Example:</strong> ${escapeHtml(item.example || "No example added.")}</p>
      <p><strong>Synonyms:</strong> ${escapeHtml(item.synonyms.join(", ") || "None")}</p>
      <p><strong>Antonyms:</strong> ${escapeHtml(item.antonyms.join(", ") || "None")}</p>
      <p><strong>Category:</strong> ${escapeHtml(item.category)} | <strong>Difficulty:</strong> ${escapeHtml(item.difficulty)}</p>
    `;
    els.flashProgress.textContent = `${flashIndex + 1} / ${flashWords.length}`;
  }

  function shuffle(items) {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const random = Math.floor(Math.random() * (index + 1));
      [items[index], items[random]] = [items[random], items[index]];
    }
  }

  function renderCalendar() {
    const days = [];
    const start = new Date();
    start.setDate(start.getDate() - 179);
    for (let index = 0; index < 180; index += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = date.toISOString().slice(0, 10);
      const activity = state.history[key] || { learned: 0, reviewed: 0, learnedWords: [], reviewedWords: [] };
      const total = activity.learned + activity.reviewed;
      const level = total >= 8 ? 4 : total >= 5 ? 3 : total >= 2 ? 2 : total >= 1 ? 1 : 0;
      days.push(`<button class="day-cell level-${level}" data-date="${key}" title="${key}: ${total} activity" type="button"></button>`);
    }
    els.calendarGrid.innerHTML = days.join("");
    els.calendarDetails.textContent = "Select a date to see words learned and reviewed.";
  }

  function renderStats() {
    const metrics = dashboardMetrics();
    const byCategory = state.categories.map((category) => `${category}: ${state.words.filter((word) => word.category === category).length}`).join("<br>");
    const favorites = state.words.filter((word) => word.favorite).length;
    const weekStart = addDays(today(), -6);
    const learnedWeek = state.words.filter((word) => word.dateLearned >= weekStart).length;
    const most = [...state.words].sort((a, b) => b.reviews - a.reviews)[0];
    const least = [...state.words].sort((a, b) => a.reviews - b.reviews)[0];
    const average = (state.words.length / Math.max(1, Object.keys(state.history).length)).toFixed(1);
    const month = state.words.filter((word) => word.dateLearned.slice(0, 7) === today().slice(0, 7)).length;
    els.statisticsGrid.innerHTML = [
      ["Total words", metrics.total],
      ["Words by category", byCategory || "No categories yet"],
      ["Favourite words", favorites],
      ["Words learned this week", learnedWeek],
      ["Review count", metrics.totalReviews],
      ["Most reviewed word", most ? `${most.word} (${most.reviews})` : "None"],
      ["Least reviewed word", least ? `${least.word} (${least.reviews})` : "None"],
      ["Daily learning average", average],
      ["Monthly progress", `${month} words this month`]
    ].map(([label, value]) => `<article class="stat-card"><span>${label}</span><strong>${value}</strong></article>`).join("");
    renderWeeklyGraph();
    renderBadges(els.allBadges, false);
  }

  function renderWeeklyGraph() {
    const days = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const key = addDays(today(), -offset);
      const activity = state.history[key] || { learned: 0, reviewed: 0 };
      const total = activity.learned + activity.reviewed;
      const height = Math.max(8, total * 22);
      days.push(`<div class="bar"><span style="height:${height}px"></span><small>${key.slice(5)}</small><strong>${total}</strong></div>`);
    }
    els.weeklyGraph.innerHTML = days.join("");
  }

  function earnedBadges() {
    const metrics = dashboardMetrics();
    return [
      ["First Word", metrics.total >= 1],
      ["50 Words Learned", metrics.total >= 50],
      ["100 Words Learned", metrics.total >= 100],
      ["7-Day Streak", metrics.streak >= 7],
      ["30-Day Streak", metrics.streak >= 30],
      ["500 Reviews", metrics.totalReviews >= 500],
      ["Professional Vocabulary Master", state.words.filter((word) => word.category === "Professional").length >= 25],
      ["Business Vocabulary Expert", state.words.filter((word) => word.category === "Business").length >= 25],
      ["Academic Vocabulary Champion", state.words.filter((word) => word.category === "Academic").length >= 25]
    ];
  }

  function renderBadges(container, earnedOnly) {
    let badges = earnedBadges();
    if (earnedOnly) badges = badges.filter((badge) => badge[1]).slice(0, 5);
    container.innerHTML = badges.length
      ? badges.map(([name, earned]) => `<span class="badge ${earned ? "" : "locked"}">${escapeHtml(name)}</span>`).join("")
      : `<span class="muted">Earn badges by learning and reviewing words.</span>`;
  }

  function showView(view) {
    $$(".view").forEach((node) => node.classList.toggle("active", node.id === view));
    $$(".nav-item").forEach((node) => node.classList.toggle("active", node.dataset.view === view));
    els.viewTitle.textContent = view.replace("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
    if (view === "flashcards") renderFlashcard();
    if (view === "calendar") renderCalendar();
    if (view === "stats") renderStats();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function refreshAll() {
    refreshSelects();
    renderDashboard();
    renderLibrary();
    renderFlashcard();
    renderCalendar();
    renderStats();
  }

  function exportFile(filename, content) {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function importFile(file, mode) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (mode === "words") {
          const imported = Array.isArray(data) ? data : data.words;
          if (!Array.isArray(imported)) throw new Error("No words found.");
          imported.forEach((word) => {
            const next = Object.assign(readForm(), word, { id: word.id || uid() });
            if (!state.words.some((item) => item.id === next.id)) state.words.push(next);
            if (next.category && !state.categories.includes(next.category)) state.categories.push(next.category);
          });
        } else {
          const nextState = window.LexoraStorage.replaceState(data);
          Object.assign(state, nextState);
        }
        save();
        refreshAll();
        toast("Import complete.");
      } catch (error) {
        toast("Import failed. Check the JSON file.");
      }
    };
    reader.readAsText(file);
  }

  function showDailyReminder() {
    const metrics = dashboardMetrics();
    if (state.words.length && metrics.reviewedToday === 0 && localStorage.getItem("lexora-reminder-date") !== today()) {
      if (Notification.permission === "granted") {
        new Notification("Time to revise today", { body: "Keep your streak alive with one quick review." });
      } else {
        els.reminderModal.classList.remove("hidden");
      }
      localStorage.setItem("lexora-reminder-date", today());
    }
  }

  function bindEvents() {
    $$(".nav-item").forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
    $$("[data-view-jump]").forEach((button) => button.addEventListener("click", () => showView(button.dataset.viewJump)));
    els.themeToggle.addEventListener("click", () => setTheme(state.theme === "dark" ? "light" : "dark"));
    $("#notifyButton").addEventListener("click", async () => {
      if (!("Notification" in window)) return toast("Browser notifications are unavailable.");
      const permission = await Notification.requestPermission();
      toast(permission === "granted" ? "Notifications enabled." : "Notifications not enabled.");
    });
    els.wordForm.addEventListener("submit", submitWord);
    $("#resetForm").addEventListener("click", emptyForm);
    [els.searchInput, els.alphabetFilter, els.categoryFilter, els.difficultyFilter, els.sortFilter].forEach((input) => {
      input.addEventListener("input", renderLibrary);
      input.addEventListener("change", renderLibrary);
    });
    els.libraryList.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const item = state.words.find((word) => word.id === button.dataset.id);
      if (button.dataset.action === "edit") editWord(button.dataset.id);
      if (button.dataset.action === "delete") deleteWord(button.dataset.id);
      if (button.dataset.action === "review") {
        reviewWord(button.dataset.id, "good");
        showView("flashcards");
      }
      if (button.dataset.action === "speak" && item) speakWord(item.word, button);
      if (button.dataset.action === "favorite" && item) {
        item.favorite = !item.favorite;
        save();
        refreshAll();
      }
    });
    els.flashcard.addEventListener("click", (event) => {
      const item = flashWords[flashIndex];
      if (event.target.closest("#speakFlashIcon")) {
        if (item) speakWord(item.word, event.target.closest("button"));
        return;
      }
      els.flashcard.classList.toggle("flipped");
    });
    els.flashcard.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        els.flashcard.classList.toggle("flipped");
      }
    });
    $("#prevCard").addEventListener("click", () => {
      flashIndex = Math.max(0, flashIndex - 1);
      renderFlashcard();
    });
    $("#nextCard").addEventListener("click", () => {
      flashIndex = Math.min(Math.max(0, flashWords.length - 1), flashIndex + 1);
      renderFlashcard();
    });
    $("#shuffleCards").addEventListener("click", () => {
      shuffle(state.words);
      flashIndex = 0;
      renderFlashcard();
      toast("Flashcards shuffled.");
    });
    $("#randomMode").addEventListener("click", () => {
      randomMode = !randomMode;
      toast(randomMode ? "Random mode on." : "Random mode off.");
      renderFlashcard();
    });
    $("#speakFlash").addEventListener("click", (event) => {
      const item = flashWords[flashIndex];
      if (item) speakWord(item.word, event.currentTarget);
    });
    $("#speakWordDay").addEventListener("click", (event) => {
      const item = getWordOfDay();
      if (item) speakWord(item.word, event.currentTarget);
    });
    $$(".review-actions button").forEach((button) => button.addEventListener("click", () => {
      const item = flashWords[flashIndex];
      if (item) reviewWord(item.id, button.dataset.review);
      flashIndex = Math.min(flashIndex + 1, Math.max(0, flashWords.length - 1));
      renderFlashcard();
    }));
    els.calendarGrid.addEventListener("click", (event) => {
      const cell = event.target.closest(".day-cell");
      if (!cell) return;
      const activity = state.history[cell.dataset.date] || { learned: 0, reviewed: 0, learnedWords: [], reviewedWords: [] };
      els.calendarDetails.innerHTML = `<strong>${cell.dataset.date}</strong><br>Learned: ${activity.learned} (${escapeHtml(activity.learnedWords.join(", ") || "none")})<br>Reviewed: ${activity.reviewed} (${escapeHtml(activity.reviewedWords.join(", ") || "none")})`;
    });
    $("#exportJson").addEventListener("click", () => exportFile("lexora-vocabulary.json", JSON.stringify(state.words, null, 2)));
    $("#backupStorage").addEventListener("click", () => exportFile("lexora-backup.json", window.LexoraStorage.exportState()));
    $("#importJson").addEventListener("change", (event) => importFile(event.target.files[0], "words"));
    $("#restoreStorage").addEventListener("change", (event) => importFile(event.target.files[0], "state"));
    $("#closeReminder").addEventListener("click", () => els.reminderModal.classList.add("hidden"));
  }

  function init() {
    setTheme(state.theme || "light");
    initSpeechVoices();
    refreshSelects();
    emptyForm();
    bindEvents();
    refreshAll();
    setTimeout(showDailyReminder, 700);
  }

  init();
})();
