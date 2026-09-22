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

    if (!cardsListEl) return; // not the glossary page

    // State
    let glossaryData = [];
    let novelLookup = {}; // { [novelId]: novel data from getNovelData() }
    let selectedTermId = null;
    let activeCategory = "Все";
    let activeLetter = "Все";
    let searchQuery = "";
    let sortMode = "az"; // "az" | "za"

    // Arriving from a novel page's "Глоссарий" shortcut (glossary.html?novel=<id>)
    // pre-filters the list to just that novel's terms
    const urlParams = new URLSearchParams(window.location.search);
    const activeNovel = urlParams.get("novel");

    // Arriving from a footnote's "Подробнее в Глоссарии →" link
    // (glossary.html?term=<id>) opens straight on that term instead
    // of the empty placeholder
    const deepLinkTermId = urlParams.get("term");

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

    function renderCards() {
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

        if (termsCountEl) termsCountEl.textContent = pluralizeTerms(filtered.length);

        if (filtered.length === 0) {
            cardsListEl.innerHTML = `<div class="empty-state"><p>Ничего не найдено по вашему запросу.</p></div>`;
            return;
        }

        cardsListEl.innerHTML = filtered
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
                                ${bookmarkButtonHtml(item.id)}
                            </div>
                            <p class="term-desc">${item.definition}</p>
                        </div>
                    </article>`)
            .join("");

        bindBookmarkButtons(cardsListEl);

        cardsListEl.querySelectorAll(".term-card").forEach((card) => {
            card.addEventListener("click", (event) => {
                if (event.target.closest(".mini-bookmark")) return;

                selectedTermId = card.dataset.id;
                renderCards();
                renderDetailPanel();
            });
        });
    }

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

        const usedIn = term.usedIn || [];

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

            <div class="used-in-section">
                <h3>Используется в</h3>
                <div class="used-in-list">
                    ${usedIn
                        .slice(0, 3)
                        .map((entry) => usedInItemHtml(entry))
                        .join("")}
                </div>
            </div>

            ${usedIn.length > 3
                ? `<button class="view-all-btn" type="button" id="viewAllOccurrencesBtn">
                        <img src="images/icons/filter.svg" alt="">
                        Все вхождения (${usedIn.length})
                   </button>`
                : ""}
        `;

        bindBookmarkButtons(detailCardEl);

        const viewAllBtn = document.getElementById("viewAllOccurrencesBtn");
        if (viewAllBtn) {
            viewAllBtn.addEventListener("click", () => openUsedInModal(term));
        }
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
