/* ========================================
   BUSY BEE — Header interactions
   ========================================
   Handles the three dropdown menus in the header (Catalog, Language,
   Profile) plus the Theme icon toggle inside the profile dropdown.

   All three dropdowns follow the same pattern:
   - click the button  -> toggle ".open" on the dropdown
   - click anywhere else on the page -> close it
   ======================================== */


/* ========================================
   Сезонные эффекты — подгрузка на ВСЕХ страницах
   ========================================
   script.js подключён на каждой странице, поэтому seasonal-effects.js
   подгружается отсюда — вручную в каждый HTML его вставлять не нужно.
   Что именно он делает (шапочка на логотипе на всех страницах; снег и
   листья с кнопкой — только на главной) и когда (по датам) — решает он
   сам, см. комментарий в начале seasonal-effects.js. Не сезон — файл
   ничего не рисует.

   Адрес файла считается от адреса самого script.js, а не от текущей
   страницы, поэтому работает и из подпапок. Если seasonal-effects.js
   уже подключён на странице вручную — второй раз не грузим.

   Убрать всё с сайта разом: удалить этот блок. */
(function loadSeasonalEffects() {
    if (document.querySelector('script[src*="seasonal-effects.js"]')) return;

    const here = document.currentScript ? document.currentScript.src : location.href;
    const script = document.createElement("script");
    script.src = new URL("seasonal-effects.js", here).href;
    document.body.appendChild(script);
})();


// Кэш getNovelData() (сама функция — ниже, в блоке «Reader / Chapter»).
// Общий для всех страниц, которые запрашивают данные новелл (главная,
// каталог, коллекции и т.д.) — держим его здесь, а не в index-script.js,
// чтобы кэш не заводился заново для каждой страницы отдельно.
const novelDataCache = {};


/* ========================================
   TESTING TOGGLE — Header signed-in state
   ========================================
   The header has two states, same idea as the hero toggle above:
   - IS_LOGGED_IN = true  -> profile menu (.user-menu)
   - IS_LOGGED_IN = false -> single icon-only login button (.header-login-button)

   Bookmarks / bell / theme stay visible either way — they're not
   account-specific enough to hide from guests.

   Change this one value and reload the page to preview either state.
   Later this will come from real auth state instead of being hardcoded here.
   ======================================== */
const IS_LOGGED_IN = true;

const userMenu = document.querySelector(".user-menu");
const headerLoginButton = document.querySelector(".header-login-button");

if (userMenu && headerLoginButton) {
    userMenu.style.display = IS_LOGGED_IN ? "block" : "none";
    headerLoginButton.style.display = IS_LOGGED_IN ? "none" : "flex";
}

// Вход/выход в бургер-меню (mobile-nav.js): показываем один из двух пунктов
document.querySelectorAll("[data-auth]").forEach((el) => {
    el.hidden = (el.dataset.auth === "logged-in") !== IS_LOGGED_IN;
});

// Иконка закладок в шапке (на всех страницах) открывает страницу «Закладки»
document.querySelectorAll(".header-bookmark-button").forEach((button) => {
    button.addEventListener("click", () => {
        if (!window.location.pathname.endsWith("bookmarks.html")) {
            window.location.href = "bookmarks.html";
        }
    });
});


/* ---------- Catalog dropdown ---------- */

const catalogButton = document.querySelector(".catalog-button");
const catalogDropdown = document.querySelector(".catalog-dropdown");

// Guarded: pages without the main header (e.g. reader.html) don't have
// a catalog dropdown at all, so this is a no-op there instead of an error
if (catalogButton && catalogDropdown) {
    catalogButton.addEventListener("click", (event) => {
        // Stops this click from also triggering the "close all dropdowns"
        // listener registered on `document` further down this file
        event.stopPropagation();
        catalogDropdown.classList.toggle("open");
    });
}


/* ---------- Language dropdown ---------- */

const languageButton = document.querySelector(".language-button");
const languageDropdown = document.querySelector(".language-dropdown");
const languageOptions = document.querySelectorAll(".language-option");

if (languageButton && languageDropdown) {
    languageButton.addEventListener("click", (event) => {
        event.stopPropagation();
        languageDropdown.classList.toggle("open");
    });
}

// Clicking a language: mark it active and close the dropdown.
// This is visual only for now — it doesn't translate the page yet.
languageOptions.forEach((option) => {
    option.addEventListener("click", () => {
        languageOptions.forEach((item) => item.classList.remove("active"));
        option.classList.add("active");
        languageDropdown.classList.remove("open");
    });
});


/* ---------- Footer language switcher (Ru / Eng) ---------- */

// Same idea as the header's language dropdown above, just flattened —
// two plain buttons instead of a button that opens a dropdown, so no
// open/close logic needed, just swap which one is .active on click.
const footerLanguageOptions = document.querySelectorAll(".footer-language-option");

footerLanguageOptions.forEach((option) => {
    option.addEventListener("click", () => {
        footerLanguageOptions.forEach((item) => item.classList.remove("active"));
        option.classList.add("active");
    });
});


/* ---------- Profile dropdown ---------- */

const userButton = document.querySelector(".user-button");
const userDropdown = document.querySelector(".user-dropdown");

if (userButton && userDropdown) {
    userButton.addEventListener("click", (event) => {
        event.stopPropagation();
        userDropdown.classList.toggle("open");
    });
}

/* ---------- Тема: светлая / тёмная ----------
   Переключатель луна/солнце виден и гостю, и вошедшему читателю.
   querySelectorAll (а не один элемент шапки), потому что у мобильной
   панели-бургера (mobile-nav.js) есть своя копия этой же кнопки — обе
   всегда показывают одно и то же.

   Как это работает:
     • theme-init.js (в <head>, до отрисовки страницы) уже поставил
       <html data-theme="light|dark"> — из localStorage (ключ ниже) или,
       если читатель ещё не выбирал, по настройке системы;
     • здесь мы только читаем это значение, меняем его по клику,
       запоминаем выбор и перерисовываем иконку;
     • сами цвета тёмной темы — в theme-dark.css, на этой странице
       подключаются через <html data-theme="dark">.
   На reader.html (там свои темы читалки) переключателя нет, и этот
   блок просто ничего не делает. */
const THEME_KEY = "busybee_theme"; // "light" | "dark"
const themeToggles = document.querySelectorAll(".theme-toggle");
let isDarkTheme = document.documentElement.getAttribute("data-theme") === "dark";

function paintThemeToggles() {
    themeToggles.forEach((toggle) => {
        const icon = toggle.querySelector("img");
        if (icon) icon.src = isDarkTheme ? "images/icons/sun.svg" : "images/icons/moon.svg";
    });
}

function applyTheme(dark, remember) {
    isDarkTheme = dark;
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    if (remember) {
        try {
            localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
        } catch (error) {
            // localStorage недоступен — выбор просто не запомнится
        }
    }
    paintThemeToggles();
}

themeToggles.forEach((toggle) => {
    toggle.addEventListener("click", (event) => {
        // No longer needed for a dropdown-closing reason (this button
        // isn't inside a dropdown anymore), left in as a harmless no-op
        event.stopPropagation();

        applyTheme(!isDarkTheme, true);
    });
});

