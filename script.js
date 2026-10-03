/* ========================================
   BUSY BEE — Header interactions
   ========================================
   Handles the three dropdown menus in the header (Catalog, Language,
   Profile) plus the Theme icon toggle inside the profile dropdown.

   All three dropdowns follow the same pattern:
   - click the button  -> toggle ".open" on the dropdown
   - click anywhere else on the page -> close it
   ======================================== */


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

// Theme icon: swaps the moon/sun icon, visible to guests and signed-in
// users alike. Placeholder for now — it doesn't switch the site's
// colors yet. querySelectorAll (not just the header's one) because the
// mobile burger panel (mobile-nav.js) has its own copy of this same
// button for when the header's is hidden — both stay in sync below.
const themeToggles = document.querySelectorAll(".theme-toggle");
let isDarkTheme = false;

function paintThemeToggles() {
    themeToggles.forEach((toggle) => {
        const icon = toggle.querySelector("img");
        if (icon) icon.src = isDarkTheme ? "images/icons/sun.svg" : "images/icons/moon.svg";
    });
}

themeToggles.forEach((toggle) => {
    toggle.addEventListener("click", (event) => {
        // No longer needed for a dropdown-closing reason (this button
        // isn't inside a dropdown anymore), left in as a harmless no-op
        event.stopPropagation();

        isDarkTheme = !isDarkTheme;
        paintThemeToggles();
    });
});


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

    // Центральная кнопка (#bottomNavCenter) намеренно не участвует:
    // это кнопка-действие «продолжить чтение», а не «вы здесь», и её
    // href в момент этой проверки ещё запасной (catalog.html) — само
    // чтение подставляется позже, отдельным блоком ближе к концу файла
    bottomNav.querySelectorAll(".bottom-nav-item[href]:not(#bottomNavCenter)").forEach((item) => {
        const itemPage = item.getAttribute("href").split("?")[0].split("#")[0];
        if (itemPage === currentPage || (currentPage === "" && itemPage === "index.html")) {
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

   NOTE: this has to sit ABOVE "NOVEL PAGE" below — favoriteStatusBtn's
   init code calls isNovelFavorited() as soon as the script runs, and
   since FAVORITE_NOVELS_KEY is `const`, referencing it before this
   line actually executes throws (temporal dead zone) — which the
   function's own try/catch was silently swallowing into "not
   favorited" on every load. Function *declarations* are hoisted,
   `const` bindings are not — order here matters. */
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
                chapterHref: `chapter.html?novel=${id}&chapter=${entry.chapterNumber || 1}`,
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
   NOVEL PAGE
   ======================================== */

/* ---------- Favorite toggle (independent of reading status) ----------
   Persisted via the helpers just above so it survives a reload and so
   the profile page's "Избранное → Новеллы" can read it back. */

const favoriteStatusBtn = document.getElementById("favoriteStatusBtn");

if (favoriteStatusBtn) {
    const icon = favoriteStatusBtn.querySelector("img");
    const novelId = new URLSearchParams(window.location.search).get("id") || "kniga-grez";

    if (isNovelFavorited(novelId)) {
        favoriteStatusBtn.classList.add("active");
        favoriteStatusBtn.setAttribute("aria-pressed", "true");
        icon.src = icon.dataset.filled;
    }

    favoriteStatusBtn.addEventListener("click", () => {
        const isFavorited = favoriteStatusBtn.classList.toggle("active");
        favoriteStatusBtn.setAttribute("aria-pressed", isFavorited);
        icon.src = isFavorited ? icon.dataset.filled : icon.dataset.outline;
        setNovelFavorited(novelId, isFavorited);
    });
}

/* ---------- Reading status dropdown ---------- */
// Want to Read / Reading / Completed / On Hold / Dropped — mutually
// exclusive, so a single-select dropdown instead of 5 separate buttons

const readingStatusButton = document.getElementById("readingStatusButton");
const readingStatusDropdown = document.getElementById("readingStatusDropdown");
const readingStatusIcon = document.getElementById("readingStatusIcon");
const readingStatusLabel = document.getElementById("readingStatusLabel");

if (readingStatusButton && readingStatusDropdown) {
    readingStatusButton.addEventListener("click", (event) => {
        event.stopPropagation();
        readingStatusDropdown.classList.toggle("open");
    });

    const statusNovelId = new URLSearchParams(window.location.search).get("id") || "kniga-grez";
    const statusOptions = Array.from(readingStatusDropdown.querySelectorAll(".reading-status-option"));

    // Рисует кнопку и список под текущую полку (null — новелла ни на какой не лежит)
    const showShelf = (shelf) => {
        const current = statusOptions.find((o) => o.dataset.shelf === shelf);

        statusOptions.forEach((o) => o.classList.toggle("active", o === current));

        if (readingStatusIcon) readingStatusIcon.src = current ? current.dataset.icon : "images/icons/book.svg";
        if (readingStatusLabel) {
            readingStatusLabel.textContent = current ? current.querySelector("span").textContent : "Добавить на полку";
        }

        // «Убрать с полки» имеет смысл, только когда новелла на какой-то лежит
        const removeOption = statusOptions.find((o) => o.dataset.shelf === "none");
        // (не атрибутом hidden: .reading-status-option задаёт display: flex и перебивает его)
        if (removeOption) removeOption.style.display = current ? "" : "none";
    };

    showShelf(getNovelShelf(statusNovelId));

    statusOptions.forEach((option) => {
        option.addEventListener("click", () => {
            const shelf = option.dataset.shelf === "none" ? null : option.dataset.shelf;

            setNovelShelf(statusNovelId, shelf);
            showShelf(shelf);

            readingStatusDropdown.classList.remove("open");
        });
    });

    document.addEventListener("click", (event) => {
        if (!readingStatusDropdown.contains(event.target) && !readingStatusButton.contains(event.target)) {
            readingStatusDropdown.classList.remove("open");
        }
    });
}


/* ---------- Chapters: volume filter + search + read/favorited (combined) ---------- */
// The volume tabs, search box, and Filter dropdown all narrow down the
// same list of rows and are applied together instead of overriding
// each other — e.g. picking a volume keeps whatever's typed in search

const volumeItems = document.querySelectorAll(".volume-sidebar li");
const chapterSearchInput = document.getElementById("chapter-search-input");
const noResultsNotice = document.querySelector(".no-results-notice");

const CHAPTERS_PER_PAGE = 10;
const pagePrevBtn = document.getElementById("pagePrevBtn");
const pageNextBtn = document.getElementById("pageNextBtn");
const pageNumbersEl = document.getElementById("pageNumbers");
let currentChapterPage = 1;

function applyChapterFilters() {
    const activeVolumeItem = document.querySelector(".volume-sidebar li.active");
    const selectedVolume = activeVolumeItem ? activeVolumeItem.dataset.volume : "all";
    const searchTerm = chapterSearchInput ? chapterSearchInput.value.trim().toLowerCase() : "";
    const activeFilterOption = document.querySelector(".filter-option.active");
    const selectedStatus = activeFilterOption ? activeFilterOption.dataset.filter : "all";

    // Re-queried fresh (not cached) so this always reflects the table's
    // current DOM order — the sort toggle physically reorders <tr>s via
    // appendChild, and pagination has to slice pages off THAT order
    const allRows = Array.from(document.querySelectorAll(".chapters-table tbody tr"));

    const matchedRows = allRows.filter((row) => {
        const matchesVolume = selectedVolume === "all" || row.dataset.volume === selectedVolume;

        const titleCell = row.querySelector(".col-title");
        const numCell = row.querySelector(".col-num");
        const searchableText =
            (titleCell ? titleCell.textContent : "") + " " +
            (numCell ? numCell.textContent : "");
        const matchesSearch = searchTerm === "" || searchableText.toLowerCase().includes(searchTerm);

        // Read state comes from the ✓ icon each row already shows; the
        // in-progress row (with the Continue button) has none, so it
        // correctly counts as "unread". Favorited reads the heart
        // button's live state, since that can change after a click.
        const isRead = row.querySelector(".icon-read") !== null;
        const isFavorited = row.querySelector(".favorite-btn")?.classList.contains("active") ?? false;
        const matchesStatus =
            selectedStatus === "all" ||
            (selectedStatus === "read" && isRead) ||
            (selectedStatus === "unread" && !isRead) ||
            (selectedStatus === "favorited" && isFavorited);

        return matchesVolume && matchesSearch && matchesStatus;
    });

    const totalPages = Math.max(1, Math.ceil(matchedRows.length / CHAPTERS_PER_PAGE));
    if (currentChapterPage > totalPages) currentChapterPage = totalPages;
    if (currentChapterPage < 1) currentChapterPage = 1;

    const pageStart = (currentChapterPage - 1) * CHAPTERS_PER_PAGE;
    const pageEnd = pageStart + CHAPTERS_PER_PAGE;

    // Rows outside the filter match are hidden outright; rows that match
    // but fall on a different page are also hidden, just for a different
    // reason — only the current page's slice of matchedRows is shown
    allRows.forEach((row) => { row.style.display = "none"; });
    matchedRows.slice(pageStart, pageEnd).forEach((row) => { row.style.display = ""; });

    // Show a message only when the filters leave nothing to display
    if (noResultsNotice) noResultsNotice.hidden = matchedRows.length !== 0;

    renderChapterPagination(totalPages);
}

function renderChapterPagination(totalPages) {
    if (!pageNumbersEl) return;

    if (pagePrevBtn) pagePrevBtn.disabled = currentChapterPage <= 1;
    if (pageNextBtn) pageNextBtn.disabled = currentChapterPage >= totalPages;

    // Compact page list: always show first/last page, the current page
    // and its immediate neighbours, and "…" for any gap in between —
    // otherwise a 26-page list would be an unusable wall of numbers
    const pagesToShow = new Set([1, totalPages, currentChapterPage, currentChapterPage - 1, currentChapterPage + 1]);
    const sortedPages = Array.from(pagesToShow).filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

    pageNumbersEl.innerHTML = "";
    let previousPage = 0;

    sortedPages.forEach((pageNum) => {
        if (pageNum - previousPage > 1) {
            const ellipsis = document.createElement("span");
            ellipsis.className = "page-ellipsis";
            ellipsis.textContent = "…";
            pageNumbersEl.appendChild(ellipsis);
        }

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "page-number" + (pageNum === currentChapterPage ? " active" : "");
        btn.textContent = pageNum;
        btn.addEventListener("click", () => {
            currentChapterPage = pageNum;
            applyChapterFilters();
        });
        pageNumbersEl.appendChild(btn);

        previousPage = pageNum;
    });
}

if (pagePrevBtn) {
    pagePrevBtn.addEventListener("click", () => {
        currentChapterPage -= 1;
        applyChapterFilters();
    });
}

if (pageNextBtn) {
    pageNextBtn.addEventListener("click", () => {
        currentChapterPage += 1;
        applyChapterFilters();
    });
}

volumeItems.forEach((item) => {
    item.addEventListener("click", () => {
        volumeItems.forEach((v) => v.classList.remove("active"));
        item.classList.add("active");
        currentChapterPage = 1; // narrowing down the list starts back at page 1
        applyChapterFilters();
    });
});

if (chapterSearchInput) {
    chapterSearchInput.addEventListener("input", () => {
        currentChapterPage = 1;
        applyChapterFilters();
    });
}


/* ---------- Filter dropdown (Read / Unread / Favorited) ---------- */
// Same open/close pattern as the header dropdowns

const filterButton = document.querySelector(".filter-button");
const filterMenu = document.querySelector(".filter-menu");
const filterOptions = document.querySelectorAll(".filter-option");

if (filterButton && filterMenu) {
    filterButton.addEventListener("click", (event) => {
        event.stopPropagation();
        filterMenu.classList.toggle("open");
    });

    filterOptions.forEach((option) => {
        option.addEventListener("click", () => {
            filterOptions.forEach((o) => o.classList.remove("active"));
            option.classList.add("active");

            // Highlight the Filter button itself whenever something
            // other than "All Chapters" is picked, as a reminder that
            // the list is narrowed down
            filterButton.classList.toggle("active", option.dataset.filter !== "all");

            filterMenu.classList.remove("open");
            currentChapterPage = 1;
            applyChapterFilters();
        });
    });

    document.addEventListener("click", (event) => {
        if (!filterMenu.contains(event.target) && event.target !== filterButton) {
            filterMenu.classList.remove("open");
        }
    });
}


/* ---------- Chapter list sort order (oldest first / newest first) ---------- */
// Table starts newest-first (highest chapter number at the top).
// Clicking the other arrow reverses the whole list so the numbers/dates
// stay attached to the correct chapter instead of just re-labeling them.

const sortButtons = document.querySelectorAll(".sort-toggle");
const chaptersTable = document.querySelector(".chapters-table");

sortButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
        const targetOrder = btn.dataset.order;
        if (!chaptersTable || chaptersTable.dataset.order === targetOrder) return;

        const tbody = chaptersTable.querySelector("tbody");
        const rows = Array.from(tbody.querySelectorAll("tr")).reverse();
        rows.forEach((row) => tbody.appendChild(row));

        chaptersTable.dataset.order = targetOrder;
        sortButtons.forEach((b) => b.classList.toggle("active", b === btn));
        currentChapterPage = 1;
        applyChapterFilters();
    });
});

