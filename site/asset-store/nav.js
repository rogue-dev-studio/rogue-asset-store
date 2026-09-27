/*
 * @Author: rogue-dev-studio
 * @Date: 2026-09-20 10:45:00
 * @Last Modified by: rogue-dev-studio
 * @Last Modified time: 2026-09-26 14:30:00
 */
(function () {
  var base = document.body.getAttribute("data-base") || "./";
  if (base.slice(-1) !== "/") base += "/";
  var studioHome = "https://rogue-dev-studio.github.io/";
  var I18n = window.RogueStoreI18n;

  function t(key) {
    return I18n ? I18n.t(key) : key;
  }

  function href(path) {
    return base + path.replace(/^\//, "");
  }

  function searchTarget() {
    var path = (location.pathname || "").toLowerCase();
    if (path.indexOf("/servers") !== -1) return href("servers/");
    if (path.indexOf("/skills") !== -1) return href("skills/");
    if (path.indexOf("/search") !== -1) return href("search/");
    if (/(?:^|\/)assets(?:\/|$)/.test(path)) return href("assets/");
    return href("search/");
  }

  function searchPlaceholderKey() {
    var path = (location.pathname || "").toLowerCase();
    if (path.indexOf("/servers") !== -1) return "searchServers";
    if (path.indexOf("/skills") !== -1) return "searchSkills";
    if (path.indexOf("/search") !== -1) return "searchCatalog";
    if (/(?:^|\/)assets(?:\/|$)/.test(path)) return "searchAssets";
    return "searchCatalog";
  }

  function injectNav() {
    var mount = document.querySelector("[data-site-nav]");
    if (!mount) return;

    var q = "";
    try {
      q = new URLSearchParams(location.search).get("q") || "";
    } catch (err) {}

    var ph = t(searchPlaceholderKey()).replace(/"/g, "&quot;");

    mount.innerHTML =
      '<a class="brand" href="' + href("") + '">' + t("brand") + "</a>" +
      '<form class="site-header-search" action="' + searchTarget() + '" method="get" role="search">' +
        '<span class="search-icon" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<circle cx="11" cy="11" r="6.5"></circle>' +
            '<path d="M16.5 16.5L21 21"></path>' +
          "</svg>" +
        "</span>" +
        '<label class="sr-only" for="site-header-q">' + t("search") + "</label>" +
        '<input id="site-header-q" type="search" name="q" data-site-search data-catalog-search placeholder="' +
          ph +
          '" value="' +
          String(q).replace(/"/g, "&quot;") +
          '" autocomplete="off" />' +
      "</form>" +
      '<button type="button" class="nav-toggle" aria-expanded="false" aria-controls="site-nav" aria-label="' +
        t("openMenu") +
        '">' +
        '<span class="nav-toggle-bar" aria-hidden="true"></span>' +
        '<span class="nav-toggle-bar" aria-hidden="true"></span>' +
        '<span class="nav-toggle-bar" aria-hidden="true"></span>' +
      "</button>" +
      '<nav class="nav" id="site-nav" aria-label="' + t("navPrimary") + '">' +
        '<div class="nav-dd">' +
          '<button type="button" class="nav-dd-btn" aria-expanded="false" aria-haspopup="true" aria-label="' +
            t("navMcp") +
            '" data-tooltip="' +
            t("navMcp") +
            '">' +
            '<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">' +
              '<path d="M9 2v6"></path><path d="M15 2v6"></path>' +
              '<rect x="6" y="8" width="12" height="6" rx="1.5"></rect>' +
              '<path d="M12 14v8"></path>' +
            "</svg>" +
            '<span class="nav-label">' + t("navMcp") + "</span>" +
          "</button>" +
          '<div class="nav-dd-menu" role="menu">' +
            '<a href="' + href("servers/") + '" role="menuitem">' + t("navAllServers") + "</a>" +
            '<a href="' + href("servers/categories/") + '" role="menuitem">' + t("navCategories") + "</a>" +
            '<a href="' + href("servers/tags/") + '" role="menuitem">' + t("navTags") + "</a>" +
            '<a href="' + href("servers/top/") + '" role="menuitem">' + t("navTopServers") + "</a>" +
          "</div>" +
        "</div>" +
        '<div class="nav-dd">' +
          '<button type="button" class="nav-dd-btn" aria-expanded="false" aria-haspopup="true" aria-label="' +
            t("navSkills") +
            '" data-tooltip="' +
            t("navSkills") +
            '">' +
            '<svg class="nav-icon nav-icon-fill" viewBox="0 0 24 24" aria-hidden="true">' +
              '<rect x="3.5" y="3.5" width="7" height="7" rx="1.2"></rect>' +
              '<rect x="13.5" y="3.5" width="7" height="7" rx="1.2"></rect>' +
              '<rect x="3.5" y="13.5" width="7" height="7" rx="1.2"></rect>' +
              '<rect x="13.5" y="13.5" width="7" height="7" rx="1.2"></rect>' +
            "</svg>" +
            '<span class="nav-label">' + t("navSkills") + "</span>" +
          "</button>" +
          '<div class="nav-dd-menu" role="menu">' +
            '<a href="' + href("skills/") + '" role="menuitem">' + t("navAllSkills") + "</a>" +
            '<a href="' + href("skills/categories/") + '" role="menuitem">' + t("navCategories") + "</a>" +
            '<a href="' + href("skills/tags/") + '" role="menuitem">' + t("navTags") + "</a>" +
            '<a href="' + href("skills/top/") + '" role="menuitem">' + t("navTopSkills") + "</a>" +
          "</div>" +
        "</div>" +
        '<div class="nav-dd">' +
          '<button type="button" class="nav-dd-btn" aria-expanded="false" aria-haspopup="true" aria-label="' +
            t("navAssets") +
            '" data-tooltip="' +
            t("navAssets") +
            '">' +
            '<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">' +
              '<path d="M4 7h16v12H4z"></path><path d="M8 7V5h8v2"></path>' +
            "</svg>" +
            '<span class="nav-label">' + t("navAssets") + "</span>" +
          "</button>" +
          '<div class="nav-dd-menu" role="menu">' +
            '<a href="' + href("assets/") + '" role="menuitem">' + t("navAllAssets") + "</a>" +
            '<a href="' + href("assets/categories/") + '" role="menuitem">' + t("navCategories") + "</a>" +
            '<a href="' + href("assets/tags/") + '" role="menuitem">' + t("navTags") + "</a>" +
            '<a href="' + href("assets/top/") + '" role="menuitem">' + t("navTopAssets") + "</a>" +
          "</div>" +
        "</div>" +
        '<a class="nav-icon-link" href="' + href("saved/") + '" aria-label="' +
          t("navSaved") +
          '" data-tooltip="' +
          t("navSaved") +
          '">' +
          '<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">' +
            '<path d="M7 3h10v18l-5-3.2L7 21V3z"></path>' +
          "</svg>" +
          '<span class="nav-label">' + t("navSaved") + "</span>" +
        "</a>" +
      "</nav>";
  }

  var PATREON_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true"><circle cx="14.48" cy="9.73" r="7.23"/><rect x="2" y="2.5" width="4.5" height="19" rx="0.5"/></svg>';

  function ensureBootstrapIcons() {
    if (document.querySelector("link[data-bootstrap-icons]")) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css";
    link.setAttribute("data-bootstrap-icons", "");
    document.head.appendChild(link);
  }

  function socialIconMarkup(icon) {
    if (icon === "patreon") {
      return '<span class="site-footer-icon site-footer-icon-svg" aria-hidden="true">' + PATREON_ICON_SVG + "</span>";
    }
    var bi = icon === "itch" ? "controller" : icon;
    return '<i class="bi bi-' + bi + '" aria-hidden="true"></i>';
  }

  function externalLink(label, url) {
    return (
      '<a href="' +
      url +
      '" rel="noopener" target="_blank">' +
      label +
      "</a>"
    );
  }

  function injectFooter() {
    var mount = document.querySelector("[data-site-footer]") || document.querySelector("footer.foot");
    if (!mount) return;

    ensureBootstrapIcons();

    var contactUrl = studioHome + "contact/";
    var stores =
      (window.RogueCatalog && RogueCatalog.studioStores) || {
        gumroad: "https://roguedevstudio.gumroad.com",
        sketchfab: "https://sketchfab.com/rogue-dev-studio",
        shutterstock: "https://www.shutterstock.com/g/ArisHadisopiyan",
        turbosquid: "https://www.turbosquid.com/Search/Artists/ArisHadisopiyan",
        cgtrader: "https://www.cgtrader.com/aris-hadisopiyan",
        itch: "https://rogue-dev-studio.itch.io"
      };

    var socials = [
      { label: "GitHub", url: "https://github.com/rogue-dev-studio", icon: "github" },
      { label: "GitLab", url: "https://gitlab.com/rogue-dev-studio", icon: "gitlab" },
      { label: "Patreon", url: "https://www.patreon.com/cw/roguedevstudio", icon: "patreon" },
      { label: "itch.io", url: "https://rogue-dev-studio.itch.io", icon: "itch" },
      { label: "LinkedIn", url: "https://www.linkedin.com/in/arishadisopiyan/", icon: "linkedin" },
      { label: "Instagram", url: "https://www.instagram.com/aya.erisu/", icon: "instagram" }
    ];

    var sources = [
      { label: "Sketchfab", url: stores.sketchfab },
      { label: "Shutterstock", url: stores.shutterstock },
      { label: "TurboSquid", url: stores.turbosquid },
      { label: "CGTrader", url: stores.cgtrader },
      { label: "itch.io", url: stores.itch },
      { label: "Gumroad", url: stores.gumroad }
    ];

    var sponsors = [
      {
        label: "GitHub Sponsors",
        url: "https://github.com/sponsors/rogue-dev-studio",
        icon: "heart"
      },
      {
        label: "Patreon",
        url: "https://www.patreon.com/cw/roguedevstudio",
        icon: "patreon"
      },
      {
        label: "Buy Me a Coffee",
        url: "https://www.buymeacoffee.com/roguedevstudio",
        icon: "cup-hot"
      },
      {
        label: "Ko-fi",
        url: "https://ko-fi.com/roguedevstudio",
        icon: "cup-straw"
      },
      {
        label: "PayPal",
        url: "https://www.paypal.com/ncp/payment/AQRMXB39CCQTW",
        icon: "paypal"
      }
    ];

    var lang = I18n ? I18n.getLang() : "en";

    mount.className = "site-footer";
    mount.setAttribute("data-site-footer", "");
    mount.innerHTML =
      '<div class="site-footer-main">' +
        '<div class="site-footer-brand">' +
          '<a class="site-footer-logo" href="' + href("") + '">' + t("brand") + "</a>" +
          "<p>" + t("footerBrand") + "</p>" +
        "</div>" +
        '<div class="site-footer-cols">' +
          '<div class="site-footer-col site-footer-lang-col">' +
            "<h3>" + t("langHeading") + "</h3>" +
            '<label class="sr-only" for="site-footer-lang">' + t("langLabel") + "</label>" +
            '<select id="site-footer-lang" class="site-footer-lang" data-site-lang aria-label="' +
              t("langLabel") +
              '">' +
              '<option value="en"' +
              (lang === "en" ? " selected" : "") +
              ">English</option>" +
              '<option value="id"' +
              (lang === "id" ? " selected" : "") +
              ">Bahasa Indonesia</option>" +
            "</select>" +
          "</div>" +
          '<div class="site-footer-col">' +
            "<h3>" + t("browseHeading") + "</h3>" +
            '<a href="' + href("servers/") + '">' + t("navMcp") + "</a>" +
            '<a href="' + href("skills/") + '">' + t("navSkills") + "</a>" +
            '<a href="' + href("assets/") + '">' + t("navAssets") + "</a>" +
            '<a href="https://github.com/rogue-dev-studio/ai-agents-rogue" rel="noopener" target="_blank">' +
              t("agentsComplete") +
              "</a>" +
            '<a href="https://github.com/rogue-dev-studio/ai-agents-rogue-programmer" rel="noopener" target="_blank">' +
              t("agentProgrammer") +
              "</a>" +
          "</div>" +
          '<div class="site-footer-col">' +
            "<h3>" + t("sourcesHeading") + "</h3>" +
            sources
              .map(function (s) {
                return externalLink(s.label, s.url);
              })
              .join("") +
          "</div>" +
          '<div class="site-footer-col">' +
            "<h3>" + t("companyHeading") + "</h3>" +
            '<a href="' + studioHome + '" rel="noopener">' + t("studioSite") + "</a>" +
            '<a href="' + href("privacy/") + '">' + t("privacy") + "</a>" +
            '<a href="' + href("terms/") + '">' + t("terms") + "</a>" +
            '<a href="' + contactUrl + '" rel="noopener">' + t("contactUs") + "</a>" +
          "</div>" +
          '<div class="site-footer-col">' +
            "<h3>" + t("supportHeading") + "</h3>" +
            '<div class="site-footer-sponsors" aria-label="' + t("sponsorsAria") + '">' +
              sponsors
                .map(function (s) {
                  return (
                    '<a class="site-footer-sponsor" href="' +
                    s.url +
                    '" rel="noopener" target="_blank">' +
                    socialIconMarkup(s.icon) +
                    "<span>" +
                    s.label +
                    "</span></a>"
                  );
                })
                .join("") +
            "</div>" +
          "</div>" +
        "</div>" +
      "</div>" +
      '<div class="site-footer-bottom">' +
        "<p>© 2026 Rogue Asset Store</p>" +
        '<div class="site-footer-socials site-footer-socials--bottom" aria-label="' +
          t("socialsAria") +
          '">' +
          socials
            .map(function (s) {
              return (
                '<a class="site-footer-social" href="' +
                s.url +
                '" rel="noopener" target="_blank" aria-label="' +
                s.label +
                '" data-tooltip="' +
                s.label +
                '">' +
                socialIconMarkup(s.icon) +
                "</a>"
              );
            })
            .join("") +
        "</div>" +
      "</div>";
  }

  function wireHeaderSearch() {
    var form = document.querySelector(".site-header-search");
    var input = document.querySelector("[data-site-search]");
    if (!form || !input) return;

    var hasCatalog = !!document.querySelector("[data-catalog]");
    if (hasCatalog) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      return;
    }

    form.addEventListener("submit", function (e) {
      var value = (input.value || "").trim();
      if (!value) {
        e.preventDefault();
        location.href = searchTarget();
        return;
      }
    });
  }

  function wireSearchClearButtons() {
    function syncAll() {
      document.querySelectorAll("[data-catalog-search], [data-site-search]").forEach(function (input) {
        var wrap = input.closest(".site-header-search, .search-bar");
        if (!wrap) return;
        var btn = wrap.querySelector("[data-search-clear]");
        if (!btn) return;
        var hasValue = !!(input.value || "").length;
        if (hasValue) btn.removeAttribute("hidden");
        else btn.setAttribute("hidden", "");
        wrap.classList.toggle("has-search-value", hasValue);
      });
    }

    document.querySelectorAll("[data-catalog-search], [data-site-search]").forEach(function (input) {
      var wrap = input.closest(".site-header-search, .search-bar");
      if (!wrap) return;
      var btn = wrap.querySelector("[data-search-clear]");
      if (!btn) {
        btn = document.createElement("button");
        btn.type = "button";
        btn.className = "search-clear";
        btn.setAttribute("data-search-clear", "");
        btn.innerHTML =
          '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">' +
            '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/>' +
          "</svg>";
        input.insertAdjacentElement("afterend", btn);
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          input.value = "";
          syncAll();
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.focus();
        });
      }
      btn.setAttribute("aria-label", t("searchClear") || "Clear search");

      if (input.getAttribute("data-search-clear-input") !== "1") {
        input.setAttribute("data-search-clear-input", "1");
        input.addEventListener("input", syncAll);
        input.addEventListener("change", syncAll);
      }
    });
    syncAll();
  }

  var docChromeWired = false;

  function wireDropdowns() {
    var menus = document.querySelectorAll(".nav-dd");
    if (!menus.length) return;

    function closeAll(except) {
      document.querySelectorAll(".nav-dd").forEach(function (dd) {
        if (except && dd === except) return;
        dd.classList.remove("is-open");
        var btn = dd.querySelector(".nav-dd-btn");
        if (btn) btn.setAttribute("aria-expanded", "false");
      });
    }

    menus.forEach(function (dd) {
      var btn = dd.querySelector(".nav-dd-btn");
      if (!btn) return;
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var open = dd.classList.contains("is-open");
        closeAll();
        if (!open) {
          dd.classList.add("is-open");
          btn.setAttribute("aria-expanded", "true");
        }
      });
    });

    if (!docChromeWired) {
      docChromeWired = true;
      document.addEventListener("click", function () {
        closeAll();
        closeMobileNav();
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          closeAll();
          closeMobileNav();
        }
      });
    }
  }

  function closeMobileNav() {
    var top = document.querySelector(".top");
    var toggle = document.querySelector(".nav-toggle");
    if (!top) return;
    top.classList.remove("is-nav-open");
    document.body.classList.remove("nav-open");
    if (toggle) {
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", t("openMenu"));
    }
  }

  function wireMobileNav() {
    var top = document.querySelector(".top");
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.querySelector(".nav");
    if (!top || !toggle || !nav) return;

    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = top.classList.toggle("is-nav-open");
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? t("closeMenu") : t("openMenu"));
    });

    nav.addEventListener("click", function (e) {
      e.stopPropagation();
      if (e.target && e.target.closest && e.target.closest("a[href]")) {
        closeMobileNav();
      }
    });
  }

  function refreshChrome() {
    injectNav();
    injectFooter();
    wireHeaderSearch();
    wireSearchClearButtons();
    wireDropdowns();
    wireMobileNav();
    if (I18n) {
      I18n.wireSelects();
      I18n.applyDocument(I18n.getLang());
      I18n.syncSelects(I18n.getLang());
    }
  }

  if (I18n) {
    I18n.apply(I18n.getLang());
  }

  refreshChrome();

  if (I18n) {
    window.addEventListener("site-lang-change", function () {
      refreshChrome();
    });
  }

  document.querySelectorAll(".subnav a").forEach(function (a) {
    try {
      var here = location.pathname.replace(/\/index\.html$/, "").replace(/\/+$/, "");
      var link = new URL(a.getAttribute("href"), location.href).pathname
        .replace(/\/index\.html$/, "")
        .replace(/\/+$/, "");
      if (here === link) a.setAttribute("aria-current", "page");
    } catch (err) {}
  });
})();
