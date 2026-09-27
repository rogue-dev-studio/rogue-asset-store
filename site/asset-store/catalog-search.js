/**
 * @Author: rogue-dev-studio
 * @Date: 2026-09-27 13:50:00
 * @Last Modified by: rogue-dev-studio
 * @Last Modified time: 2026-09-27 13:50:00
 */
(function () {
  var MAX_PER_KIND = 48;
  var debounceTimer = 0;
  var query = "";

  function tx(key, fallback) {
    if (window.RogueStoreI18n && RogueStoreI18n.t) return RogueStoreI18n.t(key);
    return fallback;
  }

  function siteRoot() {
    return (window.RogueSite && RogueSite.root && RogueSite.root()) || "/";
  }

  function detailHref(item, kind) {
    if (window.RogueSite && RogueSite.detailPath) {
      return RogueSite.detailPath(kind, item);
    }
    var root = siteRoot();
    if (kind === "assets") {
      return root + "assets/detail/?id=" + encodeURIComponent(item.id || item.slug || "");
    }
    var repo = item.githubRepo || "";
    if (repo) return root + kind + "/detail/?repo=" + encodeURIComponent(repo);
    return "#";
  }

  function itemTags(item) {
    if (!item) return [];
    if (Array.isArray(item.tags)) return item.tags;
    if (typeof item.tags === "string" && item.tags.trim()) {
      return item.tags.split(/[,|]/).map(function (t) {
        return t.trim();
      }).filter(Boolean);
    }
    return [];
  }

  function matchesQuery(item, q) {
    if (!q) return true;
    var hay = (
      (item.name || "") +
      " " +
      (item.description || "") +
      " " +
      (item.category || "") +
      " " +
      (item.contentCategory || "") +
      " " +
      (item.owner || "") +
      " " +
      (item.source || "") +
      " " +
      itemTags(item).join(" ")
    ).toLowerCase();
    return hay.indexOf(q) !== -1;
  }

  function card(item, kind) {
    if (window.RogueCards && RogueCards.html) {
      return RogueCards.html(item, kind, { href: detailHref(item, kind) });
    }
    return (
      '<li><a class="asset-card" href="' +
      detailHref(item, kind) +
      '"><strong class="asset-card-title">' +
      (item.name || "") +
      "</strong></a></li>"
    );
  }

  function emptyHtml(kind, hasQuery) {
    if (!hasQuery) {
      return '<li class="empty-state">' + tx("searchCatalogHint", "Type a query to search the catalog.") + "</li>";
    }
    if (kind === "servers") return '<li class="empty-state">' + tx("noResults", "No results found.") + "</li>";
    if (kind === "assets") return '<li class="empty-state">' + tx("noResults", "No results found.") + "</li>";
    return '<li class="empty-state">' + tx("noResults", "No results found.") + "</li>";
  }

  function listForKind(kind) {
    var catalog = window.RogueCatalog || {};
    if (kind === "skills") return catalog.skills || [];
    if (kind === "assets") return catalog.assets || [];
    return catalog.servers || [];
  }

  function filterKind(kind) {
    var q = query.toLowerCase();
    var list = listForKind(kind).filter(function (item) {
      return matchesQuery(item, q);
    });
    return list;
  }

  function syncUrl() {
    var next = new URLSearchParams();
    if (query) next.set("q", query);
    var qs = next.toString();
    var url = location.pathname + (qs ? "?" + qs : "") + location.hash;
    history.replaceState(null, "", url);
  }

  function syncMoreLinks() {
    document.querySelectorAll("[data-catalog-search-more]").forEach(function (a) {
      var kind = a.getAttribute("data-catalog-search-more") || "assets";
      var base = siteRoot() + kind + "/";
      a.href = query ? base + "?q=" + encodeURIComponent(query) : base;
    });
  }

  function updateMeta(counts) {
    var meta = document.querySelector("[data-catalog-search-meta]");
    if (!meta) return;
    if (!query) {
      meta.textContent = tx(
        "searchCatalogLead",
        "Search MCP servers, skills, and assets."
      );
      return;
    }
    var total = (counts.servers || 0) + (counts.skills || 0) + (counts.assets || 0);
    meta.innerHTML =
      "Results <strong>" +
      total +
      "</strong> for <strong>" +
      query.replace(/</g, "&lt;") +
      "</strong>" +
      " · MCP " +
      (counts.servers || 0) +
      " · Skills " +
      (counts.skills || 0) +
      " · Assets " +
      (counts.assets || 0);
  }

  function renderKind(kind, counts) {
    var host = document.querySelector('[data-catalog-search-list="' + kind + '"]');
    if (!host) return;
    var all = filterKind(kind);
    counts[kind] = all.length;
    var list = all.slice(0, MAX_PER_KIND);
    if (!query) {
      host.innerHTML = emptyHtml(kind, false);
      return;
    }
    if (!list.length) {
      host.innerHTML = emptyHtml(kind, true);
      return;
    }
    host.innerHTML = list
      .map(function (item) {
        return card(item, kind);
      })
      .join("");
    if (typeof window.refreshGithubStars === "function") {
      window.refreshGithubStars(host);
    }
    if (typeof window.refreshGithubAuthors === "function") {
      window.refreshGithubAuthors(host);
    }
  }

  function render() {
    var counts = { servers: 0, skills: 0, assets: 0 };
    renderKind("servers", counts);
    renderKind("skills", counts);
    renderKind("assets", counts);
    updateMeta(counts);
    syncMoreLinks();
  }

  function setQuery(next, pushUrl) {
    query = String(next || "").trim();
    document.querySelectorAll("[data-catalog-search], [data-site-search]").forEach(function (input) {
      if (input.value !== query) input.value = query;
    });
    if (pushUrl !== false) syncUrl();
    render();
    document.querySelectorAll("[data-search-clear]").forEach(function (btn) {
      var wrap = btn.closest(".site-header-search, .search-bar");
      var input = wrap && wrap.querySelector("[data-catalog-search], [data-site-search]");
      var hasValue = !!(input && input.value);
      if (hasValue) btn.removeAttribute("hidden");
      else btn.setAttribute("hidden", "");
      if (wrap) wrap.classList.toggle("has-search-value", hasValue);
    });
  }

  function wireSearch() {
    document.querySelectorAll("[data-catalog-search], [data-site-search]").forEach(function (input) {
      if (input.getAttribute("data-catalog-search-wired") === "1") return;
      input.setAttribute("data-catalog-search-wired", "1");
      input.addEventListener("input", function () {
        window.clearTimeout(debounceTimer);
        debounceTimer = window.setTimeout(function () {
          setQuery(input.value, true);
        }, 180);
      });
    });

    var form = document.querySelector(".site-header-search");
    if (form && form.getAttribute("data-catalog-search-form") !== "1") {
      form.setAttribute("data-catalog-search-form", "1");
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var input = form.querySelector("[data-site-search]");
        setQuery(input ? input.value : query, true);
      });
    }
  }

  try {
    query = new URLSearchParams(location.search).get("q") || "";
  } catch (err) {
    query = "";
  }

  wireSearch();
  setQuery(query, false);

  document.addEventListener("rogue-catalog:loaded", function () {
    wireSearch();
    render();
  });
  document.addEventListener("rogue-catalog:assets-loaded", function () {
    wireSearch();
    render();
  });
})();