// Иконка должна соответствовать теме, которую уже поставил theme-init.js
paintThemeToggles();

// Пока читатель сам ничего не выбирал, следуем настройке системы «вживую»
// (например, телефон переключился на ночной режим)
if (window.matchMedia) {
    const systemDarkQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemThemeChange = (event) => {
        let hasChoice = false;
        try { hasChoice = !!localStorage.getItem(THEME_KEY); } catch (error) { /* нет доступа */ }
        if (!hasChoice) applyTheme(event.matches, false);
    };
    if (systemDarkQuery.addEventListener) systemDarkQuery.addEventListener("change", onSystemThemeChange);
}


/* ========================================
   MOBILE MENU (бургер) + НИЖНЯЯ ПАНЕЛЬ
   ========================================
   Разметка обеих вещей — не здесь: бургер-кнопка сама по себе лежит в
   header.js (просто кнопка-иконка, ей не нужен position:fixed), а то,
   что она открывает (.mobile-nav-overlay), и сама .bottom-nav —
   в mobile-nav.js, который вставляет их ВНЕ .page-shell (у него
   overflow:hidden и zoom — fixed-элементы внутри вели бы себя
   непредсказуемо). Здесь — только поведение после того, как обе
   разметки уже в DOM (mobile-nav.js подключается раньше этого файла).

   BOTTOM_NAV_FIFTH_TAB — какая вкладка занимает пятое место в нижней
   панели: "profile" (сейчас) или "announcements" (когда профиля ещё
   нет на сайте). Меняется одной строкой, без правки разметки — обе
   вкладки уже лежат в mobile-nav.js, лишняя просто скрывается. */
const BOTTOM_NAV_FIFTH_TAB = "profile"; // "profile" | "announcements"

const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileNavOverlay = document.getElementById("mobileNavOverlay");

if (mobileMenuBtn && mobileNavOverlay) {
    const menuIcon = mobileMenuBtn.querySelector("img");
    const backdrop = mobileNavOverlay.querySelector(".mobile-nav-backdrop");
    const closeBtn = mobileNavOverlay.querySelector(".mobile-nav-close");

    function openMobileNav() {
        mobileNavOverlay.classList.add("open");
        mobileMenuBtn.setAttribute("aria-expanded", "true");
        document.body.classList.add("mobile-nav-locked");
        if (menuIcon) menuIcon.src = menuIcon.dataset.filled;
    }

    function closeMobileNav() {
        mobileNavOverlay.classList.remove("open");
        mobileMenuBtn.setAttribute("aria-expanded", "false");
        document.body.classList.remove("mobile-nav-locked");
        if (menuIcon) menuIcon.src = menuIcon.dataset.outline;
    }

    mobileMenuBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        if (mobileNavOverlay.classList.contains("open")) closeMobileNav();
        else openMobileNav();
    });

    if (backdrop) backdrop.addEventListener("click", closeMobileNav);
    if (closeBtn) closeBtn.addEventListener("click", closeMobileNav);

    // Переход по любой ссылке внутри панели — она должна закрыться,
    // а не остаться открытой поверх новой загруженной страницы
    mobileNavOverlay.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", closeMobileNav);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && mobileNavOverlay.classList.contains("open")) closeMobileNav();
    });

    // Скрываем в панели ту вкладку, что и так уже есть в нижней панели
    // (сейчас это «Профиль» ИЛИ «Анонсы», смотря что выбрано выше)
    const duplicateLink = mobileNavOverlay.querySelector(
        `[data-duplicate-of="${BOTTOM_NAV_FIFTH_TAB}"]`
    );
    if (duplicateLink) duplicateLink.hidden = true;
}


/* ---------- Нижняя панель: пятая вкладка + подсветка активной ---------- */
const bottomNav = document.querySelector(".bottom-nav");

if (bottomNav) {
    // Пятая вкладка — профиль или анонсы, см. BOTTOM_NAV_FIFTH_TAB выше
    bottomNav.querySelectorAll("[data-fifth-tab]").forEach((item) => {
        item.hidden = item.dataset.fifthTab !== BOTTOM_NAV_FIFTH_TAB;
    });

    // Активная вкладка — по имени текущего файла, не по полному адресу
    // (у catalog.html, bookmarks.html и т.д. бывают ?query-параметры)
    const currentPage = window.location.pathname.split("/").pop() || "index.html";

    // Страницы, которые «живут внутри» каталога: на них подсвечиваем
    // вкладку «Каталог», хотя адрес у них другой — catalog.html это
    // только общий список новелл, а жанры, авторы, коллекции, глоссарий
    // и страницы самих новелл открываются из него же (через выпадающее
    // меню «Каталог» на десктопе). Добавилась новая страница каталога —
    // допиши её имя файла в этот список.
    const CATALOG_SECTION_PAGES = [
        "catalog.html",
        "novel.html",
        "authors.html", "author.html",
        "genres.html", "genre.html",
        "collections.html", "collection.html",
        "glossary.html"
    ];
    const activePage = CATALOG_SECTION_PAGES.includes(currentPage) ? "catalog.html" : currentPage;

    // Центральная кнопка (#bottomNavCenter) намеренно не участвует:
    // это кнопка-действие «продолжить чтение», а не «вы здесь», и её
    // href в момент этой проверки ещё запасной (catalog.html) — само
    // чтение подставляется позже, отдельным блоком ближе к концу файла
    bottomNav.querySelectorAll(".bottom-nav-item[href]:not(#bottomNavCenter)").forEach((item) => {
        const itemPage = item.getAttribute("href").split("?")[0].split("#")[0];
        if (itemPage === activePage || (currentPage === "" && itemPage === "index.html")) {
            item.classList.add("active");
        }
    });
}


/* ---------- Поиск в шапке на мобильном — сворачивается до иконки ----------
   На узких экранах .search схлопывается в одну круглую иконку (см.
   style.css, медиа-запрос 768px); тап по ней разворачивает инпут,
   повторный тап вне поля — сворачивает обратно. На десктопе .search
   всегда развёрнут, этот код там просто не нужен (клик по уже
   развёрнутому полю ничего не переключает за пределами breakpoint'а). */
const headerSearch = document.querySelector(".header-actions > .search");

if (headerSearch) {
    const searchInput = headerSearch.querySelector("input");

    headerSearch.addEventListener("click", (event) => {
        if (headerSearch.classList.contains("expanded")) return;
        event.stopPropagation();
        headerSearch.classList.add("expanded");
        searchInput?.focus();
    });

    document.addEventListener("click", (event) => {
        if (!headerSearch.contains(event.target)) {
            headerSearch.classList.remove("expanded");
        }
    });
}


/* ---------- Carousels (Busy Bee Recommends + Explore by Genre) ---------- */

