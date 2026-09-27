/*
 * @Author: rogue-dev-studio
 * @Date: 2026-09-20 10:46:47
 * @Last Modified by: rogue-dev-studio
 * @Last Modified time: 2026-09-22 19:55:00
 */
(function () {
  var root = document.querySelector("[data-catalog]");
  if (!root || !window.RogueCatalog) return;

  var kind = root.getAttribute("data-catalog");
  var mode = root.getAttribute("data-mode") || "all";
  var filterStyle = root.getAttribute("data-filter-style") || mode;
  var PAGE_SIZE_OPTIONS = [4, 8, 16, 32, 64, 80];
  var items = [];
  var expandedNodes = {};
  var kindTreeCache = null;
  var label =
    kind === "skills" ? "skills" : kind === "assets" ? "assets" : "MCP servers";

  function siteRoot() {
    return (window.RogueSite && RogueSite.root && RogueSite.root()) || "/";
  }

  function syncItems() {
    if (kind === "skills") items = (RogueCatalog.skills || []).slice();
    else if (kind === "assets") items = (RogueCatalog.assets || []).slice();
    else items = (RogueCatalog.servers || []).slice();
    kindTreeCache = null;
  }

  syncItems();
  var params = new URLSearchParams(window.location.search);

  function parsePageSize() {
    var raw = parseInt(params.get("perPage") || params.get("size") || "", 10);
    if (PAGE_SIZE_OPTIONS.indexOf(raw) >= 0) return raw;
    var fallback = parseInt(RogueCatalog.pageSize, 10) || 8;
    if (PAGE_SIZE_OPTIONS.indexOf(fallback) >= 0) return fallback;
    return 8;
  }

  function parseListParam(key) {
    var all = params.getAll(key);
    if (all.length > 1) {
      return all
        .map(function (v) {
          return String(v || "").trim();
        })
        .filter(Boolean);
    }
    var raw = (params.get(key) || "").trim();
    if (!raw) return [];
    return raw
      .split(",")
      .map(function (v) {
        return v.trim();
      })
      .filter(Boolean);
  }

  var PRICE_BUCKETS = [
    { id: "free", label: "Free" },
    { id: "under-20", label: "Under $20" },
    { id: "20-50", label: "$20 – $50" },
    { id: "50-100", label: "$50 – $100" },
    { id: "100-200", label: "$100 – $200" },
    { id: "over-200", label: "Over $200" }
  ];

  var RATING_BUCKETS = [
    { id: "5", label: "5 stars", stars: 5 },
    { id: "4", label: "4 stars", stars: 4 },
    { id: "3", label: "3 stars", stars: 3 },
    { id: "2", label: "2 stars", stars: 2 },
    { id: "1", label: "1 star", stars: 1 },
    { id: "0", label: "Unrated", stars: 0 }
  ];

  var RELEASE_BUCKETS = [
    { id: "1d", label: "Last day", days: 1 },
    { id: "1w", label: "Last week", days: 7 },
    { id: "1m", label: "Last month", days: 30 },
    { id: "3m", label: "Last 3 months", days: 90 },
    { id: "6m", label: "Last 6 months", days: 180 },
    { id: "1y", label: "Last year", days: 365 },
    { id: "older-1y", label: "Older than 1 year", olderThanDays: 365 }
  ];

  var SORT_OPTIONS = [
    { id: "relevance", label: "Relevance" },
    { id: "popularity", label: "Popularity" },
    { id: "rating-asc", label: "Rating (Low to High)" },
    { id: "rating-desc", label: "Rating (High to Low)" },
    { id: "published-asc", label: "Published Date (Oldest)" },
    { id: "published-desc", label: "Published Date (Newest)" },
    { id: "updated-asc", label: "Recently Updated (Oldest)" },
    { id: "updated-desc", label: "Recently Updated (Newest)" },
    { id: "price-asc", label: "Price (Low to High)" },
    { id: "price-desc", label: "Price (High to Low)" }
  ];

  var SORT_ALIASES = {
    rating: "rating-desc",
    published: "published-desc",
    updated: "updated-desc"
  };

  function parseSort() {
    var raw = (params.get("sort") || "relevance").trim().toLowerCase();
    if (SORT_ALIASES[raw]) raw = SORT_ALIASES[raw];
    for (var i = 0; i < SORT_OPTIONS.length; i++) {
      if (SORT_OPTIONS[i].id === raw) return raw;
    }
    return "relevance";
  }

  function parseBucketIds(paramKey, buckets) {
    var fromParam = parseListParam(paramKey);
    if (!fromParam.length) return [];
    var allowed = {};
    buckets.forEach(function (b) {
      allowed[b.id] = true;
    });
    return fromParam.filter(function (id) {
      return allowed[id];
    });
  }

  function parsePriceBuckets() {
    var fromParam = parseBucketIds("price", PRICE_BUCKETS);
    if (fromParam.length) return fromParam;
    var minP = params.has("minPrice") ? parseFloat(params.get("minPrice")) : null;
    var maxP = params.has("maxPrice") ? parseFloat(params.get("maxPrice")) : null;
    if (minP != null && isNaN(minP)) minP = null;
    if (maxP != null && isNaN(maxP)) maxP = null;
    if (maxP === 0 && (minP == null || minP === 0)) return ["free"];
    return [];
  }

  var state = {
    page: Math.max(1, parseInt(params.get("page") || "1", 10) || 1),
    pageSize: parsePageSize(),
    query: (params.get("q") || "").trim(),
    categories: parseListParam("category"),
    tags: parseListParam("tag"),
    range: (params.get("range") || "all-time").trim() === "new" ? "new" : "all-time",
    priceBuckets: parsePriceBuckets(),
    ratingBuckets: parseBucketIds("rating", RATING_BUCKETS),
    releaseBuckets: parseBucketIds("released", RELEASE_BUCKETS),
    sort: parseSort()
  };

  function hasCategoryFilter() {
    return state.categories.length > 0;
  }

  function hasTagFilter() {
    return state.tags.length > 0;
  }

  function isCategorySelected(name) {
    var key = String(name || "").toLowerCase();
    return state.categories.some(function (c) {
      return c.toLowerCase() === key;
    });
  }

  function parseScopedTag(value) {
    var raw = String(value || "");
    var idx = raw.indexOf("::");
    if (idx === -1) return { category: "", platform: "", label: raw };
    var category = raw.slice(0, idx);
    var rest = raw.slice(idx + 2);
    var sep = rest.indexOf("›");
    if (sep === -1) return { category: category, platform: "", label: rest };
    return {
      category: category,
      platform: rest.slice(0, sep),
      label: rest.slice(sep + 1)
    };
  }

  function scopeTagKey(categoryLabel, label, platformLabel) {
    var tag = String(label || "").trim();
    if (!tag) return "";
    var cat = String(categoryLabel || "").trim();
    var platform = String(platformLabel || "").trim();
    if (platform && tag.toLowerCase() !== platform.toLowerCase()) {
      return cat ? cat + "::" + platform + "›" + tag : platform + "›" + tag;
    }
    return cat ? cat + "::" + tag : tag;
  }

  function isPlatformLabel(name) {
    var key = String(name || "").toLowerCase();
    if (!key) return false;
    var list = (window.RogueCatalog && RogueCatalog.platformLabels) || [];
    if (!list.length) return false;
    return list.some(function (label) {
      return String(label).toLowerCase() === key;
    });
  }

  function itemMatchesCategory(item, categoryName) {
    var key = String(categoryName || "").toLowerCase();
    if (!key || !item) return false;
    if (String(item.category || "").toLowerCase() === key) return true;
    if (String(item.contentCategory || "").toLowerCase() === key) return true;
    if (
      window.RogueCatalog &&
      typeof RogueCatalog.contentCategoryForAsset === "function" &&
      String(RogueCatalog.contentCategoryForAsset(item) || "").toLowerCase() === key
    ) {
      return true;
    }
    return false;
  }

  function itemHasTag(item, name) {
    var key = String(name || "").toLowerCase();
    if (!key) return false;
    return itemTags(item).some(function (tag) {
      return String(tag).toLowerCase() === key;
    });
  }

  function isTagSelected(name, categoryLabel, platformLabel) {
    var key = String(name || "").toLowerCase();
    if (!key) return false;
    var platform = String(platformLabel || "").trim();
    var cat = String(categoryLabel || "").trim();

    function tagMatches(t) {
      var raw = String(t || "");
      var parsed = parseScopedTag(raw);
      var label = String(parsed.label || raw).toLowerCase();
      if (label !== key && raw.toLowerCase() !== key) return false;

      var parsedCat = String(parsed.category || "").toLowerCase();
      var parsedPlat = String(parsed.platform || "").toLowerCase();
      var isPlain = !parsedCat && !parsedPlat && raw.indexOf("::") === -1;

      if (platform) {
        if (parsedPlat && parsedPlat !== platform.toLowerCase()) return false;
        if (key === platform.toLowerCase()) {
          var platformsCatKey = platformsCategoryLabel().toLowerCase();
          return (
            !parsedPlat ||
            parsedPlat === platform.toLowerCase() ||
            isPlain ||
            (!!platformsCatKey &&
              parsedCat === platformsCatKey &&
              !parsedPlat)
          );
        }
        if (parsedPlat === platform.toLowerCase()) return true;
        // Plain overview tags apply to every taxonomy branch with this label.
        if (isPlain) return true;
        if (parsedCat && cat && parsedCat !== cat.toLowerCase()) return false;
        return false;
      }

      if (cat) {
        if (parsedCat && parsedCat !== cat.toLowerCase()) return false;
        if (parsedCat === cat.toLowerCase()) return true;
        if (isPlain) return true;
        return false;
      }

      return true;
    }

    if (cat && platform && key !== platform.toLowerCase()) {
      var compound =
        cat.toLowerCase() + "::" + platform.toLowerCase() + "›" + key;
      if (
        state.tags.some(function (t) {
          return t.toLowerCase() === compound;
        })
      ) {
        return true;
      }
    }
    if (cat) {
      var scoped = cat.toLowerCase() + "::" + key;
      if (
        state.tags.some(function (t) {
          return t.toLowerCase() === scoped;
        })
      ) {
        return true;
      }
    }
    return state.tags.some(tagMatches);
  }

  function platformLabelForItem(item) {
    if (
      window.RogueCatalog &&
      typeof RogueCatalog.platformLabelFromItem === "function"
    ) {
      return String(RogueCatalog.platformLabelFromItem(item) || "").trim();
    }
    var tags = itemTags(item);
    for (var i = 0; i < tags.length; i++) {
      if (isPlatformLabel(tags[i])) return tags[i];
    }
    return "";
  }

  function contentCategoryForItem(item) {
    if (!item) return "";
    if (item.contentCategory) return String(item.contentCategory).trim();
    if (
      window.RogueCatalog &&
      typeof RogueCatalog.contentCategoryForAsset === "function"
    ) {
      return String(RogueCatalog.contentCategoryForAsset(item) || "").trim();
    }
    return "";
  }

  function itemHasStoreGenre(item, tagLabel) {
    var want = String(tagLabel || "").toLowerCase();
    if (!want || !item) return false;
    return (item.storeCategories || []).some(function (g) {
      return String(g || "").toLowerCase() === want;
    });
  }

  function isPlatformsTaxonomyRoot(root) {
    if (!root) return false;
    return (root.children || []).some(function (child) {
      return isPlatformLabel(child.label);
    });
  }

  function platformsCategoryLabel() {
    var fromCatalog =
      window.RogueCatalog && RogueCatalog.platformsCategoryLabel
        ? String(RogueCatalog.platformsCategoryLabel).trim()
        : "";
    var tree = taxonomyTree();
    for (var i = 0; i < tree.length; i++) {
      if (isPlatformsTaxonomyRoot(tree[i])) {
        return String(tree[i].label || "").trim();
      }
    }
    if (fromCatalog) {
      var cats =
        (window.RogueCatalog && RogueCatalog.assetCategories) || [];
      for (var c = 0; c < cats.length; c++) {
        if (
          String(cats[c] || "").toLowerCase() === fromCatalog.toLowerCase()
        ) {
          return cats[c];
        }
      }
      return fromCatalog;
    }
    return "";
  }

  function isPlatformsCategory(name) {
    var key = String(name || "").trim().toLowerCase();
    if (!key) return false;
    return key === platformsCategoryLabel().toLowerCase();
  }

  /**
   * Resolve parent filter paths for a leaf tag from item overview/categories.
   * opts.platform — limit to one platform (e.g. click Platforms › Sketchfab › People).
   * Store-genre rows win when present; otherwise any item with the tag.
   */
  function findTaxonomyLabelPaths(label, opts) {
    var key = String(label || "").toLowerCase();
    var paths = [];
    var seen = {};
    var onlyPlatform = String((opts && opts.platform) || "")
      .trim()
      .toLowerCase();
    if (!key) return paths;

    function push(path) {
      var value = String(path || "").trim();
      if (!value) return;
      var id = value.toLowerCase();
      if (seen[id]) return;
      seen[id] = true;
      paths.push(value);
    }

    function pushItemParents(item, requireStoreGenre) {
      if (!itemHasTag(item, label)) return false;
      if (requireStoreGenre && !itemHasStoreGenre(item, label)) return false;

      var cat = String(item.category || "").trim();
      var contentCat = contentCategoryForItem(item);
      var platform = platformLabelForItem(item);
      if (
        onlyPlatform &&
        String(platform || "").toLowerCase() !== onlyPlatform
      ) {
        return false;
      }
      var added = false;

      if (cat && platform && isPlatformLabel(platform)) {
        push(scopeTagKey(cat, label, platform));
        added = true;
      } else if (cat && !isPlatformLabel(cat)) {
        push(scopeTagKey(cat, label));
        added = true;
      }
      if (contentCat && contentCat !== cat) {
        push(scopeTagKey(contentCat, label));
        added = true;
      }
      return added;
    }

    if (!items.length) {
      taxonomyTree().forEach(function (root) {
        var platformsRoot = isPlatformsTaxonomyRoot(root);
        function walk(node, categoryLabel, platformLabel) {
          if (!node) return;
          if (String(node.label || "").toLowerCase() === key) {
            if (
              onlyPlatform &&
              String(platformLabel || "").toLowerCase() !== onlyPlatform
            ) {
              // skip
            } else if (platformLabel) {
              push(scopeTagKey(categoryLabel, node.label, platformLabel));
            } else if (categoryLabel && String(node.label) !== categoryLabel) {
              push(scopeTagKey(categoryLabel, node.label));
            }
          }
          var nextCat = categoryLabel || node.label;
          var nextPlat =
            platformLabel ||
            (platformsRoot && isPlatformLabel(node.label) ? node.label : "");
          (node.children || []).forEach(function (child) {
            walk(child, nextCat, nextPlat);
          });
        }
        walk(root, root.label, "");
      });
      return paths;
    }

    var foundStoreGenre = false;
    items.forEach(function (item) {
      if (pushItemParents(item, true)) foundStoreGenre = true;
    });
    if (foundStoreGenre) return paths;

    items.forEach(function (item) {
      pushItemParents(item, false);
    });
    return paths;
  }

  function normalizeFilterTags() {
    var next = [];
    var seen = {};

    function pushTag(tag) {
      var value = String(tag || "").trim();
      if (!value) return;
      var key = value.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      next.push(value);
    }

    state.tags.forEach(function (tag) {
      var raw = String(tag || "").trim();
      if (!raw) return;
      var parsed = parseScopedTag(raw);
      var label = parsed.label || raw;
      // Platform roots stay scoped to their category (usually Platforms).
      if (kind === "assets" && isPlatformLabel(label) && !parsed.platform) {
        pushTag(
          raw.indexOf("::") !== -1
            ? raw
            : scopeTagKey(String(parsed.category || platformsCategoryLabel()), label)
        );
        return;
      }
      var isPlain = raw.indexOf("::") === -1;
      // Scoped tags stay on their branch only. Expanding them to siblings
      // would re-check e.g. 2D›Holidays after the user unchecked parent 2D
      // while Platforms›Holidays remains.
      if (!isPlain) {
        var scopedCat = String(parsed.category || "").trim();
        if (scopedCat && isCategorySelected(scopedCat)) return;
        pushTag(raw);
        return;
      }
      // Plain overview / URL tags: check every parent branch.
      var paths = findTaxonomyLabelPaths(label);
      if (!paths.length) {
        pushTag(raw);
        return;
      }
      paths.forEach(function (path) {
        var pathCat = String(parseScopedTag(path).category || "").trim();
        if (pathCat && isCategorySelected(pathCat)) return;
        pushTag(path);
      });
    });
    state.tags = next;
  }

  /** After taxonomy graft, refresh plain tags only — never collapse platform-scoped tags. */
  function promoteMultiParentTagsForExpand() {
    var next = [];
    var seen = {};

    function pushUnique(tag) {
      var value = String(tag || "").trim();
      if (!value) return;
      var key = value.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      next.push(value);
    }

    state.tags.forEach(function (tag) {
      var raw = String(tag || "").trim();
      if (!raw) return;
      var parsed = parseScopedTag(raw);
      var label = parsed.label || raw;

      if (kind === "assets" && isPlatformLabel(label) && !parsed.platform) {
        pushUnique(
          raw.indexOf("::") !== -1
            ? raw
            : scopeTagKey(String(parsed.category || platformsCategoryLabel()), label)
        );
        return;
      }

      // Platform-scoped: re-resolve for that platform only (Sketchfab ≠ Shutterstock).
      if (parsed.platform) {
        var platformPaths = findTaxonomyLabelPaths(label, {
          platform: parsed.platform
        });
        if (platformPaths.length) {
          platformPaths.forEach(pushUnique);
        } else {
          pushUnique(raw);
        }
        return;
      }

      // Category-scoped (e.g. 3D::People): keep — do not demote to plain.
      if (parsed.category) {
        pushUnique(raw);
        return;
      }

      // Plain overview tags stay plain for normalizeFilterTags to expand.
      pushUnique(raw);
    });
    state.tags = next;
  }

  function toggleListValue(list, value, on) {
    var key = String(value || "").toLowerCase();
    var next = list.filter(function (v) {
      return v.toLowerCase() !== key;
    });
    if (on && value) next.push(value);
    return next;
  }

  function itemHref(item) {
    if (window.RogueSite && RogueSite.detailPath) {
      return RogueSite.detailPath(kind, item);
    }
    var root = siteRoot();
    var repo = item.githubRepo || "";
    if (repo) return root + kind + "/detail/?repo=" + encodeURIComponent(repo);
    if (kind === "skills") return root + "skills/" + item.slug + "/";
    return root + "servers/" + item.slug + "/";
  }

  function itemLinkAttrs() {
    return "";
  }

  function emptyMessage() {
    function tx(key, fallback) {
      if (window.RogueStoreI18n && RogueStoreI18n.t) return RogueStoreI18n.t(key);
      return fallback;
    }
    if (hasActiveFilters()) return tx("noResults", "No results found.");
    if (kind === "assets") {
      if (!RogueCatalog.assetsLoaded && !(RogueCatalog.assets || []).length) {
        return tx("loading", "Loading…");
      }
      return tx("noAssets", "No assets yet.");
    }
    if (!RogueCatalog.loaded) return tx("loading", "Loading…");
    return kind === "skills"
      ? tx("noSkills", "No skills yet.")
      : tx("noServers", "No MCP servers yet.");
  }

  function hasActiveFilters() {
    return !!(
      state.query ||
      hasCategoryFilter() ||
      hasTagFilter() ||
      state.priceBuckets.length ||
      state.ratingBuckets.length ||
      state.releaseBuckets.length
    );
  }

  function syncSearchInputs() {
    document.querySelectorAll("[data-catalog-search], [data-site-search]").forEach(function (input) {
      input.value = state.query;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  function clearAllFilters() {
    state.query = "";
    state.categories = [];
    state.tags = [];
    state.priceBuckets = [];
    state.ratingBuckets = [];
    state.releaseBuckets = [];
    state.page = 1;
    syncSearchInputs();
    syncUrl();
    refreshFilterChips();
    render();
  }

  function itemPrice(item) {
    var n = typeof item.price === "number" ? item.price : parseFloat(item.price);
    return isNaN(n) ? 0 : n;
  }

  function itemRatingStars(item) {
    if (window.RogueCards && typeof RogueCards.resolveScore === "function") {
      var resolved = RogueCards.resolveScore(item, kind);
      if (resolved > 0) return Math.round(Math.max(1, Math.min(5, resolved)));
      return 0;
    }
    var n = typeof item.rating === "number" ? item.rating : parseFloat(item.rating);
    if (isNaN(n) || n <= 0) return 0;
    return Math.round(Math.max(1, Math.min(5, n)));
  }

  /** Parse catalog dates; YYYY-MM-DD uses local calendar noon to avoid UTC edge cases. */
  function parseCatalogDate(raw) {
    if (raw == null || raw === "") return 0;
    if (typeof raw === "number" && isFinite(raw)) return raw > 0 ? raw : 0;
    var s = String(raw).trim();
    if (!s) return 0;
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      return new Date(
        parseInt(m[1], 10),
        parseInt(m[2], 10) - 1,
        parseInt(m[3], 10),
        12,
        0,
        0,
        0
      ).getTime();
    }
    var t = Date.parse(s);
    return isNaN(t) ? 0 : t;
  }

  function startOfLocalDay(ms) {
    var d = new Date(ms);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
  }

  function itemAddedTime(item) {
    if (!item) return 0;
    return parseCatalogDate(item.addedAt || item.publishedAt || item.createdAt || "");
  }

  function itemUpdatedTime(item) {
    if (!item) return 0;
    return parseCatalogDate(
      item.updatedAt || item.pushedAt || item.addedAt || item.publishedAt || item.createdAt || ""
    );
  }

  function itemNameKey(item) {
    return String((item && item.name) || "").toLowerCase();
  }

  function priceInBucket(price, bucket) {
    if (!bucket) return false;
    if (bucket.id === "free") return price <= 0;
    if (bucket.id === "under-20") return price > 0 && price < 20;
    if (bucket.id === "20-50") return price >= 20 && price < 50;
    if (bucket.id === "50-100") return price >= 50 && price < 100;
    if (bucket.id === "100-200") return price >= 100 && price < 200;
    if (bucket.id === "over-200") return price >= 200;
    return false;
  }

  function ratingInBucket(stars, bucket) {
    if (!bucket) return false;
    var n = typeof stars === "number" && !isNaN(stars) ? stars : 0;
    if (bucket.stars === 0) return n <= 0;
    if (n <= 0) return false;
    return n === bucket.stars;
  }

  /** Inclusive last N local calendar days, or older-than window for archive items. */
  function releaseInBucket(addedMs, bucket) {
    if (!bucket || !addedMs) return false;
    var todayStart = startOfLocalDay(Date.now());
    var dayMs = 24 * 60 * 60 * 1000;
    if (typeof bucket.olderThanDays === "number" && bucket.olderThanDays > 0) {
      var olderCutoff = todayStart - bucket.olderThanDays * dayMs;
      return addedMs < olderCutoff;
    }
    if (typeof bucket.days !== "number" || bucket.days <= 0) return false;
    var cutoff = todayStart - (bucket.days - 1) * dayMs;
    return addedMs >= cutoff;
  }

  function bucketById(buckets, id) {
    for (var i = 0; i < buckets.length; i++) {
      if (buckets[i].id === id) return buckets[i];
    }
    return null;
  }

  function itemMatchesPriceBuckets(item) {
    if (!state.priceBuckets.length) return true;
    var price = itemPrice(item);
    return state.priceBuckets.some(function (id) {
      return priceInBucket(price, bucketById(PRICE_BUCKETS, id));
    });
  }

  function itemMatchesRatingBuckets(item) {
    if (!state.ratingBuckets.length) return true;
    var stars = itemRatingStars(item);
    return state.ratingBuckets.some(function (id) {
      return ratingInBucket(stars, bucketById(RATING_BUCKETS, id));
    });
  }

  function itemMatchesReleaseBuckets(item) {
    if (!state.releaseBuckets.length) return true;
    var added = itemAddedTime(item);
    return state.releaseBuckets.some(function (id) {
      return releaseInBucket(added, bucketById(RELEASE_BUCKETS, id));
    });
  }

  function priceLabel(item) {
    var n = itemPrice(item);
    if (n <= 0) return "Free";
    if (Number.isInteger(n)) return "$" + n;
    return "$" + n.toFixed(2);
  }

  function priceHtml(item) {
    return '<span class="price-pill" title="Price">' + priceLabel(item) + "</span>";
  }

  function searchHref(category) {
    return siteRoot() + kind + "/?category=" + encodeURIComponent(category);
  }

  function searchTagHref(tag) {
    return siteRoot() + kind + "/?tag=" + encodeURIComponent(tag);
  }

  function itemTags(item) {
    var raw = Array.isArray(item.tags) ? item.tags : [];
    if (kind !== "assets") return raw;
    var out = [];
    var seen = {};
    raw.forEach(function (tag) {
      String(tag)
        .split(/\s*›\s*/)
        .forEach(function (part) {
          part = part.trim();
          if (!part) return;
          var key = part.toLowerCase();
          if (seen[key]) return;
          seen[key] = true;
          out.push(part);
        });
    });
    return out;
  }

  function cardHtml(item, rank) {
    if (window.RogueCards && RogueCards.html) {
      return RogueCards.html(item, kind, {
        href: itemHref(item),
        rank: mode === "top" ? rank : undefined
      });
    }
    var votes = typeof item.votes === "number" ? item.votes : item.stars || 0;
    return (
      '<li><a class="skill-card store-card" href="' +
      itemHref(item) +
      '"><strong class="skill-name" data-tooltip="' +
      item.name +
      '">' +
      item.name +
      '</strong><span class="skill-desc">' +
      item.description +
      '</span><span class="card-foot"><span class="pill">' +
      item.category +
      '</span><span class="price-pill">' +
      priceLabel(item) +
      "</span> ★ " +
      votes +
      "</span></a></li>"
    );
  }

  function filteredItems() {
    var list = items.slice();

    if (mode === "top") {
      if (state.range === "new") {
        list.sort(function (a, b) {
          var tb = itemAddedTime(b);
          var ta = itemAddedTime(a);
          if (!ta && !tb) return itemNameKey(a).localeCompare(itemNameKey(b));
          if (!ta) return 1;
          if (!tb) return -1;
          if (tb !== ta) return tb - ta;
          return itemNameKey(a).localeCompare(itemNameKey(b));
        });
      } else {
        list.sort(function (a, b) {
          var vb = (b.votes != null ? b.votes : b.stars) || 0;
          var va = (a.votes != null ? a.votes : a.stars) || 0;
          if (vb !== va) return vb - va;
          return (a.rank || 999) - (b.rank || 999);
        });
      }
      list = list.slice(0, 100);
    }

    if (hasCategoryFilter() || hasTagFilter()) {
      list = list.filter(function (item) {
        var catOk =
          hasCategoryFilter() &&
          state.categories.some(function (c) {
            return itemMatchesCategory(item, c);
          });
        var tagOk =
          hasTagFilter() &&
          state.tags.some(function (t) {
            var parsed = parseScopedTag(t);
            if (parsed.category && !itemMatchesCategory(item, parsed.category)) {
              return false;
            }
            if (parsed.platform) {
              return itemHasTag(item, parsed.platform) && itemHasTag(item, parsed.label);
            }
            if (parsed.category) {
              return itemHasTag(item, parsed.label);
            }
            return itemHasTag(item, t);
          });
        return catOk || tagOk;
      });
    }
    if (state.query) {
      var q = state.query.toLowerCase();
      list = list.filter(function (item) {
        var hay = (item.name + " " + item.description + " " + item.category + " " + item.owner + " " + itemTags(item).join(" "))
          .toLowerCase();
        return hay.indexOf(q) !== -1;
      });
    }
    if (state.priceBuckets.length) {
      list = list.filter(itemMatchesPriceBuckets);
    }
    if (state.ratingBuckets.length) {
      list = list.filter(itemMatchesRatingBuckets);
    }
    if (state.releaseBuckets.length) {
      list = list.filter(itemMatchesReleaseBuckets);
    }
    if (mode !== "top") {
      list = sortItems(list);
    }
    return list;
  }

  function sortItems(list) {
    var sorted = list.slice();
    var key = state.sort || "relevance";
    function popularity(item) {
      if (window.RogueCards && typeof RogueCards.engagementCount === "function") {
        return RogueCards.engagementCount(item, kind);
      }
      return (item.votes != null ? item.votes : item.stars) || 0;
    }
    function compareTime(a, b, asc) {
      var ta = itemAddedTime(a);
      var tb = itemAddedTime(b);
      var aMissing = !ta;
      var bMissing = !tb;
      if (aMissing && bMissing) return itemNameKey(a).localeCompare(itemNameKey(b));
      if (aMissing) return 1;
      if (bMissing) return -1;
      if (ta !== tb) return asc ? ta - tb : tb - ta;
      return itemNameKey(a).localeCompare(itemNameKey(b));
    }
    function compareUpdated(a, b, asc) {
      var ta = itemUpdatedTime(a);
      var tb = itemUpdatedTime(b);
      var aMissing = !ta;
      var bMissing = !tb;
      if (aMissing && bMissing) return itemNameKey(a).localeCompare(itemNameKey(b));
      if (aMissing) return 1;
      if (bMissing) return -1;
      if (ta !== tb) return asc ? ta - tb : tb - ta;
      return itemNameKey(a).localeCompare(itemNameKey(b));
    }
    if (key === "popularity") {
      sorted.sort(function (a, b) {
        var pb = popularity(b);
        var pa = popularity(a);
        if (pb !== pa) return pb - pa;
        return itemNameKey(a).localeCompare(itemNameKey(b));
      });
    } else if (key === "rating-asc" || key === "rating") {
      sorted.sort(function (a, b) {
        var ra = itemRatingStars(a);
        var rb = itemRatingStars(b);
        if (ra !== rb) return ra - rb;
        return popularity(a) - popularity(b);
      });
    } else if (key === "rating-desc") {
      sorted.sort(function (a, b) {
        var rb = itemRatingStars(b);
        var ra = itemRatingStars(a);
        if (rb !== ra) return rb - ra;
        return popularity(b) - popularity(a);
      });
    } else if (key === "published-asc") {
      sorted.sort(function (a, b) {
        return compareTime(a, b, true);
      });
    } else if (key === "published-desc" || key === "published") {
      sorted.sort(function (a, b) {
        return compareTime(a, b, false);
      });
    } else if (key === "updated-asc") {
      sorted.sort(function (a, b) {
        return compareUpdated(a, b, true);
      });
    } else if (key === "updated-desc" || key === "updated") {
      sorted.sort(function (a, b) {
        return compareUpdated(a, b, false);
      });
    } else if (key === "price-asc") {
      sorted.sort(function (a, b) {
        var d = itemPrice(a) - itemPrice(b);
        if (d !== 0) return d;
        return itemNameKey(a).localeCompare(itemNameKey(b));
      });
    } else if (key === "price-desc") {
      sorted.sort(function (a, b) {
        var d = itemPrice(b) - itemPrice(a);
        if (d !== 0) return d;
        return itemNameKey(a).localeCompare(itemNameKey(b));
      });
    }
    return sorted;
  }

  function listBeforeFacets(skipKey) {
    var savedPrice = state.priceBuckets;
    var savedRating = state.ratingBuckets;
    var savedRelease = state.releaseBuckets;
    if (skipKey === "price" || skipKey === "all") state.priceBuckets = [];
    if (skipKey === "rating" || skipKey === "all") state.ratingBuckets = [];
    if (skipKey === "release" || skipKey === "all") state.releaseBuckets = [];
    try {
      return filteredItems();
    } finally {
      state.priceBuckets = savedPrice;
      state.ratingBuckets = savedRating;
      state.releaseBuckets = savedRelease;
    }
  }

  function syncUrl() {
    var next = new URLSearchParams();
    if (state.query) next.set("q", state.query);
    state.categories.forEach(function (c) {
      next.append("category", c);
    });
    state.tags.forEach(function (t) {
      next.append("tag", t);
    });
    if (mode === "top" && state.range !== "all-time") next.set("range", state.range);
    state.priceBuckets.forEach(function (id) {
      next.append("price", id);
    });
    state.ratingBuckets.forEach(function (id) {
      next.append("rating", id);
    });
    state.releaseBuckets.forEach(function (id) {
      next.append("released", id);
    });
    if (state.sort && state.sort !== "relevance") next.set("sort", state.sort);
    if (state.pageSize && state.pageSize !== 8) next.set("perPage", String(state.pageSize));
    if (state.page > 1) next.set("page", String(state.page));
    var qs = next.toString();
    var url = location.pathname + (qs ? "?" + qs : "") + location.hash;
    history.replaceState(null, "", url);
  }

  function resultsMetaText(total, page, pages) {
    if (!total) return "0 results";
    var start = (page - 1) * state.pageSize + 1;
    var end = Math.min(total, page * state.pageSize);
    return "Results " + start + " – " + end + " of " + total;
  }

  function resultsMetaHtml(total, page, pages) {
    if (!total) return "0 results";
    var start = (page - 1) * state.pageSize + 1;
    var end = Math.min(total, page * state.pageSize);
    return (
      "Results <strong>" +
      start +
      " – " +
      end +
      "</strong> of <strong>" +
      total +
      "</strong>"
    );
  }

  function updateFacetResultsMeta(total, page, pages) {
    var text = resultsMetaText(total, page, pages);
    var html = resultsMetaHtml(total, page, pages);
    document.querySelectorAll("[data-facet-results-meta]").forEach(function (meta) {
      if (meta.getAttribute("data-facet-results-html") === "1") meta.innerHTML = html;
      else meta.textContent = text;
    });
    var viewBtn = document.querySelector("[data-mobile-filter-view]");
    if (viewBtn) {
      viewBtn.textContent = total
        ? "VIEW RESULTS (" + total + ")"
        : "VIEW RESULTS (0)";
    }
    refreshMobileActiveChips();
    refreshMobileFilterCounts();
  }

  function renderPager(total, page, pages) {
    updateFacetResultsMeta(total, page, pages);
    var host = root.querySelector("[data-catalog-pager]");
    if (!host) return;
    if (pages <= 1) {
      host.innerHTML = "";
      return;
    }

    var buttons = "";
    buttons += '<button type="button" class="pager-btn" data-page="' + (page - 1) + '"' +
      (page <= 1 ? " disabled" : "") + ">Prev</button>";

    var windowSize = 5;
    var start = Math.max(1, page - Math.floor(windowSize / 2));
    var end = Math.min(pages, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);

    for (var i = start; i <= end; i++) {
      buttons += '<button type="button" class="pager-btn' + (i === page ? " is-active" : "") +
        '" data-page="' + i + '">' + i + "</button>";
    }

    buttons += '<button type="button" class="pager-btn" data-page="' + (page + 1) + '"' +
      (page >= pages ? " disabled" : "") + ">Next</button>";

    host.innerHTML = '<div class="pager-controls">' + buttons + "</div>";

    host.querySelectorAll("[data-page]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var nextPage = parseInt(btn.getAttribute("data-page"), 10);
        if (!nextPage || nextPage < 1 || nextPage > pages || nextPage === state.page) return;
        state.page = nextPage;
        syncUrl();
        render();
        root.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function renderList() {
    var list = filteredItems();
    var pages = Math.max(1, Math.ceil(list.length / state.pageSize) || 1);
    if (state.page > pages) state.page = pages;
    var start = (state.page - 1) * state.pageSize;
    var pageItems = list.slice(start, start + state.pageSize);
    var ul = root.querySelector("[data-catalog-list]");
    if (!ul) return;
    if (!pageItems.length) {
      ul.innerHTML = '<li class="empty-state">' + emptyMessage() + "</li>";
      var emptyPager = root.querySelector("[data-catalog-pager]");
      if (emptyPager) emptyPager.innerHTML = "";
      updateFacetResultsMeta(list.length, state.page, pages);
    } else {
      ul.innerHTML = pageItems.map(function (item, index) {
        return cardHtml(item, start + index + 1);
      }).join("");
      renderPager(list.length, state.page, pages);
    }
  }

  function countForCategory(name) {
    return items.filter(function (item) {
      return itemMatchesCategory(item, name);
    }).length;
  }

  function countForTag(name) {
    return items.filter(function (item) {
      return itemTags(item).some(function (tag) {
        return tag.toLowerCase() === name.toLowerCase();
      });
    }).length;
  }

  function iconSvg(paths) {
    if (window.RogueCards && typeof RogueCards.iconSvg === "function") {
      return RogueCards.iconSvg(paths);
    }
    return (
      '<svg class="category-icon-svg" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      paths +
      "</svg>"
    );
  }

  function catalogCategories() {
    if (kind === "assets") return RogueCatalog.assetCategories || [];
    return RogueCatalog.categories || [];
  }

  function catalogTags() {
    if (kind === "assets") {
      if (state.categories.length === 1 && RogueCatalog.assetTagsByCategory) {
        var scoped = RogueCatalog.assetTagsByCategory[state.categories[0]];
        if (Array.isArray(scoped) && scoped.length) return scoped.slice();
      }
      return (RogueCatalog.assetTags || []).slice();
    }
    return (RogueCatalog.tags || []).slice();
  }

  function categoryIcon(name) {
    if (window.RogueCards && typeof RogueCards.categoryIcon === "function") {
      return RogueCards.categoryIcon(name);
    }
    return iconSvg('<rect x="5" y="5" width="14" height="14" rx="2"></rect><path d="M9 12h6M12 9v6"></path>');
  }

  function tagIcon() {
    return iconSvg('<path d="M4 10V5h5l9 9-5 5z"></path><circle cx="8" cy="8" r="1.2"></circle>');
  }

  function renderCategories() {
    var host = root.querySelector("[data-catalog-categories]");
    if (!host) return;
    var cats = catalogCategories();
    host.innerHTML =
      '<ul class="category-grid">' +
      cats.map(function (name) {
        var count = countForCategory(name);
        return (
          '<li><a class="category-card" href="' + searchHref(name) + '">' +
            '<span class="category-icon" aria-hidden="true">' + categoryIcon(name) + "</span>" +
            '<span class="category-name">' + name + "</span>" +
            '<span class="category-count">' + count + " " + label + "</span>" +
          "</a></li>"
        );
      }).join("") +
      "</ul>";
  }

  function renderTags() {
    var host = root.querySelector("[data-catalog-tags-grid]");
    if (!host) return;
    var tags = catalogTags();
    host.innerHTML =
      '<ul class="category-grid tag-grid">' +
      tags.map(function (name) {
        var count = countForTag(name);
        return (
          '<li><a class="category-card tag-card" href="' + searchTagHref(name) + '">' +
            '<span class="category-icon" aria-hidden="true">' + tagIcon() + "</span>" +
            '<span class="category-name">' + name + "</span>" +
            '<span class="category-count">' + count + " " + label + "</span>" +
          "</a></li>"
        );
      }).join("") +
      "</ul>";
  }

  function render() {
    if (mode === "categories") {
      renderCategories();
      return;
    }
    if (mode === "tags") {
      renderTags();
      return;
    }
    renderList();
    refreshBrowseFacetsUI();
    if (typeof window.refreshGithubStars === "function") {
      window.refreshGithubStars(root);
    }
    if (typeof window.refreshGithubAuthors === "function") {
      window.refreshGithubAuthors(root);
    }
  }

  function syncChipActive(chipHost) {
    chipHost.querySelectorAll("[data-category]").forEach(function (el) {
      var value = el.getAttribute("data-category") || "";
      var active = value === ""
        ? !hasCategoryFilter()
        : isCategorySelected(value);
      el.classList.toggle("is-active", active);
    });
  }

  function syncTagActive(tagHost) {
    tagHost.querySelectorAll("[data-tag]").forEach(function (el) {
      var value = el.getAttribute("data-tag") || "";
      var active = value === ""
        ? !hasTagFilter()
        : isTagSelected(value);
      el.classList.toggle("is-active", active);
    });
  }

  function setSingleCategory(name) {
    state.categories = name ? [name] : [];
    if (state.tags.length) {
      var allowed = catalogTags().map(function (t) {
        return t.toLowerCase();
      });
      state.tags = state.tags.filter(function (t) {
        var label = parseScopedTag(t).label || t;
        return allowed.indexOf(label.toLowerCase()) !== -1;
      });
    }
  }

  function setSingleTag(name) {
    state.tags = name ? [name] : [];
  }

  function wireFilters() {
    var input =
      document.querySelector("[data-site-search]") ||
      document.querySelector("[data-catalog-search]");
    if (input && !input.getAttribute("data-wired")) {
      input.setAttribute("data-wired", "1");
      input.value = state.query;
      input.addEventListener("input", function () {
        state.query = input.value.trim();
        state.page = 1;
        syncUrl();
        render();
      });
    } else if (input) {
      input.value = state.query;
    }

    refreshFilterChips();
  }

  function escAttr(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function slugifyLabel(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function titleCaseTag(raw) {
    var special = {
      mcp: "MCP",
      ml: "ML",
      ai: "AI",
      api: "API",
      ui: "UI",
      ux: "UX",
      db: "DB",
      devops: "DevOps",
      github: "GitHub",
      gitlab: "GitLab",
      openai: "OpenAI",
      "chrome-devtools": "Chrome DevTools"
    };
    var key = String(raw || "").toLowerCase();
    if (special[key]) return special[key];
    return key
      .split("-")
      .filter(Boolean)
      .map(function (part) {
        if (special[part]) return special[part];
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(" ");
  }

  function nestTagNodes(tagMap, parentId) {
    var keys = Object.keys(tagMap).sort(function (a, b) {
      return a.length - b.length || a.localeCompare(b);
    });
    var nodes = {};
    keys.forEach(function (key) {
      var raw = tagMap[key];
      nodes[key] = {
        id: "",
        slug: key,
        label: raw,
        displayLabel: titleCaseTag(raw),
        children: []
      };
    });
    var roots = [];
    keys.forEach(function (key) {
      var parentKey = "";
      keys.forEach(function (cand) {
        if (cand === key) return;
        if (key.indexOf(cand + "-") === 0) {
          if (!parentKey || cand.length > parentKey.length) parentKey = cand;
        }
      });
      if (parentKey && nodes[parentKey]) {
        nodes[parentKey].children.push(nodes[key]);
      } else {
        roots.push(nodes[key]);
      }
    });

    function assignIds(node, baseId) {
      node.id = baseId + "/" + node.slug;
      node.children
        .sort(function (a, b) {
          return String(a.displayLabel || a.label).localeCompare(
            String(b.displayLabel || b.label)
          );
        })
        .forEach(function (child) {
          assignIds(child, node.id);
        });
    }

    roots
      .sort(function (a, b) {
        return String(a.displayLabel || a.label).localeCompare(
          String(b.displayLabel || b.label)
        );
      })
      .forEach(function (node) {
        assignIds(node, parentId);
      });
    return roots;
  }

  function categorySeedTags(cat) {
    var seeds = {
      "Developer Tools": ["developer-tools", "mcp", "mcp-server"],
      "Data Science & ML": ["data-science-ml", "machine-learning", "ml"],
      "API Development": ["api-development", "api"],
      "Productivity & Workflow": ["productivity-workflow", "automation"],
      "Analytics & Monitoring": ["analytics-monitoring", "monitoring"],
      "Security & Testing": ["security-testing", "security", "testing"],
      "Web Scraping & Data Collection": ["web-scraping", "scraping"],
      "Deployment & DevOps": ["deployment-devops", "devops", "ci-cd"],
      "Learning & Documentation": ["learning-documentation", "docs"],
      "Database Management": ["database-management", "database"],
      "Content Management": ["content-management", "cms"],
      "Collaboration Tools": ["collaboration-tools", "atlassian", "jira", "linear", "confluence"],
      "Cloud Infrastructure": ["cloud-infrastructure", "cloud"],
      "Marketing Automation": ["marketing-automation", "marketing"],
      "E-commerce Solutions": ["e-commerce", "ecommerce"],
      "Design Tools": ["design-tools", "blender", "illustrator", "photoshop", "3d", "sculpting"],
      "Browser Automation": ["browser-automation", "playwright", "chrome-devtools", "cdp"],
      "Social Media Management": ["social-media-management", "youtube", "publishing"],
      "Game Development": ["game-development", "gamedev"],
      "Mobile Development": ["mobile-development", "mobile"],
      Other: ["other"],
      Official: ["official"]
    };
    return (seeds[cat] || []).slice();
  }

  function buildKindTaxonomyTree() {
    var catOrder = catalogCategories();
    var byCat = {};
    catOrder.forEach(function (name) {
      byCat[name] = {};
      categorySeedTags(name).forEach(function (tag) {
        var raw = String(tag || "").trim();
        if (!raw) return;
        byCat[name][raw.toLowerCase()] = raw;
      });
    });

    items.forEach(function (item) {
      var cat = item.category || "Other";
      if (!byCat[cat]) byCat[cat] = {};
      itemTags(item).forEach(function (tag) {
        var raw = String(tag || "").trim();
        if (!raw) return;
        var key = raw.toLowerCase();
        if (!byCat[cat][key]) byCat[cat][key] = raw;
      });
    });

    return catOrder.map(function (cat) {
      var catId = slugifyLabel(cat);
      return {
        id: catId,
        slug: catId,
        label: cat,
        children: nestTagNodes(byCat[cat] || {}, catId)
      };
    });
  }

  function taxonomyTree() {
    if (kind === "assets") return (RogueCatalog.assetTaxonomyTree || []).slice();
    if (!kindTreeCache) kindTreeCache = buildKindTaxonomyTree();
    return kindTreeCache.slice();
  }

  function countForNode(node, categoryLabel, platformLabel) {
    if (!node) return 0;
    var platform = String(platformLabel || "").trim();
    if (!node.children || !node.children.length) {
      if (categoryLabel) {
        return items.filter(function (item) {
          if (!itemMatchesCategory(item, categoryLabel)) return false;
          if (platform) {
            if (!itemHasTag(item, platform)) return false;
            if (node.label.toLowerCase() === platform.toLowerCase()) return true;
            return itemHasTag(item, node.label);
          }
          return itemHasTag(item, node.label);
        }).length;
      }
      return countForTag(node.label);
    }
    if (!categoryLabel) return countForCategory(node.label);
    if (platform && node.label.toLowerCase() === platform.toLowerCase()) {
      return items.filter(function (item) {
        return itemMatchesCategory(item, categoryLabel) && itemHasTag(item, platform);
      }).length;
    }
    var labels = collectNodeLabels(node);
    return items.filter(function (item) {
      if (!itemMatchesCategory(item, categoryLabel)) return false;
      if (platform && !itemHasTag(item, platform)) return false;
      return itemTags(item).some(function (tag) {
        return labels.some(function (label) {
          return String(tag).toLowerCase() === String(label).toLowerCase();
        });
      });
    }).length;
  }

  function isNodeChecked(node, categoryLabel, depth, platformLabel) {
    return nodeCheckState(node, categoryLabel, depth, platformLabel) === "checked";
  }

  function hasRefiningTagsForCategory(categoryLabel) {
    var cat = String(categoryLabel || "").toLowerCase();
    if (!cat) return false;
    return state.tags.some(function (t) {
      var parsed = parseScopedTag(t);
      var parsedCat = String(parsed.category || "").toLowerCase();
      var label = String(parsed.label || t).toLowerCase();
      if (parsedCat && parsedCat === cat) {
        return label !== cat;
      }
      if (!parsedCat && String(t).indexOf("::") === -1) {
        return label !== cat;
      }
      return false;
    });
  }

  function nodeCheckState(node, categoryLabel, depth, platformLabel) {
    if (!node) return "unchecked";
    var platform = String(platformLabel || "").trim();
    if (depth === 0) {
      if (isCategorySelected(node.label)) {
        if (!hasRefiningTagsForCategory(node.label)) return "checked";
        var rootLabelsWhenRefined = collectDescendantLabels(node);
        if (!rootLabelsWhenRefined.length) return "indeterminate";
        var selectedRoot = 0;
        rootLabelsWhenRefined.forEach(function (label) {
          if (isTagSelected(label, node.label)) selectedRoot += 1;
        });
        if (selectedRoot === 0) return "indeterminate";
        if (selectedRoot === rootLabelsWhenRefined.length) return "checked";
        return "indeterminate";
      }
      var rootLabels = collectDescendantLabels(node);
      if (!rootLabels.length) return "unchecked";
      var selected = 0;
      rootLabels.forEach(function (label) {
        if (isTagSelected(label, node.label)) selected += 1;
      });
      if (selected === 0) return "unchecked";
      if (selected === rootLabels.length) return "checked";
      return "indeterminate";
    }
    if (
      categoryLabel &&
      isCategorySelected(categoryLabel) &&
      !hasRefiningTagsForCategory(categoryLabel)
    ) {
      return "checked";
    }
    if (
      kind === "assets" &&
      isPlatformsCategory(categoryLabel) &&
      platform &&
      node.label.toLowerCase() === platform.toLowerCase()
    ) {
      if (isCategorySelected(categoryLabel) && !hasRefiningTagsForCategory(categoryLabel)) {
        return "checked";
      }
      if (isTagSelected(platform, categoryLabel) && !hasPlatformContentTags(categoryLabel, platform)) {
        return "checked";
      }
      var platLabels = collectDescendantLabels(node);
      if (!platLabels.length) {
        return isTagSelected(platform, categoryLabel) ? "checked" : "unchecked";
      }
      var platHits = 0;
      platLabels.forEach(function (label) {
        if (isTagSelected(label, categoryLabel, platform)) platHits += 1;
      });
      if (platHits === 0) return "unchecked";
      if (platHits === platLabels.length) return "checked";
      return "indeterminate";
    }
    if (kind === "assets" && isPlatformsCategory(categoryLabel) && platform) {
      if (isCategorySelected(categoryLabel) && !hasRefiningTagsForCategory(categoryLabel)) {
        return "checked";
      }
      if (isTagSelected(platform, categoryLabel) && !hasPlatformContentTags(categoryLabel, platform)) {
        return "checked";
      }
      var kids = node.children || [];
      if (kids.length) {
        var labels = collectNodeLabels(node);
        var hit = 0;
        labels.forEach(function (label) {
          if (label.toLowerCase() === platform.toLowerCase()) return;
          if (isTagSelected(label, categoryLabel, platform)) hit += 1;
        });
        var contentCount = labels.filter(function (label) {
          return label.toLowerCase() !== platform.toLowerCase();
        }).length;
        if (contentCount === 0) return "unchecked";
        if (hit === 0) return "unchecked";
        if (hit === contentCount) return "checked";
        return "indeterminate";
      }
      return isTagSelected(node.label, categoryLabel, platform) ? "checked" : "unchecked";
    }
    var childNodes = node.children || [];
    if (childNodes.length) {
      var nodeLabels = collectNodeLabels(node);
      var hits = 0;
      nodeLabels.forEach(function (label) {
        if (isTagSelected(label, categoryLabel)) hits += 1;
      });
      if (hits === 0) return "unchecked";
      if (hits === nodeLabels.length) return "checked";
      return "indeterminate";
    }
    return isTagSelected(node.label, categoryLabel) ? "checked" : "unchecked";
  }

  function findTreeChildren(host, id) {
    if (!host || !id) return null;
    var nodes = host.querySelectorAll("[data-tree-children]");
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].getAttribute("data-tree-children") === id) return nodes[i];
    }
    return null;
  }

  function applyExpandState(host, id, expanded) {
    var children = findTreeChildren(host, id);
    if (children) {
      children.hidden = !expanded;
      children.classList.toggle("is-collapsed", !expanded);
    }
    host.querySelectorAll("[data-tree-toggle]").forEach(function (btn) {
      if (btn.getAttribute("data-tree-toggle") !== id) return;
      btn.setAttribute("aria-expanded", expanded ? "true" : "false");
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2">' +
        (expanded
          ? '<path d="M6 9l6 6 6-6"></path>'
          : '<path d="M9 6l6 6-6 6"></path>') +
        "</svg>";
      var row = btn.closest(".filter-tree-row");
      if (row) row.classList.toggle("is-expanded", expanded);
    });
  }

  function renderTreeNode(node, depth, categoryLabel, platformLabel) {
    var children = node.children || [];
    var hasChildren = children.length > 0;
    var expanded = !!expandedNodes[node.id];
    var catLabel = depth === 0 ? node.label : categoryLabel;
    var platform =
      platformLabel ||
      (depth === 1 && isPlatformsCategory(catLabel) && isPlatformLabel(node.label)
        ? node.label
        : "");
    var count = countForNode(node, depth === 0 ? "" : catLabel, platform);
    var checkState = nodeCheckState(node, catLabel, depth, platform);
    var checked = checkState === "checked";
    var indeterminate = checkState === "indeterminate";
    var labelText = node.displayLabel || node.label;
    var iconHtml =
      depth === 0
        ? '<span class="filter-tree-icon" aria-hidden="true">' + categoryIcon(node.label) + "</span>"
        : '<span class="filter-tree-icon filter-tree-icon-tag" aria-hidden="true">' + tagIcon() + "</span>";
    var toggle = hasChildren
      ? '<button type="button" class="filter-tree-toggle" data-tree-toggle="' +
        escAttr(node.id) +
        '" aria-expanded="' +
        (expanded ? "true" : "false") +
        '" aria-label="' +
        (expanded ? "Collapse" : "Expand") +
        " " +
        escAttr(labelText) +
        '">' +
        '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2">' +
        (expanded
          ? '<path d="M6 9l6 6 6-6"></path>'
          : '<path d="M9 6l6 6-6 6"></path>') +
        "</svg>" +
        "</button>"
      : '<span class="filter-tree-toggle is-empty" aria-hidden="true"></span>';

    var row =
      '<div class="filter-tree-row' +
      (checked ? " is-checked" : "") +
      (indeterminate ? " is-indeterminate" : "") +
      (expanded ? " is-expanded" : "") +
      (count === 0 ? " is-empty" : "") +
      '" style="--tree-depth:' +
      depth +
      '">' +
      '<label class="filter-tree-label" data-tooltip="' +
      escAttr(labelText) +
      '">' +
      '<input type="checkbox" class="filter-tree-check" data-node-id="' +
      escAttr(node.id) +
      '" data-depth="' +
      depth +
      '" data-category="' +
      escAttr(catLabel) +
      '" data-platform="' +
      escAttr(platform) +
      '" data-tag="' +
      escAttr(depth === 0 ? "" : node.label) +
      '"' +
      (checked ? " checked" : "") +
      (indeterminate ? ' data-indeterminate="1"' : "") +
      " />" +
      iconHtml +
      '<span class="filter-link-label">' +
      escAttr(labelText) +
      "</span>" +
      '<span class="filter-count">' +
      count +
      "</span>" +
      "</label>" +
      toggle +
      "</div>";

    var kids = "";
    if (hasChildren) {
      kids =
        '<div class="filter-tree-children' +
        (expanded ? "" : " is-collapsed") +
        '"' +
        (expanded ? "" : " hidden") +
        ' data-tree-children="' +
        escAttr(node.id) +
        '">' +
        children
          .map(function (child) {
            return renderTreeNode(child, depth + 1, catLabel, platform);
          })
          .join("") +
        "</div>";
    }

    return '<div class="filter-tree-node" data-depth="' + depth + '">' + row + kids + "</div>";
  }

  function applyTreeIndeterminate(chipHost) {
    if (!chipHost) return;
    chipHost.querySelectorAll(".filter-tree-check[data-indeterminate='1']").forEach(function (input) {
      input.indeterminate = true;
      input.checked = false;
    });
  }

  function wireFilterTooltips(chipHost) {
    if (!chipHost || chipHost.getAttribute("data-tip-wired")) return;
    chipHost.setAttribute("data-tip-wired", "1");
    var tip =
      (window.RogueCards &&
        typeof RogueCards.ensureFloatingTip === "function" &&
        RogueCards.ensureFloatingTip()) ||
      document.getElementById("site-floating-tip");
    if (!tip) {
      tip = document.createElement("div");
      tip.id = "site-floating-tip";
      tip.className = "site-floating-tip";
      tip.hidden = true;
      tip.setAttribute("role", "tooltip");
      document.body.appendChild(tip);
    }
    function hideTip() {
      tip.classList.remove("is-visible");
      tip.hidden = true;
    }
    function placeTip(anchor) {
      var text = anchor.getAttribute("data-tooltip") || "";
      if (!text) {
        hideTip();
        return;
      }
      tip.textContent = text;
      tip.hidden = false;
      tip.classList.remove("is-visible");
      var rect = anchor.getBoundingClientRect();
      var tipWidth = tip.offsetWidth || 160;
      var tipHeight = tip.offsetHeight || 36;
      var left = Math.min(Math.max(8, rect.left), window.innerWidth - tipWidth - 8);
      var top = rect.bottom + 6;
      var placeAbove = top + tipHeight > window.innerHeight - 8;
      if (placeAbove) top = Math.max(8, rect.top - tipHeight - 6);
      tip.style.left = left + "px";
      tip.style.top = top + "px";
      tip.classList.toggle("is-above", placeAbove);
      requestAnimationFrame(function () {
        tip.classList.add("is-visible");
      });
    }
    chipHost.addEventListener("pointerover", function (event) {
      var el = event.target.closest ? event.target.closest("[data-tooltip]") : null;
      if (!el || !chipHost.contains(el)) return;
      placeTip(el);
    });
    chipHost.addEventListener("pointerout", function (event) {
      var el = event.target.closest ? event.target.closest("[data-tooltip]") : null;
      if (!el || !chipHost.contains(el)) return;
      var next = event.relatedTarget;
      if (next && el.contains(next)) return;
      hideTip();
    });
    chipHost.addEventListener("scroll", hideTip, true);
    window.addEventListener("scroll", hideTip, true);
  }

  function findNodeById(nodes, id) {
    var list = nodes || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
      var found = findNodeById(list[i].children || [], id);
      if (found) return found;
    }
    return null;
  }

  function collectNodeLabels(node) {
    var labels = [node.label];
    (node.children || []).forEach(function (child) {
      labels = labels.concat(collectNodeLabels(child));
    });
    return labels;
  }

  function collectDescendantLabels(node) {
    var labels = [];
    (node.children || []).forEach(function (child) {
      labels = labels.concat(collectNodeLabels(child));
    });
    return labels;
  }

  function applyLabelsToTags(labels, on, categoryLabel, platformLabel) {
    (labels || []).forEach(function (label) {
      if (!label) return;
      state.tags = toggleListValue(
        state.tags,
        scopeTagKey(categoryLabel, label, platformLabel),
        on
      );
    });
  }

  function clearPlatformContentTags(categoryLabel, platformLabel) {
    var prefix =
      String(categoryLabel || "").toLowerCase() +
      "::" +
      String(platformLabel || "").toLowerCase() +
      "›";
    state.tags = state.tags.filter(function (t) {
      return t.toLowerCase().indexOf(prefix) !== 0;
    });
  }

  function findRootByCategory(categoryLabel) {
    var key = String(categoryLabel || "").toLowerCase();
    var found = null;
    taxonomyTree().some(function (n) {
      if (n.label.toLowerCase() === key) {
        found = n;
        return true;
      }
      return false;
    });
    return found;
  }

  function hasPlatformContentTags(categoryLabel, platformLabel) {
    var prefix =
      String(categoryLabel || "").toLowerCase() +
      "::" +
      String(platformLabel || "").toLowerCase() +
      "›";
    return state.tags.some(function (t) {
      return t.toLowerCase().indexOf(prefix) === 0;
    });
  }

  function explodePlatformToContentTags(categoryLabel, platformLabel, exceptLabel) {
    var root = findRootByCategory(categoryLabel);
    if (!root) return;
    var platNode = null;
    (root.children || []).some(function (child) {
      if (
        isPlatformLabel(child.label) &&
        child.label.toLowerCase() === String(platformLabel || "").toLowerCase()
      ) {
        platNode = child;
        return true;
      }
      return false;
    });
    if (!platNode) return;
    state.tags = toggleListValue(
      state.tags,
      scopeTagKey(categoryLabel, platformLabel),
      false
    );
    clearPlatformContentTags(categoryLabel, platformLabel);
    var except = String(exceptLabel || "").toLowerCase();
    collectDescendantLabels(platNode).forEach(function (label) {
      if (except && label.toLowerCase() === except) return;
      state.tags = toggleListValue(
        state.tags,
        scopeTagKey(categoryLabel, label, platformLabel),
        true
      );
    });
  }

  function clearCategoryScopedTags(categoryLabel, platformLabel) {
    var cat = String(categoryLabel || "").toLowerCase();
    var platform = String(platformLabel || "").trim().toLowerCase();
    state.tags = state.tags.filter(function (t) {
      var parsed = parseScopedTag(t);
      var parsedCat = String(parsed.category || "").toLowerCase();
      if (parsedCat && parsedCat === cat) {
        if (platform) {
          var parsedPlat = String(parsed.platform || "").toLowerCase();
          if (parsedPlat === platform) return false;
          if (!parsedPlat && String(parsed.label || "").toLowerCase() === platform) {
            return false;
          }
          return true;
        }
        return false;
      }
      return true;
    });
  }

  function explodeCategoryToTags(categoryLabel, exceptLabel, exceptPlatform) {
    var rootNode = findRootByCategory(categoryLabel);
    if (!rootNode) return;
    state.categories = toggleListValue(state.categories, categoryLabel, false);
    clearCategoryScopedTags(categoryLabel);
    var except = String(exceptLabel || "").toLowerCase();
    var exceptPlat = String(exceptPlatform || "").toLowerCase();

    if (isPlatformsCategory(categoryLabel)) {
      (rootNode.children || []).forEach(function (platNode) {
        if (!isPlatformLabel(platNode.label)) return;
        var platName = platNode.label;
        var platKey = platName.toLowerCase();
        if (except && !exceptPlat && platKey === except) return;

        var contentLabels = collectDescendantLabels(platNode).filter(function (label) {
          var labelKey = String(label || "").toLowerCase();
          if (except && labelKey === except && (!exceptPlat || exceptPlat === platKey)) {
            return false;
          }
          return true;
        });

        if (!except) {
          state.tags = toggleListValue(
            state.tags,
            scopeTagKey(categoryLabel, platName),
            true
          );
          return;
        }

        contentLabels.forEach(function (label) {
          state.tags = toggleListValue(
            state.tags,
            scopeTagKey(categoryLabel, label, platName),
            true
          );
        });
      });
      return;
    }

    applyLabelsToTags(
      collectDescendantLabels(rootNode).filter(function (label) {
        return !except || label.toLowerCase() !== except;
      }),
      true,
      categoryLabel
    );
  }

  function selectNodeTags(catLabel, node, platform, on) {
    if (!node) return;
    var plat = String(platform || "").trim();
    if (plat && isPlatformLabel(node.label) && node.label.toLowerCase() === plat.toLowerCase()) {
      clearPlatformContentTags(catLabel, plat);
      state.tags = toggleListValue(state.tags, scopeTagKey(catLabel, plat), on);
      return;
    }
    if (plat) {
      collectNodeLabels(node).forEach(function (label) {
        if (label.toLowerCase() === plat.toLowerCase()) return;
        state.tags = toggleListValue(
          state.tags,
          scopeTagKey(catLabel, label, plat),
          on
        );
      });
      return;
    }
    applyLabelsToTags(collectNodeLabels(node), on, catLabel);
  }

  function setLeafTag(catLabel, leafLabel, platform, on) {
    if (!leafLabel) return;
    var explicit = platform
      ? scopeTagKey(catLabel, leafLabel, platform)
      : scopeTagKey(catLabel, leafLabel);
    var contentMap =
      (window.RogueCatalog && RogueCatalog.platformContentCategory) || {};

    // Platforms › {platform} › tag: only that platform + its content category.
    if (platform && isPlatformLabel(platform)) {
      var platformPaths = findTaxonomyLabelPaths(leafLabel, {
        platform: platform
      });
      if (platformPaths.length) {
        platformPaths.forEach(function (path) {
          state.tags = toggleListValue(state.tags, path, on);
        });
      } else {
        state.tags = toggleListValue(state.tags, explicit, on);
        var mapped = String(contentMap[platform] || "").trim();
        if (mapped) {
          state.tags = toggleListValue(
            state.tags,
            scopeTagKey(mapped, leafLabel),
            on
          );
        }
      }
      return;
    }

    // Content-category leaf: sync only paths for this category / platforms
    // that map to it — not every platform that shares the tag label.
    var clickedCat = String(catLabel || "").trim();
    var clickedKey = clickedCat.toLowerCase();
    var allPaths = findTaxonomyLabelPaths(leafLabel);
    var matching = allPaths.filter(function (path) {
      var parsed = parseScopedTag(path);
      if (String(parsed.category || "").toLowerCase() === clickedKey) {
        return true;
      }
      if (parsed.platform) {
        var mappedCat = String(
          contentMap[parsed.platform] || ""
        ).toLowerCase();
        return mappedCat === clickedKey;
      }
      return false;
    });

    if (matching.length) {
      matching.forEach(function (path) {
        state.tags = toggleListValue(state.tags, path, on);
      });
      if (explicit) state.tags = toggleListValue(state.tags, explicit, on);
      return;
    }

    state.tags = toggleListValue(state.tags, explicit, on);
  }

  function applyTreeCheckAction(node, catLabel, depth, platform, tag) {
    var hasKids = !!(node && node.children && node.children.length);
    var isPlatformBranch =
      isPlatformsCategory(catLabel) && platform && isPlatformLabel(platform);
    var isPlatformRoot =
      isPlatformBranch &&
      depth === 1 &&
      isPlatformLabel(tag || (node && node.label) || "");
    var prior = nodeCheckState(node, catLabel, depth, platform);

    if (depth === 0) {
      var rootName = catLabel || (node && node.label) || "";
      if (prior === "checked") {
        state.categories = toggleListValue(state.categories, rootName, false);
        clearCategoryScopedTags(rootName);
      } else {
        state.categories = toggleListValue(state.categories, rootName, true);
        clearCategoryScopedTags(rootName);
      }
      return;
    }

    if (hasKids || isPlatformRoot) {
      var turnOn = prior !== "checked";
      var scopePlat = isPlatformBranch ? platform : "";
      if (isPlatformRoot) scopePlat = platform || tag || (node && node.label) || "";

      if (isCategorySelected(catLabel)) {
        if (turnOn) {
          state.categories = toggleListValue(state.categories, catLabel, true);
          clearCategoryScopedTags(catLabel);
        } else {
          explodeCategoryToTags(catLabel, "", "");
          selectNodeTags(catLabel, node, scopePlat, false);
        }
        return;
      }

      selectNodeTags(catLabel, node, scopePlat, turnOn);
      return;
    }

    var leafLabel = tag || (node && node.label) || "";
    if (prior === "checked") {
      if (isCategorySelected(catLabel)) {
        explodeCategoryToTags(catLabel, leafLabel, isPlatformBranch ? platform : "");
        return;
      }
      if (
        isPlatformBranch &&
        isTagSelected(platform, catLabel) &&
        !hasPlatformContentTags(catLabel, platform)
      ) {
        explodePlatformToContentTags(catLabel, platform, leafLabel);
        return;
      }
      setLeafTag(catLabel, leafLabel, isPlatformBranch ? platform : "", false);
      return;
    }
    setLeafTag(catLabel, leafLabel, isPlatformBranch ? platform : "", true);
  }

  function wireProductTree(chipHost) {
    if (chipHost.getAttribute("data-tree-wired")) return;
    chipHost.setAttribute("data-tree-wired", "1");

    chipHost.addEventListener("click", function (event) {
      var toggle = event.target.closest
        ? event.target.closest("button[data-tree-toggle]")
        : null;
      if (toggle && !toggle.classList.contains("is-empty") && chipHost.contains(toggle)) {
        event.preventDefault();
        event.stopPropagation();
        var id = toggle.getAttribute("data-tree-toggle") || "";
        if (!id) return;
        expandedNodes[id] = !expandedNodes[id];
        applyExpandState(chipHost, id, !!expandedNodes[id]);
        return;
      }

      var label = event.target.closest
        ? event.target.closest("label.filter-tree-label")
        : null;
      var input =
        event.target.classList && event.target.classList.contains("filter-tree-check")
          ? event.target
          : label
            ? label.querySelector(".filter-tree-check")
            : null;
      if (!input || !chipHost.contains(input)) return;

      // Drive tri-state from model; browser default cannot cycle indeterminate reliably.
      event.preventDefault();
      event.stopPropagation();

      var nodeId = (input.getAttribute("data-node-id") || "").trim();
      var category = (input.getAttribute("data-category") || "").trim();
      var platform = (input.getAttribute("data-platform") || "").trim();
      var tag = (input.getAttribute("data-tag") || "").trim();
      var depth = parseInt(input.getAttribute("data-depth") || "0", 10) || 0;
      var node = findNodeById(taxonomyTree(), nodeId);
      var catLabel = category || (depth === 0 && node ? node.label : "") || "";

      applyTreeCheckAction(node, catLabel, depth, platform, tag);

      state.page = 1;
      syncUrl();
      refreshFilterChips();
      render();
    });
  }

  function refreshFilterChips() {
    var chipHost = document.querySelector("[data-catalog-chips]");
    var mobileCatHost = document.querySelector("[data-mobile-filter-categories]");
    var tagHost = document.querySelector("[data-catalog-tags]");
    var useSidebar =
      filterStyle === "sidebar" ||
      !!document.querySelector("[data-filter-layout='sidebar']");
    var useSoftChips = !useSidebar && (filterStyle === "search" || mode === "search");
    var cats = catalogCategories();
    var tags = catalogTags();

    function renderSidebarTree(host) {
      if (!host) return;
      var tree = taxonomyTree();
      if (tree.length) {
        normalizeFilterTags();
        wireProductTree(host);
        host.innerHTML = tree
          .map(function (node) {
            return renderTreeNode(node, 0, node.label);
          })
          .join("");
        applyTreeIndeterminate(host);
        wireFilterTooltips(host);
      } else {
        host.innerHTML = cats
          .map(function (name) {
            var count = countForCategory(name);
            return (
              '<button type="button" class="filter-link" data-category="' +
              name +
              '">' +
              '<span class="filter-tree-icon" aria-hidden="true">' +
              categoryIcon(name) +
              "</span>" +
              '<span class="filter-link-label">' +
              name +
              "</span>" +
              '<span class="filter-count">' +
              count +
              "</span>" +
              "</button>"
            );
          })
          .join("");
        syncChipActive(host);
        host.querySelectorAll("[data-category]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var name = btn.getAttribute("data-category") || "";
            if (isCategorySelected(name)) setSingleCategory("");
            else setSingleCategory(name);
            state.page = 1;
            syncUrl();
            syncChipActive(host);
            refreshFilterChips();
            render();
          });
        });
      }
    }

    if (chipHost) {
      if (useSidebar) {
        renderSidebarTree(chipHost);
      } else if (useSoftChips) {
        chipHost.innerHTML =
          '<button type="button" class="chip-soft" data-category="">All categories (' + items.length + ")</button>" +
          cats.map(function (name) {
            var count = countForCategory(name);
            return '<button type="button" class="chip-soft" data-category="' + name + '">' +
              name + " (" + count + ")</button>";
          }).join("");
        syncChipActive(chipHost);
        chipHost.querySelectorAll("[data-category]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var name = btn.getAttribute("data-category") || "";
            setSingleCategory(name);
            state.page = 1;
            syncUrl();
            syncChipActive(chipHost);
            refreshFilterChips();
            render();
          });
        });
      } else {
        chipHost.innerHTML =
          '<button type="button" class="chip-browse" data-category="">ALL</button>' +
          cats.map(function (name) {
            return '<button type="button" class="chip-browse" data-category="' + name + '">' +
              name.toUpperCase() + "</button>";
          }).join("");
        syncChipActive(chipHost);
        chipHost.querySelectorAll("[data-category]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var name = btn.getAttribute("data-category") || "";
            setSingleCategory(name);
            state.page = 1;
            syncUrl();
            syncChipActive(chipHost);
            refreshFilterChips();
            render();
          });
        });
      }
    }

    if (useSidebar && mobileCatHost) {
      renderSidebarTree(mobileCatHost);
    }

    if (tagHost) {
      if (useSidebar && taxonomyTree().length) {
        tagHost.innerHTML = "";
      } else if (useSidebar) {
        tagHost.innerHTML = tags
          .map(function (name) {
            var count = countForTag(name);
            return (
              '<button type="button" class="filter-link" data-tag="' +
              name +
              '">' +
              '<span class="filter-link-label">' +
              name +
              "</span>" +
              '<span class="filter-count">' +
              count +
              "</span>" +
              "</button>"
            );
          })
          .join("");
        syncTagActive(tagHost);
        tagHost.querySelectorAll("[data-tag]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var name = btn.getAttribute("data-tag") || "";
            if (name && isTagSelected(name)) setSingleTag("");
            else setSingleTag(name);
            state.page = 1;
            syncUrl();
            syncTagActive(tagHost);
            render();
          });
        });
      } else if (useSoftChips) {
        tagHost.innerHTML =
          '<button type="button" class="chip-soft chip-tag" data-tag="">All tags</button>' +
          tags.map(function (name) {
            var count = countForTag(name);
            return '<button type="button" class="chip-soft chip-tag" data-tag="' + name + '">' +
              name + " (" + count + ")</button>";
          }).join("");
        syncTagActive(tagHost);
        tagHost.querySelectorAll("[data-tag]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var name = btn.getAttribute("data-tag") || "";
            setSingleTag(name);
            state.page = 1;
            syncUrl();
            syncTagActive(tagHost);
            render();
          });
        });
      } else {
        tagHost.innerHTML =
          '<button type="button" class="chip-browse chip-tag" data-tag="">ALL TAGS</button>' +
          tags.map(function (name) {
            return '<button type="button" class="chip-browse chip-tag" data-tag="' + name + '">' +
              name.toUpperCase() + "</button>";
          }).join("");
        syncTagActive(tagHost);
        tagHost.querySelectorAll("[data-tag]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var name = btn.getAttribute("data-tag") || "";
            setSingleTag(name);
            state.page = 1;
            syncUrl();
            syncTagActive(tagHost);
            render();
          });
        });
      }
    }
  }

  function wireTopRange() {
    var host = document.querySelector("[data-top-range]");
    if (!host) return;

    host.querySelectorAll("[data-range]").forEach(function (btn) {
      var active = btn.getAttribute("data-range") === state.range;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
      btn.addEventListener("click", function () {
        state.range = btn.getAttribute("data-range") === "new" ? "new" : "all-time";
        state.page = 1;
        host.querySelectorAll("[data-range]").forEach(function (el) {
          var on = el.getAttribute("data-range") === state.range;
          el.classList.toggle("is-active", on);
          el.setAttribute("aria-selected", on ? "true" : "false");
        });
        syncUrl();
        render();
      });
    });
  }

  var facetControllers = [];

  function closeAllFacets(except) {
    facetControllers.forEach(function (ctl) {
      if (except && ctl === except) return;
      ctl.setOpen(false);
    });
  }

  function refreshBrowseFacetsUI() {
    facetControllers.forEach(function (ctl) {
      ctl.refresh();
    });
  }

  function createFacetDropdown(host, config) {
    var key = config.key;
    var buckets = config.buckets;
    var getSelected = config.getSelected;
    var setSelected = config.setSelected;
    var matches = config.matches;
    var optionPrefix = config.optionPrefix || "";

    var rowsHtml = buckets
      .map(function (bucket) {
        var prefix =
          typeof config.optionPrefixFor === "function"
            ? config.optionPrefixFor(bucket)
            : optionPrefix;
        return (
          '<label class="price-filter-option" data-facet-bucket="' +
          bucket.id +
          '">' +
          '<input type="checkbox" value="' +
          bucket.id +
          '" />' +
          prefix +
          '<span class="price-filter-option-label">' +
          bucket.label +
          "</span>" +
          '<span class="price-filter-option-count" data-facet-count>0</span>' +
          "</label>"
        );
      })
      .join("");

    var wrap = document.createElement("div");
    wrap.className = "price-filter-unity";
    wrap.setAttribute("data-facet", key);
    wrap.innerHTML =
      '<button type="button" class="price-filter-trigger" data-facet-trigger aria-expanded="false" aria-haspopup="true">' +
        '<span data-facet-label>' +
        config.label +
        "</span>" +
        '<svg class="price-filter-chevron" viewBox="0 0 12 8" aria-hidden="true">' +
          '<path d="M1 1.5L6 6.5L11 1.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>' +
        "</svg>" +
      "</button>" +
      '<div class="price-filter-panel" data-facet-panel hidden role="group" aria-label="' +
      config.label +
      '">' +
        rowsHtml +
        '<button type="button" class="price-filter-clear-link" data-facet-clear hidden>Clear</button>' +
      "</div>";

    host.appendChild(wrap);

    var trigger = wrap.querySelector("[data-facet-trigger]");
    var panel = wrap.querySelector("[data-facet-panel]");
    var labelEl = wrap.querySelector("[data-facet-label]");
    var clearBtn = wrap.querySelector("[data-facet-clear]");

    var ctl = {
      key: key,
      setOpen: function () {},
      refresh: function () {}
    };

    function setOpen(open) {
      panel.hidden = !open;
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
      wrap.classList.toggle("is-open", open);
      if (open) {
        closeAllFacets(ctl);
        positionPanel();
      }
    }

    function positionPanel() {
      var rect = trigger.getBoundingClientRect();
      var panelWidth = Math.max(220, rect.width + 48);
      var left = rect.left;
      if (left + panelWidth > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - panelWidth - 12);
      }
      panel.style.top = Math.round(rect.bottom + 6) + "px";
      panel.style.left = Math.round(left) + "px";
      panel.style.width = panelWidth + "px";
    }

    function refresh() {
      var selected = getSelected();
      var count = selected.length;
      labelEl.textContent = count ? config.label + " (" + count + ")" : config.label;
      trigger.classList.toggle("is-active", count > 0);
      clearBtn.hidden = count === 0;

      var base = listBeforeFacets(key);
      buckets.forEach(function (bucket) {
        var row = wrap.querySelector('[data-facet-bucket="' + bucket.id + '"]');
        if (!row) return;
        var n = 0;
        for (var i = 0; i < base.length; i++) {
          if (matches(base[i], bucket)) n += 1;
        }
        var countEl = row.querySelector("[data-facet-count]");
        var input = row.querySelector('input[type="checkbox"]');
        var on = selected.some(function (id) {
          return String(id) === String(bucket.id);
        });
        if (countEl) countEl.textContent = String(n);
        row.classList.toggle("is-empty", n === 0);
        row.classList.toggle("is-checked", on);
        if (input) {
          input.checked = on;
          input.disabled = n === 0 && !on;
        }
      });
    }

    ctl.setOpen = setOpen;
    ctl.refresh = refresh;
    facetControllers.push(ctl);

    trigger.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(panel.hidden);
    });

    panel.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    panel.querySelectorAll('input[type="checkbox"]').forEach(function (input) {
      input.addEventListener("change", function () {
        setSelected(toggleListValue(getSelected(), input.value, input.checked));
        state.page = 1;
        syncUrl();
        render();
      });
    });

    clearBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      setSelected([]);
      state.page = 1;
      syncUrl();
      render();
    });

    return ctl;
  }

  function createClearFiltersControl(host) {
    if (!host) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "browse-clear-filters";
    btn.setAttribute("data-clear-filters", "");
    btn.setAttribute("hidden", "");
    btn.textContent = "Clear";
    host.appendChild(btn);

    var ctl = {
      key: "clear-filters",
      setOpen: function () {},
      refresh: function () {
        if (hasActiveFilters()) btn.removeAttribute("hidden");
        else btn.setAttribute("hidden", "");
      }
    };
    facetControllers.push(ctl);

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      clearAllFilters();
    });

    return ctl;
  }

  function bucketLabel(buckets, id) {
    for (var i = 0; i < buckets.length; i++) {
      if (buckets[i].id === id) return buckets[i].label;
    }
    return id;
  }

  function activeFilterCount() {
    return (
      state.categories.length +
      state.tags.length +
      state.priceBuckets.length +
      state.ratingBuckets.length +
      state.releaseBuckets.length +
      (state.sort && state.sort !== "relevance" ? 1 : 0)
    );
  }

  function collectActiveFilterChips() {
    var chips = [];
    state.categories.forEach(function (name) {
      chips.push({ type: "category", id: name, label: name });
    });
    state.tags.forEach(function (tag) {
      var label = String(tag || "").replace(/^[^:]+:/, "").replace(/\|/g, " · ");
      chips.push({ type: "tag", id: tag, label: label || tag });
    });
    state.priceBuckets.forEach(function (id) {
      chips.push({ type: "price", id: id, label: bucketLabel(PRICE_BUCKETS, id) });
    });
    state.ratingBuckets.forEach(function (id) {
      chips.push({ type: "rating", id: id, label: bucketLabel(RATING_BUCKETS, id) });
    });
    state.releaseBuckets.forEach(function (id) {
      chips.push({ type: "release", id: id, label: bucketLabel(RELEASE_BUCKETS, id) });
    });
    return chips;
  }

  function removeActiveChip(type, id) {
    if (type === "category") {
      state.categories = state.categories.filter(function (c) {
        return c !== id;
      });
    } else if (type === "tag") {
      state.tags = state.tags.filter(function (t) {
        return t !== id;
      });
    } else if (type === "price") {
      state.priceBuckets = state.priceBuckets.filter(function (v) {
        return v !== id;
      });
    } else if (type === "rating") {
      state.ratingBuckets = state.ratingBuckets.filter(function (v) {
        return v !== id;
      });
    } else if (type === "release") {
      state.releaseBuckets = state.releaseBuckets.filter(function (v) {
        return v !== id;
      });
    }
    state.page = 1;
    syncUrl();
    refreshFilterChips();
    render();
  }

  function refreshMobileActiveChips() {
    var host = document.querySelector("[data-mobile-active-chips]");
    if (!host) return;
    var chips = collectActiveFilterChips();
    if (!chips.length) {
      host.innerHTML = "";
      host.setAttribute("hidden", "");
      return;
    }
    host.removeAttribute("hidden");
    host.innerHTML =
      chips
        .map(function (chip) {
          return (
            '<button type="button" class="mobile-filter-chip" data-chip-type="' +
            chip.type +
            '" data-chip-id="' +
            String(chip.id).replace(/"/g, "&quot;") +
            '">' +
            '<span>' +
            chip.label +
            "</span>" +
            '<span class="mobile-filter-chip-x" aria-hidden="true">×</span>' +
            "</button>"
          );
        })
        .join("") +
      '<button type="button" class="mobile-filter-clear-inline" data-mobile-clear-filters>Clear</button>';
  }

  function refreshMobileFilterCounts() {
    var count = activeFilterCount();
    document.querySelectorAll("[data-mobile-filter-count]").forEach(function (el) {
      var key = el.getAttribute("data-mobile-filter-count");
      var n = 0;
      if (key === "categories") n = state.categories.length + state.tags.length;
      else if (key === "price") n = state.priceBuckets.length;
      else if (key === "rating") n = state.ratingBuckets.length;
      else if (key === "release") n = state.releaseBuckets.length;
      else if (key === "sort") n = state.sort && state.sort !== "relevance" ? 1 : 0;
      else if (key === "all") n = count;
      if (n > 0) {
        el.textContent = " (" + n + ")";
        el.removeAttribute("hidden");
      } else {
        el.textContent = "";
        el.setAttribute("hidden", "");
      }
    });
    var clearBtn = document.querySelector("[data-mobile-filter-clear]");
    if (clearBtn) {
      clearBtn.textContent = count > 0 ? "Clear (" + count + ")" : "Clear";
      clearBtn.toggleAttribute("hidden", count === 0);
    }
  }

  function refreshMobileBucketChecks() {
    var sheet = document.querySelector("[data-mobile-filter-sheet]");
    if (!sheet) return;
    sheet.querySelectorAll("[data-mobile-bucket]").forEach(function (input) {
      var group = input.getAttribute("data-mobile-bucket");
      var id = input.value;
      var on = false;
      if (group === "price") on = state.priceBuckets.indexOf(id) !== -1;
      else if (group === "rating") on = state.ratingBuckets.indexOf(id) !== -1;
      else if (group === "release") on = state.releaseBuckets.indexOf(id) !== -1;
      input.checked = on;
    });
    sheet.querySelectorAll("[data-mobile-sort-option]").forEach(function (btn) {
      btn.classList.toggle(
        "is-active",
        btn.getAttribute("data-mobile-sort-option") === state.sort
      );
    });
  }

  function setMobileFilterSheetOpen(open) {
    var sheet = document.querySelector("[data-mobile-filter-sheet]");
    if (!sheet) return;
    sheet.classList.toggle("is-open", open);
    sheet.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.classList.toggle("mobile-filter-open", open);
    if (open) {
      refreshFilterChips();
      refreshMobileBucketChecks();
      refreshMobileFilterCounts();
      var list = filteredItems();
      updateFacetResultsMeta(
        list.length,
        state.page,
        Math.max(1, Math.ceil(list.length / state.pageSize) || 1)
      );
    }
  }

  function wireMobileSortFilterChrome() {
    if (!document.querySelector("[data-filter-layout='sidebar']")) return;
    if (document.querySelector("[data-mobile-filter-sheet]")) return;

    var host = document.querySelector("[data-browse-facets]");
    if (!host) return;

    var mobileBar = document.createElement("div");
    mobileBar.className = "browse-mobile-filter";
    mobileBar.setAttribute("data-mobile-filter-bar", "");
    mobileBar.innerHTML =
      '<p class="facet-results-meta" data-facet-results-meta data-facet-results-html="1"></p>' +
      '<button type="button" class="mobile-sort-filter-btn" data-mobile-sort-filter-open>' +
        '<svg class="mobile-sort-filter-icon" viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">' +
          '<path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M4 7h16M7 12h10M10 17h4"/>' +
          '<circle cx="9" cy="7" r="1.6" fill="currentColor" stroke="none"/>' +
          '<circle cx="15" cy="12" r="1.6" fill="currentColor" stroke="none"/>' +
          '<circle cx="12" cy="17" r="1.6" fill="currentColor" stroke="none"/>' +
        "</svg>" +
        "<span>SORT AND FILTER</span>" +
      "</button>" +
      '<div class="mobile-active-chips" data-mobile-active-chips hidden></div>';
    host.appendChild(mobileBar);

    function accordionSection(key, title, bodyHtml) {
      return (
        '<div class="mobile-filter-acc" data-mobile-acc="' +
        key +
        '">' +
        '<button type="button" class="mobile-filter-acc-trigger" data-mobile-acc-trigger aria-expanded="false">' +
          "<span>" +
          title +
          '<span data-mobile-filter-count="' +
          key +
          '" hidden></span></span>' +
          '<svg class="mobile-filter-acc-chevron" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.5L6 6.5L11 1.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path></svg>' +
        "</button>" +
        '<div class="mobile-filter-acc-panel" data-mobile-acc-panel hidden>' +
          bodyHtml +
        "</div>" +
        "</div>"
      );
    }

    function bucketChecks(group, buckets) {
      return (
        '<div class="mobile-filter-options">' +
        buckets
          .map(function (b) {
            return (
              '<label class="mobile-filter-option">' +
              '<input type="checkbox" data-mobile-bucket="' +
              group +
              '" value="' +
              b.id +
              '" />' +
              "<span>" +
              b.label +
              "</span>" +
              "</label>"
            );
          })
          .join("") +
        "</div>"
      );
    }

    var sortBody =
      '<div class="mobile-filter-options">' +
      SORT_OPTIONS.map(function (opt) {
        return (
          '<button type="button" class="mobile-filter-sort-option" data-mobile-sort-option="' +
          opt.id +
          '">' +
          opt.label +
          "</button>"
        );
      }).join("") +
      "</div>";

    var sheet = document.createElement("div");
    sheet.className = "mobile-filter-sheet";
    sheet.setAttribute("data-mobile-filter-sheet", "");
    sheet.setAttribute("aria-hidden", "true");
    sheet.innerHTML =
      '<div class="mobile-filter-sheet-inner">' +
        '<div class="mobile-filter-sheet-head">' +
          '<button type="button" class="mobile-filter-sheet-close" data-mobile-filter-close aria-label="Close filters">' +
            '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>' +
          "</button>" +
        "</div>" +
        '<div class="mobile-filter-sheet-body">' +
          accordionSection(
            "categories",
            "CATEGORIES",
            '<div class="filter-tree mobile-filter-tree" data-mobile-filter-categories></div>'
          ) +
          accordionSection("price", "PRICE", bucketChecks("price", PRICE_BUCKETS)) +
          accordionSection("rating", "RATING", bucketChecks("rating", RATING_BUCKETS)) +
          accordionSection(
            "release",
            "RELEASE DATE",
            bucketChecks("release", RELEASE_BUCKETS)
          ) +
          accordionSection("sort", "SORT BY", sortBody) +
        "</div>" +
        '<div class="mobile-filter-sheet-foot">' +
          '<button type="button" class="mobile-filter-view-btn" data-mobile-filter-view>VIEW RESULTS (0)</button>' +
          '<button type="button" class="mobile-filter-clear-btn" data-mobile-filter-clear hidden>Clear</button>' +
        "</div>" +
      "</div>";
    document.body.appendChild(sheet);

    mobileBar
      .querySelector("[data-mobile-sort-filter-open]")
      .addEventListener("click", function (e) {
        e.preventDefault();
        setMobileFilterSheetOpen(true);
      });

    sheet
      .querySelector("[data-mobile-filter-close]")
      .addEventListener("click", function () {
        setMobileFilterSheetOpen(false);
      });

    sheet
      .querySelector("[data-mobile-filter-view]")
      .addEventListener("click", function () {
        setMobileFilterSheetOpen(false);
      });

    sheet
      .querySelector("[data-mobile-filter-clear]")
      .addEventListener("click", function () {
        clearAllFilters();
        refreshMobileBucketChecks();
        refreshMobileFilterCounts();
      });

    sheet.querySelectorAll("[data-mobile-acc-trigger]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var acc = btn.closest("[data-mobile-acc]");
        if (!acc) return;
        var panel = acc.querySelector("[data-mobile-acc-panel]");
        var open = panel && panel.hidden;
        if (panel) panel.hidden = !open;
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        acc.classList.toggle("is-open", open);
      });
    });

    sheet.addEventListener("change", function (e) {
      var input = e.target;
      if (!input || !input.getAttribute || !input.getAttribute("data-mobile-bucket")) return;
      var group = input.getAttribute("data-mobile-bucket");
      var id = input.value;
      if (group === "price") {
        state.priceBuckets = toggleListValue(state.priceBuckets, id, input.checked);
      } else if (group === "rating") {
        state.ratingBuckets = toggleListValue(state.ratingBuckets, id, input.checked);
      } else if (group === "release") {
        state.releaseBuckets = toggleListValue(state.releaseBuckets, id, input.checked);
      }
      state.page = 1;
      syncUrl();
      render();
    });

    sheet.addEventListener("click", function (e) {
      var sortBtn = e.target.closest("[data-mobile-sort-option]");
      if (sortBtn) {
        e.preventDefault();
        state.sort = sortBtn.getAttribute("data-mobile-sort-option") || "relevance";
        state.page = 1;
        syncUrl();
        refreshMobileBucketChecks();
        render();
        return;
      }
    });

    mobileBar.addEventListener("click", function (e) {
      var chip = e.target.closest("[data-chip-type]");
      if (chip) {
        e.preventDefault();
        removeActiveChip(
          chip.getAttribute("data-chip-type"),
          chip.getAttribute("data-chip-id")
        );
        return;
      }
      if (e.target.closest("[data-mobile-clear-filters]")) {
        e.preventDefault();
        clearAllFilters();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMobileFilterSheetOpen(false);
    });
  }

  function wireBrowseFacets() {
    var host =
      document.querySelector("[data-browse-facets]") ||
      document.querySelector("[data-price-filters]");
    if (!host || host.getAttribute("data-wired")) return;
    host.setAttribute("data-wired", "1");
    host.classList.add("browse-facet-row");
    host.innerHTML =
      '<div class="browse-facet-desktop">' +
        '<div class="browse-facet-left" data-facet-left></div>' +
        '<div class="browse-facet-center"><p class="facet-results-meta" data-facet-results-meta></p></div>' +
        '<div class="browse-facet-right" data-facet-right></div>' +
      "</div>";

    var left = host.querySelector("[data-facet-left]");
    var right = host.querySelector("[data-facet-right]");

    var starIcon =
      '<span class="price-filter-option-icon" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 3.6l2.4 4.86 5.36.78-3.88 3.78.92 5.34L12 16.9l-4.8 2.52.92-5.34L4.24 9.24l5.36-.78L12 3.6z"></path></svg>' +
      "</span>";
    var starEmptyIcon =
      '<span class="price-filter-option-icon price-filter-option-icon-empty" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="none" stroke="currentColor" stroke-width="1.6" d="M12 3.6l2.4 4.86 5.36.78-3.88 3.78.92 5.34L12 16.9l-4.8 2.52.92-5.34L4.24 9.24l5.36-.78L12 3.6z"></path></svg>' +
      "</span>";

    createFacetDropdown(left, {
      key: "price",
      label: "Price",
      buckets: PRICE_BUCKETS,
      getSelected: function () {
        return state.priceBuckets;
      },
      setSelected: function (next) {
        state.priceBuckets = next;
      },
      matches: function (item, bucket) {
        return priceInBucket(itemPrice(item), bucket);
      }
    });

    createFacetDropdown(left, {
      key: "rating",
      label: "Rating",
      buckets: RATING_BUCKETS,
      optionPrefix: starIcon,
      optionPrefixFor: function (bucket) {
        return bucket.stars === 0 ? starEmptyIcon : starIcon;
      },
      getSelected: function () {
        return state.ratingBuckets;
      },
      setSelected: function (next) {
        state.ratingBuckets = next;
      },
      matches: function (item, bucket) {
        return ratingInBucket(itemRatingStars(item), bucket);
      }
    });

    createFacetDropdown(left, {
      key: "release",
      label: "Release Date",
      buckets: RELEASE_BUCKETS,
      getSelected: function () {
        return state.releaseBuckets;
      },
      setSelected: function (next) {
        state.releaseBuckets = next;
      },
      matches: function (item, bucket) {
        return releaseInBucket(itemAddedTime(item), bucket);
      }
    });

    createClearFiltersControl(left);

    createSortDropdown(right);
    createPageSizeDropdown(right);

    wireMobileSortFilterChrome();

    document.addEventListener("click", function () {
      closeAllFacets();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeAllFacets();
    });

    window.addEventListener("resize", function () {
      facetControllers.forEach(function (ctl) {
        var wrap = document.querySelector('[data-facet="' + ctl.key + '"]');
        if (wrap && wrap.classList.contains("is-open")) ctl.setOpen(true);
      });
    });

    window.addEventListener(
      "scroll",
      function () {
        facetControllers.forEach(function (ctl) {
          var wrap = document.querySelector('[data-facet="' + ctl.key + '"]');
          if (wrap && wrap.classList.contains("is-open")) {
            var panel = wrap.querySelector("[data-facet-panel]");
            var trigger = wrap.querySelector("[data-facet-trigger]");
            if (!panel || !trigger || panel.hidden) return;
            var rect = trigger.getBoundingClientRect();
            var panelWidth;
            var leftPos;
            if (ctl.alignToTrigger) {
              panelWidth = Math.round(rect.width);
              leftPos = rect.left;
              panel.style.minWidth = panelWidth + "px";
              panel.style.maxWidth = panelWidth + "px";
            } else {
              panel.style.width = "max-content";
              panel.style.minWidth = "13.5rem";
              panel.style.maxWidth = "min(20rem, calc(100vw - 24px))";
              panelWidth = Math.ceil(panel.getBoundingClientRect().width);
              leftPos = rect.right - panelWidth;
              if (leftPos < 12) leftPos = 12;
              if (leftPos + panelWidth > window.innerWidth - 12) {
                leftPos = Math.max(12, window.innerWidth - panelWidth - 12);
              }
              panel.style.minWidth = panelWidth + "px";
              panel.style.maxWidth = panelWidth + "px";
            }
            panel.style.top = Math.round(rect.bottom + 6) + "px";
            panel.style.left = Math.round(leftPos) + "px";
            panel.style.width = panelWidth + "px";
          }
        });
      },
      true
    );

    refreshBrowseFacetsUI();
  }

  function createSortDropdown(host) {
    if (!host) return;

    function sortLabel() {
      for (var i = 0; i < SORT_OPTIONS.length; i++) {
        if (SORT_OPTIONS[i].id === state.sort) return SORT_OPTIONS[i].label;
      }
      return "Relevance";
    }

    var optionsHtml = SORT_OPTIONS.map(function (opt) {
      return (
        '<button type="button" class="sort-filter-option" data-sort-option="' +
        opt.id +
        '">' +
        opt.label +
        "</button>"
      );
    }).join("");

    var wrap = document.createElement("div");
    wrap.className = "sort-filter-unity price-filter-unity";
    wrap.setAttribute("data-facet", "sort");
    wrap.innerHTML =
      '<button type="button" class="sort-filter-trigger price-filter-trigger" data-facet-trigger aria-expanded="false" aria-haspopup="true">' +
        '<span data-sort-label>Sort by: ' +
        sortLabel() +
        "</span>" +
        '<svg class="price-filter-chevron" viewBox="0 0 12 8" aria-hidden="true">' +
          '<path d="M1 1.5L6 6.5L11 1.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>' +
        "</svg>" +
      "</button>" +
      '<div class="sort-filter-panel price-filter-panel" data-facet-panel hidden role="listbox" aria-label="Sort by">' +
        optionsHtml +
      "</div>";

    host.appendChild(wrap);

    var trigger = wrap.querySelector("[data-facet-trigger]");
    var panel = wrap.querySelector("[data-facet-panel]");
    var labelEl = wrap.querySelector("[data-sort-label]");

    var ctl = {
      key: "sort",
      setOpen: function () {},
      refresh: function () {}
    };

    function positionPanel() {
      var rect = trigger.getBoundingClientRect();
      panel.style.width = "max-content";
      panel.style.minWidth = "13.5rem";
      panel.style.maxWidth = "min(20rem, calc(100vw - 24px))";
      var panelWidth = Math.ceil(panel.getBoundingClientRect().width);
      var left = rect.right - panelWidth;
      if (left < 12) left = 12;
      if (left + panelWidth > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - panelWidth - 12);
      }
      panel.style.top = Math.round(rect.bottom + 6) + "px";
      panel.style.left = Math.round(left) + "px";
      panel.style.width = panelWidth + "px";
      panel.style.minWidth = panelWidth + "px";
      panel.style.maxWidth = panelWidth + "px";
    }

    function setOpen(open) {
      panel.hidden = !open;
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
      wrap.classList.toggle("is-open", open);
      if (open) {
        closeAllFacets(ctl);
        positionPanel();
      }
    }

    function refresh() {
      labelEl.textContent = "Sort by: " + sortLabel();
      panel.querySelectorAll("[data-sort-option]").forEach(function (btn) {
        btn.classList.toggle("is-active", btn.getAttribute("data-sort-option") === state.sort);
      });
    }

    ctl.setOpen = setOpen;
    ctl.refresh = refresh;
    ctl.alignToTrigger = false;
    facetControllers.push(ctl);

    trigger.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(panel.hidden);
    });

    panel.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    panel.querySelectorAll("[data-sort-option]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        state.sort = btn.getAttribute("data-sort-option") || "relevance";
        state.page = 1;
        setOpen(false);
        syncUrl();
        render();
      });
    });

    refresh();
  }

  function createPageSizeDropdown(host) {
    if (!host) return;

    var optionsHtml = PAGE_SIZE_OPTIONS.map(function (size) {
      return (
        '<button type="button" class="sort-filter-option" data-page-size="' +
        size +
        '">' +
        size +
        "</button>"
      );
    }).join("");

    var wrap = document.createElement("div");
    wrap.className = "sort-filter-unity price-filter-unity";
    wrap.setAttribute("data-facet", "page-size");
    wrap.innerHTML =
      '<button type="button" class="sort-filter-trigger price-filter-trigger" data-facet-trigger aria-expanded="false" aria-haspopup="true">' +
        '<span data-page-size-label>Results: ' +
        state.pageSize +
        "</span>" +
        '<svg class="price-filter-chevron" viewBox="0 0 12 8" aria-hidden="true">' +
          '<path d="M1 1.5L6 6.5L11 1.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>' +
        "</svg>" +
      "</button>" +
      '<div class="sort-filter-panel price-filter-panel" data-facet-panel hidden role="listbox" aria-label="Results per page">' +
        optionsHtml +
      "</div>";

    host.appendChild(wrap);

    var trigger = wrap.querySelector("[data-facet-trigger]");
    var panel = wrap.querySelector("[data-facet-panel]");
    var labelEl = wrap.querySelector("[data-page-size-label]");

    var ctl = {
      key: "page-size",
      setOpen: function () {},
      refresh: function () {}
    };

    function positionPanel() {
      var rect = trigger.getBoundingClientRect();
      var panelWidth = Math.round(rect.width);
      panel.style.top = Math.round(rect.bottom + 6) + "px";
      panel.style.left = Math.round(rect.left) + "px";
      panel.style.width = panelWidth + "px";
      panel.style.minWidth = panelWidth + "px";
      panel.style.maxWidth = panelWidth + "px";
    }

    function setOpen(open) {
      panel.hidden = !open;
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
      wrap.classList.toggle("is-open", open);
      if (open) {
        closeAllFacets(ctl);
        positionPanel();
      }
    }

    function refresh() {
      labelEl.textContent = "Results: " + state.pageSize;
      panel.querySelectorAll("[data-page-size]").forEach(function (btn) {
        var size = parseInt(btn.getAttribute("data-page-size"), 10);
        btn.classList.toggle("is-active", size === state.pageSize);
      });
    }

    ctl.setOpen = setOpen;
    ctl.refresh = refresh;
    ctl.alignToTrigger = true;
    facetControllers.push(ctl);

    trigger.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(panel.hidden);
    });

    panel.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    panel.querySelectorAll("[data-page-size]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var size = parseInt(btn.getAttribute("data-page-size"), 10);
        if (PAGE_SIZE_OPTIONS.indexOf(size) < 0) return;
        state.pageSize = size;
        state.page = 1;
        setOpen(false);
        syncUrl();
        render();
      });
    });

    refresh();
  }

  if (mode === "all" || mode === "search") {
    wireFilters();
    wireBrowseFacets();
  }
  if (mode === "top") {
    wireTopRange();
  }

  document.addEventListener("rogue-catalog:loaded", function () {
    syncItems();
    if (mode === "all" || mode === "search") {
      wireFilters();
      wireBrowseFacets();
    }
    render();
  });

  document.addEventListener("rogue-catalog:assets-loaded", function () {
    if (kind !== "assets") return;
    syncItems();
    promoteMultiParentTagsForExpand();
    normalizeFilterTags();
    syncUrl();
    if (mode === "all" || mode === "search") {
      wireFilters();
      wireBrowseFacets();
    }
    render();
  });

  render();
})();
