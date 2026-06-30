(function () {
  "use strict";

  const STORAGE_KEY = "lexora-state-v1";
  const defaultState = {
    words: [],
    categories: [
      "Professional",
      "Daily Conversation",
      "Business",
      "Finance",
      "Technology",
      "Academic",
      "Interview Preparation",
      "MBA"
    ],
    theme: "light",
    history: {}
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return clone(defaultState);
      return Object.assign(clone(defaultState), JSON.parse(raw));
    } catch (error) {
      return clone(defaultState);
    }
  }

  function save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function exportState() {
    return JSON.stringify(load(), null, 2);
  }

  function replaceState(nextState) {
    const merged = Object.assign(clone(defaultState), nextState);
    save(merged);
    return merged;
  }

  window.LexoraStorage = {
    STORAGE_KEY,
    load,
    save,
    exportState,
    replaceState
  };
})();