// Generic setup: each carousel wrapper (.book-carousel, .genre-carousel,
// .collection-carousel)
// contains one scrollable ".carousel-track" and two ".carousel-arrow"
// buttons (prev, next). Scrolls by roughly one card's width each click,
// and wraps around at either end (next from the last card jumps back
// to the first, prev from the first card jumps to the last) so the
// arrows work in a continuous loop rather than stopping dead.
// Scoping the query to `wrapper` keeps the two carousels independent —
// clicking a genre arrow should never scroll the book list, etc.
function setupCarousel(wrapper) {
    const track = wrapper.querySelector(".carousel-track");
    const arrows = wrapper.querySelectorAll(".carousel-arrow");
    const card = track?.firstElementChild;
    if (!track || !card) return;

    arrows.forEach((arrow, index) => {
        const direction = index === 0 ? -1 : 1; // first arrow = prev, second = next

        arrow.addEventListener("click", () => {
            const trackGap = parseFloat(getComputedStyle(track).gap) || 0;
            const step = card.offsetWidth + trackGap;
            const maxScroll = track.scrollWidth - track.clientWidth;

            const atStart = track.scrollLeft <= 1;
            const atEnd = track.scrollLeft >= maxScroll - 1;

            if (direction === 1 && atEnd) {
                track.scrollTo({ left: 0, behavior: "smooth" }); // wrap to first
            } else if (direction === -1 && atStart) {
                track.scrollTo({ left: maxScroll, behavior: "smooth" }); // wrap to last
            } else {
                track.scrollBy({ left: direction * step, behavior: "smooth" });
            }
        });
    });
}

document.querySelectorAll(".book-carousel, .genre-carousel, .collection-carousel, .quotes-carousel, .recommends-carousel").forEach(setupCarousel);


/* ---------- Book cards & hero: bookmark toggle ---------- */
// Same outline/filled <img> swap as the favorite (heart) buttons below —
// keeps every bookmark-style button on the site (card corner, hero
// "Continue Reading" card, etc.) behaving identically

const miniBookmarks = document.querySelectorAll(".mini-bookmark, .hero-bookmark-button");

miniBookmarks.forEach((button) => {
    const icon = button.querySelector("img");

    button.addEventListener("click", (event) => {
        // Don't let the click bubble up to the <article> in case it
        // becomes a clickable link to the book page later
        event.stopPropagation();

        // Закладки на карточках новелл ведёт bindNovelBookmarks (ниже)
        if (button.dataset.novelId) return;

        const isSaved = button.classList.toggle("active");
        button.setAttribute("aria-pressed", isSaved);
        icon.src = isSaved ? icon.dataset.filled : icon.dataset.outline;
    });
});


/* ---------- Chapters table: favorite (heart) toggle ---------- */
// Swaps the <img> between the outline and filled heart files instead
// of recoloring via CSS — simplest thing that renders identically
// everywhere, no mask-image browser quirks to worry about

const favoriteButtons = document.querySelectorAll(".favorite-btn");

favoriteButtons.forEach((button) => {
    const icon = button.querySelector("img");

    button.addEventListener("click", () => {
        const isSaved = button.classList.toggle("active");
        button.setAttribute("aria-pressed", isSaved);
        icon.src = isSaved ? icon.dataset.filled : icon.dataset.outline;

        // Re-apply the chapters Filter dropdown (if defined further down
        // this file) in case "Favorited" is the active filter — a row
        // should disappear the instant its heart is unclicked
        if (typeof applyChapterFilters === "function") applyChapterFilters();
    });
});


/* ---------- Click outside closes whichever dropdown is open ---------- */

document.addEventListener("click", (event) => {
    if (catalogDropdown && !catalogDropdown.contains(event.target) && event.target !== catalogButton) {
        catalogDropdown.classList.remove("open");
    }

    if (languageDropdown && !languageDropdown.contains(event.target) && event.target !== languageButton) {
        languageDropdown.classList.remove("open");
    }

    if (userDropdown && userButton && !userDropdown.contains(event.target) && !userButton.contains(event.target)) {
        userDropdown.classList.remove("open");
    }
});


/* ---------- Favorite novels (localStorage) ----------
   Which novels the reader has hearted on novel.html — independent of
   reading status (Reading / Completed / ...). No backend yet, so this
   is a per-browser convenience, same idea and shape as reading
   progress further down this file.
   Storage shape: { "<novelId>": { addedAt: <ISO> } }

   NOTE: код страницы новеллы живёт в novel-script.js и подключается
   ПОСЛЕ этого файла — поэтому FAVORITE_NOVELS_KEY (`const`, не
   поднимается как function) к его запуску уже объявлен. Если код
   страницы когда-нибудь вернётся сюда, он должен стоять ниже этой
   строки, иначе isNovelFavorited() упадёт в temporal dead zone. */
const FAVORITE_NOVELS_KEY = "busybee_favorite_novels";

function getFavoriteNovelIds() {
    try {
        const all = JSON.parse(localStorage.getItem(FAVORITE_NOVELS_KEY)) || {};
        // Most recently favorited first
        return Object.entries(all)
            .sort(([, a], [, b]) => new Date(b.addedAt) - new Date(a.addedAt))
            .map(([novelId]) => novelId);
    } catch (error) {
        return [];
    }
}

function isNovelFavorited(novelId) {
    try {
        const all = JSON.parse(localStorage.getItem(FAVORITE_NOVELS_KEY)) || {};
        return Boolean(all[novelId]);
    } catch (error) {
        return false;
    }
}

function setNovelFavorited(novelId, isFavorited) {
    try {
        const all = JSON.parse(localStorage.getItem(FAVORITE_NOVELS_KEY)) || {};
        if (isFavorited) {
            all[novelId] = { addedAt: new Date().toISOString() };
        } else {
            delete all[novelId];
        }
        localStorage.setItem(FAVORITE_NOVELS_KEY, JSON.stringify(all));
    } catch (error) {
        console.error("Couldn't save favorite novels:", error);
    }
}

/* ---------- Reading shelves (localStorage) ----------
   На какой «полке» лежит новелла: Читаю / Буду читать / Отложено /
   Прочитано / Брошено. Статус один на новеллу (взаимоисключающий),
   независим от избранного ♡ выше. Ставится выпадающим списком на
   novel.html, читается страницей «Моя библиотека».
   Storage shape: { "<novelId>": { shelf: "<key>", addedAt: <ISO> } }

   Ключи полок: reading | planned | paused | completed | dropped
   (те же, что в адресе library.html#reading и в data-shelf).

   NOTE: как и FAVORITE_NOVELS_KEY, стоит ВЫШЕ блока "NOVEL PAGE" —
   `const` не поднимается, а код страницы новеллы вызывает эти
   функции сразу при загрузке. */
const NOVEL_SHELVES_KEY = "busybee_shelves";
const SHELF_KEYS = ["reading", "planned", "paused", "completed", "dropped"];

function readNovelShelves() {
    try {
        return JSON.parse(localStorage.getItem(NOVEL_SHELVES_KEY)) || {};
    } catch (error) {
        return {};
    }
}

// Ключ полки новеллы или null, если она ни на какой не лежит
function getNovelShelf(novelId) {
    const entry = readNovelShelves()[novelId];
    return entry && SHELF_KEYS.includes(entry.shelf) ? entry.shelf : null;
}