// Initial render: paginates the chapters table to page 1 on load.
// No-ops on pages without a .chapters-table (checked inside the function).
applyChapterFilters();


/* ---------- Quote likes ---------- */
// Same outline/filled <img> swap as the favorite buttons in the
// chapters table, plus the honey text color once liked

const likeButtons = document.querySelectorAll(".quote-footer .like-btn");

likeButtons.forEach((likeBtn) => {
    const icon = likeBtn.querySelector("img");

    likeBtn.addEventListener("click", () => {
        const isLiked = likeBtn.classList.toggle("liked");
        icon.src = isLiked ? icon.dataset.filled : icon.dataset.outline;
    });
});


/* ---------- Floating "Continue Reading" button ---------- */
// Fades out once the footer scrolls into view so it doesn't sit on
// top of the "Buy Us a Coffee" button down there

const floatingReadingBtn = document.querySelector(".floating-reading-btn");
const pageFooter = document.querySelector(".footer");

if (floatingReadingBtn && pageFooter) {
    const footerObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            floatingReadingBtn.style.opacity = entry.isIntersecting ? "0" : "1";
            floatingReadingBtn.style.pointerEvents = entry.isIntersecting ? "none" : "auto";
        });
    });

    footerObserver.observe(pageFooter);
}





/* ========================================
   CATALOG PAGE (catalog.html)
   ========================================
   Header, footer, dropdowns, and the recommends/recently-updated
   carousels are handled by the generic code above — this only
   covers what's unique to the catalog: the filters sidebar toggle
   and the Grid/List view switcher. Guarded the same way as the
   other page-specific sections, so this is a no-op everywhere else.
   ======================================== */

/* ---------- Filters sidebar toggle ---------- */

const toggleFiltersBtn = document.getElementById("toggleFilters");
const catalogLayout = document.querySelector(".catalog-layout");
const catalogGrid = document.querySelector(".catalog-grid");

if (toggleFiltersBtn && catalogLayout) {
    toggleFiltersBtn.addEventListener("click", () => {
        catalogLayout.classList.toggle("filters-hidden");
    });
}

/* ---------- Searchable filter checklists ---------- */
// Generic: wires up any .filter-search-input to narrow down the
// .filter-checkbox labels inside its .filter-checklist as you type.
// Built for Author, but reusable as-is for Translator or anything
// else later — just reuse the same markup pattern.
// Wrapped in a function (called again once the Author checklist is
// actually populated from novels.json) for the same reason as
// initCatalogFiltering/bindCatalogCardMenus above.

function bindFilterSearchInputs() {
    document.querySelectorAll(".filter-search-input").forEach((input) => {
        if (input.dataset.bound) return;
        input.dataset.bound = "true";

        const checklist = input.closest(".filter-group")?.querySelector(".filter-checklist");
        if (!checklist) return;

        input.addEventListener("input", () => {
            const term = input.value.trim().toLowerCase();
            const labels = Array.from(checklist.querySelectorAll(".filter-checkbox"));
            const noResults = checklist.querySelector(".filter-no-results");
            let anyVisible = false;

            labels.forEach((label) => {
                const matches = label.textContent.trim().toLowerCase().includes(term);
                label.style.display = matches ? "" : "none";
                if (matches) anyVisible = true;
            });

            if (noResults) noResults.hidden = anyVisible;
        });
    });
}

bindFilterSearchInputs();

/* ---------- "Show more" genres ---------- */

const btnShowMoreGenres = document.getElementById("btnShowMoreGenres");
const extraGenres = document.getElementById("extraGenres");

if (btnShowMoreGenres && extraGenres) {
    btnShowMoreGenres.addEventListener("click", () => {
        const isHidden = extraGenres.hidden;
        extraGenres.hidden = !isHidden;
        btnShowMoreGenres.textContent = isHidden ? "Скрыть ▴" : "Показать ещё ▾";
    });
}

/* ---------- Filters + search + sort (combined) ---------- */
// Same idea as the chapters table's applyChapterFilters: every control
// narrows down the same set of cards together, instead of one control
// overriding another. Status/Length/Genre are OR'd within their own
// group and AND'd across groups; search matches title or author.
//
// Sort by "Высокий рейтинг" / "Популярные" uses each card's data-rating —
// there's no separate "popularity" number in the mock data, so both
// options sort by the same value for now. "Новые поступления" has no real
// "date added" either, so it just reverses the default card order.

const catalogSearchInput = document.getElementById("catalogSearchInput");
const catalogSearchBtn = document.getElementById("catalogSearchBtn");
const resultsCountEl = document.getElementById("resultsCount");
const catalogNoResults = document.querySelector(".catalog-no-results");
const clearAllFiltersBtn = document.getElementById("clearAllFilters");

function getCheckedValues(groupName) {
    return Array.from(document.querySelectorAll(`.filter-group[data-filter-group="${groupName}"] input[type="checkbox"]:checked`))
        .map((input) => input.dataset.value);
}

function getCardChapterCount(card) {
    const statusText = card.querySelector(".chapter-status")?.textContent || "";
    const ofMatch = statusText.match(/из (\d+)/);
    if (ofMatch) return parseInt(ofMatch[1], 10);
    const totalMatch = statusText.match(/(\d+)/);
    return totalMatch ? parseInt(totalMatch[1], 10) : 0;
}

function getCardLengthBucket(card) {
    const total = getCardChapterCount(card);
    if (total <= 100) return "short";
    if (total <= 300) return "medium";
    return "long";
}

// Called once the grid actually has cards in it — either these ran
// against nothing before (catalog.html loaded before its cards were
// fetched), so this lives in a function callable again once
// populateCatalogGrid() (further down this file) has finished
function initCatalogFiltering() {
    const catalogCards = Array.from(document.querySelectorAll(".catalog-grid > .novel-card"));
    if (!catalogCards.length || !catalogGrid) return;

    const originalOrder = catalogCards.slice();

    const CATALOG_CARDS_PER_PAGE = 12;
    const catalogPagePrevBtn = document.getElementById("catalogPagePrevBtn");
    const catalogPageNextBtn = document.getElementById("catalogPageNextBtn");
    const catalogPageNumbersEl = document.getElementById("catalogPageNumbers");
    let currentCatalogPage = 1;

    function applyCatalogFilters() {
        const statusFilters = getCheckedValues("status");
        const translationFilters = getCheckedValues("translation");
        const lengthFilters = getCheckedValues("length");
        const genreFilters = getCheckedValues("genre");
        const authorFilters = getCheckedValues("author");
        const searchTerm = catalogSearchInput ? catalogSearchInput.value.trim().toLowerCase() : "";

        const matchedCards = catalogCards.filter((card) => {
            const cardGenres = (card.dataset.genres || "").split("|").filter(Boolean);
            const cardTitle = (card.querySelector("h3")?.textContent || "").toLowerCase();
            const cardAuthor = (card.querySelector(".author-name")?.textContent || "").toLowerCase();

            const matchesStatus = statusFilters.length === 0 || statusFilters.includes(card.dataset.status);
            const matchesTranslation = translationFilters.length === 0 || translationFilters.includes(card.dataset.translation);
            const matchesLength = lengthFilters.length === 0 || lengthFilters.includes(getCardLengthBucket(card));
            const matchesGenre = genreFilters.length === 0 || genreFilters.some((g) => cardGenres.includes(g));
            const matchesAuthor = authorFilters.length === 0 || authorFilters.includes(cardAuthor);
            const matchesSearch = searchTerm === "" || cardTitle.includes(searchTerm) || cardAuthor.includes(searchTerm) || cardGenres.some((g) => g.includes(searchTerm));

            return matchesStatus && matchesTranslation && matchesLength && matchesGenre && matchesAuthor && matchesSearch;
        });

        const totalPages = Math.max(1, Math.ceil(matchedCards.length / CATALOG_CARDS_PER_PAGE));
        if (currentCatalogPage > totalPages) currentCatalogPage = totalPages;
        if (currentCatalogPage < 1) currentCatalogPage = 1;

        const pageStart = (currentCatalogPage - 1) * CATALOG_CARDS_PER_PAGE;
        const pageEnd = pageStart + CATALOG_CARDS_PER_PAGE;
        const pageCards = matchedCards.slice(pageStart, pageEnd);

        // Everything outside the filter match is hidden outright; cards
        // that match but fall on a different page are hidden too, just
        // for a different reason — only the current page's slice shows
        catalogCards.forEach((card) => { card.style.display = "none"; });
        pageCards.forEach((card) => { card.style.display = ""; });

        if (resultsCountEl) {
            resultsCountEl.textContent = `Показано ${pageCards.length} из ${matchedCards.length}`;
        }

        if (catalogNoResults) catalogNoResults.hidden = matchedCards.length !== 0;

        renderCatalogPagination(totalPages, currentCatalogPage);
    }

    function renderCatalogPagination(totalPages, activePage) {
        if (!catalogPageNumbersEl) return;

        if (catalogPagePrevBtn) catalogPagePrevBtn.disabled = activePage <= 1;
        if (catalogPageNextBtn) catalogPageNextBtn.disabled = activePage >= totalPages;

        // Compact page list: first/last page, the current page and its
        // immediate neighbours, "…" for any gap — same approach as the
        // chapters table's pagination on the novel page
        const pagesToShow = new Set([1, totalPages, activePage, activePage - 1, activePage + 1]);
        const sortedPages = Array.from(pagesToShow).filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

        catalogPageNumbersEl.innerHTML = "";
        let previousPage = 0;

        sortedPages.forEach((pageNum) => {
            if (pageNum - previousPage > 1) {
                const ellipsis = document.createElement("span");
                ellipsis.className = "page-ellipsis";
                ellipsis.textContent = "…";
                catalogPageNumbersEl.appendChild(ellipsis);
            }

            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "page-number" + (pageNum === activePage ? " active" : "");
            btn.textContent = pageNum;
            btn.addEventListener("click", () => {
                currentCatalogPage = pageNum;
                applyCatalogFilters();
                catalogGrid.scrollIntoView({ behavior: "smooth", block: "start" });
            });
            catalogPageNumbersEl.appendChild(btn);

            previousPage = pageNum;
        });
    }

    if (catalogPagePrevBtn) {
        catalogPagePrevBtn.addEventListener("click", () => {
            currentCatalogPage -= 1;
            applyCatalogFilters();
            catalogGrid.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }

    if (catalogPageNextBtn) {
        catalogPageNextBtn.addEventListener("click", () => {
            currentCatalogPage += 1;
            applyCatalogFilters();
            catalogGrid.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }

    function applyCatalogSort() {
        const activeSort = sortDropdown?.querySelector(".sort-option.active")?.textContent.trim();
        let sorted;

        if (activeSort === "Высокий рейтинг" || activeSort === "Популярные") {
            sorted = catalogCards.slice().sort((a, b) => parseFloat(b.dataset.rating || 0) - parseFloat(a.dataset.rating || 0));
        } else if (activeSort === "Новые поступления") {
            sorted = originalOrder.slice().reverse();
        } else {
            sorted = originalOrder;
        }

        sorted.forEach((card) => catalogGrid.appendChild(card));
        currentCatalogPage = 1;
        applyCatalogFilters();
    }

    document.querySelectorAll('.filter-group[data-filter-group] input[type="checkbox"]').forEach((input) => {
        input.addEventListener("change", () => {
            currentCatalogPage = 1;
            applyCatalogFilters();
        });
    });

    if (catalogSearchInput) {
        catalogSearchInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                currentCatalogPage = 1;
                applyCatalogFilters();
            }
        });
    }

    if (catalogSearchBtn) {
        catalogSearchBtn.addEventListener("click", () => {
            currentCatalogPage = 1;
            applyCatalogFilters();
        });
    }

    document.querySelectorAll(".search-tag").forEach((tag) => {
        tag.addEventListener("click", (event) => {
            event.preventDefault();

            if (tag.dataset.search && catalogSearchInput) {
                catalogSearchInput.value = tag.dataset.search;
            }

            if (tag.dataset.status) {
                const checkbox = document.querySelector(`.filter-group[data-filter-group="status"] input[data-value="${tag.dataset.status}"]`);
                if (checkbox) checkbox.checked = true;
            }

            currentCatalogPage = 1;
            applyCatalogFilters();
        });
    });

    if (clearAllFiltersBtn) {
        clearAllFiltersBtn.addEventListener("click", () => {
            document.querySelectorAll('.filter-group[data-filter-group] input[type="checkbox"]').forEach((input) => { input.checked = false; });
            if (catalogSearchInput) catalogSearchInput.value = "";

            // Also reset any searchable checklists (Author, etc.) back
            // to their unfiltered state
            document.querySelectorAll(".filter-search-input").forEach((input) => {
                input.value = "";
                input.dispatchEvent(new Event("input"));
            });

            currentCatalogPage = 1;
            applyCatalogFilters();
        });
    }

    // Exposed so the sort dropdown (defined below) can trigger a re-sort
    // right after it updates which option is active
    window.applyCatalogSort = applyCatalogSort;

    // Run once on load: some browsers (Firefox especially) restore
    // checkbox states after a refresh without firing a "change" event,
    // which could otherwise leave the result count/no-results message
    // out of sync with what's actually checked
    applyCatalogFilters();
}

/* ---------- "Sort by" dropdown ---------- */
/* Same open/close + option-list pattern as the header's Profile
   dropdown — a button + panel instead of a native <select> */

const sortButton = document.getElementById("sortButton");
const sortDropdown = document.getElementById("sortDropdown");
const sortButtonLabel = document.getElementById("sortButtonLabel");

if (sortButton && sortDropdown) {
    sortButton.addEventListener("click", (event) => {
        event.stopPropagation();
        sortDropdown.classList.toggle("open");
    });

    sortDropdown.querySelectorAll(".sort-option").forEach((option) => {
        option.addEventListener("click", () => {
            sortDropdown.querySelectorAll(".sort-option").forEach((o) => o.classList.remove("active"));
            option.classList.add("active");
            if (sortButtonLabel) sortButtonLabel.textContent = option.textContent;
            sortDropdown.classList.remove("open");
            if (window.applyCatalogSort) window.applyCatalogSort();
        });
    });

    document.addEventListener("click", (event) => {
        if (!sortDropdown.contains(event.target) && !sortButton.contains(event.target)) {
            sortDropdown.classList.remove("open");
        }
    });
}

/* ---------- Grid / List view switcher ---------- */

const viewButtons = document.querySelectorAll(".view-btn");

viewButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
        viewButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        if (catalogGrid) {
            catalogGrid.classList.toggle("list-view", btn.dataset.view === "list");
        }
    });
});

