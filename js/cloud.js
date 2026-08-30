(function () {
  "use strict";

  const url = window.LEXORA_SUPABASE_URL;
  const key = window.LEXORA_SUPABASE_ANON_KEY;

  const configured =
    url &&
    key &&
    !url.includes("PASTE_YOUR") &&
    !key.includes("PASTE_YOUR");

  let client = null;
  let user = null;
  let syncing = false;

  function status() {
    return {
      configured,
      user,
      syncing
    };
  }

  function getClient() {
    if (!configured) return null;

    if (!client) {
      client = window.supabase.createClient(url, key);
    }

    return client;
  }

  async function restoreCloudState() {
    const sb = getClient();

    if (!sb) return null;

    const {
      data: { session }
    } = await sb.auth.getSession();

    user = session ? session.user : null;

    if (!user) return null;

    const { data, error } = await sb
      .from("lexora_states")
      .select("state")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

    return data && data.state ? data.state : null;
  }

  async function saveCloudState(state) {
    const sb = getClient();

    if (!sb || !user || syncing) return;

    syncing = true;

    try {
      const { error } = await sb
        .from("lexora_states")
        .upsert({
          user_id: user.id,
          state,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

    } finally {
      syncing = false;
    }
  }

  async function signUp(email, password) {
    const sb = getClient();

    if (!sb) {
      throw new Error("Supabase is not configured yet.");
    }

    const { data, error } = await sb.auth.signUp({
      email,
      password
    });

    if (error) throw error;

    user = data.user || null;

    return data;
  }

  async function signIn(email, password) {
    const sb = getClient();

    if (!sb) {
      throw new Error("Supabase is not configured yet.");
    }

    const { data, error } = await sb.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    user = data.user;

    return data;
  }

  async function signOut() {
    const sb = getClient();

    if (!sb) return;

    const { error } = await sb.auth.signOut();

    if (error) throw error;

    user = null;
  }

  async function init() {
    if (!configured) return null;

    const sb = getClient();

    sb.auth.onAuthStateChange((_event, session) => {
      user = session ? session.user : null;
    });

    return restoreCloudState();
  }

  window.LexoraCloud = {
    init,
    restoreCloudState,
    saveCloudState,
    signUp,
    signIn,
    signOut,
    status
  };
})();