// shelf = ключ полки, либо null/"" — убрать новеллу с полки
function setNovelShelf(novelId, shelf) {
    try {
        const all = readNovelShelves();
        if (shelf && SHELF_KEYS.includes(shelf)) {
            all[novelId] = { shelf, addedAt: new Date().toISOString() };
        } else {
            delete all[novelId];
        }
        localStorage.setItem(NOVEL_SHELVES_KEY, JSON.stringify(all));
    } catch (error) {
        console.error("Couldn't save reading shelf:", error);
    }
}

// id новелл на полке, недавно добавленные — первыми
function getShelfNovelIds(shelf) {
    return Object.entries(readNovelShelves())
        .filter(([, entry]) => entry && entry.shelf === shelf)
        .sort(([, a], [, b]) => new Date(b.addedAt) - new Date(a.addedAt))
        .map(([novelId]) => novelId);
}

// Начал читать главу → новелла сама попадает на полку «Читаю».
// Трогаем только «ничью» новеллу и «Буду читать» (читать начали —
// план выполнен). Всё, что читатель выбрал сам — «Отложено»,
// «Брошено», «Прочитано» — не перезаписываем: перечитывание
// дочитанной новеллы не должно сбрасывать её статус.
function markNovelAsReadingIfNew(novelId) {
    const shelf = getNovelShelf(novelId);
    if (!shelf || shelf === "planned") {
        setNovelShelf(novelId, "reading");
    }
}

/* ---------- Общее для страниц «аккаунта» (библиотека, избранное…) ---------- */

// Горизонтальные вкладки, у каждой — своя панель (aria-controls).
// Выбранная вкладка живёт в адресе (page.html#ключ): ссылки извне
// открывают нужную вкладку, а «назад» в браузере работает.
// keyOf(tab) — ключ вкладки для адреса. ← → Home End двигают выбор.
function setupHashTabs(tabs, keyOf) {
    function select(tab, { updateHash = true } = {}) {
        tabs.forEach((t) => {
            const isActive = t === tab;
            t.classList.toggle("active", isActive);
            t.setAttribute("aria-selected", isActive);
            t.tabIndex = isActive ? 0 : -1;

            const panel = document.getElementById(t.getAttribute("aria-controls"));
            if (panel) panel.hidden = !isActive;
        });

        if (updateHash) {
            history.replaceState(null, "", `#${keyOf(tab)}`);
        }
    }

    tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => select(tab));

        tab.addEventListener("keydown", (event) => {
            let next = null;
            if (event.key === "ArrowRight") next = tabs[(index + 1) % tabs.length];
            if (event.key === "ArrowLeft") next = tabs[(index - 1 + tabs.length) % tabs.length];
            if (event.key === "Home") next = tabs[0];
            if (event.key === "End") next = tabs[tabs.length - 1];
            if (!next) return;

            event.preventDefault();
            select(next);
            next.focus();
        });
    });

    function selectFromHash() {
        const key = location.hash.slice(1);
        const tab = tabs.find((t) => keyOf(t) === key);
        if (tab) select(tab, { updateHash: false });
    }

    selectFromHash();
    window.addEventListener("hashchange", selectFromHash);
}

// Карточка новеллы для сеток: обложка, название, автор
function novelCoverCardHtml(novelId, novel) {
    return `
        <a href="novel.html?id=${encodeURIComponent(novelId)}" class="fav-novel-card">
            <img src="${novel.cover}" alt="">
            <h4>${novel.title}</h4>
            <span class="fav-novel-author">${novel.author ? novel.author.name : ""}</span>
        </a>`;
}

// Выводит новеллы по списку id в сетку { ids, grid, empty, count }:
// grid — контейнер, empty — «пока пусто» (показывается, когда карточек нет),
// count — где написать число. Число ставится сразу по длине списка и
// уточняется, когда данные пришли: удалённые новеллы пропускаются.
function renderNovelGrid({ ids, grid, empty, count }) {
    if (count) count.textContent = ids.length;
    if (!grid) return Promise.resolve();

    if (ids.length === 0 || typeof getNovelData !== "function") {
        grid.innerHTML = "";
        if (empty) empty.hidden = false;
        return Promise.resolve();
    }

    return Promise.all(
        ids.map((id) =>
            getNovelData(id)
                .then((novel) => ({ id, novel }))
                .catch(() => null)
        )
    ).then((results) => {
        const found = results.filter(Boolean);
        grid.innerHTML = found.map(({ id, novel }) => novelCoverCardHtml(id, novel)).join("");
        if (empty) empty.hidden = found.length > 0;
        if (count) count.textContent = found.length;
    });
}

/* ---------- Сохранённые цитаты и заметки (localStorage) ----------
   Их пишет читалка (кнопки «Цитата» / «Заметка» над выделенным текстом):
     busybee_quotes: [{ novelId, text, chapterTitle, chapterNumber, url, savedAt }]
     busybee_notes:  [{ novelId, quotedText, content, chapterTitle, chapterNumber, url, savedAt }]
   Читают страницы «Мои цитаты» / «Мои заметки» и виджеты профиля.
   У записей, сохранённых до появления novelId, новелла берётся из url
   (?novel=…), поэтому старые записи никуда не деваются. */

function getSavedList(storageKey) {
    try {
        return JSON.parse(localStorage.getItem(storageKey)) || [];
    } catch (error) {
        return [];
    }
}

function savedEntryNovelId(entry) {
    if (entry.novelId) return entry.novelId;
    try {
        return new URL(entry.url).searchParams.get("novel") || "kniga-grez";
    } catch (error) {
        return "kniga-grez";
    }
}

// Текст пользователя попадает в innerHTML — экранируем
function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// «18 мая, 2025»
function formatSavedDateLong(isoString) {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "";
    const dayMonth = date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
    return `${dayMonth}, ${date.getFullYear()}`;
}

// pluralRu(5, "цитата", "цитаты", "цитат") → "цитат"
function pluralRu(n, one, few, many) {
    const mod100 = n % 100;
    const mod10 = n % 10;
    if (mod100 >= 11 && mod100 <= 14) return many;
    if (mod10 === 1) return one;
    if (mod10 >= 2 && mod10 <= 4) return few;
    return many;
}

// Записи списка, новые — первыми, с названием новеллы, ссылками и датой.
// Названия тянутся из novels/<id>/<id>.json; если файла нет — запись
// всё равно показывается, просто без названия новеллы.
async function loadSavedEntries(storageKey) {
    const entries = getSavedList(storageKey).map((entry) => ({
        ...entry,
        novelId: savedEntryNovelId(entry),
    }));

    const novels = {};
    const novelIds = [...new Set(entries.map((entry) => entry.novelId))];
    await Promise.all(
        novelIds.map((id) =>
            getNovelData(id)
                .then((novel) => { novels[id] = novel; })
                .catch(() => {})
        )
    );

    return entries
        .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
        .map((entry) => {
            const id = encodeURIComponent(entry.novelId);
            const title = entry.chapterTitle && !entry.chapterTitle.includes("|") ? entry.chapterTitle : "";
            return {
                ...entry,
                novelTitle: (novels[entry.novelId] || {}).title || "",
                novelCover: (novels[entry.novelId] || {}).cover || "",
                novelHref: `novel.html?id=${id}`,
                chapterHref: chapterHref(entry.novelId, entry.chapterNumber || 1),
                chapterLabel: `Глава ${entry.chapterNumber || 1}${title ? `: ${title}` : ""}`,
                dateLabel: formatSavedDateLong(entry.savedAt),
            };
        });
}