/* ---------- Card "···" menu (Add to Collection / Share / Report...) ---------- */
// Wrapped in a function (called after the grid is actually populated)
// for the same reason as initCatalogFiltering above — nothing to bind
// to yet at the point this file first runs

function bindCatalogCardMenus() {
    document.querySelectorAll(".card-menu").forEach((menu) => {
        const toggleBtn = menu.querySelector(".btn-card-menu");
        const dropdown = menu.querySelector(".card-menu-dropdown");
        if (!toggleBtn || !dropdown || toggleBtn.dataset.bound) return;
        toggleBtn.dataset.bound = "true";

        toggleBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            const isOpen = dropdown.classList.contains("open");

            // Only one card menu open at a time
            document.querySelectorAll(".card-menu-dropdown.open").forEach((d) => d.classList.remove("open"));
            document.querySelectorAll(".btn-card-menu[aria-expanded='true']").forEach((b) => b.setAttribute("aria-expanded", "false"));

            if (!isOpen) {
                dropdown.classList.add("open");
                toggleBtn.setAttribute("aria-expanded", "true");
            }
        });
    });
}

document.addEventListener("click", (event) => {
    if (!event.target.closest(".card-menu")) {
        document.querySelectorAll(".card-menu-dropdown.open").forEach((d) => d.classList.remove("open"));
        document.querySelectorAll(".btn-card-menu[aria-expanded='true']").forEach((b) => b.setAttribute("aria-expanded", "false"));
    }
});

/* ---------- Pagination ----------
   Real prev/next + page-number logic now lives inside
   initCatalogFiltering() above (renderCatalogPagination), since the
   page buttons need to be rebuilt every time the filtered/sorted set
   of cards changes — nothing left to do here. */

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

