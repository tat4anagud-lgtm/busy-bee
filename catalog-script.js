/* ========================================
   BUSY BEE — КАТАЛОГ (catalog.html)
   ========================================
   Всё, что работает только на странице каталога:
     • панель фильтров (кнопка «Фильтр», чекбоксы, поиск внутри списков,
       «Показать ещё», «Очистить всё»), поиск по каталогу;
     • сортировка, переключение «Плитка / Список», пагинация;
     • меню «···» на карточках;
     • сетка новелл из novels/novels.json, мини-карусель «Busy Bee
       рекомендует» и панель «Последние обновления».

   ПОДКЛЮЧАТЬ ПОСЛЕ script.js — здесь используются его общие функции
   (getNovelData, chapterHref, getReadingProgress, bindNovelBookmarks):
       <script src="script.js"></script>
       <script src="catalog-script.js"></script>
   Каждый блок сам проверяет, есть ли нужные элементы на странице. */

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

/* На десктопе фильтры — колонка слева, по умолчанию видна. На планшете
   и телефоне (≤1024px) это шторка снизу поверх страницы: по умолчанию
   закрыта, открывается кнопкой «Фильтр», закрывается крестиком,
   тапом по затемнению, кнопкой «Показать результаты» или Escape.
   «Открыта» — это отсутствие класса .filters-hidden, как и раньше. */
const COMPACT_FILTERS_QUERY = window.matchMedia("(max-width: 1024px)");

function setFiltersOpen(open) {
    if (!catalogLayout) return;
    catalogLayout.classList.toggle("filters-hidden", !open);
    // Пока шторка открыта, страница под ней не прокручивается
    document.body.classList.toggle("filters-open", open && COMPACT_FILTERS_QUERY.matches);
}

if (toggleFiltersBtn && catalogLayout) {
    // На компактных экранах стартуем с закрытой шторкой
    if (COMPACT_FILTERS_QUERY.matches) setFiltersOpen(false);

    toggleFiltersBtn.addEventListener("click", () => {
        setFiltersOpen(catalogLayout.classList.contains("filters-hidden"));
    });

    ["filtersClose", "filtersApply"].forEach((id) => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener("click", () => setFiltersOpen(false));
    });

    const filtersBackdrop = document.getElementById("filtersBackdrop");
    if (filtersBackdrop) filtersBackdrop.addEventListener("click", () => setFiltersOpen(false));

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && COMPACT_FILTERS_QUERY.matches && !catalogLayout.classList.contains("filters-hidden")) {
            setFiltersOpen(false);
        }
    });

    // Окно меняет ширину (поворот телефона, растягивание окна):
    // при переходе на компактный вид шторку закрываем, при возврате на
    // десктоп — снимаем блокировку прокрутки
    COMPACT_FILTERS_QUERY.addEventListener("change", (event) => {
        if (event.matches) setFiltersOpen(false);
        else document.body.classList.remove("filters-open");
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
                    <button type="button" class="btn-card-menu" aria-label="Ещё" aria-haspopup="true" aria-expanded="false">···</button>
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
                        <button type="button" class="favorite-btn" aria-label="В избранное" aria-pressed="false"><img src="images/icons/heart.svg" alt="" data-outline="images/icons/heart.svg" data-filled="images/icons/heart-filled.svg"></button>
                        <button type="button" class="mini-bookmark" data-novel-id="${novel.id}" aria-label="Сохранить в закладки" aria-pressed="false"><img src="images/icons/bookmark.svg" alt="" data-outline="images/icons/bookmark.svg" data-filled="images/icons/bookmark-filled-gold.svg"></button>
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