function deleteSavedEntry(storageKey, savedAt) {
    try {
        const list = getSavedList(storageKey);
        const index = list.findIndex((entry) => entry.savedAt === savedAt);
        if (index === -1) return;
        list.splice(index, 1);
        localStorage.setItem(storageKey, JSON.stringify(list));
    } catch (error) {
        console.error("Couldn't delete saved entry:", error);
    }
}

// «Удалить» с подтверждением в два клика (на 3 секунды кнопка
// превращается в «Точно удалить?»), карточка ищется по data-saved-at.
// onChange — перерисовать список после удаления.
function setupSavedDelete(listEl, storageKey, onChange) {
    listEl.addEventListener("click", (event) => {
        const button = event.target.closest(".saved-delete");
        if (!button) return;

        if (!button.classList.contains("confirm")) {
            button.classList.add("confirm");
            button.textContent = "Точно удалить?";
            clearTimeout(button._resetTimer);
            button._resetTimer = setTimeout(() => {
                button.classList.remove("confirm");
                button.textContent = "Удалить";
            }, 3000);
            return;
        }

        const card = button.closest(".saved-card");
        deleteSavedEntry(storageKey, card.dataset.savedAt);
        onChange();
    });
}

/* ---------- Закладки-страницы (localStorage) ----------
   «Закладка» = место в тексте, куда хочется вернуться. Живёт в одном
   списке busybee_passage_bookmarks, читает его страница bookmarks.html
   (вкладка «Страницы»). Записи двух видов:
     • отрывок — выделила текст и нажала «Закладка» над ним (kind не задан);
     • место в главе — кнопка «Закладка» в шапке читалки (kind: "chapter").
       На главу — не больше одной: повторное нажатие снимает её.
   Shape: { novelId, kind?, text, chapterTitle, chapterNumber, url, savedAt }
   А вот «Читаю / Буду читать / Отложено» — это НЕ закладки-страницы, а
   полки новелл (busybee_shelves): на странице «Закладки» они собираются
   во вкладку «Новеллы» сами, отдельно ничего не хранится. */
const PAGE_BOOKMARKS_KEY = "busybee_passage_bookmarks";

function getChapterBookmark(novelId, chapterNumber) {
    return getSavedList(PAGE_BOOKMARKS_KEY).find((entry) =>
        entry.kind === "chapter" &&
        savedEntryNovelId(entry) === novelId &&
        Number(entry.chapterNumber) === Number(chapterNumber)
    ) || null;
}

function saveChapterBookmark({ novelId, chapterNumber, chapterTitle, text }) {
    try {
        const list = getSavedList(PAGE_BOOKMARKS_KEY);
        list.push({
            novelId,
            kind: "chapter",
            text: String(text || "").slice(0, 300),
            chapterTitle: chapterTitle || "",
            chapterNumber,
            url: window.location.href,
            savedAt: new Date().toISOString(),
        });
        localStorage.setItem(PAGE_BOOKMARKS_KEY, JSON.stringify(list));
    } catch (error) {
        console.error("Couldn't save chapter bookmark:", error);
    }
}

function removeChapterBookmark(novelId, chapterNumber) {
    try {
        const list = getSavedList(PAGE_BOOKMARKS_KEY).filter((entry) => !(
            entry.kind === "chapter" &&
            savedEntryNovelId(entry) === novelId &&
            Number(entry.chapterNumber) === Number(chapterNumber)
        ));
        localStorage.setItem(PAGE_BOOKMARKS_KEY, JSON.stringify(list));
    } catch (error) {
        console.error("Couldn't remove chapter bookmark:", error);
    }
}

/* ---------- Закладка на карточке новеллы = «Буду читать» ----------
   Значок закладки на карточках (главная, каталог, страница переводчика)
   — быстрый способ отметить новеллу. Своего хранилища у него нет, он
   работает с теми же полками, что и выпадающий список на странице
   новеллы (busybee_shelves):
     • закрашен, если новелла на «Читаю», «Буду читать» или «Отложено»
       — ровно то, что показывает страница «Закладки», вкладка «Новеллы»;
     • нажатие на пустой значок ставит «Буду читать»;
     • нажатие на закрашенный снимает статус (прогресс чтения остаётся).
   Оба действия сопровождаются «Отменить», поэтому случайный клик не
   стирает «Читаю» или «Прочитано».
   Значки других видов (закладки на посты, на термины глоссария) сюда
   не попадают: привязываются только кнопки с data-novel-id. */
const BOOKMARK_SHELVES = ["reading", "planned", "paused"];

function isNovelBookmarked(novelId) {
    return BOOKMARK_SHELVES.includes(getNovelShelf(novelId));
}

// Закрашивает/очищает значок по текущему состоянию хранилища
function paintNovelBookmark(button) {
    const saved = isNovelBookmarked(button.dataset.novelId);
    button.classList.toggle("active", saved);
    button.setAttribute("aria-pressed", saved);

    const icon = button.querySelector("img");
    if (icon && icon.dataset.filled) {
        icon.src = saved ? icon.dataset.filled : icon.dataset.outline;
    }
}

function repaintNovelBookmarks() {
    document.querySelectorAll("[data-novel-id][data-novel-bound]").forEach(paintNovelBookmark);
}

// Небольшое сообщение внизу экрана с кнопкой «Отменить».
// Стили заданы здесь же, чтобы не зависеть от CSS конкретной страницы.
let undoToastEl = null;
let undoToastTimer = null;

function showUndoToast(text, onUndo) {
    if (!undoToastEl) {
        undoToastEl = document.createElement("div");
        undoToastEl.setAttribute("role", "status");
        undoToastEl.setAttribute("aria-live", "polite");
        undoToastEl.style.cssText =
            "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:300;" +
            "display:flex;align-items:center;gap:16px;padding:12px 20px;border-radius:12px;" +
            "background:var(--text-primary,#3B2F26);color:#fff;font-size:13px;" +
            "box-shadow:0 8px 24px rgba(0,0,0,0.18);";
        document.body.appendChild(undoToastEl);
    }

    undoToastEl.innerHTML = "";
    const message = document.createElement("span");
    message.textContent = text;
    const undoButton = document.createElement("button");
    undoButton.type = "button";
    undoButton.textContent = "Отменить";
    undoButton.style.cssText =
        "padding:0;background:none;border:none;font:inherit;font-weight:600;color:#F0C56A;cursor:pointer;";
    undoButton.addEventListener("click", () => {
        onUndo();
        undoToastEl.style.display = "none";
        clearTimeout(undoToastTimer);
    });
    undoToastEl.append(message, undoButton);
    undoToastEl.style.display = "flex";

    clearTimeout(undoToastTimer);
    undoToastTimer = setTimeout(() => { undoToastEl.style.display = "none"; }, 6000);
}