// novel=<id> is passed along so chapter.html / reader.html know which
// novel's chapter to load
function chapterHref(novelId, chapterNumber) {
    return `chapter.html?novel=${encodeURIComponent(novelId)}&chapter=${chapterNumber}`;
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
        all[novelId] = { chapter: chapterNumber, updatedAt: new Date().toISOString() };
        localStorage.setItem(READING_PROGRESS_KEY, JSON.stringify(all));
        markNovelAsReadingIfNew(novelId);
    } catch (error) {
        console.error("Couldn't save reading progress:", error);
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
   READER MODE (reader.html)
   ========================================
   Guarded on the outer if: only reader.html has a .reader-header,
   so this whole block is a no-op on every other page instead of
   throwing on missing elements.
   ======================================== */

const readerHeader = document.querySelector(".reader-header");

if (readerHeader) {
    const readerBody = document.body;

    /* 1. Toggle Settings Bar Visibility */
    const toggleSettingsBtn = document.getElementById("toggleSettings");
    const settingsPanel = document.getElementById("settingsPanel");

    if (toggleSettingsBtn && settingsPanel) {
        toggleSettingsBtn.addEventListener("click", () => {
            const isHidden = settingsPanel.style.display === "none";
            settingsPanel.style.display = isHidden ? "flex" : "none";
            toggleSettingsBtn.classList.toggle("active", isHidden);
        });
    }

    /* 1b. «Закладка» в шапке читалки — закладка на этом месте главы.
       Сохраняется (см. «Закладки-страницы» выше): в закладку попадает
       абзац, который сейчас на экране, он же — подпись на странице
       «Закладки». Иконка: контур/заливка, как у .favorite-btn. На главу
       одна закладка — повторное нажатие снимает её. При переходе на
       другую главу состояние кнопки подтягивается заново
       (syncChapterBookmarkButton вызывается из loadChapter ниже). */

    // Первый абзац, видимый на экране: в режиме прокрутки — под шапкой,
    // в режиме «Книга» — в текущей колонке (предыдущие уехали влево)
    function firstVisiblePassage() {
        const paragraphs = document.querySelectorAll("#proseParagraphs p");
        const topEdge = readerHeader.offsetHeight + 4;

        for (const paragraph of paragraphs) {
            const rect = paragraph.getBoundingClientRect();
            if (rect.bottom > topEdge && rect.right > 0 && rect.left < window.innerWidth) {
                return paragraph.textContent.trim();
            }
        }
        return paragraphs.length ? paragraphs[0].textContent.trim() : "";
    }

    let syncChapterBookmarkButton = () => {};
    const btnBookmark = document.getElementById("btnBookmark");
    if (btnBookmark) {
        const btnBookmarkIcon = btnBookmark.querySelector(".tool-icon img");

        const showBookmarkState = (isSaved) => {
            btnBookmark.classList.toggle("active", isSaved);
            btnBookmark.setAttribute("aria-pressed", isSaved);
            btnBookmark.title = isSaved ? "Убрать закладку с этой главы" : "Поставить закладку на этом месте";
            if (btnBookmarkIcon) {
                btnBookmarkIcon.src = isSaved
                    ? btnBookmarkIcon.dataset.filled
                    : btnBookmarkIcon.dataset.outline;
            }
        };

        syncChapterBookmarkButton = () => {
            showBookmarkState(Boolean(getChapterBookmark(readerNovelId, currentChapterNumber)));
        };

        btnBookmark.addEventListener("click", () => {
            const wasSaved = Boolean(getChapterBookmark(readerNovelId, currentChapterNumber));

            if (wasSaved) {
                removeChapterBookmark(readerNovelId, currentChapterNumber);
            } else {
                const titleEl = document.getElementById("chapterTitle");
                saveChapterBookmark({
                    novelId: readerNovelId,
                    chapterNumber: currentChapterNumber,
                    chapterTitle: titleEl ? titleEl.textContent : "",
                    text: firstVisiblePassage(),
                });
            }
            showBookmarkState(!wasSaved);
        });
    }

    /* 1c. Reading Mode Toggle — Scroll (one continuous page) vs Book
       (paginated, one screen at a time via the side ‹ › arrows).
       Book mode lays the prose out as a single CSS column sized to
       the space actually available on screen, and "turning a page"
       just scrolls that column horizontally by one screen-width. */
    const BOOK_COLUMN_GAP = 60; // keep in sync with the column-gap in style.css
    const toggleReadingModeBtn = document.getElementById("toggleReadingMode");
    const readingModeLabel = document.getElementById("readingModeLabel");
    const readingModeIcon = toggleReadingModeBtn
        ? toggleReadingModeBtn.querySelector(".tool-icon img")
        : null;
    let isBookMode = false;

    function applyBookModeLayout() {
        const proseEl = document.getElementById("readingProse");
        if (!isBookMode || !proseEl) return;

        const header = document.querySelector(".reader-header");
        const footer = document.querySelector(".reader-footer");
        const viewport = document.querySelector(".reader-viewport");
        const headerH = header ? header.offsetHeight : 0;
        const footerH = footer ? footer.offsetHeight : 0;

        // Read .reader-viewport's actual top+bottom padding straight from
        // CSS instead of hardcoding a guessed number here — a hardcoded
        // value silently drifts out of sync the moment that CSS padding
        // changes (that's exactly what was leaving a gap at the bottom of
        // every page: this used to assume 60px of padding when book mode
        // actually only reserves 40px, so every page was rendered ~20px
        // shorter than it needed to be).
        let viewportPaddingV = 40;
        if (viewport) {
            const viewportStyles = getComputedStyle(viewport);
            viewportPaddingV =
                parseFloat(viewportStyles.paddingTop || "0") +
                parseFloat(viewportStyles.paddingBottom || "0");
        }
        const safetyBuffer = 4; // small cushion for rounding/border edge cases

        // Note: chapter-head is now a flowing child of .prose itself
        // (so it only ever occupies the first page/column), so it's
        // NOT subtracted here the way header/footer are
        const available = window.innerHeight - headerH - footerH - viewportPaddingV - safetyBuffer;
        proseEl.style.height = `${Math.max(240, available)}px`;

        // column-width doesn't accept percentages — measure the
        // container's actual rendered width first, then pin each
        // column to exactly that width so "one column" = "one screen"
        const columnWidthPx = proseEl.clientWidth;
        if (columnWidthPx > 0) {
            proseEl.style.columnWidth = `${columnWidthPx}px`;
        }
    }

    // Re-lays-out and jumps back to the first page — called whenever
    // something reflows the text (chapter switch, font/size/width
    // change, window resize) so the reader never gets stuck mid-column
    function refreshBookLayoutIfNeeded() {
        if (!isBookMode) return;
        applyBookModeLayout();
        const proseEl = document.getElementById("readingProse");
        if (proseEl) proseEl.scrollLeft = 0;
        updateReadingProgress();
    }

    function setBookMode(enabled) {
        isBookMode = enabled;
        document.body.classList.toggle("book-mode", enabled);

        if (toggleReadingModeBtn) {
            toggleReadingModeBtn.title = enabled ? "Переключить на прокрутку" : "Переключить на постраничный режим";
        }
        if (readingModeLabel) readingModeLabel.textContent = enabled ? "Книга" : "Прокрутка";

        // Same pattern as the moon/sun theme icon swap: the icon itself
        // communicates the state, no color highlight needed on the button
        if (readingModeIcon) {
            readingModeIcon.src = enabled
                ? "images/icons/book.svg"
                : "images/icons/scroll.svg";
        }

        const proseEl = document.getElementById("readingProse");
        if (enabled) {
            applyBookModeLayout();
            if (proseEl) proseEl.scrollLeft = 0;
        } else if (proseEl) {
            proseEl.style.height = "";
            proseEl.style.columnWidth = "";
            proseEl.scrollLeft = 0;
        }

        window.scrollTo({ top: 0, behavior: "instant" });
        updateReadingProgress();
    }

    if (toggleReadingModeBtn) {
        toggleReadingModeBtn.addEventListener("click", () => setBookMode(!isBookMode));
    }

    /* 2. Theme Swatches */
    const readerSwatches = document.querySelectorAll(".swatch");
    readerSwatches.forEach((swatch) => {
        swatch.addEventListener("click", () => {
            readerSwatches.forEach((s) => s.classList.remove("active"));
            swatch.classList.add("active");

            const selectedTheme = swatch.getAttribute("data-theme");
            readerBody.className = readerBody.className.replace(/\btheme-\S+/g, "").trim();
            readerBody.classList.add(selectedTheme);
        });
    });

    /* Generic wiring for the site-style dropdown menus used below
       (Font / Spacing / Width) — same open/close pattern as the header
       Catalog/Language/Filter dropdowns: toggle .open on click, close
       on an outside click, one open at a time. */
    function setupPanelDropdown({ containerId, buttonId, labelId, onSelect }) {
        const container = document.getElementById(containerId);
        const button = document.getElementById(buttonId);
        const label = document.getElementById(labelId);
        if (!container || !button) return;

        button.addEventListener("click", (event) => {
            event.stopPropagation();
            document.querySelectorAll(".panel-dropdown.open").forEach((other) => {
                if (other !== container) other.classList.remove("open");
            });
            container.classList.toggle("open");
        });

        container.querySelectorAll(".panel-dropdown-option").forEach((option) => {
            option.addEventListener("click", () => {
                container.querySelectorAll(".panel-dropdown-option").forEach((o) => o.classList.remove("active"));
                option.classList.add("active");
                if (label) label.textContent = option.textContent;
                container.classList.remove("open");
                onSelect(option);
            });
        });
    }

    document.addEventListener("click", (event) => {
        document.querySelectorAll(".panel-dropdown.open").forEach((container) => {
            if (!container.contains(event.target)) container.classList.remove("open");
        });
    });

    /* 3. Font Family Dropdown */
    setupPanelDropdown({
        containerId: "fontDropdown",
        buttonId: "fontDropdownBtn",
        labelId: "fontDropdownLabel",
        onSelect: (option) => {
            readerBody.className = readerBody.className.replace(/\bfont-\S+/g, "").trim();
            readerBody.classList.add(option.dataset.fontClass);
            refreshBookLayoutIfNeeded();
        },
    });

    /* 4. Font Size Step Controls */
    const prose = document.getElementById("readingProse");
    const readerContainer = document.getElementById("readerContainer");
    const fontSizeVal = document.getElementById("fontSizeVal");
    let currentFontSize = 20;

    const btnIncreaseFont = document.getElementById("btnIncreaseFont");
    if (btnIncreaseFont) {
        btnIncreaseFont.addEventListener("click", () => {
            if (currentFontSize < 32) {
                currentFontSize += 2;
                prose.style.fontSize = `${currentFontSize}px`;
                fontSizeVal.textContent = currentFontSize;
                refreshBookLayoutIfNeeded();
            }
        });
    }

    const btnDecreaseFont = document.getElementById("btnDecreaseFont");
    if (btnDecreaseFont) {
        btnDecreaseFont.addEventListener("click", () => {
            if (currentFontSize > 14) {
                currentFontSize -= 2;
                prose.style.fontSize = `${currentFontSize}px`;
                fontSizeVal.textContent = currentFontSize;
                refreshBookLayoutIfNeeded();
            }
        });
    }

    /* 5. Line Spacing Dropdown */
    setupPanelDropdown({
        containerId: "spacingDropdown",
        buttonId: "spacingDropdownBtn",
        labelId: "spacingDropdownLabel",
        onSelect: (option) => {
            prose.style.lineHeight = option.dataset.spacing;
            refreshBookLayoutIfNeeded();
        },
    });

    /* 6. Text Column Width Dropdown */
    setupPanelDropdown({
        containerId: "widthDropdown",
        buttonId: "widthDropdownBtn",
        labelId: "widthDropdownLabel",
        onSelect: (option) => {
            readerContainer.style.maxWidth = option.dataset.width;
            refreshBookLayoutIfNeeded();
        },
    });

    /* 8. Chapter loading — fetches the novel's own data file (for the
       full chapter list, used for prev/next) plus the individual
       chapter's text from /novels/<id>/chapters/glava-<n>.json */
    const chapterLabel = document.getElementById("chapterLabel");
    const chapterTitleEl = document.getElementById("chapterTitle");
    const chapterSubtitle = document.getElementById("chapterSubtitle");
    const novelTitle = readerHeader.querySelector(".novel-title");

    const { novelId: readerNovelId, chapterNumber: readerChapterFromUrl } = getNovelAndChapterFromUrl();
    let currentChapterNumber = readerChapterFromUrl;
    let availableChapters = [currentChapterNumber];
    let currentChapterFootnotes = [];

    setupFootnotePopover(prose, () => currentChapterFootnotes);

    async function loadChapter(chapterNumber) {
        try {
            const novel = await getNovelData(readerNovelId);
            availableChapters = [...novel.chapters].map((c) => c.number).sort((a, b) => a - b);

            const response = await fetch(chapterContentUrl(readerNovelId, chapterNumber));
            if (!response.ok) throw new Error(`Глава ${chapterNumber} не найдена`);
            const chapter = await response.json();

            currentChapterNumber = chapter.number;
            currentChapterFootnotes = chapter.footnotes || [];
            saveReadingProgress(readerNovelId, chapter.number);
            syncChapterBookmarkButton();

            const webVersionLink = document.getElementById("webVersionLink");
            if (webVersionLink) webVersionLink.href = `chapter.html?novel=${readerNovelId}&chapter=${chapter.number}`;

            const exitReadingLink = document.getElementById("exitReadingLink");
            if (exitReadingLink) exitReadingLink.href = `novel.html?id=${readerNovelId}`;

            if (chapterLabel) chapterLabel.textContent = `Глава ${chapter.number}`;
            if (chapterTitleEl) chapterTitleEl.textContent = chapter.title;
            if (chapterSubtitle) chapterSubtitle.textContent = `Глава ${chapter.number}: ${chapter.title}`;
            document.title = `Глава ${chapter.number}: ${chapter.title} — ${novel.title || (novelTitle ? novelTitle.textContent : "Busy Bee")}`;
            if (novelTitle) {
                novelTitle.textContent = novel.title;
                novelTitle.href = `novel.html?id=${readerNovelId}`;
            }

            if (prose) {
                const paragraphsContainer = document.getElementById("proseParagraphs");
                // The drop cap on the first paragraph is now handled purely
                // in CSS via `#proseParagraphs p:first-child::first-letter`
                // (see style.css) instead of manually slicing off the first
                // character here — ::first-letter is what the initial-letter
                // enhancement is actually designed to target, and it's
                // universally supported on its own as a fallback too, so
                // there's no longer any need to special-case paragraph 0.
                const paragraphsHtml = chapter.paragraphs
                    .map(formatChapterParagraph)
                    .join("");

                if (paragraphsContainer) {
                    paragraphsContainer.innerHTML = paragraphsHtml;
                } else {
                    // Fallback, shouldn't normally happen
                    prose.innerHTML = paragraphsHtml;
                }
            }

            updateChapterNavLinks();

            // Recompute how many "pages" this chapter is roughly worth,
            // for the "X pages left" footer label (see step 9 below)
            const totalWords = chapter.paragraphs.reduce(
                (sum, paragraph) => sum + paragraph.split(/\s+/).filter(Boolean).length,
                0
            );
            currentChapterTotalPages = Math.max(1, Math.round(totalWords / WORDS_PER_PAGE));

            // Scroll to top of the chapter on every switch
            window.scrollTo({ top: 0, behavior: "instant" });
            refreshBookLayoutIfNeeded();
            updateReadingProgress();
        } catch (error) {
            const paragraphsContainer = document.getElementById("proseParagraphs");
            const errorHtml = `<p>Не удалось загрузить главу (${chapterNumber}). ${error.message}</p>`;
            if (paragraphsContainer) {
                paragraphsContainer.innerHTML = errorHtml;
            } else if (prose) {
                prose.innerHTML = errorHtml;
            }
            console.error(error);
        }
    }

    // Footer "‹ Previous" / "Next ›" links: step through the chapters
    // that actually have test data, disabling at either end
    const prevChapterLink = document.querySelector(".chapter-nav-links .nav-link:first-child");
    const nextChapterLink = document.querySelector(".chapter-nav-links .nav-link:last-child");

    function updateChapterNavLinks() {
        const index = availableChapters.indexOf(currentChapterNumber);

        if (prevChapterLink) {
            const hasPrev = index > 0;
            prevChapterLink.style.opacity = hasPrev ? "1" : "0.3";
            prevChapterLink.style.pointerEvents = hasPrev ? "auto" : "none";
        }
        if (nextChapterLink) {
            const hasNext = index >= 0 && index < availableChapters.length - 1;
            nextChapterLink.style.opacity = hasNext ? "1" : "0.3";
            nextChapterLink.style.pointerEvents = hasNext ? "auto" : "none";
        }
    }

    if (prevChapterLink) {
        prevChapterLink.addEventListener("click", (event) => {
            event.preventDefault();
            const index = availableChapters.indexOf(currentChapterNumber);
            if (index > 0) loadChapter(availableChapters[index - 1]);
        });
    }

    if (nextChapterLink) {
        nextChapterLink.addEventListener("click", (event) => {
            event.preventDefault();
            const index = availableChapters.indexOf(currentChapterNumber);
            if (index < availableChapters.length - 1) loadChapter(availableChapters[index + 1]);
        });
    }

    /* 9. Reading progress bar — tracks position through the current
       chapter (page scroll in Scroll mode, column scroll in Book
       mode) and updates the footer bar, dot, percent text, and an
       estimated "pages left" count in real time. Pages are a rough
       estimate (words ÷ WORDS_PER_PAGE) in Scroll mode; in Book mode
       "pages left" instead reflects actual columns remaining. */
    const progressFill = document.querySelector(".progress-fill");
    const progressThumb = document.querySelector(".progress-thumb");
    const progressText = document.querySelector(".progress-text");
    const pagesRemainingEl = document.querySelector(".pages-remaining");
    const progressTrack = document.querySelector(".progress-track");
    const WORDS_PER_PAGE = 300;
    let currentChapterTotalPages = 1;

    // "1 страница", "2 страницы", "5 страниц" — Russian plural forms
    function pagesLeftLabel(n) {
        const mod10 = n % 10;
        const mod100 = n % 100;
        let word = "страниц";
        if (mod10 === 1 && mod100 !== 11) word = "страница";
        else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) word = "страницы";
        return `${n} ${word} осталось`;
    }

    function updateReadingProgress() {
        if (!prose) return;

        let percent = 0;

        if (isBookMode) {
            const maxScroll = prose.scrollWidth - prose.clientWidth;
            percent = maxScroll > 0
                ? Math.min(100, Math.max(0, Math.round((prose.scrollLeft / maxScroll) * 100)))
                : 100;
        } else {
            const proseTop = prose.getBoundingClientRect().top + window.scrollY;
            const proseHeight = prose.offsetHeight;
            const viewportHeight = window.innerHeight;
            const scrolled = window.scrollY - proseTop + viewportHeight;
            percent = proseHeight > 0
                ? Math.min(100, Math.max(0, Math.round((scrolled / proseHeight) * 100)))
                : 0;
        }

        if (progressFill) progressFill.style.width = `${percent}%`;
        if (progressThumb) progressThumb.style.left = `${percent}%`;
        if (progressText) progressText.textContent = `${percent}% главы`;

        if (pagesRemainingEl) {
            if (isBookMode) {
                const pageWidth = prose.clientWidth + BOOK_COLUMN_GAP;
                const totalPages = Math.max(1, Math.round((prose.scrollWidth + BOOK_COLUMN_GAP) / pageWidth));
                const currentPage = Math.round((prose.scrollLeft / pageWidth)) + 1;
                const pagesLeft = Math.max(0, totalPages - currentPage);
                pagesRemainingEl.textContent = pagesLeftLabel(pagesLeft);
            } else {
                const pagesLeft = Math.max(
                    0,
                    currentChapterTotalPages - Math.round((currentChapterTotalPages * percent) / 100)
                );
                pagesRemainingEl.textContent = pagesLeftLabel(pagesLeft);
            }
        }
    }

    // Clicking anywhere on the track jumps to that point in the chapter
    if (progressTrack) {
        progressTrack.addEventListener("click", (event) => {
            if (!prose) return;
            const rect = progressTrack.getBoundingClientRect();
            const clickPercent = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));

            if (isBookMode) {
                const maxScroll = prose.scrollWidth - prose.clientWidth;
                prose.scrollTo({ left: clickPercent * maxScroll, behavior: "smooth" });
            } else {
                const proseTop = prose.getBoundingClientRect().top + window.scrollY;
                const targetScroll = proseTop - window.innerHeight + clickPercent * prose.offsetHeight;
                window.scrollTo({ top: targetScroll, behavior: "smooth" });
            }
        });
    }

    /* 10. Page-turn arrows — the big round ‹ › buttons beside the
       text. In Book mode they move exactly one column (one "page").
       In Scroll mode there's no concept of a "page" to move by, so
       they step to the previous/next chapter instead — same jump as
       the ‹ Previous / Next › links in the footer. */
    const navPrevBtn = document.querySelector(".page-nav.nav-prev");
    const navNextBtn = document.querySelector(".page-nav.nav-next");

    function turnPage(direction) {
        if (!prose) return;

        if (isBookMode) {
            const pageWidth = prose.clientWidth + BOOK_COLUMN_GAP;
            prose.scrollBy({ left: direction * pageWidth, behavior: "smooth" });
        } else {
            const index = availableChapters.indexOf(currentChapterNumber);
            if (direction < 0 && index > 0) {
                loadChapter(availableChapters[index - 1]);
            } else if (direction > 0 && index >= 0 && index < availableChapters.length - 1) {
                loadChapter(availableChapters[index + 1]);
            }
        }
    }

    if (navPrevBtn) navPrevBtn.addEventListener("click", () => turnPage(-1));
    if (navNextBtn) navNextBtn.addEventListener("click", () => turnPage(1));

    window.addEventListener("scroll", updateReadingProgress);
    if (prose) prose.addEventListener("scroll", updateReadingProgress);
    window.addEventListener("resize", () => {
        refreshBookLayoutIfNeeded();
        updateReadingProgress();
    });

    loadChapter(currentChapterNumber);
}


