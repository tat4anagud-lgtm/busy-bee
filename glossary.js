/* ========================================
   BUSY BEE — GLOSSARY PAGE
   ========================================
   Loads glossary/glossary.json (the single, site-wide glossary — see
   the schema discussion: one shared file, terms reference which
   novels+chapters use them, not the other way around) and cross-
   references each term's "usedIn" entries against the novels'
   own data via getNovelData()/chapterHref(), both already provided
   by script.js on this page.
   ======================================== */

document.addEventListener("DOMContentLoaded", () => {

    // DOM elements
    const cardsListEl = document.getElementById("cardsList");
    const detailCardEl = document.getElementById("detailCard");
    const searchInputEl = document.getElementById("glossarySearchInput");
    const categoryPillsEl = document.getElementById("categoryPills");
    const alphabetNavEl = document.getElementById("alphabetNav");
    const termsCountEl = document.getElementById("termsCount");
    const sortWrapEl = document.getElementById("sortBtn")?.closest(".sort-select-wrap");
    const sortBtnEl = document.getElementById("sortBtn");
    const sortMenuEl = document.getElementById("sortMenu");
    const sortLabelEl = document.getElementById("sortLabel");
    const novelFilterBannerEl = document.getElementById("novelFilterBanner");
    const novelFilterTextEl = document.getElementById("novelFilterText");
    const usedInBackdropEl = document.getElementById("usedInBackdrop");
    const usedInModalItemsEl = document.getElementById("usedInModalItems");
    const usedInModalTitleEl = document.getElementById("usedInModalTitle");
    const usedInModalCloseEl = document.getElementById("usedInModalClose");
    const paginationEl = document.getElementById("glossaryPagination");
    const pageNumbersEl = document.getElementById("glossaryPageNumbers");
    const pagePrevBtn = document.getElementById("glossaryPagePrev");
    const pageNextBtn = document.getElementById("glossaryPageNext");
    const toolbarEl = document.querySelector(".glossary-main-col .toolbar");

    if (!cardsListEl) return; // not the glossary page

    // State
    let glossaryData = [];
    let novelLookup = {}; // { [novelId]: novel data from getNovelData() }
    let selectedTermId = null;
    let activeCategory = "Все";
    let activeLetter = "Все";
    let searchQuery = "";
    let sortMode = "az"; // "az" | "za"
    let currentPage = 1;
    let justOpenedId = null; // карточка, которую только что раскрыли — ей нужна анимация появления

    // Сколько терминов на одной странице списка
    const TERMS_PER_PAGE = 10;

    // Сколько категорий-пилюль видно сразу (считая «Все»); остальные
    // прячутся за кнопкой «Ещё». Какие именно остаются на виду — решает
    // порядок кнопок в glossary.html: первые видны, остальные уходят в «Ещё».
    const VISIBLE_PILLS = 6;

    // Ниже этой ширины список идёт в одну колонку, боковой панели нет
    // (в CSS она скрыта), а определение раскрывается прямо под выбранным
    // термином. Значение то же, что в @media в glossary.css.
    const mobileQuery = window.matchMedia("(max-width: 992px)");
    const isMobile = () => mobileQuery.matches;

    // Arriving from a novel page's "Глоссарий" shortcut (glossary.html?novel=<id>)
    // pre-filters the list to just that novel's terms
    const urlParams = new URLSearchParams(window.location.search);
    const activeNovel = urlParams.get("novel");

    // Arriving from a footnote's "Подробнее в Глоссарии →" link
    // (glossary.html?term=<id>) opens straight on that term instead
    // of the empty placeholder
    const deepLinkTermId = urlParams.get("term");

    /* ---------- Категории: первые на виду, остальные по кнопке «Ещё» ---------- */

    let categoryMoreBtn = null;
    let categoryExtraPills = [];

    function setupCategoryOverflow() {
        if (!categoryPillsEl) return;

        const pills = Array.from(categoryPillsEl.querySelectorAll(".pill-btn"));
        categoryExtraPills = pills.slice(VISIBLE_PILLS);
        if (categoryExtraPills.length === 0) return; // и так всё помещается

        categoryExtraPills.forEach((pill) => pill.classList.add("is-extra"));

        // Класс .pill-more, а не .pill-btn: иначе обработчик категорий ниже
        // принял бы кнопку «Ещё» за очередную категорию
        categoryMoreBtn = document.createElement("button");
        categoryMoreBtn.type = "button";
        categoryMoreBtn.className = "pill-more";
        categoryMoreBtn.addEventListener("click", () => {
            categoryPillsEl.classList.toggle("expanded");
            refreshCategoryOverflow();
        });
        categoryPillsEl.appendChild(categoryMoreBtn);

        refreshCategoryOverflow();
    }

    // Подпись и состояние кнопки: «Ещё 9» / «Свернуть». Выбранная
    // категория из спрятанных остаётся на виду (так делает CSS), поэтому
    // в счётчик «Ещё N» она не входит.
    function refreshCategoryOverflow() {
        if (!categoryMoreBtn) return;

        const expanded = categoryPillsEl.classList.contains("expanded");
        const hiddenCount = categoryExtraPills.filter((pill) => !pill.classList.contains("active")).length;

        categoryMoreBtn.classList.toggle("is-open", expanded);
        categoryMoreBtn.setAttribute("aria-expanded", expanded);
        categoryMoreBtn.innerHTML =
            (expanded ? "Свернуть" : `Ещё ${hiddenCount}`) +
            `<img src="images/icons/chevron-down.svg" alt="">`;
    }

    setupCategoryOverflow();

    /* ---------- Bookmarks (localStorage, shared between the list
       cards and the sidebar detail panel — both are just different
       views of the same saved-term set) ---------- */

    const BOOKMARKS_KEY = "busybee_glossary_bookmarks";

    function loadBookmarks() {
        try {
            return new Set(JSON.parse(localStorage.getItem(BOOKMARKS_KEY)) || []);
        } catch {
            return new Set();
        }
    }

    let bookmarkedIds = loadBookmarks();

    function isBookmarked(id) {
        return bookmarkedIds.has(id);
    }

    function toggleBookmark(id) {
        if (bookmarkedIds.has(id)) bookmarkedIds.delete(id);
        else bookmarkedIds.add(id);
        localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(Array.from(bookmarkedIds)));
    }

    // Shared markup + click wiring for a bookmark button — used by both
    // the list card and the sidebar so they can never fall out of sync
    function bookmarkButtonHtml(id) {
        const saved = isBookmarked(id);
        return `
            <button type="button" class="mini-bookmark ${saved ? "active" : ""}" data-term-id="${id}"
                    aria-label="Сохранить в закладки" aria-pressed="${saved}">
                <img src="${saved ? "images/icons/bookmark-filled-gold.svg" : "images/icons/bookmark.svg"}" alt=""
                     data-outline="images/icons/bookmark.svg" data-filled="images/icons/bookmark-filled-gold.svg">
            </button>`;
    }

    function bindBookmarkButtons(container) {
        container.querySelectorAll(".mini-bookmark[data-term-id]").forEach((button) => {
            button.addEventListener("click", (event) => {
                event.stopPropagation();
                toggleBookmark(button.dataset.termId);
                // Both surfaces read from the same bookmarkedIds set, so
                // re-rendering both keeps card + sidebar in sync no
                // matter which one triggered the change
                renderCards();
                renderDetailPanel();
            });
        });
    }

    // "3 термина" / "1 термин" / "12 терминов"
    function pluralizeTerms(n) {
        const mod10 = n % 10;
        const mod100 = n % 100;
        let word = "терминов";
        if (mod10 === 1 && mod100 !== 11) word = "термин";
        else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) word = "термина";
        return `${n} ${word}`;
    }

    function novelCover(novelId) {
        return novelLookup[novelId] ? novelLookup[novelId].cover : "";
    }

    function novelTitle(novelId) {
        return novelLookup[novelId] ? novelLookup[novelId].title : novelId;
    }

    function usedInHref(entry) {
        return typeof chapterHref === "function" ? chapterHref(entry.novelId, entry.chapter) : "#";
    }

    /* ---------- Render: term cards list ---------- */

    // Все термины, прошедшие фильтры и сортировку, — без разбивки на
    // страницы (её делает renderCards). Отдельной функцией, чтобы
    // deep-link ?term=… мог узнать, на какой странице лежит термин.
    function getVisibleTerms() {
        const query = searchQuery.trim().toLowerCase();

        const filtered = glossaryData.filter((item) => {
            const matchesCategory = activeCategory === "Все" || item.category === activeCategory;
            const matchesSearch =
                query === "" ||
                item.term.includes(searchQuery.trim()) ||
                item.pinyin.toLowerCase().includes(query) ||
                item.nameRu.toLowerCase().includes(query) ||
                item.definition.toLowerCase().includes(query);

            let matchesLetter = true;
            if (activeLetter !== "Все") {
                const pinyinFirstLetter = item.pinyin.charAt(0).toUpperCase();
                const nameRuFirstLetter = item.nameRu.charAt(0).toUpperCase();
                matchesLetter = pinyinFirstLetter === activeLetter || nameRuFirstLetter === activeLetter;
            }

            const matchesNovel =
                !activeNovel || (item.usedIn || []).some((entry) => entry.novelId === activeNovel);

            return matchesCategory && matchesSearch && matchesLetter && matchesNovel;
        });

        filtered.sort((a, b) =>
            sortMode === "za"
                ? b.nameRu.localeCompare(a.nameRu, "ru")
                : a.nameRu.localeCompare(b.nameRu, "ru")
        );

        return filtered;
    }

    function renderCards() {
        const visible = getVisibleTerms();

        if (termsCountEl) termsCountEl.textContent = pluralizeTerms(visible.length);

        if (visible.length === 0) {
            cardsListEl.innerHTML = `<div class="empty-state"><p>Ничего не найдено по вашему запросу.</p></div>`;
            renderPagination(0);
            return;
        }

        // Страница могла «уехать» за край (например, после поиска) — возвращаем в границы
        const totalPages = Math.ceil(visible.length / TERMS_PER_PAGE);
        currentPage = Math.min(Math.max(currentPage, 1), totalPages);

        const pageStart = (currentPage - 1) * TERMS_PER_PAGE;
        const pageItems = visible.slice(pageStart, pageStart + TERMS_PER_PAGE);

        cardsListEl.innerHTML = pageItems
            .map((item) => `
                    <article class="term-card ${item.id === selectedTermId ? "selected" : ""}" data-id="${item.id}">
                        <div class="term-card-hanzi">
                            <span class="term-hanzi">${item.term}</span>
                            <span class="term-pinyin">${item.pinyin}</span>
                        </div>
                        <div class="term-card-body">
                            <div class="term-card-top">
                                <div class="term-title-group">
                                    <h3 class="term-name-ru">${item.nameRu}</h3>
                                    <span class="badge-tag">${item.category}</span>
                                </div>
                                <div class="term-card-actions">
                                    ${bookmarkButtonHtml(item.id)}
                                    <img src="images/icons/chevron-down.svg" alt="" class="term-card-chevron">
                                </div>
                            </div>
                            <p class="term-desc">${item.definition}</p>
                        </div>
                        ${isMobile() && item.id === selectedTermId ? expandedPanelHtml(item) : ""}
                    </article>`)
            .join("");

        renderPagination(totalPages);

        bindBookmarkButtons(cardsListEl);
        bindViewAllButton(cardsListEl);
        justOpenedId = null;

        cardsListEl.querySelectorAll(".term-card").forEach((card) => {
            card.addEventListener("click", (event) => {
                // Закладка, ссылки и кнопка внутри раскрытой панели — свои действия, карточку не трогают
                if (event.target.closest(".mini-bookmark, .term-card-expand")) return;

                if (isMobile()) {
                    toggleAccordion(card);
                    return;
                }

                selectedTermId = card.dataset.id;
                renderCards();
                renderDetailPanel();
            });
        });
    }

    /* ---------- Mobile: определение раскрывается под самим термином ---------- */

    // Раскрыть термин / свернуть, если он уже раскрыт. Открыт всегда не
    // больше одного: выбираем новый — прежний сворачивается.
    function toggleAccordion(card) {
        const id = card.dataset.id;

        // Запоминаем, где на экране стояла карточка. Если прежняя раскрытая
        // схлопнется ВЫШЕ нажатой, всё под ней сдвинется вверх — без
        // поправки палец вдруг оказался бы на другом слове.
        const topBefore = card.getBoundingClientRect().top;

        selectedTermId = selectedTermId === id ? null : id;
        justOpenedId = selectedTermId;
        renderCards();

        keepCardInPlace(id, topBefore);

        if (selectedTermId === id) {
            // Раскрытая часть могла уйти за нижний край экрана — подкручиваем ровно настолько,
            // чтобы она была видна целиком (если и так видно, ничего не двигается)
            const panel = cardsListEl.querySelector(`.term-card[data-id="${id}"] .term-card-expand`);
            if (panel) panel.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
    }

    // Возвращает карточку на то же место экрана, где она была до перерисовки.
    // Несколько проходов, а не один: страница уменьшена через zoom, и
    // браузеры по-разному считают пиксели — повторная проверка добирает остаток.
    function keepCardInPlace(id, topBefore) {
        const card = cardsListEl.querySelector(`.term-card[data-id="${id}"]`);
        if (!card) return;

        for (let i = 0; i < 3; i++) {
            const diff = card.getBoundingClientRect().top - topBefore;
            if (Math.abs(diff) < 1) break;
            window.scrollBy(0, diff);
        }
    }

    // Раскрытая часть: карточка уже показывает иероглиф, перевод, категорию и
    // само определение, поэтому добавляем только то, чего в ней нет —
    // где термин встречается
    function expandedPanelHtml(term) {
        return `
            <div class="term-card-expand ${term.id === justOpenedId ? "is-opening" : ""}">
                ${usedInSectionHtml(term)}
            </div>`;
    }

    /* ---------- Pagination ---------- */

    function renderPagination(totalPages) {
        if (!paginationEl || !pageNumbersEl) return;

        // Одной страницы хватает — переключатель не нужен
        paginationEl.hidden = totalPages <= 1;
        if (totalPages <= 1) {
            pageNumbersEl.innerHTML = "";
            return;
        }

        if (pagePrevBtn) pagePrevBtn.disabled = currentPage <= 1;
        if (pageNextBtn) pageNextBtn.disabled = currentPage >= totalPages;

        // Тот же компактный список, что в каталоге и в таблице глав:
        // первая/последняя страница, текущая и соседние, «…» на месте пропусков
        const pagesToShow = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
        const sortedPages = Array.from(pagesToShow)
            .filter((p) => p >= 1 && p <= totalPages)
            .sort((a, b) => a - b);

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
            btn.className = "page-number" + (pageNum === currentPage ? " active" : "");
            btn.textContent = pageNum;
            if (pageNum === currentPage) btn.setAttribute("aria-current", "page");
            btn.addEventListener("click", () => goToPage(pageNum));
            pageNumbersEl.appendChild(btn);

            previousPage = pageNum;
        });
    }

    // Листание — только по клику на переключатель: возвращаем читателя к
    // началу списка, иначе после «2» он так и остался бы внизу страницы
    function goToPage(pageNum) {
        currentPage = pageNum;
        renderCards();
        if (toolbarEl) toolbarEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (pagePrevBtn) pagePrevBtn.addEventListener("click", () => goToPage(currentPage - 1));
    if (pageNextBtn) pageNextBtn.addEventListener("click", () => goToPage(currentPage + 1));

    /* ---------- Render: right-hand detail panel ---------- */

    function renderDetailPanel() {
        if (!detailCardEl) return;

        // Nothing picked yet (default state, or the filtered list is
        // empty) — an inviting placeholder beats silently showing
        // whichever term happened to be first
        if (!selectedTermId) {
            detailCardEl.innerHTML = `
                <div class="detail-empty-state">
                    <img src="images/icons/bee-icon.svg" alt="" class="detail-empty-icon">
                    <h3>Выберите термин</h3>
                    <p>Нажмите на карточку слева — здесь появится перевод, произношение и главы, где слово встречается.</p>
                </div>
            `;
            return;
        }

        const term = glossaryData.find((item) => item.id === selectedTermId);
        if (!term) return;

        detailCardEl.innerHTML = `
            <div class="detail-top">
                <h2 class="detail-name-ru">${term.nameRu}</h2>
                ${bookmarkButtonHtml(term.id)}
            </div>
            <span class="detail-original">${term.term} · ${term.pinyin}</span>

            <div style="margin-bottom: 14px;">
                <span class="badge-tag">${term.category}</span>
            </div>

            <p class="detail-desc">${term.definition}</p>

            ${usedInSectionHtml(term)}
        `;

        bindBookmarkButtons(detailCardEl);
        bindViewAllButton(detailCardEl);
    }

    // Блок «Используется в» с кнопкой «Все вхождения» — общий для боковой
    // панели (десктоп) и раскрытой карточки (телефон). Кнопка опознаётся
    // по data-атрибуту, а не по id: id был бы один на двоих.
    function usedInSectionHtml(term) {
        const usedIn = term.usedIn || [];

        return `
            <div class="used-in-section">
                <h3>Используется в</h3>
                <div class="used-in-list">
                    ${usedIn.length
                        ? usedIn.slice(0, 3).map((entry) => usedInItemHtml(entry)).join("")
                        : `<p class="used-in-empty">Пока не встречается ни в одной главе.</p>`}
                </div>
            </div>

            ${usedIn.length > 3
                ? `<button class="view-all-btn" type="button" data-view-all="${term.id}">
                        <img src="images/icons/filter.svg" alt="">
                        Все вхождения (${usedIn.length})
                   </button>`
                : ""}`;
    }

    function bindViewAllButton(container) {
        const button = container.querySelector("[data-view-all]");
        if (!button) return;

        button.addEventListener("click", () => {
            const term = glossaryData.find((item) => item.id === button.dataset.viewAll);
            if (term) openUsedInModal(term);
        });
    }

    // Shared row markup for one novel/chapter occurrence — used by
    // both the sidebar's first-3 preview and the full "all
    // occurrences" modal, so they never drift apart visually
    function usedInItemHtml(entry) {
        return `
            <div class="used-in-item">
                <img src="${novelCover(entry.novelId)}" alt="" class="novel-cover-thumb">
                <div class="used-in-info">
                    <div class="used-in-title">${novelTitle(entry.novelId)}</div>
                    <div class="used-in-chapter">Глава ${entry.chapter}</div>
                </div>
                <a href="${usedInHref(entry)}" class="used-in-link">
                    Открыть
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </a>
            </div>`;
    }

    /* ---------- "All occurrences" modal ---------- */

    function openUsedInModal(term) {
        if (!usedInBackdropEl || !usedInModalItemsEl) return;

        const usedIn = (term.usedIn || [])
            .slice()
            .sort((a, b) => novelTitle(a.novelId).localeCompare(novelTitle(b.novelId), "ru"));

        if (usedInModalTitleEl) {
            usedInModalTitleEl.textContent = `Все вхождения — ${term.nameRu} (${usedIn.length})`;
        }
        usedInModalItemsEl.innerHTML = usedIn.map((entry) => usedInItemHtml(entry)).join("");
        usedInBackdropEl.style.display = "flex";
    }

    function closeUsedInModal() {
        if (usedInBackdropEl) usedInBackdropEl.style.display = "none";
    }

    if (usedInBackdropEl) {
        usedInBackdropEl.addEventListener("click", closeUsedInModal);
        const usedInModalEl = usedInBackdropEl.querySelector(".chapter-list-modal");
        if (usedInModalEl) usedInModalEl.addEventListener("click", (event) => event.stopPropagation());
        if (usedInModalCloseEl) usedInModalCloseEl.addEventListener("click", closeUsedInModal);
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") closeUsedInModal();
        });
    }

    // Окно растянули или повернули телефон — панель переезжает между
    // боковой колонкой и раскрытой карточкой
    mobileQuery.addEventListener("change", () => {
        renderCards();
        renderDetailPanel();
    });

    /* ---------- Data loading ---------- */

    fetch("glossary/glossary.json")
        .then((response) => response.json())
        .then((data) => {
            glossaryData = data;
            // No term selected by default — the sidebar starts on its
            // "Выберите термин" placeholder until the reader picks one

            // Every unique novel referenced anywhere in the glossary,
            // fetched once via the same getNovelData() the rest of the
            // site uses (memoized there too, so no duplicate requests
            // even across many terms pointing at the same novel).
            // The novel we arrived filtered-by is added too, even if
            // it has zero terms so far — the banner still needs its title.
            const novelIds = Array.from(
                new Set([
                    ...data.flatMap((term) => (term.usedIn || []).map((entry) => entry.novelId)),
                    ...(activeNovel ? [activeNovel] : []),
                ])
            );

            return Promise.all(novelIds.map((id) => getNovelData(id).then((novel) => [id, novel])));
        })
        .then((entries) => {
            novelLookup = Object.fromEntries(entries);

            if (activeNovel && novelFilterBannerEl && novelFilterTextEl) {
                const title = novelLookup[activeNovel] ? novelLookup[activeNovel].title : activeNovel;
                novelFilterTextEl.textContent = `Термины, использованные в «${title}»`;
                novelFilterBannerEl.style.display = "flex";
            }

            if (deepLinkTermId && glossaryData.some((item) => item.id === deepLinkTermId)) {
                selectedTermId = deepLinkTermId;

                // Открываем ту страницу списка, на которой лежит этот термин
                const termIndex = getVisibleTerms().findIndex((item) => item.id === selectedTermId);
                if (termIndex >= 0) currentPage = Math.floor(termIndex / TERMS_PER_PAGE) + 1;
            }

            renderCards();
            renderDetailPanel();

            if (selectedTermId) {
                const activeCard = cardsListEl.querySelector(`.term-card[data-id="${selectedTermId}"]`);
                if (activeCard) activeCard.scrollIntoView({ block: "center" });
            }
        })
        .catch((error) => {
            console.error("Failed to load glossary:", error);
            cardsListEl.innerHTML = `<div class="empty-state"><p>Не удалось загрузить глоссарий.</p></div>`;
        });

    /* ---------- Filters ---------- */

    if (searchInputEl) {
        searchInputEl.addEventListener("input", (event) => {
            searchQuery = event.target.value;
            currentPage = 1;
            renderCards();
        });
    }

    if (categoryPillsEl) {
        categoryPillsEl.addEventListener("click", (event) => {
            const btn = event.target.closest(".pill-btn");
            if (!btn) return;

            categoryPillsEl.querySelectorAll(".pill-btn").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            activeCategory = btn.dataset.category;
            currentPage = 1;
            refreshCategoryOverflow();
            renderCards();
        });
    }

    if (alphabetNavEl) {
        alphabetNavEl.addEventListener("click", (event) => {
            const link = event.target.closest(".alphabet-link");
            if (!link) return;
            event.preventDefault();

            alphabetNavEl.querySelectorAll(".alphabet-link").forEach((l) => l.classList.remove("active-pill"));
            link.classList.add("active-pill");
            activeLetter = link.dataset.letter;
            currentPage = 1;
            renderCards();
        });
    }

    if (sortWrapEl && sortBtnEl && sortMenuEl) {
        sortBtnEl.addEventListener("click", (event) => {
            event.stopPropagation();
            const willOpen = !sortWrapEl.classList.contains("open");
            sortWrapEl.classList.toggle("open", willOpen);
            sortBtnEl.setAttribute("aria-expanded", willOpen);
        });

        sortMenuEl.addEventListener("click", (event) => {
            const option = event.target.closest(".sort-option");
            if (!option) return;

            sortMenuEl.querySelectorAll(".sort-option").forEach((o) => o.classList.remove("active"));
            option.classList.add("active");

            sortMode = option.dataset.sort;
            if (sortLabelEl) sortLabelEl.textContent = option.textContent.trim();

            sortWrapEl.classList.remove("open");
            sortBtnEl.setAttribute("aria-expanded", "false");
            currentPage = 1;
            renderCards();
        });

        document.addEventListener("click", (event) => {
            if (!sortWrapEl.contains(event.target)) {
                sortWrapEl.classList.remove("open");
                sortBtnEl.setAttribute("aria-expanded", "false");
            }
        });
    }

});
