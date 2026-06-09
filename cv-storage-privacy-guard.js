(function () {
  "use strict";

  const PRIVATE_KEYS = new Set([
    "profileName",
    "profileImageUrl",
    "playerSetup",
    "groundSetup",
    "creasevisionBowlers",
    "creasevisionBowlerMode",
    "creasevisionSelectedBowlerIndex",
    "creasevisionPitchDeliveries",
    "wagonWheelInnings",
    "wagonWheelHistory",
    "cww_history_view_record_id",
    "cww_history_auto_export"
  ]);

  const IDENTITY_KEYS = [
    "cww_session_user",
    "creasevisionUserProfile",
    "currentUser",
    "loggedInUser",
    "authUser",
    "user"
  ];

  const STORAGE_PREFIX = "creasevision_user_data:";
  const LAST_USER_KEY = "creasevision:last_active_storage_user";

  const rawGetItem = Storage.prototype.getItem;
  const rawSetItem = Storage.prototype.setItem;
  const rawRemoveItem = Storage.prototype.removeItem;
  const rawKey = Storage.prototype.key;

  function safeParse(value) {
    try {
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  function normalizeUserId(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_.@-]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function getIdentityFromObject(user) {
    if (!user || typeof user !== "object") {
      return "";
    }

    return normalizeUserId(
      user.uid ||
      user.id ||
      user.userId ||
      user.email ||
      user.mobile ||
      user.phone ||
      user.username ||
      ""
    );
  }

  function getActiveStorageUserId() {
    for (const key of IDENTITY_KEYS) {
      const rawValue = rawGetItem.call(localStorage, key);
      const parsed = safeParse(rawValue);

      const objectId = getIdentityFromObject(parsed);
      if (objectId) {
        return objectId;
      }

      const rawId = normalizeUserId(rawValue);
      if (rawId && rawId !== "null" && rawId !== "undefined" && rawId !== "[object_object]") {
        return rawId;
      }
    }

    return "guest";
  }

  function scopedKey(key) {
    return STORAGE_PREFIX + getActiveStorageUserId() + ":" + key;
  }

  window.CWWScopedKey = function CWWScopedKey(key) {
    return scopedKey(key);
  };

  function isAlreadyScoped(key) {
    return String(key || "").startsWith(STORAGE_PREFIX);
  }

  function finalKey(key) {
    const plainKey = String(key || "");

    if (PRIVATE_KEYS.has(plainKey)) {
      return scopedKey(plainKey);
    }

    return plainKey;
  }

  function removeRawPrivateKeys() {
    PRIVATE_KEYS.forEach(function (key) {
      rawRemoveItem.call(localStorage, key);
    });
  }

  function removeGuestPrivateDataAfterLogin() {
    const activeUser = getActiveStorageUserId();

    if (!activeUser || activeUser === "guest") {
      return;
    }

    const keysToRemove = [];

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = rawKey.call(localStorage, index);
      if (key && key.startsWith(STORAGE_PREFIX + "guest:")) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(function (key) {
      rawRemoveItem.call(localStorage, key);
    });
  }

  function clearPrivateDataIfUserChanged() {
    const activeUser = getActiveStorageUserId();
    const previousUser = rawGetItem.call(localStorage, LAST_USER_KEY);

    if (previousUser && previousUser !== activeUser) {
      removeRawPrivateKeys();
    }

    rawSetItem.call(localStorage, LAST_USER_KEY, activeUser);
    removeGuestPrivateDataAfterLogin();
  }

  Storage.prototype.getItem = function patchedGetItem(key) {
    return rawGetItem.call(this, finalKey(key));
  };

  Storage.prototype.setItem = function patchedSetItem(key, value) {
    return rawSetItem.call(this, finalKey(key), value);
  };

  Storage.prototype.removeItem = function patchedRemoveItem(key) {
    return rawRemoveItem.call(this, finalKey(key));
  };

  removeRawPrivateKeys();
  clearPrivateDataIfUserChanged();

  window.addEventListener("storage", function () {
    clearPrivateDataIfUserChanged();
  });

  document.addEventListener("click", function (event) {
    const logoutLink = event.target && event.target.closest
      ? event.target.closest("[data-logout='true'], .logout-btn")
      : null;

    if (!logoutLink) {
      return;
    }

    PRIVATE_KEYS.forEach(function (key) {
      rawRemoveItem.call(localStorage, scopedKey(key));
      rawRemoveItem.call(localStorage, key);
    });
  }, true);
})();