/* ====================================================================
   WEB-MODE CHAPTER PAGE (chapter.html only)
   Independent from the Reading-mode block above — same chapter JSON
   files, but rendered into a plain page (title/subtitle/paragraphs,
   no drop cap, no font/theme controls) with the normal site header
   and footer instead of the immersive reader chrome.
   ==================================================================== */
const chapterWebText = document.getElementById("chapterWebText");

if (chapterWebText) {
    const { novelId: webNovelId, chapterNumber: webChapterNumber } = getNovelAndChapterFromUrl();
    let webAvailableChapters = [webChapterNumber];
    let currentWebChapterFootnotes = [];

    setupFootnotePopover(chapterWebText, () => currentWebChapterFootnotes);

    const breadcrumbChapter = document.getElementById("breadcrumbChapter");
    const breadcrumbNovelLink = document.getElementById("breadcrumbNovelLink");
    const chapterLabel = document.getElementById("chapterLabel");
    const chapterTitle = document.getElementById("chapterTitle");
    const chapterWebInfo = document.getElementById("chapterWebInfo");
    const chapterWebNovelLink = document.getElementById("chapterWebNovelLink");
    const chapterWebAuthor = document.getElementById("chapterWebAuthor");
    const readingModeBtn = document.getElementById("readingModeBtn");
    const prevChapterBtn = document.getElementById("prevChapterBtn");
    const nextChapterBtn = document.getElementById("nextChapterBtn");

    async function loadWebChapter(chapterNumber) {
        try {
            const novel = await getNovelData(webNovelId);
            webAvailableChapters = [...novel.chapters].map((c) => c.number).sort((a, b) => a - b);

            const novelHref = `novel.html?id=${webNovelId}`;
            if (breadcrumbNovelLink) {
                breadcrumbNovelLink.textContent = novel.title;
                breadcrumbNovelLink.href = novelHref;
            }
            if (chapterWebNovelLink) {
                chapterWebNovelLink.textContent = novel.title;
                chapterWebNovelLink.href = novelHref;
            }
            if (chapterWebAuthor) chapterWebAuthor.textContent = novel.author ? novel.author.name : "";

            const response = await fetch(chapterContentUrl(webNovelId, chapterNumber));
            if (!response.ok) throw new Error(`Глава ${chapterNumber} не найдена`);
            const chapter = await response.json();
            saveReadingProgress(webNovelId, chapter.number);
            currentWebChapterFootnotes = chapter.footnotes || [];

            document.title = `Глава ${chapter.number}: ${chapter.title} — ${novel.title} | Busy Bee`;
            if (breadcrumbChapter) breadcrumbChapter.textContent = `Глава ${chapter.number}`;
            if (chapterLabel) chapterLabel.textContent = `Глава ${chapter.number}`;
            if (chapterTitle) chapterTitle.textContent = chapter.title;

            // Rough reading-time estimate (~200 words/minute) — just a
            // nice-to-have for the meta line, not meant to be precise
            const wordCount = chapter.paragraphs.join(" ").trim().split(/\s+/).length;
            const minutes = Math.max(1, Math.round(wordCount / 200));
            if (chapterWebInfo) {
                chapterWebInfo.textContent = `Глава ${chapter.number} · ~${minutes} мин чтения`;
            }

            chapterWebText.innerHTML = chapter.paragraphs
                .map(formatChapterParagraph)
                .join("");

            // Carry the chapter number over into Reading mode, so
            // switching modes lands on the same chapter you were on
            if (readingModeBtn) readingModeBtn.href = `reader.html?novel=${webNovelId}&chapter=${chapter.number}`;

            const index = webAvailableChapters.indexOf(chapterNumber);
            if (prevChapterBtn) {
                const hasPrev = index > 0;
                prevChapterBtn.classList.toggle("disabled", !hasPrev);
                prevChapterBtn.href = hasPrev
                    ? `chapter.html?novel=${webNovelId}&chapter=${webAvailableChapters[index - 1]}`
                    : "#";
            }
            if (nextChapterBtn) {
                const hasNext = index >= 0 && index < webAvailableChapters.length - 1;
                nextChapterBtn.classList.toggle("disabled", !hasNext);
                nextChapterBtn.href = hasNext
                    ? `chapter.html?novel=${webNovelId}&chapter=${webAvailableChapters[index + 1]}`
                    : "#";
            }

            window.scrollTo({ top: 0 });
        } catch (error) {
            chapterWebText.innerHTML = "<p>Не удалось загрузить главу.</p>";
            console.error("Failed to load chapter:", error);
        }
    }

    // Comment composer — visual only for now, no backend to post to yet
    const commentInput = document.getElementById("commentInput");
    const commentPostBtn = document.getElementById("commentPostBtn");
    if (commentPostBtn && commentInput) {
        commentPostBtn.addEventListener("click", () => {
            commentInput.value = "";
        });
    }

    loadWebChapter(webChapterNumber);
}


/* ====================================================================
   CHAPTER LIST MODAL (shared by reader.html + chapter.html)
   Independent block — works out which page it's on by feature-
   detecting an element unique to each, so the same code can open the
   same panel and jump to the right kind of page (reader.html vs
   chapter.html) from either one.
   ==================================================================== */
const chapterListBackdrop = document.getElementById("chapterListBackdrop");

if (chapterListBackdrop) {
    const chapterListItems = document.getElementById("chapterListItems");
    const chapterListClose = document.getElementById("chapterListClose");

    // Same page-detection trick as elsewhere: an element that only
    // exists on one of the two pages tells us which one we're on
    const isOnReaderPage = Boolean(document.getElementById("readingProse"));
    const targetPage = isOnReaderPage ? "reader.html" : "chapter.html";

    const { novelId: listNovelId, chapterNumber: listChapterFromUrl } = getNovelAndChapterFromUrl();
    const currentListChapter = listChapterFromUrl;

    function scrollToCurrentChapter() {
        const currentItem = chapterListItems.querySelector(".chapter-list-item.is-current");
        if (currentItem) {
            currentItem.scrollIntoView({ block: "center" });
        }
    }

    function openChapterList() {
        chapterListBackdrop.style.display = "flex";
        scrollToCurrentChapter();
    }

    function closeChapterList() {
        chapterListBackdrop.style.display = "none";
    }

    // Click the dimmed backdrop (but not the panel itself) to close —
    // stopPropagation on the modal itself keeps clicks inside it from
    // bubbling up and closing it by accident
    chapterListBackdrop.addEventListener("click", closeChapterList);
    const chapterListModalEl = chapterListBackdrop.querySelector(".chapter-list-modal");
    if (chapterListModalEl) {
        chapterListModalEl.addEventListener("click", (event) => event.stopPropagation());
    }
    if (chapterListClose) chapterListClose.addEventListener("click", closeChapterList);
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeChapterList();
    });

    // Wire up whichever trigger exists on this page
    const chapterSelectorBtn = document.getElementById("chapterSelectorBtn");
    if (chapterSelectorBtn) chapterSelectorBtn.addEventListener("click", openChapterList);
    const chapterTocBtn = document.getElementById("chapterTocBtn");
    if (chapterTocBtn) chapterTocBtn.addEventListener("click", openChapterList);

    getNovelData(listNovelId)
        .then((novel) => {
            // Newest-first, same order the novel page's chapters table uses
            const chapters = [...novel.chapters].sort((a, b) => b.number - a.number);

            chapterListItems.innerHTML = chapters
                .map((chapter) => {
                    const isCurrent = chapter.number === currentListChapter;
                    // No title yet = nothing has actually been
                    // translated for this chapter — shown, but not
                    // clickable, rather than linking to a chapter
                    // that would fail to load
                    const isLocked = !chapter.title;

                    let statusHtml = "";
                    if (chapter.status === "read") statusHtml = '<span class="item-status">✓</span>';
                    else if (isCurrent) statusHtml = '<span class="item-status">●</span>';

                    const classes = [
                        "chapter-list-item",
                        isCurrent ? "is-current" : "",
                        isLocked ? "is-locked" : "",
                    ].filter(Boolean).join(" ");

                    return `
                        <button type="button" class="${classes}" data-chapter="${chapter.number}" ${isLocked ? "disabled" : ""}>
                            <span class="item-num">${chapter.number}</span>
                            <span class="item-title">${chapter.title || "Ещё не переведено"}</span>
                            ${statusHtml}
                        </button>
                    `;
                })
                .join("");

            chapterListItems.querySelectorAll(".chapter-list-item:not(.is-locked)").forEach((item) => {
                item.addEventListener("click", () => {
                    window.location.href = `${targetPage}?novel=${listNovelId}&chapter=${item.dataset.chapter}`;
                });
            });

            // Covers the case where the panel gets opened before this
            // fetch resolves — there'd be nothing to scroll to yet at
            // that point, so do it again now that the rows exist
            scrollToCurrentChapter();
        })
        .catch((error) => console.error("Failed to load chapter list:", error));
}


/* ====================================================================
   TEXT SELECTION TOOLBAR (shared by reader.html + chapter.html)
   Detects when the reader selects text inside the chapter, shows a
   floating toolbar above the selection, and wires up Copy / Bookmark
   / Quote / Comment / Note. Comment and Note open a small composer;
   the other three act immediately. Everything persists to
   localStorage — there's no backend yet, so this is a working
   prototype of the feature, not a stub.
   ==================================================================== */
const selectionToolbar = document.getElementById("selectionToolbar");