// Привязывает все .mini-bookmark[data-novel-id] и .hero-bookmark-button
// [data-novel-id] внутри scope; безопасно вызывать повторно после
// каждой перерисовки карточек (уже привязанные пропускаются).
function bindNovelBookmarks(scope = document) {
    scope.querySelectorAll("[data-novel-id]").forEach((button) => {
        if (!button.matches(".mini-bookmark, .hero-bookmark-button")) return;
        if (button.dataset.novelBound) return;
        button.dataset.novelBound = "1";
        paintNovelBookmark(button);

        button.addEventListener("click", (event) => {
            event.stopPropagation();
            const novelId = button.dataset.novelId;
            const previous = getNovelShelf(novelId);

            if (isNovelBookmarked(novelId)) {
                setNovelShelf(novelId, null);
                showUndoToast("Новелла убрана из закладок", () => {
                    setNovelShelf(novelId, previous);
                    repaintNovelBookmarks();
                });
            } else {
                setNovelShelf(novelId, "planned");
                showUndoToast("Добавлено в закладки — «Буду читать»", () => {
                    setNovelShelf(novelId, previous);
                    repaintNovelBookmarks();
                });
            }

            // одна и та же новелла может быть на странице дважды
            // (рекомендации + каталог) — перекрашиваем все значки сразу
            repaintNovelBookmarks();
        });
    });
}

// Вернулись «Назад» из кэша браузера — состояние могло измениться
// на другой странице (статус на странице новеллы, чтение главы)
window.addEventListener("pageshow", (event) => {
    if (event.persisted) repaintNovelBookmarks();
});

/* ========================================
   NOVEL PAGE — код перенесён в novel-script.js
   (избранное, статус чтения, таблица глав, цитаты, плавающая кнопка)
   ======================================== */


/* ========================================
   CATALOG PAGE — код перенесён в catalog-script.js
   ========================================
   Фильтры, сортировка, плитка/список, пагинация, меню карточек,
   сетка новелл, «Busy Bee рекомендует» и «Последние обновления» каталога
   теперь в catalog-script.js. Общие помощники (getNovelData,
   chapterHref, getReadingProgress, bindNovelBookmarks) остались здесь. */

/* ========================================
   CHAPTER DATA — shared helpers (reader.html + chapter.html)
   ========================================
   Both the Reading-mode block and the Web-mode block below (plus the
   Chapter List modal) need the same two things: the novel's own data
   file (for its title + full chapter list, used for prev/next and the
   table of contents) and the individual chapter's text. Both now come
   from /novels/<id>/... instead of the old flat /chapters/ test files.

   getNovelData() is memoized so that all three blocks can call it
   independently without triggering three separate fetches of the same
   novel file.
   ======================================== */

// novelDataCache объявлен в самом начале файла (см. «Homepage hero»):
// главная зовёт getNovelData уже в первых строках скрипта, а const,
// объявленный ниже по файлу, в тот момент ещё недоступен.

async function getNovelData(novelId) {
    if (novelDataCache[novelId]) return novelDataCache[novelId];
    const response = await fetch(`novels/${novelId}/${novelId}.json`);
    if (!response.ok) throw new Error(`Novel "${novelId}" not found`);
    const data = await response.json();
    novelDataCache[novelId] = data;
    return data;
}

// Same memoization idea as getNovelData() above — the whole glossary
// is one small JSON file, so the footnote popover just fetches it
// once (on whichever page's first glossary-linked footnote gets
// clicked) and reuses it for every footnote after that
let glossaryDataCache = null;

async function getGlossaryData() {
    if (glossaryDataCache) return glossaryDataCache;
    const response = await fetch("glossary/glossary.json");
    if (!response.ok) throw new Error("Glossary not found");
    glossaryDataCache = await response.json();
    return glossaryDataCache;
}

function chapterContentUrl(novelId, chapterNumber) {
    return `novels/${novelId}/chapters/glava-${chapterNumber}.json`;
}

/* Какой вид чтения открывать: веб-версию (chapter.html) или читалку
   «как Kindle» (reader.html). Запоминается, в каком виде читатель
   открывал главу в последний раз (запись делает reader-script.js при
   открытии любой из двух страниц), и все ссылки «Читать / Продолжить»
   на сайте ведут сразу в этот вид. По умолчанию — веб-версия. */
const READING_VIEW_KEY = "busybee_reading_view"; // "web" | "reader"

function getPreferredReadingView() {
    try {
        return localStorage.getItem(READING_VIEW_KEY) === "reader" ? "reader" : "web";
    } catch (error) {
        return "web";
    }
}

function setPreferredReadingView(view) {
    try {
        localStorage.setItem(READING_VIEW_KEY, view === "reader" ? "reader" : "web");
    } catch (error) {
        // localStorage недоступен (приватный режим и т.п.) — просто не запоминаем
    }
}

// novel=<id> is passed along so chapter.html / reader.html know which
// novel's chapter to load
function chapterHref(novelId, chapterNumber) {
    const page = getPreferredReadingView() === "reader" ? "reader.html" : "chapter.html";
    return `${page}?novel=${encodeURIComponent(novelId)}&chapter=${chapterNumber}`;
}

/* ---------- Paragraph formatting (shared by reader.html + chapter.html) ----------
   A small Telegraph-style shorthand, written straight into a chapter's
   `paragraphs` array in its JSON file — no schema change, each entry
   is still just a plain string:
     **text**   -> <strong>
     *text*     -> <em>
     > text     -> the marker at the very START of the paragraph turns
                    the whole paragraph into a <blockquote> instead of
                    a <p> (strip the "> ", keep the rest)
     ---        -> a paragraph containing ONLY three dashes becomes a
                    <hr> instead of a <p> (like Telegraph's own "type
                    --- on its own line")
   Existing chapters with none of these characters render exactly as
   before. Runs on top of whatever's already in the paragraph string,
   so existing inline HTML (footnote <sup> markers, etc.) is left
   alone — bold/italic only look for '*', which nothing else in a
   paragraph currently uses. */
function formatChapterParagraph(paragraph) {
    if (paragraph.trim() === "---") {
        return "<hr>";
    }

    const quoteMatch = paragraph.match(/^\s*>\s+([\s\S]*)$/);
    const isQuote = Boolean(quoteMatch);
    let text = isQuote ? quoteMatch[1] : paragraph;

    // Bold before italic, so **text** isn't left with stray single
    // asterisks once the outer pair has already been consumed
    text = text
        .replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*([\s\S]+?)\*/g, "<em>$1</em>");

    return isQuote ? `<blockquote>${text}</blockquote>` : `<p>${text}</p>`;
}

/* ---------- Footnote popover (shared by reader.html + chapter.html) ----------
   `containerEl` is the element the chapter's paragraphs are rendered
   into; `getFootnotes` returns the CURRENTLY loaded chapter's own
   `footnotes` array (kept up to date by whichever loadChapter function
   calls this). Each entry is either:
     { marker, note }          — a one-off translator's aside, shown as-is
     { marker, glossaryId }    — a real term; looked up in glossary.json
                                  (via getGlossaryData() above) and shown
                                  with pinyin + a link into the Glossary */
