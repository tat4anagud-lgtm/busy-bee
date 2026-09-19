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

    if (!cardsListEl) return; // not the glossary page

    // State
    let glossaryData = [];
    let novelLookup = {}; // { [novelId]: novel data from getNovelData() }
    let selectedTermId = null;
    let activeCategory = "Все";
    let activeLetter = "Все";
    let searchQuery = "";

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
                item.definition.toLowerCase().includes(query);

            let matchesLetter = true;
            if (activeLetter !== "Все") {
                const pinyinFirstLetter = item.pinyin.charAt(0).toUpperCase();
                const definitionFirstLetter = item.definition.charAt(0).toUpperCase();
                matchesLetter = pinyinFirstLetter === activeLetter || definitionFirstLetter === activeLetter;
            }

            return matchesCategory && matchesSearch && matchesLetter;
        });

        if (termsCountEl) termsCountEl.textContent = pluralizeTerms(filtered.length);

        if (filtered.length === 0) {
            cardsListEl.innerHTML = `<div class="empty-state"><p>Ничего не найдено по вашему запросу.</p></div>`;
            return;
        }

        cardsListEl.innerHTML = filtered
            .map((item) => {
                const firstOccurrence = item.usedIn && item.usedIn[0];
                return `
                    <article class="term-card ${item.id === selectedTermId ? "selected" : ""}" data-id="${item.id}">
                        <div class="term-card-header">
                            <div class="term-title-group">
                                <h3 class="term-cn">${item.term}</h3>
                                <span class="term-pinyin">${item.pinyin}</span>
                            </div>
                            <div class="term-card-header-actions">
                                <span class="badge-tag">${item.category}</span>
                                <button class="bookmark-icon-btn" title="Добавить в избранное" type="button">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                                </button>
                            </div>
                        </div>
                        <p class="term-desc">${item.definition}</p>
                        <div class="term-card-footer">
                            <a href="${firstOccurrence ? usedInHref(firstOccurrence) : "#"}" class="see-in-chapter-btn">
                                Смотреть в главе
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                            </a>
                        </div>
                    </article>`;
            })
            .join("");

        cardsListEl.querySelectorAll(".term-card").forEach((card) => {
            card.addEventListener("click", (event) => {
                if (event.target.closest(".bookmark-icon-btn")) {
                    event.target.closest(".bookmark-icon-btn").classList.toggle("active");
                    return;
                }
                if (event.target.closest(".see-in-chapter-btn")) return; // let the link work normally

                selectedTermId = card.dataset.id;
                renderCards();
                renderDetailPanel();
            });
        });
    }

    /* ---------- Render: right-hand detail panel ---------- */

    function renderDetailPanel() {
        const term = glossaryData.find((item) => item.id === selectedTermId) || glossaryData[0];
        if (!term || !detailCardEl) return;

        const usedIn = term.usedIn || [];

        detailCardEl.innerHTML = `
            <div class="detail-top">
                <h2 class="detail-cn">${term.term}</h2>
                <button class="star-btn" title="Добавить в избранное" type="button">
                    <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </button>
            </div>
            <span class="detail-pinyin">${term.pinyin}</span>

            <div style="margin-bottom: 14px;">
                <span class="badge-tag">${term.category}</span>
            </div>

            <p class="detail-desc">${term.definition}</p>

            <div class="used-in-section">
                <h3>Используется в</h3>
                <div class="used-in-list">
                    ${usedIn
                        .slice(0, 3)
                        .map(
                            (entry) => `
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
                        </div>`
                        )
                        .join("")}
                </div>
            </div>

            <button class="view-all-btn" type="button">
                <img src="images/icons/filter.svg" alt="">
                Все вхождения (${usedIn.length})
            </button>
        `;
    }

    /* ---------- Data loading ---------- */

    fetch("glossary/glossary.json")
        .then((response) => response.json())
        .then((data) => {
            glossaryData = data;
            selectedTermId = data.length > 0 ? data[0].id : null;

            // Every unique novel referenced anywhere in the glossary,
            // fetched once via the same getNovelData() the rest of the
            // site uses (memoized there too, so no duplicate requests
            // even across many terms pointing at the same novel)
            const novelIds = Array.from(
                new Set(data.flatMap((term) => (term.usedIn || []).map((entry) => entry.novelId)))
            );

            return Promise.all(novelIds.map((id) => getNovelData(id).then((novel) => [id, novel])));
        })
        .then((entries) => {
            novelLookup = Object.fromEntries(entries);
            renderCards();
            renderDetailPanel();
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

});