if (selectionToolbar) {
    // Whichever of these exists tells us which page we're on, and is
    // also the only container selection should be picked up from —
    // selecting header/footer text shouldn't pop the toolbar up
    const selectionContainer =
        document.getElementById("proseParagraphs") || document.getElementById("chapterWebText");

    const selectionComposer = document.getElementById("selectionComposer");
    const selectionComposerQuoted = document.getElementById("selectionComposerQuoted");
    const selectionComposerLabel = document.getElementById("selectionComposerLabel");
    const selectionComposerInput = document.getElementById("selectionComposerInput");
    const selectionComposerCancel = document.getElementById("selectionComposerCancel");
    const selectionComposerSave = document.getElementById("selectionComposerSave");
    const readerToast = document.getElementById("readerToast");

    let pendingSelectedText = "";
    let pendingComposerKey = ""; // which localStorage list Save writes to

    function showToast(message) {
        if (!readerToast) return;
        readerToast.textContent = message;
        readerToast.classList.add("is-visible");
        clearTimeout(showToast._timer);
        showToast._timer = setTimeout(() => {
            readerToast.classList.remove("is-visible");
        }, 2000);
    }

    // Appends an entry to a localStorage list — every button below
    // uses this same tiny helper, just with a different key/payload
    function saveToLocalList(key, entry) {
        let list = [];
        try {
            list = JSON.parse(localStorage.getItem(key)) || [];
        } catch (error) {
            list = [];
        }
        list.push({ novelId: currentChapterContext().novelId, ...entry, savedAt: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(list));
    }

    function hideSelectionToolbar() {
        selectionToolbar.style.display = "none";
    }

    function hideComposer() {
        if (selectionComposer) selectionComposer.style.display = "none";
        if (selectionComposerInput) selectionComposerInput.value = "";
    }

    function positionFloatingEl(el, rect) {
        // Centers the toolbar/composer horizontally over the
        // selection and sits it just above the selection's top edge,
        // then clamps so it never runs off either side of the screen
        const elWidth = el.offsetWidth;
        let left = rect.left + rect.width / 2 - elWidth / 2;
        left = Math.max(12, Math.min(left, window.innerWidth - elWidth - 12));
        const top = Math.max(12, rect.top - el.offsetHeight - 10);
        el.style.left = `${left}px`;
        el.style.top = `${top}px`;
    }

    function handleSelection() {
        const selection = window.getSelection();
        const text = selection.toString().trim();

        if (!text || selection.rangeCount === 0) {
            hideSelectionToolbar();
            return;
        }

        // Ignore selections that aren't inside the chapter text
        // (e.g. selecting a header link or the footer)
        const anchorNode = selection.anchorNode;
        if (!selectionContainer || !selectionContainer.contains(anchorNode)) {
            hideSelectionToolbar();
            return;
        }

        pendingSelectedText = text;
        const rect = selection.getRangeAt(0).getBoundingClientRect();

        selectionToolbar.style.display = "flex";
        positionFloatingEl(selectionToolbar, rect);

        // Kept for the composer, in case Comment/Note gets opened
        // right after — the DOM selection itself disappears the
        // moment the reader clicks into the textarea
        selectionToolbar.dataset.rectTop = rect.top;
        selectionToolbar.dataset.rectLeft = rect.left;
        selectionToolbar.dataset.rectWidth = rect.width;
    }

    document.addEventListener("mouseup", (event) => {
        // Let a click on the toolbar/composer itself run its own
        // handler instead of being treated as "selection cleared"
        if (selectionToolbar.contains(event.target)) return;
        if (selectionComposer && selectionComposer.contains(event.target)) return;
        handleSelection();
    });

    document.addEventListener("mousedown", (event) => {
        const clickedToolbar = selectionToolbar.contains(event.target);
        const clickedComposer = selectionComposer && selectionComposer.contains(event.target);
        if (!clickedToolbar && !clickedComposer) {
            hideSelectionToolbar();
        }
    });

    function currentChapterContext() {
        // Used both as a display label (e.g. in the Quotes/Notes
        // panels) and, via chapterNumber, to filter what those panels
        // show to just this chapter
        const title = document.getElementById("chapterTitle");
        const params = new URLSearchParams(window.location.search);
        const chapterNumber = parseInt(params.get("chapter"), 10) || 1;
        return {
            title: title ? title.textContent : document.title,
            number: chapterNumber,
            novelId: params.get("novel") || "kniga-grez",
        };
    }

    const selCopyBtn = document.getElementById("selCopyBtn");
    if (selCopyBtn) {
        selCopyBtn.addEventListener("click", () => {
            navigator.clipboard
                .writeText(pendingSelectedText)
                .then(() => showToast("Скопировано"))
                .catch(() => showToast("Не удалось скопировать — попробуйте ещё раз"));
            hideSelectionToolbar();
        });
    }

    const selBookmarkBtn = document.getElementById("selBookmarkBtn");
    if (selBookmarkBtn) {
        selBookmarkBtn.addEventListener("click", () => {
            saveToLocalList("busybee_passage_bookmarks", {
                text: pendingSelectedText,
                chapterTitle: currentChapterContext().title,
                chapterNumber: currentChapterContext().number,
                url: window.location.href,
            });
            showToast("Отрывок добавлен в закладки");
            hideSelectionToolbar();
        });
    }

    const selQuoteBtn = document.getElementById("selQuoteBtn");
    if (selQuoteBtn) {
        selQuoteBtn.addEventListener("click", () => {
            saveToLocalList("busybee_quotes", {
                text: pendingSelectedText,
                chapterTitle: currentChapterContext().title,
                chapterNumber: currentChapterContext().number,
                url: window.location.href,
            });
            showToast("Сохранено как цитата");
            hideSelectionToolbar();
        });
    }

    function openComposer(mode) {
        if (!selectionComposer) return;
        pendingComposerKey = mode === "note" ? "busybee_notes" : "busybee_comments";

        if (selectionComposerLabel) {
            selectionComposerLabel.textContent = mode === "note" ? "Добавить заметку" : "Добавить комментарий";
        }
        if (selectionComposerInput) {
            selectionComposerInput.placeholder =
                mode === "note" ? "Запишите что-нибудь…" : "Поделитесь мыслями…";
        }
        if (selectionComposerQuoted) {
            selectionComposerQuoted.textContent = `"${pendingSelectedText}"`;
        }

        const rect = {
            top: parseFloat(selectionToolbar.dataset.rectTop) || 100,
            left: parseFloat(selectionToolbar.dataset.rectLeft) || 100,
            width: parseFloat(selectionToolbar.dataset.rectWidth) || 0,
        };

        hideSelectionToolbar();
        selectionComposer.style.display = "block";
        positionFloatingEl(selectionComposer, rect);
        if (selectionComposerInput) selectionComposerInput.focus();
    }

    const selCommentBtn = document.getElementById("selCommentBtn");
    if (selCommentBtn) selCommentBtn.addEventListener("click", () => openComposer("comment"));

    const selNoteBtn = document.getElementById("selNoteBtn");
    if (selNoteBtn) selNoteBtn.addEventListener("click", () => openComposer("note"));

    if (selectionComposerCancel) selectionComposerCancel.addEventListener("click", hideComposer);

    if (selectionComposerSave) {
        selectionComposerSave.addEventListener("click", () => {
            const content = selectionComposerInput ? selectionComposerInput.value.trim() : "";
            if (!content) {
                showToast("Сначала что-нибудь напишите");
                return;
            }
            saveToLocalList(pendingComposerKey, {
                quotedText: pendingSelectedText,
                content,
                chapterTitle: currentChapterContext().title,
                chapterNumber: currentChapterContext().number,
                url: window.location.href,
            });
            showToast(pendingComposerKey === "busybee_notes" ? "Заметка сохранена" : "Комментарий опубликован");
            hideComposer();
        });
    }
}


/* ====================================================================
   SAVED QUOTES / NOTES PANEL (reader.html only)
   Reads whatever the selection toolbar above has saved into
   localStorage and shows just this chapter's entries — independent
   block so it works regardless of load order relative to that one.
   ==================================================================== */
const btnQuotesPanel = document.getElementById("btnQuotesPanel");
const btnNotesPanel = document.getElementById("btnNotesPanel");

if (btnQuotesPanel || btnNotesPanel) {
    const savedItemsBackdrop = document.getElementById("savedItemsBackdrop");
    const savedItemsTitle = document.getElementById("savedItemsTitle");
    const savedItemsList = document.getElementById("savedItemsList");
    const savedItemsClose = document.getElementById("savedItemsClose");

    function getStoredList(key) {
        try {
            return JSON.parse(localStorage.getItem(key)) || [];
        } catch (error) {
            return [];
        }
    }

    function currentReaderChapterNumber() {
        const params = new URLSearchParams(window.location.search);
        return parseInt(params.get("chapter"), 10) || 1;
    }

    function formatSavedDate(isoString) {
        const date = new Date(isoString);
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleDateString("ru-RU", { month: "short", day: "numeric" });
    }

    function renderSavedItems(storageKey) {
        const chapterNumber = currentReaderChapterNumber();
        const currentNovelId = new URLSearchParams(window.location.search).get("novel") || "kniga-grez";
        const isNotes = storageKey === "busybee_notes";
        const allItems = getStoredList(storageKey);
        const items = allItems
            .map((item, index) => ({ ...item, originalIndex: index }))
            .filter((item) => item.chapterNumber === chapterNumber && savedEntryNovelId(item) === currentNovelId);

        if (savedItemsTitle) savedItemsTitle.textContent = isNotes ? "Заметки" : "Цитаты";

        if (items.length === 0) {
            savedItemsList.innerHTML = `<div class="saved-items-empty">Пока нет сохранённых ${isNotes ? "заметок" : "цитат"} из этой главы.</div>`;
            return;
        }

        // Newest first
        items.reverse();

        savedItemsList.innerHTML = items
            .map((item) => {
                const quoteText = isNotes ? item.quotedText : item.text;
                const noteHtml = isNotes ? `<div class="saved-item-note">${item.content}</div>` : "";
                return `
                    <div class="saved-item" data-index="${item.originalIndex}">
                        <div class="saved-item-quote">"${quoteText}"</div>
                        ${noteHtml}
                        <div class="saved-item-meta">
                            <span>${formatSavedDate(item.savedAt)}</span>
                            <button type="button" class="saved-item-delete" data-storage-key="${storageKey}">Удалить</button>
                        </div>
                    </div>
                `;
            })
            .join("");

        savedItemsList.querySelectorAll(".saved-item-delete").forEach((btn) => {
            btn.addEventListener("click", () => {
                const card = btn.closest(".saved-item");
                const index = parseInt(card.dataset.index, 10);
                const list = getStoredList(storageKey);
                list.splice(index, 1);
                localStorage.setItem(storageKey, JSON.stringify(list));
                renderSavedItems(storageKey);
            });
        });
    }

    function openSavedItems(storageKey) {
        renderSavedItems(storageKey);
        savedItemsBackdrop.style.display = "flex";
    }

    function closeSavedItems() {
        savedItemsBackdrop.style.display = "none";
    }

    if (btnQuotesPanel) btnQuotesPanel.addEventListener("click", () => openSavedItems("busybee_quotes"));
    if (btnNotesPanel) btnNotesPanel.addEventListener("click", () => openSavedItems("busybee_notes"));
    if (savedItemsClose) savedItemsClose.addEventListener("click", closeSavedItems);

    savedItemsBackdrop.addEventListener("click", closeSavedItems);
    const savedItemsModalEl = savedItemsBackdrop.querySelector(".chapter-list-modal");
    if (savedItemsModalEl) {
        savedItemsModalEl.addEventListener("click", (event) => event.stopPropagation());
    }

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeSavedItems();
    });
}

/* ====================================================================
   NOVEL PAGE — dynamic data loading from /novels/<id>/<id>.json
   ==================================================================== */

const novelPageTitleEl = document.getElementById("novelTitle");