function setupFootnotePopover(containerEl, getFootnotes) {
    const popover = document.getElementById("footnotePopover");
    if (!popover || !containerEl) return;

    const termEl = document.getElementById("footnotePopoverTerm");
    const pinyinEl = document.getElementById("footnotePopoverPinyin");
    const definitionEl = document.getElementById("footnotePopoverDefinition");
    const linkEl = document.getElementById("footnotePopoverLink");

    function closePopover() {
        popover.style.display = "none";
    }

    // Anchored purely in CSS (see .footnote-popover in style.css) as a
    // child of whichever marker is open, so this only has to decide
    // whether the default placement (opens below, left-aligned) would
    // run past an edge — measured AFTER it's actually rendered in its
    // real spot, so there's no coordinate math to get wrong.
    function positionPopover() {
        popover.classList.remove("align-right", "flip-above");

        const rect = popover.getBoundingClientRect();
        const containerRect = containerEl.getBoundingClientRect();
        // The tighter of the two: the window edge, or containerEl's own
        // edge when it clips its content (Book mode's paginated view)
        const maxRight = Math.min(window.innerWidth, containerRect.right) - 8;
        const maxBottom = Math.min(window.innerHeight, containerRect.bottom) - 8;

        if (rect.right > maxRight) popover.classList.add("align-right");
        if (rect.bottom > maxBottom) popover.classList.add("flip-above");
    }

    containerEl.addEventListener("click", async (event) => {
        const marker = event.target.closest(".footnote-marker");
        if (!marker) return;

        const footnotes = getFootnotes() || [];
        const entry = footnotes.find((f) => String(f.marker) === String(marker.dataset.footnote));
        if (!entry) return;

        if (entry.glossaryId) {
            let term = null;
            try {
                const glossary = await getGlossaryData();
                term = glossary.find((item) => item.id === entry.glossaryId);
            } catch (err) {
                console.error("Failed to load glossary for footnote:", err);
            }

            if (term) {
                if (termEl) termEl.textContent = term.nameRu;
                if (pinyinEl) {
                    pinyinEl.textContent = `${term.term} · ${term.pinyin}`;
                    pinyinEl.hidden = false;
                }
                if (definitionEl) definitionEl.textContent = term.definition;
                if (linkEl) {
                    linkEl.href = `glossary.html?term=${encodeURIComponent(term.id)}`;
                    linkEl.hidden = false;
                }
            } else {
                // Term id doesn't match anything in the glossary (renamed,
                // removed) — fail gracefully instead of a blank popover
                if (termEl) termEl.textContent = "Термин не найден в глоссарии";
                if (pinyinEl) pinyinEl.hidden = true;
                if (definitionEl) definitionEl.textContent = "";
                if (linkEl) linkEl.hidden = true;
            }
        } else {
            if (termEl) termEl.textContent = "Заметка переводчика";
            if (pinyinEl) pinyinEl.hidden = true;
            if (definitionEl) definitionEl.textContent = entry.note;
            if (linkEl) linkEl.hidden = true;
        }

        marker.appendChild(popover);
        popover.style.display = "block";
        positionPopover();
    });

    document.addEventListener("click", (event) => {
        if (popover.style.display !== "none" && !popover.contains(event.target) && !event.target.closest(".footnote-marker")) {
            closePopover();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closePopover();
    });
}

// Reads ?novel=<id>&chapter=<n> from the current page's URL — shared
// so every block below agrees on the same defaults
function getNovelAndChapterFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const novelId = params.get("novel") || "kniga-grez";
    const chapterNumber = parseInt(params.get("chapter"), 10) || 1;
    return { novelId, chapterNumber };
}

/* ---------- Reading progress (localStorage) ----------
   Remembers, per novel, the last chapter the reader opened — no
   backend yet, so this is purely a per-browser convenience for now.
   Storage shape: { "<novelId>": { chapter: <number>, updatedAt: <ISO> } } */
const READING_PROGRESS_KEY = "busybee_reading_progress";

function getReadingProgress(novelId) {
    try {
        const all = JSON.parse(localStorage.getItem(READING_PROGRESS_KEY)) || {};
        return all[novelId] ? all[novelId].chapter : null;
    } catch (error) {
        return null;
    }
}

function saveReadingProgress(novelId, chapterNumber) {
    try {
        const all = JSON.parse(localStorage.getItem(READING_PROGRESS_KEY)) || {};
        const previousChapter = all[novelId] ? all[novelId].chapter : null;
        all[novelId] = { chapter: chapterNumber, updatedAt: new Date().toISOString() };
        localStorage.setItem(READING_PROGRESS_KEY, JSON.stringify(all));
        markNovelAsReadingIfNew(novelId);

        // Читатель открыл более позднюю главу, чем в прошлый раз, — значит,
        // ту, на которой он был, он дочитал: отмечаем её прочитанной.
        // Возврат назад или повторное открытие той же главы ничего не меняют.
        if (previousChapter && previousChapter < chapterNumber) {
            setChapterRead(novelId, previousChapter, true);
        }
    } catch (error) {
        console.error("Couldn't save reading progress:", error);
    }
}

/* ---------- Дух-спутник ----------
   Каталог зверей лежит в spirits/spirits.json, выбранный зверь пока
   хранится в localStorage: busybee_spirit_pet = { id, chosenAt }.
   Когда появятся аккаунты на сервере, менять нужно только эти функции
   (они станут асинхронными) — остальной код про хранилище не знает. */
const SPIRIT_PET_KEY = "busybee_spirit_pet";

function getSpiritPetId() {
    try {
        const saved = JSON.parse(localStorage.getItem(SPIRIT_PET_KEY));
        return saved && saved.id ? saved.id : null;
    } catch (error) {
        return null;
    }
}

function setSpiritPetId(spiritId) {
    try {
        localStorage.setItem(SPIRIT_PET_KEY, JSON.stringify({ id: spiritId, chosenAt: new Date().toISOString() }));
    } catch (error) {
        console.error("Couldn't save the spirit companion:", error);
    }
}

// { stages: [{ key, label }], spirits: [{ id, name, epithet, description, legend, images }] }
let spiritsDataCache = null;

async function getSpiritsData() {
    if (spiritsDataCache) return spiritsDataCache;
    const response = await fetch("spirits/spirits.json");
    if (!response.ok) throw new Error("Spirits catalog not found");
    spiritsDataCache = await response.json();
    return spiritsDataCache;
}

/* ---------- Избранные главы (localStorage) ----------
   Сердечки у глав в таблице на странице новеллы. Формат тот же, что у
   прочитанных глав ниже: { "<novelId>": [3, 12] } — номера глав. */
const FAVORITE_CHAPTERS_KEY = "busybee_favorite_chapters";

function getFavoriteChapters(novelId) {
    try {
        const all = JSON.parse(localStorage.getItem(FAVORITE_CHAPTERS_KEY)) || {};
        return Array.isArray(all[novelId]) ? all[novelId] : [];
    } catch (error) {
        return [];
    }
}

