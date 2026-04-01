(function () {
  function withTimestamp(url) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}ts=${Date.now()}`;
  }

  async function fetchJson(options) {
    const candidates = [];
    const canUseProxy = window.location.protocol === "http:" || window.location.protocol === "https:";

    if (options.proxy && canUseProxy) {
      candidates.push(options.proxy);
    }
    if (options.fallback) {
      candidates.push(options.fallback);
    }

    let lastError = new Error("Unable to load data.");

    for (const url of candidates) {
      try {
        const response = await fetch(withTimestamp(url), { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        lastError = error;
      }
    }

    if (options.snapshotKey && window.VibeCatalogSnapshot && window.VibeCatalogSnapshot[options.snapshotKey]) {
      return window.VibeCatalogSnapshot[options.snapshotKey];
    }

    throw lastError;
  }

  window.VibeCatalogApi = { fetchJson };
})();