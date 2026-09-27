/**
 * @Author: rogue-dev-studio
 * @Date: 2026-09-26 14:25:00
 * @Last Modified by: rogue-dev-studio
 * @Last Modified time: 2026-09-26 14:25:00
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "site-lang";

  var PACKS = {
    en: {
      langHeading: "Language",
      langLabel: "Language",
      browseHeading: "Browse",
      sourcesHeading: "Sources",
      companyHeading: "Company",
      supportHeading: "Support",
      footerBrand:
        "Browse MCP servers, agent skills, and digital assets curated for AI builders.",
      studioSite: "Studio site",
      privacy: "Privacy",
      terms: "Terms",
      contactUs: "Contact us",
      sponsorsAria: "Sponsor links",
      socialsAria: "Social links",
      agentsComplete: "Agents Complete",
      agentProgrammer: "Agent Programmer",
      brand: "Rogue Asset Store",
      navPrimary: "Primary",
      navMcp: "MCP Servers",
      navSkills: "Agent Skills",
      navAssets: "Assets",
      navSaved: "Saved Assets",
      navAllServers: "All Servers",
      navAllSkills: "All Skills",
      navAllAssets: "All Assets",
      navCategories: "Categories",
      navTags: "Tags",
      navTopServers: "Top Servers",
      navTopSkills: "Top Skills",
      navTopAssets: "Top Assets",
      openMenu: "Open menu",
      closeMenu: "Close menu",
      search: "Search",
      searchCatalog: "Search catalog...",
      searchCatalogLead: "Search MCP servers, skills, and assets.",
      searchCatalogHint: "Type a query to search the catalog.",
      searchClear: "Clear search",
      searchServers: "Search MCP servers...",
      searchSkills: "Search agent skills...",
      searchAssets: "Search assets...",
      searchServersPage: "Search for MCP servers...",
      searchSkillsPage: "Search for agent skills...",
      searchAssetsPage: "Search assets...",
      explore: "Explore",
      seeMore: "See more",
      loading: "Loading…",
      home: "Home",
      all: "All",
      catalog: "Catalog",
      categories: "Categories",
      filters: "Filters",
      catalogKind: "Catalog kind",
      noResults: "No results found.",
      noAssets: "No assets yet.",
      noSkills: "No skills yet.",
      noServers: "No MCP servers yet.",
      noSaved:
        "No saved links yet. Open a product, skill, or MCP detail and tap Save.",
      heroMcpTitle: "MCP Servers",
      heroMcpLede:
        "Connect tools and apps to your AI agent — ready for Cursor, Claude Code, and other hosts.",
      heroSkillsTitle: "Agent Skills",
      heroSkillsLede:
        "Installable agent playbooks and workflows for Cursor, Claude Code, OpenCode, and more.",
      heroAssetsTitle: "Assets",
      heroAssetsLede:
        "Motion packs, 3D models, and stock downloads from studio storefronts.",
      heroOrbitAria: "Interactive categories and tags"
    },
    id: {
      langHeading: "Bahasa",
      langLabel: "Bahasa",
      browseHeading: "Jelajah",
      sourcesHeading: "Sumber",
      companyHeading: "Perusahaan",
      supportHeading: "Dukung",
      footerBrand:
        "Jelajahi MCP server, skill agen, dan aset digital untuk pembangun AI.",
      studioSite: "Situs studio",
      privacy: "Privasi",
      terms: "Ketentuan",
      contactUs: "Hubungi kami",
      sponsorsAria: "Tautan sponsor",
      socialsAria: "Tautan sosial",
      agentsComplete: "Agents Complete",
      agentProgrammer: "Agent Programmer",
      brand: "Rogue Asset Store",
      navPrimary: "Utama",
      navMcp: "MCP Servers",
      navSkills: "Agent Skills",
      navAssets: "Assets",
      navSaved: "Aset Tersimpan",
      navAllServers: "Semua Server",
      navAllSkills: "Semua Skills",
      navAllAssets: "Semua Assets",
      navCategories: "Kategori",
      navTags: "Tag",
      navTopServers: "Server Teratas",
      navTopSkills: "Skills Teratas",
      navTopAssets: "Assets Teratas",
      openMenu: "Buka menu",
      closeMenu: "Tutup menu",
      search: "Cari",
      searchCatalog: "Cari katalog...",
      searchCatalogLead: "Cari MCP server, skills, dan aset.",
      searchCatalogHint: "Ketik kata kunci untuk mencari katalog.",
      searchClear: "Hapus pencarian",
      searchServers: "Cari MCP server...",
      searchSkills: "Cari agent skills...",
      searchAssets: "Cari aset...",
      searchServersPage: "Cari MCP server...",
      searchSkillsPage: "Cari agent skills...",
      searchAssetsPage: "Cari aset...",
      explore: "Jelajahi",
      seeMore: "Lihat selengkapnya",
      loading: "Memuat…",
      home: "Beranda",
      all: "Semua",
      catalog: "Katalog",
      categories: "Kategori",
      filters: "Filter",
      catalogKind: "Jenis katalog",
      noResults: "Hasil tidak ditemukan.",
      noAssets: "Belum ada aset.",
      noSkills: "Belum ada skills.",
      noServers: "Belum ada MCP server.",
      noSaved:
        "Belum ada tautan tersimpan. Buka detail produk, skill, atau MCP lalu ketuk Simpan.",
      heroMcpTitle: "MCP Servers",
      heroMcpLede:
        "Hubungkan tools dan app ke agen AI Anda — siap untuk Cursor, Claude Code, dan host lain.",
      heroSkillsTitle: "Agent Skills",
      heroSkillsLede:
        "Playbook dan workflow agen siap pasang untuk Cursor, Claude Code, OpenCode, dan lainnya.",
      heroAssetsTitle: "Assets",
      heroAssetsLede:
        "Paket motion, model 3D, dan unduhan stock dari toko studio.",
      heroOrbitAria: "Kategori dan tag interaktif"
    }
  };

  function normalize(lang) {
    var v = String(lang || "").toLowerCase();
    if (v.indexOf("id") === 0) return "id";
    return "en";
  }

  function detectBrowser() {
    try {
      var list = navigator.languages || [navigator.language || "en"];
      for (var i = 0; i < list.length; i++) {
        if (String(list[i]).toLowerCase().indexOf("id") === 0) return "id";
      }
    } catch (err) {}
    return "en";
  }

  function getLang() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return normalize(stored);
    } catch (err) {}
    return detectBrowser();
  }

  function setLang(lang) {
    var L = normalize(lang);
    try {
      localStorage.setItem(STORAGE_KEY, L);
    } catch (err) {}
    return L;
  }

  function t(key, lang) {
    var pack = PACKS[normalize(lang || getLang())] || PACKS.en;
    if (pack[key] != null) return pack[key];
    return PACKS.en[key] != null ? PACKS.en[key] : key;
  }

  function applyDocument(lang) {
    var L = normalize(lang || getLang());
    document.documentElement.lang = L === "id" ? "id" : "en";
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (!key) return;
      var val = t(key, L);
      if (el.getAttribute("data-i18n-html") === "1") {
        el.innerHTML = val;
      } else {
        el.textContent = val;
      }
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-placeholder");
      if (!key) return;
      el.setAttribute("placeholder", t(key, L));
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-aria");
      if (!key) return;
      el.setAttribute("aria-label", t(key, L));
    });
    return L;
  }

  function syncSelects(lang) {
    var L = normalize(lang || getLang());
    document.querySelectorAll("[data-site-lang]").forEach(function (sel) {
      sel.value = L;
    });
  }

  function apply(lang) {
    var L = setLang(lang || getLang());
    applyDocument(L);
    syncSelects(L);
    try {
      global.dispatchEvent(new CustomEvent("site-lang-change", { detail: { lang: L } }));
    } catch (err) {}
    return L;
  }

  function wireSelects() {
    document.querySelectorAll("[data-site-lang]").forEach(function (sel) {
      if (sel.getAttribute("data-i18n-wired") === "1") return;
      sel.setAttribute("data-i18n-wired", "1");
      sel.addEventListener("change", function () {
        apply(sel.value);
      });
    });
  }

  global.RogueStoreI18n = {
    STORAGE_KEY: STORAGE_KEY,
    PACKS: PACKS,
    normalize: normalize,
    getLang: getLang,
    setLang: setLang,
    t: t,
    apply: apply,
    applyDocument: applyDocument,
    syncSelects: syncSelects,
    wireSelects: wireSelects
  };
})(typeof window !== "undefined" ? window : this);
