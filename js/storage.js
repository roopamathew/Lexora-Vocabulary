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

  function mergeWithDefault(state) {
    return Object.assign(clone(defaultState), state || {});
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return clone(defaultState);
      }

      return mergeWithDefault(JSON.parse(raw));

    } catch (error) {
      console.error("Lexora loading error:", error);
      return clone(defaultState);
    }
  }

  function save(state) {
    const cleanState = mergeWithDefault(state);

    // Always keep a local backup.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(cleanState)
    );

    // If the user is signed in, also save to Supabase.
    if (
      window.LexoraCloud &&
      window.LexoraCloud.status().user
    ) {
      window.LexoraCloud
        .saveCloudState(cleanState)
        .catch((error) => {
          console.error("Cloud save error:", error);
        });
    }
  }

  function exportState() {
    return JSON.stringify(load(), null, 2);
  }

  function replaceState(nextState) {
    const merged = mergeWithDefault(nextState);

    save(merged);

    return merged;
  }

  async function loadCloudState() {
    if (!window.LexoraCloud) {
      return null;
    }

    try {
      const cloudState =
        await window.LexoraCloud.restoreCloudState();

      if (cloudState) {
        const merged = mergeWithDefault(cloudState);

        // Store cloud data locally too.
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(merged)
        );

        return merged;
      }

      return null;

    } catch (error) {
      console.error("Cloud loading error:", error);
      return null;
    }
  }

  async function syncToCloud() {
    if (!window.LexoraCloud) {
      return false;
    }

    const cloudStatus = window.LexoraCloud.status();

    if (!cloudStatus.user) {
      return false;
    }

    try {
      await window.LexoraCloud.saveCloudState(load());

      return true;

    } catch (error) {
      console.error("Cloud sync error:", error);

      return false;
    }
  }

  window.LexoraStorage = {
    STORAGE_KEY,
    load,
    save,
    exportState,
    replaceState,
    loadCloudState,
    syncToCloud
  };

})();