// Все избранные главы по всем новеллам: [{ novelId, number }, …].
// Порядок: новеллы — как лежат в хранилище, главы внутри — по номеру.
function getAllFavoriteChapters() {
    try {
        const all = JSON.parse(localStorage.getItem(FAVORITE_CHAPTERS_KEY)) || {};
        return Object.entries(all).flatMap(([novelId, numbers]) =>
            Array.isArray(numbers) ? numbers.map((number) => ({ novelId, number })) : []
        );
    } catch (error) {
        return [];
    }
}

function setChapterFavorited(novelId, chapterNumber, isFavorited) {
    try {
        const all = JSON.parse(localStorage.getItem(FAVORITE_CHAPTERS_KEY)) || {};
        const current = new Set(Array.isArray(all[novelId]) ? all[novelId] : []);
        if (isFavorited) current.add(chapterNumber);
        else current.delete(chapterNumber);
        all[novelId] = Array.from(current).sort((a, b) => a - b);
        localStorage.setItem(FAVORITE_CHAPTERS_KEY, JSON.stringify(all));
    } catch (error) {
        console.error("Couldn't save favorite chapters:", error);
    }
}

/* ---------- Прочитанные главы (localStorage) ----------
   Какие главы читатель уже прочитал — для галочек в таблице глав на
   странице новеллы. Отмечаются двумя способами: автоматически (см.
   saveReadingProgress выше) и вручную — пунктом «Отметить прочитанной»
   в меню «···» у главы.
   Формат: { "<novelId>": [1, 2, 5] } — номера глав. */
const READ_CHAPTERS_KEY = "busybee_read_chapters";

function getReadChapters(novelId) {
    try {
        const all = JSON.parse(localStorage.getItem(READ_CHAPTERS_KEY)) || {};
        return Array.isArray(all[novelId]) ? all[novelId] : [];
    } catch (error) {
        return [];
    }
}

function setChapterRead(novelId, chapterNumber, isRead) {
    try {
        const all = JSON.parse(localStorage.getItem(READ_CHAPTERS_KEY)) || {};
        const current = new Set(Array.isArray(all[novelId]) ? all[novelId] : []);
        if (isRead) current.add(chapterNumber);
        else current.delete(chapterNumber);
        all[novelId] = Array.from(current).sort((a, b) => a - b);
        localStorage.setItem(READ_CHAPTERS_KEY, JSON.stringify(all));
    } catch (error) {
        console.error("Couldn't save read chapters:", error);
    }
}

/* ---------- Приподнятая кнопка «Продолжить чтение» в нижней панели ----------
   Кнопка всегда одна и та же (иконка + общая подпись, без названия
   конкретной книги — так попросили: выбор, что продолжать, должен
   быть за читателем, а не за кнопкой). По клику:
     • есть хоть одна начатая новелла — открывает шторку со списком
       всех, от самой свежей к самой старой;
     • прогресса нет вообще — сразу ведёт в каталог, шторка в этом
       случае не нужна.
   В отличие от getReadingProgress() выше (прогресс ОДНОЙ конкретной
   новеллы — так его зовут страницы книги/главы), здесь нужны СРАЗУ
   ВСЕ записи — читаем тот же ключ READING_PROGRESS_KEY напрямую. */
(function initBottomNavContinueReading() {
    const centerBtn = document.getElementById("bottomNavCenter");
    const sheet = document.getElementById("continueSheet");
    if (!centerBtn || !sheet) return;

    const labelEl = document.getElementById("bottomNavCenterLabel");
    const listEl = document.getElementById("continueSheetList");
    const backdrop = sheet.querySelector(".continue-sheet-backdrop");
    const closeBtn = document.getElementById("continueSheetClose");

    let all;
    try {
        all = JSON.parse(localStorage.getItem(READING_PROGRESS_KEY)) || {};
    } catch (error) {
        all = {};
    }

    const entries = Object.entries(all).sort(
        (a, b) => new Date(b[1].updatedAt) - new Date(a[1].updatedAt)
    );

    // Прогресса нет нигде — кнопка просто ведёт в каталог, шторка не нужна
    if (!entries.length) {
        centerBtn.addEventListener("click", () => {
            window.location.href = "catalog.html";
        });
        return;
    }

    if (labelEl) labelEl.textContent = "Продолжить";

    function openSheet() {
        sheet.classList.add("open");
        centerBtn.setAttribute("aria-expanded", "true");
        document.body.classList.add("mobile-nav-locked");
    }

    function closeSheet() {
        sheet.classList.remove("open");
        centerBtn.setAttribute("aria-expanded", "false");
        document.body.classList.remove("mobile-nav-locked");
    }

    centerBtn.addEventListener("click", openSheet);
    if (backdrop) backdrop.addEventListener("click", closeSheet);
    if (closeBtn) closeBtn.addEventListener("click", closeSheet);
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && sheet.classList.contains("open")) closeSheet();
    });

    // Список строится один раз, сразу при загрузке страницы — тому,
    // кто откроет шторку, не придётся ждать подгрузки
    Promise.all(
        entries.map(([novelId, progress]) =>
            getNovelData(novelId)
                .then((novel) => ({ novel, progress }))
                .catch(() => null) // нет файла новеллы — пропускаем строку, а не ломаем список
        )
    ).then((loaded) => {
        const rows = loaded.filter(Boolean);
        if (!listEl) return;

        if (!rows.length) {
            listEl.innerHTML = `<p class="continue-sheet-empty">Не удалось загрузить список. Попробуйте обновить страницу.</p>`;
            return;
        }

        listEl.innerHTML = rows.map(({ novel, progress }) => {
            const total = novel.totalChapters || 0;
            const chapterLine = total
                ? `Глава ${progress.chapter || 1} из ${total}`
                : `Глава ${progress.chapter || 1}`;

            return `
                <a href="${chapterHref(novel.id, progress.chapter)}" class="continue-sheet-row">
                    <img class="continue-sheet-row-cover" src="${escapeHtml(novel.cover)}" alt="">
                    <span class="continue-sheet-row-body">
                        <strong>${escapeHtml(novel.title)}</strong>
                        <span>${escapeHtml(chapterLine)}</span>
                    </span>
                </a>`;
        }).join("");
    });
})();

/* ========================================
   READER / CHAPTER — код перенесён в reader-script.js
   ========================================
   READER MODE (reader.html), WEB-MODE CHAPTER PAGE (chapter.html),
   CHAPTER LIST MODAL, TEXT SELECTION TOOLBAR и SAVED QUOTES / NOTES
   PANEL — теперь в reader-script.js. Общие помощники для глав
   («CHAPTER DATA — shared helpers» выше) остались здесь: ими
   пользуется и страница новеллы. */
/* NOVEL PAGE — загрузка данных новеллы из novels/<id>/<id>.json
   теперь тоже в novel-script.js */

/* CATALOG PAGE — загрузка новелл, «Busy Bee рекомендует» и
   «Последние обновления» каталога теперь тоже в catalog-script.js */