if (novelPageTitleEl) {

    // Russian pluralization: pluralizeRu(5, "глава", "главы", "глав") -> "глав"
    function pluralizeRu(n, one, few, many) {
        const mod10 = n % 10;
        const mod100 = n % 100;
        if (mod10 === 1 && mod100 !== 11) return one;
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
        return many;
    }

    function formatDateRu(isoDate) {
        const parsed = new Date(isoDate);
        if (isNaN(parsed)) return isoDate;
        return parsed.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
    }

    async function loadNovelPage() {
        const params = new URLSearchParams(window.location.search);
        const novelId = params.get("id") || "kniga-grez";

        // The "Глоссарий" shortcut needs the novel id before the JSON
        // even loads, so a broken novel page still links somewhere sane
        const novelGlossaryShortcut = document.getElementById("novelGlossaryShortcut");
        if (novelGlossaryShortcut) {
            novelGlossaryShortcut.href = `glossary.html?novel=${encodeURIComponent(novelId)}`;
        }

        let novel;
        try {
            const response = await fetch(`novels/${novelId}/${novelId}.json`);
            if (!response.ok) throw new Error("Not found");
            novel = await response.json();
        } catch (err) {
            novelPageTitleEl.textContent = "Новелла не найдена";
            return;
        }

        /* ---- Page title & breadcrumb ---- */
        const pageTitleEl = document.getElementById("pageTitle");
        if (pageTitleEl) pageTitleEl.textContent = `${novel.title} — Busy Bee`;
        const breadcrumbEl = document.getElementById("breadcrumbNovelTitle");
        if (breadcrumbEl) breadcrumbEl.textContent = novel.title;

        /* ---- Cover ---- */
        const coverImg = document.getElementById("novelCoverImg");
        if (coverImg) {
            coverImg.src = novel.cover;
            coverImg.alt = novel.title;
        }

        /* ---- Title / original title / author / translator ---- */
        novelPageTitleEl.textContent = novel.title;
        const originalTitleEl = document.getElementById("novelOriginalTitle");
        if (originalTitleEl) originalTitleEl.textContent = novel.originalTitle || "";

        if (novel.author) {
            const authorLinkTop = document.getElementById("novelAuthorLinkTop");
            const authorNameTop = document.getElementById("novelAuthorNameTop");
            const authorLinkMeta = document.getElementById("novelAuthorLinkMeta");
            if (authorNameTop) authorNameTop.textContent = novel.author.name;
            if (authorLinkTop) authorLinkTop.href = novel.author.href || "#";
            if (authorLinkMeta) {
                authorLinkMeta.textContent = novel.author.name;
                authorLinkMeta.href = novel.author.href || "#";
            }
        }

        if (novel.translator) {
            const translatorName = document.getElementById("novelTranslatorName");
            const translatorLink = document.getElementById("novelTranslatorLink");
            const translatorVerified = document.getElementById("novelTranslatorVerified");
            if (translatorName) translatorName.textContent = novel.translator.name;
            if (translatorLink) translatorLink.href = novel.translator.href || "#";
            if (translatorVerified) translatorVerified.hidden = !novel.translator.verified;
        }

        /* ---- Meta line: original status / chapter count / genres ---- */
        const metaStatusEl = document.getElementById("metaOriginalStatus");
        if (metaStatusEl) metaStatusEl.textContent = novel.status || "";

        const metaChaptersEl = document.getElementById("metaChaptersCount");
        if (metaChaptersEl && novel.totalChapters) {
            metaChaptersEl.textContent =
                `${novel.totalChapters} ${pluralizeRu(novel.totalChapters, "глава", "главы", "глав")}`;
        }

        const metaGenresEl = document.getElementById("metaGenresLine");
        if (metaGenresEl) metaGenresEl.textContent = (novel.genres || []).join(", ");

        const metaTranslationEl = document.getElementById("metaTranslationStatus");
        const metaTranslationIconEl = document.getElementById("metaTranslationStatusIcon");
        if (metaTranslationEl && novel.translationStatus) {
            metaTranslationEl.textContent = novel.translationStatus;
            if (metaTranslationIconEl) {
                if (novel.translationStatus === "Полностью переведено") {
                    metaTranslationIconEl.src = "images/icons/check-circle.svg";
                } else if (novel.translationStatus === "Приостановлено") {
                    metaTranslationIconEl.src = "images/icons/pause-circle.svg";
                } else {
                    metaTranslationIconEl.src = "images/icons/clock.svg";
                }
            }
        }

        /* ---- Rating ---- */
        if (novel.rating) {
            const scoreEl = document.getElementById("novelRatingScore");
            const starsEl = document.getElementById("novelRatingStars");
            const votesEl = document.getElementById("novelVotesCount");
            if (scoreEl) scoreEl.textContent = novel.rating.score.toFixed(1);
            if (starsEl) {
                const fullStars = Math.round(novel.rating.score);
                starsEl.textContent = "★".repeat(fullStars) + "☆".repeat(Math.max(0, 5 - fullStars));
            }
            if (votesEl) {
                const votesLabel = pluralizeRu(novel.rating.votes, "голос", "голоса", "голосов");
                votesEl.textContent = `(${novel.rating.votes.toLocaleString("ru-RU")} ${votesLabel})`;
            }
        }

        /* ---- Genres pills ---- */
        const genresPillsEl = document.getElementById("novelGenresPills");
        if (genresPillsEl) {
            genresPillsEl.innerHTML = (novel.genres || [])
                .map((genre) => `<a href="genre.html?name=${encodeURIComponent(genre)}" class="pill">${genre}</a>`)
                .join("");
        }

        /* ---- Series ---- */
        if (novel.series) {
            const seriesNameEl = document.getElementById("novelSeriesName");
            const seriesBookLabelEl = document.getElementById("novelSeriesBookLabel");
            if (seriesNameEl) seriesNameEl.textContent = novel.series.name;
            if (seriesBookLabelEl) seriesBookLabelEl.textContent = novel.series.bookLabel || "";
        }

        /* ---- Alternative titles ---- */
        const altTitlesEl = document.getElementById("novelAltTitles");
        if (altTitlesEl) altTitlesEl.innerHTML = (novel.alternativeTitles || []).join("<br>");

        /* ---- Content warnings ---- */
        const warningsPillsEl = document.getElementById("novelWarningsPills");
        if (warningsPillsEl) {
            warningsPillsEl.innerHTML = (novel.contentWarnings || [])
                .map((warning) => `<span class="pill warning">${warning}</span>`)
                .join("");
        }

        /* ---- Synopsis ---- */
        const synopsisEl = document.getElementById("novelSynopsisContent");
        if (synopsisEl) synopsisEl.innerHTML = (novel.synopsis || []).map((p) => `<p>${p}</p>`).join("");

        /* ---- Busy Bee Notes ---- */
        const beeNotesEl = document.getElementById("novelBeeNotesText");
        if (beeNotesEl) beeNotesEl.textContent = novel.busyBeeNotes || "";

        /* ---- Quotes carousel ---- */
        const quotesTrackEl = document.getElementById("novelQuotesTrack");
        if (quotesTrackEl) {
            quotesTrackEl.innerHTML = (novel.quotes || [])
                .map((quote) => `
                    <div class="quote-card">
                        <span class="quote-mark">“</span>
                        <p class="quote-text">«${quote.text}»</p>
                        <div class="quote-footer">
                            <span>— Глава ${quote.chapter}</span>
                            <button type="button" class="like-btn"><img src="images/icons/heart.svg" alt="" data-outline="images/icons/heart.svg" data-filled="images/icons/heart-filled.svg"> ${quote.likes}</button>
                        </div>
                    </div>`)
                .join("");

            // Same like-toggle behaviour as everywhere else — bound here
            // since these buttons didn't exist yet when script.js's own
            // quote-like handler ran further up this file
            quotesTrackEl.querySelectorAll(".like-btn").forEach((likeBtn) => {
                const icon = likeBtn.querySelector("img");
                likeBtn.addEventListener("click", () => {
                    const isLiked = likeBtn.classList.toggle("liked");
                    icon.src = isLiked ? icon.dataset.filled : icon.dataset.outline;
                });
            });
        }

        /* ---- Chapters: volumes sidebar + table rows ---- */
        const chapters = [...(novel.chapters || [])].sort((a, b) => b.number - a.number);
        const chaptersPerVolume = novel.chaptersPerVolume || 50;
        const totalVolumes = Math.max(1, Math.ceil((novel.totalChapters || 0) / chaptersPerVolume));
        const volumeForChapter = (num) => Math.ceil(num / chaptersPerVolume);

        const volumeListEl = document.getElementById("volumeSidebarList");
        if (volumeListEl) {
            let volumesHtml = `<li class="active" data-volume="all"><span>Все главы</span> <small>${novel.totalChapters || 0}</small></li>`;
            for (let v = 1; v <= totalVolumes; v++) {
                const start = (v - 1) * chaptersPerVolume + 1;
                const end = Math.min(v * chaptersPerVolume, novel.totalChapters || 0);
                volumesHtml += `<li data-volume="${v}"><span>Том ${v}</span> <small>${start}–${end}</small></li>`;
            }
            volumeListEl.innerHTML = volumesHtml;

            // Delegated click — works no matter when these <li>s were
            // created, unlike the old querySelectorAll(".volume-sidebar
            // li") binding further up this file (which ran before this
            // list existed and so never found anything to bind to)
            volumeListEl.addEventListener("click", (event) => {
                const item = event.target.closest("li");
                if (!item) return;
                volumeListEl.querySelectorAll("li").forEach((li) => li.classList.remove("active"));
                item.classList.add("active");
                if (typeof currentChapterPage !== "undefined") currentChapterPage = 1;
                if (typeof applyChapterFilters === "function") applyChapterFilters();
            });
        }

        const tbodyEl = document.getElementById("chaptersTableBody");
        if (tbodyEl) {
            tbodyEl.innerHTML = chapters
                .map((chapter) => {
                    const href = chapterHref(novelId, chapter.number);
                    return `
                    <tr data-volume="${volumeForChapter(chapter.number)}">
                        <td class="col-num">${chapter.number}</td>
                        <td class="col-title"><a href="${href}">${chapter.title || ""}</a></td>
                        <td class="col-date">${formatDateRu(chapter.date)}</td>
                        <td class="col-actions">
                            <div class="col-actions-inner">
                                <button type="button" class="btn-icon favorite-btn" aria-label="Сохранить главу" aria-pressed="false"><img src="images/icons/heart.svg" alt="" data-outline="images/icons/heart.svg" data-filled="images/icons/heart-filled.svg"></button>
                                <button class="btn-icon">···</button>
                            </div>
                        </td>
                    </tr>`;
                })
                .join("");

            // Same reasoning as the volume list above — bind the
            // favorite-heart toggle directly on these freshly-created rows
            tbodyEl.querySelectorAll(".favorite-btn").forEach((button) => {
                const icon = button.querySelector("img");
                button.addEventListener("click", () => {
                    const isSaved = button.classList.toggle("active");
                    button.setAttribute("aria-pressed", isSaved);
                    icon.src = isSaved ? icon.dataset.filled : icon.dataset.outline;
                    if (typeof applyChapterFilters === "function") applyChapterFilters();
                });
            });
        }

        /* ---- Continue Reading / floating button ----
           Resumes at the last chapter this browser has open for this
           novel (see getReadingProgress — localStorage only for now,
           no accounts/backend yet), falling back to the first chapter
           for a brand new reader. */
        if (chapters.length > 0) {
            const firstChapterNumber = Math.min(...chapters.map((c) => c.number));
            const savedChapterNumber = getReadingProgress(novelId);
            const hasSavedChapter =
                savedChapterNumber && chapters.some((c) => c.number === savedChapterNumber);
            const targetChapterNumber = hasSavedChapter ? savedChapterNumber : firstChapterNumber;
            const startHref = chapterHref(novelId, targetChapterNumber);

            const continueBtn = document.getElementById("continueReadingBtn");
            if (continueBtn) {
                continueBtn.href = startHref;
                const label = continueBtn.querySelector("span");
                if (label) label.textContent = hasSavedChapter ? "Продолжить чтение" : "Читать";
            }

            const floatingBtn = document.getElementById("floatingReadingBtn");
            if (floatingBtn) {
                const floatingLabel = document.getElementById("floatingReadingBtnLabel");
                if (floatingLabel) floatingLabel.innerHTML = hasSavedChapter ? "Продолжить<br>чтение" : "Начать<br>чтение";
                floatingBtn.addEventListener("click", () => { window.location.href = startHref; });
            }

            // Progress box: only shown once there's actually something
            // to report — a brand-new reader has no chapter to show yet
            const progressBox = document.getElementById("userProgressBox");
            if (progressBox && hasSavedChapter && novel.totalChapters) {
                const percent = Math.min(100, Math.round((savedChapterNumber / novel.totalChapters) * 100));
                const percentLabel = document.getElementById("userProgressPercentLabel");
                const fill = document.getElementById("userProgressFill");
                if (percentLabel) percentLabel.textContent = `${percent}%`;
                if (fill) fill.style.width = `${percent}%`;
                progressBox.hidden = false;
            }
        }

        // Now that real rows exist, kick off the table's own
        // filter/search/pagination system (defined further up this file)
        if (typeof applyChapterFilters === "function") applyChapterFilters();
    }

    loadNovelPage();
}

/* ====================================================================
   CATALOG PAGE — novel grid, populated from novels.json instead of
   the old hardcoded cards. Only handles the grid itself + the results
   count for now — the filter sidebar's checkbox lists (genres,
   authors, status counts) are still static/demo and need their own
   pass later once there's more real data to build them from.
   ==================================================================== */

