(function () {
  const STORE_BASE_URL = "https://vibe-labs.netlify.app";
  const API_ROOT = "https://vibe-labs-appstore.web.app";

  const ENDPOINTS = {
    apps: {
      proxy: "/api/apps_catalog.json",
      fallback: `${API_ROOT}/apps_catalog.json`,
      snapshotKey: "apps"
    },
    websites: {
      proxy: "/api/web_catalog.json",
      fallback: `${API_ROOT}/web_catalog.json`,
      snapshotKey: "websites"
    },
    profile: {
      proxy: "/api/profile_catalog.json",
      fallback: `${API_ROOT}/profile_catalog.json`,
      snapshotKey: "profile"
    },
    appStore: {
      proxy: "/api/appstore_metadata.json",
      fallback: `${API_ROOT}/appstore_metadata.json`,
      snapshotKey: "appStore"
    }
  };

  function esc(value) {
    return String(value ?? "").replace(/[&<>\"']/g, (match) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    }[match]));
  }

  function firstNonEmptyString(values) {
    for (const value of values) {
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
    return "";
  }

  function normalizeAppEntry(entry) {
    const appId = String(entry && entry.id ? entry.id : "").trim();
    const openLink = firstNonEmptyString([
      entry && entry.openInVibeStoreUrl,
      entry && entry.vibeStoreOpenUrl,
      entry && entry.openUrl,
      appId ? appOpenLink(appId) : ""
    ]);

    return {
      ...entry,
      openInVibeStoreUrl: openLink,
      vibeStoreOpenUrl: openLink,
      openUrl: openLink
    };
  }

  function normalizeWebsiteEntry(entry) {
    const websiteId = String(entry && entry.id ? entry.id : "").trim();
    const openLink = firstNonEmptyString([
      entry && entry.openInVibeStoreUrl,
      entry && entry.vibeStoreOpenUrl,
      entry && entry.openUrl,
      websiteId ? websiteOpenLink(websiteId) : ""
    ]);

    return {
      ...entry,
      openInVibeStoreUrl: openLink,
      vibeStoreOpenUrl: openLink,
      openUrl: openLink
    };
  }

  async function loadApps() {
    const data = await window.VibeCatalogApi.fetchJson(ENDPOINTS.apps);
    const apps = Array.isArray(data.apps) ? data.apps : [];
    return apps.map(normalizeAppEntry);
  }

  async function loadWebsites() {
    const data = await window.VibeCatalogApi.fetchJson(ENDPOINTS.websites);
    const websites = Array.isArray(data.websites) ? data.websites : [];
    return websites.map(normalizeWebsiteEntry);
  }

  async function loadProfile() {
    const data = await window.VibeCatalogApi.fetchJson(ENDPOINTS.profile);
    return Array.isArray(data.profiles) ? data.profiles[0] || null : null;
  }

  async function loadCatalogs() {
    const [apps, websites, profile] = await Promise.all([
      loadApps(),
      loadWebsites(),
      loadProfile()
    ]);

    return { apps, websites, profile };
  }

  async function loadAppStoreMetadata() {
    const data = await window.VibeCatalogApi.fetchJson(ENDPOINTS.appStore);
    return data && data.appStore ? data.appStore : null;
  }

  function appHref(id) {
    return `app.html?id=${encodeURIComponent(id)}`;
  }

  function websiteHref(id) {
    return `website.html?id=${encodeURIComponent(id)}`;
  }

  function appOpenLink(id) {
    return `${STORE_BASE_URL}/open/app/${encodeURIComponent(id)}`;
  }

  function websiteOpenLink(id) {
    return `${STORE_BASE_URL}/open/web/${encodeURIComponent(id)}`;
  }

  function queryValue(name) {
    const params = new URLSearchParams(window.location.search);
    const value = params.get(name);
    if (value) {
      return value;
    }

    if (name === "id") {
      const segments = window.location.pathname.split("/").filter(Boolean);
      if (segments.length >= 3 && segments[0] === "open") {
        if (segments[1] === "app" || segments[1] === "web") {
          return decodeURIComponent(segments.slice(2).join("/"));
        }
      }
    }

    return "";
  }

  function emptyState(message) {
    return `<div class="empty">${esc(message)}</div>`;
  }

  function developerNames(entry) {
    return Array.isArray(entry.developers)
      ? entry.developers.map((developer) => developer && developer.name).filter(Boolean).join(", ")
      : "";
  }

  function statusBadge(value) {
    const label = value || "unknown";
    const className = String(label).toLowerCase() === "stable" ? "badge badge--good" : "badge";
    return `<span class="${className}">${esc(label)}</span>`;
  }

  function goTo(url) {
    if (url) {
      window.location.assign(url);
    }
  }

  function openExternal(url) {
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  function bindDataActions(root) {
    const targetRoot = root || document;

    targetRoot.addEventListener("click", (event) => {
      const action = event.target.closest("[data-link],[data-external],[data-mail]");
      if (!action) {
        return;
      }

      event.preventDefault();

      if (action.dataset.link) {
        goTo(action.dataset.link);
        return;
      }

      if (action.dataset.external) {
        openExternal(action.dataset.external);
        return;
      }

      if (action.dataset.mail) {
        window.location.href = `mailto:${action.dataset.mail}`;
      }
    });

    targetRoot.addEventListener("keydown", (event) => {
      const action = event.target.closest("[data-link],[data-external],[data-mail]");
      if (!action) {
        return;
      }

      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      action.click();
    });
  }

  function applyInteractionGuards() {
    document.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });

    document.addEventListener("dragstart", (event) => {
      event.preventDefault();
    });

    document.addEventListener("selectstart", (event) => {
      if (event.target.closest("input,textarea")) {
        return;
      }
      event.preventDefault();
    });
  }

  function applyMobileNavMode() {
    const isMobile = window.innerWidth <= 980;
    document.body.classList.toggle("is-mobile-nav", isMobile);

    const topNav = document.querySelector(".site-header .nav");
    const bottomNav = document.querySelector(".mobile-bottom-nav");

    if (topNav) {
      topNav.hidden = isMobile;
    }
    if (bottomNav) {
      bottomNav.hidden = !isMobile;
    }
  }

  function ensureMobileBottomNav() {
    const topNav = document.querySelector(".site-header .nav");
    if (!topNav || document.querySelector(".mobile-bottom-nav")) {
      return;
    }

    const bottomNav = document.createElement("nav");
    bottomNav.className = "nav mobile-bottom-nav";
    bottomNav.setAttribute("aria-label", "Mobile Navigation");
    bottomNav.innerHTML = topNav.innerHTML;
    document.body.appendChild(bottomNav);
  }

  async function ensureReleaseBanner() {
    const header = document.querySelector(".site-header");
    if (!header || document.querySelector(".release-banner-wrap")) {
      return;
    }

    try {
      const appStore = await loadAppStoreMetadata();
      const stable = appStore && appStore.stable;
      const stableVersion = stable && stable.version;
      const stableApkUrl = stable && stable.apk && stable.apk.url;

      if (!stableVersion || !stableApkUrl) {
        return;
      }

      const banner = document.createElement("section");
      banner.className = "release-banner-wrap";
      banner.innerHTML = `
        <div class="release-banner" role="status" aria-live="polite">
          <div class="release-banner__left">
            <span class="release-banner__mark" aria-hidden="true">
              <img class="release-banner__mark-bg" src="assets/images/appstore/app_icon_background.png" alt="" />
              <img class="release-banner__mark-fg" src="assets/images/appstore/app_icon_foreground.png" alt="" />
            </span>
            <div>
              <p class="release-banner__name">Vibe Store</p>
              <p class="release-banner__meta">Latest Stable: v${esc(stableVersion)}</p>
            </div>
          </div>
          <button class="release-banner__cta" type="button">Download for Android</button>
        </div>
      `;

      header.insertAdjacentElement("afterend", banner);

      const cta = banner.querySelector(".release-banner__cta");
      cta.addEventListener("click", () => {
        window.location.assign(stableApkUrl);
      });
    } catch (_) {
      // Silent fail: keep pages usable if catalog is temporarily unavailable.
    }
  }

  function initUi() {
    bindDataActions(document);
    applyInteractionGuards();
    ensureMobileBottomNav();
    ensureReleaseBanner();
    applyMobileNavMode();
    window.addEventListener("resize", applyMobileNavMode);
  }

  function renderAppCard(app) {
    const latestVersion = app.latest && app.latest.version ? `v${app.latest.version}` : "No release";
    return `
      <article class="card">
        <div class="card__top">
          <img class="card__icon" src="${esc(app.icon)}" alt="${esc(app.name)}" />
          <div>
            <h3 class="card__title">${esc(app.name)}</h3>
            <div class="card__label">${esc(app.team || developerNames(app) || "Vibe Labs")}</div>
          </div>
        </div>
        <p class="card__sub">${esc(app.description || "No description available.")}</p>
        <div class="badge-row">
          ${statusBadge(app.status)}
          <span class="badge">${esc(app.platformDetails || app.platform || "cross-platform")}</span>
        </div>
        <div class="card__footer">
          <span class="card__label">${esc(latestVersion)}</span>
          <button class="button-secondary" type="button" data-link="${appHref(app.id)}">View Details</button>
        </div>
      </article>
    `;
  }

  function renderWebsiteCard(site) {
    return `
      <article class="card">
        <div class="card__top">
          <img class="card__icon" src="${esc(site.icon)}" alt="${esc(site.name)}" />
          <div>
            <h3 class="card__title">${esc(site.name)}</h3>
            <div class="card__label">${esc(site.team || developerNames(site) || "Vibe Labs")}</div>
          </div>
        </div>
        <p class="card__sub">${esc(site.description || "No description available.")}</p>
        <div class="badge-row">
          <span class="badge badge--good">website</span>
        </div>
        <div class="card__footer">
          <span class="card__label">Live project</span>
          <button class="button-secondary" type="button" data-link="${websiteHref(site.id)}">View Details</button>
        </div>
      </article>
    `;
  }

  function mountGrid(element, items, renderer, emptyMessage) {
    if (!element) {
      return;
    }

    element.innerHTML = items.length ? items.map(renderer).join("") : emptyState(emptyMessage);
  }

  window.VibeSite = {
    esc,
    loadApps,
    loadWebsites,
    loadProfile,
    loadAppStoreMetadata,
    loadCatalogs,
    appHref,
    websiteHref,
    appOpenLink,
    websiteOpenLink,
    queryValue,
    emptyState,
    developerNames,
    renderAppCard,
    renderWebsiteCard,
    mountGrid,
    goTo,
    openExternal,
    bindDataActions,
    initUi
  };

  initUi();
})();