if (catalogGrid) {
    // "116 глав" / "1 глава" / "3 главы" — same pattern as the other
    // pluralizers elsewhere in this file, duplicated locally since this
    // block doesn't share scope with them
    function pluralizeChaptersLabel(n) {
        const mod10 = n % 10;
        const mod100 = n % 100;
        let word = "глав";
        if (mod10 === 1 && mod100 !== 11) word = "глава";
        else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) word = "главы";
        return `${n} ${word}`;
    }

    // Maps the novel's own free-text status fields to the fixed set of
    // filter values the sidebar checkboxes use — shared between the
    // card template below and the sidebar's count aggregation further
    // down, so both always agree on the same buckets
    function originalStatusToFilterValue(status) {
        return status === "Завершено" ? "completed" : "ongoing";
    }

    function translationStatusToFilterValue(status) {
        if (status === "Полностью переведено") return "fully-translated";
        if (status === "Приостановлено") return "on-hiatus";
        return "in-progress";
    }

    // Builds every sidebar filter group (counts, genres, authors) from
    // the same `novels` array the grid itself was just built from —
    // one fetch feeds both, so they can never disagree with each other
    function populateCatalogSidebar(novels) {
        const statusCounts = { completed: 0, ongoing: 0 };
        const translationCounts = { "fully-translated": 0, "in-progress": 0, "on-hiatus": 0 };
        const lengthCounts = { short: 0, medium: 0, long: 0 };
        const genreCounts = new Map();
        const authorsByKey = new Map();

        novels.forEach((novel) => {
            statusCounts[originalStatusToFilterValue(novel.status)] += 1;
            translationCounts[translationStatusToFilterValue(novel.translationStatus)] += 1;

            const total = novel.totalChapters || 0;
            const bucket = total <= 100 ? "short" : total <= 300 ? "medium" : "long";
            lengthCounts[bucket] += 1;

            (novel.genres || []).forEach((genre) => {
                genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
            });

            if (novel.author && novel.author.name) {
                const key = novel.author.name.toLowerCase();
                if (!authorsByKey.has(key)) authorsByKey.set(key, { name: novel.author.name, count: 0 });
                authorsByKey.get(key).count += 1;
            }
        });

        const setCount = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };
        setCount("statusCountCompleted", statusCounts.completed);
        setCount("statusCountOngoing", statusCounts.ongoing);
        setCount("translationCountFully", translationCounts["fully-translated"]);
        setCount("translationCountProgress", translationCounts["in-progress"]);
        setCount("translationCountHiatus", translationCounts["on-hiatus"]);
        setCount("lengthCountShort", lengthCounts.short);
        setCount("lengthCountMedium", lengthCounts.medium);
        setCount("lengthCountLong", lengthCounts.long);

        // Genres — most common first; only the first few show right
        // away, the rest sit behind "Show more" (see GENRES_VISIBLE_COUNT)
        const GENRES_VISIBLE_COUNT = 6;
        const sortedGenres = Array.from(genreCounts.entries()).sort((a, b) => b[1] - a[1]);

        function genreCheckboxHtml([genre, count]) {
            return `
                <label class="filter-checkbox">
                    <input type="checkbox" data-value="${genre.toLowerCase()}">
                    <span>${genre}</span>
                    <span class="count">${count}</span>
                </label>`;
        }

        const genreChecklistMain = document.getElementById("genreChecklistMain");
        const extraGenres = document.getElementById("extraGenres");
        const btnShowMoreGenres = document.getElementById("btnShowMoreGenres");

        if (genreChecklistMain) {
            genreChecklistMain.innerHTML = sortedGenres.slice(0, GENRES_VISIBLE_COUNT).map(genreCheckboxHtml).join("");
        }
        if (extraGenres) {
            const extra = sortedGenres.slice(GENRES_VISIBLE_COUNT);
            extraGenres.innerHTML = extra.map(genreCheckboxHtml).join("");
            if (btnShowMoreGenres) btnShowMoreGenres.hidden = extra.length === 0;
        }

        // Authors — alphabetical, easier to scan/search than sorted by count
        const authorChecklist = document.getElementById("authorChecklist");
        if (authorChecklist) {
            const sortedAuthors = Array.from(authorsByKey.values()).sort((a, b) => a.name.localeCompare(b.name, "ru"));
            const authorRows = sortedAuthors
                .map((author) => `
                    <label class="filter-checkbox">
                        <input type="checkbox" data-value="${author.name.toLowerCase()}">
                        <span>${author.name}</span>
                        <span class="count">${author.count}</span>
                    </label>`)
                .join("");
            authorChecklist.innerHTML = authorRows + '<p class="no-results-notice filter-no-results" hidden>Авторы не найдены.</p>';
        }
    }

    function catalogCardHtml(novel) {
        const novelHref = `novel.html?id=${novel.id}`;
        const savedChapter = getReadingProgress(novel.id);
        const hasProgress = savedChapter && (novel.chapters || []).some((c) => c.number === savedChapter);

        let badgeClass = "badge-ongoing";
        let badgeIcon = "images/icons/clock.svg";
        let badgeText = "Выходит";
        if (novel.translationStatus === "Полностью переведено") {
            badgeClass = "badge-completed";
            badgeIcon = "images/icons/check-circle.svg";
            badgeText = "Завершено";
        } else if (novel.translationStatus === "Приостановлено") {
            badgeClass = "badge-hiatus";
            badgeIcon = "images/icons/pause-circle.svg";
            badgeText = "На паузе";
        }
        const genresHtml = (novel.genres || [])
            .slice(0, 4)
            .map((genre) => `<a href="genre.html?name=${encodeURIComponent(genre)}">${genre}</a>`)
            .join("");
        // Full genre list for filtering, separate from the 4 shown on
        // the card itself — otherwise filtering by a 5th+ genre a novel
        // actually has would wrongly exclude its card
        const allGenresAttr = (novel.genres || []).map((g) => g.toLowerCase()).join("|");

        let progressZoneHtml;
        let actionButtonHtml;
        if (hasProgress) {
            const percent = Math.min(100, Math.round((savedChapter / novel.totalChapters) * 100));
            progressZoneHtml = `
                <div class="card-progress-zone">
                    <span class="chapter-status">Глава ${savedChapter} из ${novel.totalChapters}</span>
                    <div class="mini-progress-bar"><div class="fill" style="width: ${percent}%;"></div></div>
                    <span class="percent-val">${percent}%</span>
                </div>`;
            actionButtonHtml = `<a href="${chapterHref(novel.id, savedChapter)}" class="btn-primary-action">Продолжить</a>`;
        } else {
            progressZoneHtml = `
                <div class="card-progress-zone text-only">
                    <span class="chapter-status">${pluralizeChaptersLabel(novel.totalChapters || 0)}</span>
                </div>`;
            actionButtonHtml = `<a href="${novelHref}" class="btn-secondary-action">Подробнее</a>`;
        }

        return `
            <article class="novel-card" data-rating="${novel.rating ? novel.rating.score : 0}" data-status="${originalStatusToFilterValue(novel.status)}" data-translation="${translationStatusToFilterValue(novel.translationStatus)}" data-genres="${allGenresAttr}">
                <div class="novel-cover-wrap">
                    <span class="badge ${badgeClass}"><img src="${badgeIcon}" alt="">${badgeText}</span>
                    <a href="${novelHref}"><img src="${novel.cover}" alt="${novel.title}"></a>
                </div>
                <div class="card-menu">
                    <button type="button" class="btn-card-menu" aria-label="More options" aria-haspopup="true" aria-expanded="false">···</button>
                    <div class="card-menu-dropdown">
                        <button type="button" class="card-menu-item"><img src="images/icons/folder.svg" alt="">Добавить в коллекцию</button>
                        <button type="button" class="card-menu-item"><img src="images/icons/share.svg" alt="">Поделиться</button>
                        <button type="button" class="card-menu-item"><img src="images/icons/edit.svg" alt="">Предложить исправление</button>
                        <button type="button" class="card-menu-item"><img src="images/icons/x-circle.svg" alt="">Скрыть новеллу</button>
                        <div class="card-menu-divider"></div>
                        <button type="button" class="card-menu-item card-menu-item-danger"><img src="images/icons/flag.svg" alt="">Пожаловаться</button>
                    </div>
                </div>
                <div class="novel-card-body">
                    <h3><a href="${novelHref}">${novel.title}</a></h3>
                    <span class="orig-title">${novel.originalTitle || ""}</span>
                    <span class="author-name">${novel.author ? novel.author.name : ""}</span>
                    <span class="translator-tag"><img src="images/icons/bee-icon.svg" alt=""> Переведено ${novel.translator ? novel.translator.name : "Busy Bee"}</span>

                    <div class="novel-tags">${genresHtml}</div>

                    ${progressZoneHtml}

                    <div class="card-actions">
                        <button type="button" class="favorite-btn" aria-label="Like" aria-pressed="false"><img src="images/icons/heart.svg" alt="" data-outline="images/icons/heart.svg" data-filled="images/icons/heart-filled.svg"></button>
                        <button type="button" class="mini-bookmark" data-novel-id="${novel.id}" aria-label="Save to bookmarks" aria-pressed="false"><img src="images/icons/bookmark.svg" alt="" data-outline="images/icons/bookmark.svg" data-filled="images/icons/bookmark-filled-gold.svg"></button>
                        ${actionButtonHtml}
                    </div>
                </div>
            </article>`;
    }

    fetch("novels/novels.json")
        .then((response) => response.json())
        .then((novelsIndex) => Promise.all(novelsIndex.map((entry) => getNovelData(entry.id))))
        .then((novels) => {
            catalogGrid.innerHTML = novels.map(catalogCardHtml).join("");
            populateCatalogSidebar(novels);

            // Same manual-bind reasoning as everywhere else dynamic in
            // this file — these buttons didn't exist yet when the
            // global .favorite-btn / .mini-bookmark bindings ran earlier
            catalogGrid.querySelectorAll(".favorite-btn").forEach((button) => {
                const icon = button.querySelector("img");
                button.addEventListener("click", () => {
                    const isSaved = button.classList.toggle("active");
                    button.setAttribute("aria-pressed", isSaved);
                    icon.src = isSaved ? icon.dataset.filled : icon.dataset.outline;
                });
            });
            bindNovelBookmarks(catalogGrid);

            bindCatalogCardMenus();
            bindFilterSearchInputs();
            initCatalogFiltering();
        })
        .catch((error) => console.error("Failed to load catalog:", error));
}

/* ====================================================================
   CATALOG PAGE — "Busy Bee рекомендует" mini carousel, same novels.json
   source as the grid above (and the homepage's own recommends section).
   ==================================================================== */

const catalogRecommendsTrack = document.getElementById("catalogRecommendsTrack");

if (catalogRecommendsTrack) {
    fetch("novels/novels.json")
        .then((response) => response.json())
        .then((novelsIndex) => Promise.all(novelsIndex.map((entry) => getNovelData(entry.id))))
        .then((novels) => {
            catalogRecommendsTrack.innerHTML = novels
                .map((novel) => `
                    <a href="novel.html?id=${novel.id}" class="mini-recommend-card">
                        <img src="${novel.cover}" alt="${novel.title}">
                        <strong>${novel.title}</strong>
                        <span>${novel.author ? novel.author.name : ""}</span>
                    </a>`)
                .join("");
        })
        .catch((error) => console.error("Failed to load catalog recommends:", error));
}

/* ====================================================================
   CATALOG PAGE — "Последние обновления" panel, same idea as the
   homepage's version (one latest chapter per novel, newest first),
   just capped at 6 here instead of 4 to match this panel's taller
   sidebar spot.
   ==================================================================== */

const catalogLatestReleasesList = document.getElementById("catalogLatestReleasesList");
const MAX_CATALOG_LATEST_RELEASES = 6;

if (catalogLatestReleasesList) {
    // Same relative-time formatting as the homepage's version —
    // duplicated locally rather than shared, since that one lives
    // inside a block scoped to the homepage only
    function formatRelativeRuCatalog(isoDate) {
        const date = new Date(isoDate);
        if (isNaN(date)) return "";
        const diffDays = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) return "Сегодня";
        if (diffDays === 1) return "Вчера";
        if (diffDays < 7) {
            const mod10 = diffDays % 10;
            const mod100 = diffDays % 100;
            let word = "дней";
            if (mod10 === 1 && mod100 !== 11) word = "день";
            else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) word = "дня";
            return `${diffDays} ${word} назад`;
        }
        return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
    }

    fetch("novels/novels.json")
        .then((response) => response.json())
        .then((novelsIndex) => Promise.all(novelsIndex.map((entry) => getNovelData(entry.id))))
        .then((novels) => {
            const latestPerNovel = novels
                .map((novel) => {
                    if (!novel.chapters || novel.chapters.length === 0) return null;
                    const latestChapter = [...novel.chapters].sort(
                        (a, b) => new Date(b.date) - new Date(a.date)
                    )[0];
                    return { novel, chapter: latestChapter };
                })
                .filter(Boolean)
                .sort((a, b) => new Date(b.chapter.date) - new Date(a.chapter.date))
                .slice(0, MAX_CATALOG_LATEST_RELEASES);

            catalogLatestReleasesList.innerHTML = latestPerNovel
                .map(({ novel, chapter }) => {
                    const daysOld = Math.floor((new Date() - new Date(chapter.date)) / (1000 * 60 * 60 * 24));
                    const isNew = daysOld <= 3;
                    return `
                        <article class="release-item">
                            <img src="${novel.cover}" alt="${novel.title}">
                            <div class="release-info">
                                <h3><a href="novel.html?id=${novel.id}" class="hero-title-link">${novel.title}</a></h3>
                                <p>Глава ${chapter.number}</p>
                            </div>
                            <div class="release-right">
                                <span>${formatRelativeRuCatalog(chapter.date)}</span>
                                ${isNew ? "<b>Новое</b>" : ""}
                            </div>
                        </article>`;
                })
                .join("");
        })
        .catch((error) => console.error("Failed to load catalog latest releases:", error));
}
