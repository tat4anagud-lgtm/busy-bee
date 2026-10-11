/* ========================================
   BUSY BEE — СТРАНИЦА НОВЕЛЛЫ (novel.html)
   ========================================
   Всё, что работает только на странице новеллы:
     • избранное (сердечко) и выпадающий список статуса чтения;
     • таблица глав: вкладки томов, поиск, фильтр, сортировка, пагинация;
     • лайки у цитат и плавающая кнопка «Продолжить чтение»;
     • загрузка данных новеллы из novels/<id>/<id>.json и заполнение
       страницы (обложка, название, жанры, рейтинг, главы, цитаты…).

   ПОДКЛЮЧАТЬ ПОСЛЕ script.js — здесь используются его общие функции
   (избранное в localStorage, полки чтения, прогресс чтения и т.п.):
       <script src="script.js"></script>
       <script src="novel-script.js"></script>
   Каждый блок сам проверяет, есть ли нужные элементы на странице. */

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

    /* ---------- Таблица глав: галочка «прочитано» и меню «···» ---------- */

    // Галочка рядом с названием. Класс .icon-read — тот самый, по которому
    // фильтр «Прочитанные / Непрочитанные» отличает прочитанные строки.
    // Без <title> внутри: его текст попал бы в поиск по названию главы.
    function chapterReadMarkHtml() {
        return '<svg class="icon-read" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Прочитано"><path d="M20 6 9 17l-5-5"/></svg>';
    }

    function setChapterReadState(row, novelId, chapterNumber, isRead) {
        row.classList.toggle("is-read", isRead);
        const titleCell = row.querySelector(".col-title");
        const mark = titleCell.querySelector(".icon-read");
        if (isRead && !mark) titleCell.insertAdjacentHTML("beforeend", chapterReadMarkHtml());
        if (!isRead && mark) mark.remove();
        setChapterRead(novelId, chapterNumber, isRead);
    }

    // Копирование в буфер: navigator.clipboard работает только на https
    // (и localhost), поэтому запасной путь через временное поле
    async function copyTextToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) { /* пробуем запасной путь */ }
        try {
            const field = document.createElement("textarea");
            field.value = text;
            field.setAttribute("readonly", "");
            field.style.position = "fixed";
            field.style.opacity = "0";
            document.body.appendChild(field);
            field.select();
            const ok = document.execCommand("copy");
            field.remove();
            return ok;
        } catch (error) {
            return false;
        }
    }

    // Одно общее меню на всю таблицу: живёт в <body> и позиционируется
    // под нажатой «···» (position: fixed). Внутри .chapters-table-wrapper
    // его бы обрезал overflow, а на телефоне оно ещё и ушло бы за край.
    function setupChapterMenu(tbodyEl, novelId) {
        const icon = (paths) =>
            `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

        const menu = document.createElement("div");
        menu.className = "chapter-menu";
        menu.setAttribute("role", "menu");
        menu.hidden = true;
        menu.innerHTML = `
            <button type="button" class="chapter-menu-item" role="menuitem" data-action="toggle-read">
                ${icon('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m22 4-10 10.01-3-3"/>')}
                <span data-role="read-label"></span>
            </button>
            <button type="button" class="chapter-menu-item" role="menuitem" data-action="copy-link">
                ${icon('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>')}
                <span data-role="copy-label"></span>
            </button>
            <a class="chapter-menu-item" role="menuitem" data-action="comments" href="#">
                ${icon('<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>')}
                <span>Комментарии</span>
            </a>
            <button type="button" class="chapter-menu-item" role="menuitem" data-action="report" disabled title="Скоро появится">
                ${icon('<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>')}
                <span>Сообщить об ошибке</span>
            </button>`;
        document.body.appendChild(menu);

        const readLabel = menu.querySelector('[data-role="read-label"]');
        const copyLabel = menu.querySelector('[data-role="copy-label"]');
        const commentsLink = menu.querySelector('[data-action="comments"]');

        let openRow = null;
        let openBtn = null;
        let closeTimer = null;

        function closeMenu(returnFocus) {
            if (menu.hidden) return;
            menu.hidden = true;
            clearTimeout(closeTimer);
            if (openBtn) {
                openBtn.setAttribute("aria-expanded", "false");
                if (returnFocus) openBtn.focus();
            }
            openRow = null;
            openBtn = null;
        }

        function openMenuFor(btn) {
            openRow = btn.closest("tr");
            openBtn = btn;
            const chapterNumber = Number(openRow.dataset.chapter);

            readLabel.textContent = openRow.classList.contains("is-read")
                ? "Отметить непрочитанной"
                : "Отметить прочитанной";
            copyLabel.textContent = "Скопировать ссылку";
            commentsLink.href = `${chapterHref(novelId, chapterNumber)}#comments`;

            // Сначала показываем невидимым — чтобы измерить размер и
            // решить, где место: справа от «···», под ней или над ней
            menu.style.visibility = "hidden";
            menu.hidden = false;
            const rect = btn.getBoundingClientRect();
            const margin = 8;
            const left = Math.max(margin, Math.min(rect.right - menu.offsetWidth, window.innerWidth - menu.offsetWidth - margin));
            let top = rect.bottom + 4;
            if (top + menu.offsetHeight > window.innerHeight - margin) {
                top = Math.max(margin, rect.top - menu.offsetHeight - 4);
            }
            menu.style.left = `${left}px`;
            menu.style.top = `${top}px`;
            menu.style.visibility = "";
            btn.setAttribute("aria-expanded", "true");
        }

        tbodyEl.addEventListener("click", (event) => {
            const btn = event.target.closest(".chapter-menu-btn");
            if (!btn) return;
            const sameButton = btn === openBtn;
            closeMenu();
            if (!sameButton) openMenuFor(btn);
        });

        menu.addEventListener("click", async (event) => {
            const item = event.target.closest(".chapter-menu-item");
            if (!item || item.disabled || !openRow) return;

            const chapterNumber = Number(openRow.dataset.chapter);
            const action = item.dataset.action;

            if (action === "toggle-read") {
                const makeRead = !openRow.classList.contains("is-read");
                setChapterReadState(openRow, novelId, chapterNumber, makeRead);
                closeMenu(true);
                // Строка могла перестать подходить под фильтр
                // («Непрочитанные» / «Прочитанные») — пересчитываем список
                if (typeof applyChapterFilters === "function") applyChapterFilters();
            } else if (action === "copy-link") {
                const url = new URL(chapterHref(novelId, chapterNumber), window.location.href).href;
                const copied = await copyTextToClipboard(url);
                copyLabel.textContent = copied ? "Ссылка скопирована" : "Не удалось скопировать";
                closeTimer = setTimeout(() => closeMenu(true), 1200);
            } else if (action === "comments") {
                closeMenu(); // переход по ссылке произойдёт сам
            }
        });

        document.addEventListener("click", (event) => {
            if (menu.hidden) return;
            if (menu.contains(event.target) || event.target.closest(".chapter-menu-btn")) return;
            closeMenu();
        });
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") closeMenu(true);
        });
        // Меню привязано к экранным координатам кнопки, поэтому при
        // прокрутке или повороте экрана проще закрыть, чем двигать
        window.addEventListener("scroll", () => closeMenu(), true);
        window.addEventListener("resize", () => closeMenu());
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

            // «Рекомендации переводчика →» в заметках: страница переводчика,
            // сразу открытая на вкладке «Рекомендации» (?tab=… читает
            // translator-script.js)
            const translatorRecsLink = document.getElementById("novelTranslatorRecsLink");
            if (translatorRecsLink && novel.translator.href) {
                const base = novel.translator.href.split("#")[0];
                translatorRecsLink.href = `${base}${base.includes("?") ? "&" : "?"}tab=recommendations`;
            }
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
        updateSynopsisClamp();

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

        // Тома необязательны. Если у глав в JSON (массив "chapters" в
        // novels/<id>.json) есть поле "volume": 1, 2, … — над таблицей
        // появляются пилюли «Том N», а диапазон глав в них считается из
        // самих данных. Если ни у одной главы поля нет — пилюль нет и
        // главы идут одним списком. Глава без "volume" среди глав с
        // томами попадёт только в «Все главы».
        const hasVolume = (chapter) =>
            chapter.volume !== undefined && chapter.volume !== null && chapter.volume !== "";
        const volumeKeys = [...new Set(chapters.filter(hasVolume).map((c) => String(c.volume)))]
            .sort((a, b) => Number(a) - Number(b));
        const hasVolumes = volumeKeys.length > 0;

        const chaptersLayoutEl = document.querySelector(".chapters-layout");
        if (chaptersLayoutEl) chaptersLayoutEl.classList.toggle("chapters-layout--no-volumes", !hasVolumes);

        const volumeListEl = document.getElementById("volumeSidebarList");
        if (volumeListEl) {
            let volumesHtml = "";
            if (hasVolumes) {
                volumesHtml = `<li class="active" data-volume="all"><span>Все главы</span> <small>${chapters.length}</small></li>`;
                volumeKeys.forEach((key) => {
                    const numbers = chapters.filter((c) => hasVolume(c) && String(c.volume) === key).map((c) => c.number);
                    const start = Math.min(...numbers);
                    const end = Math.max(...numbers);
                    const range = start === end ? `${start}` : `${start}–${end}`;
                    volumesHtml += `<li data-volume="${key}"><span>Том ${key}</span> <small>${range}</small></li>`;
                });
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
            const readChapters = new Set(getReadChapters(novelId));
            const favoriteChapters = new Set(getFavoriteChapters(novelId));
            tbodyEl.innerHTML = chapters
                .map((chapter) => {
                    const href = chapterHref(novelId, chapter.number);
                    const isRead = readChapters.has(chapter.number);
                    const isFavorite = favoriteChapters.has(chapter.number);
                    return `
                    <tr data-volume="${hasVolume(chapter) ? chapter.volume : ""}" data-chapter="${chapter.number}"${isRead ? ' class="is-read"' : ""}>
                        <td class="col-num">${chapter.number}</td>
                        <td class="col-title"><a href="${href}">${chapter.title || ""}</a>${isRead ? chapterReadMarkHtml() : ""}</td>
                        <td class="col-date">${formatDateRu(chapter.date)}</td>
                        <td class="col-actions">
                            <div class="col-actions-inner">
                                <button type="button" class="btn-icon favorite-btn${isFavorite ? " active" : ""}" aria-label="Сохранить главу" aria-pressed="${isFavorite}"><img src="${isFavorite ? "images/icons/heart-filled.svg" : "images/icons/heart.svg"}" alt="" data-outline="images/icons/heart.svg" data-filled="images/icons/heart-filled.svg"></button>
                                <button type="button" class="btn-icon chapter-menu-btn" aria-label="Действия с главой" aria-haspopup="menu" aria-expanded="false">···</button>
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
                    setChapterFavorited(novelId, Number(button.closest("tr").dataset.chapter), isSaved);
                    if (typeof applyChapterFilters === "function") applyChapterFilters();
                });
            });

            setupChapterMenu(tbodyEl, novelId);
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


/* ---------- Синопсис: «Читать далее» на телефоне ----------
   На телефоне (≤768px, см. novel-style.css) текст синопсиса обрезан
   примерно до 5 строк. Кнопка «Читать далее» нужна только если текст
   реально длиннее — это и проверяет updateSynopsisClamp(): снимает
   .expanded, мерит, есть ли что скрывать, и ставит .is-clampable
   (CSS по нему показывает кнопку и затемнение внизу). На десктопе
   обрезки нет, scrollHeight == clientHeight, кнопка не появляется. */
const synopsisCard = document.querySelector(".synopsis-card");
const synopsisContentEl = document.getElementById("novelSynopsisContent");
const synopsisToggleBtn = document.getElementById("synopsisToggle");

function updateSynopsisClamp() {
    if (!synopsisCard || !synopsisContentEl || !synopsisToggleBtn) return;

    const wasExpanded = synopsisCard.classList.contains("expanded");
    synopsisCard.classList.remove("expanded");

    const isClampable = synopsisContentEl.scrollHeight > synopsisContentEl.clientHeight + 2;
    synopsisCard.classList.toggle("is-clampable", isClampable);

    // Если читатель уже раскрыл текст, а потом, например, повернул
    // телефон — оставляем раскрытым
    if (wasExpanded && isClampable) synopsisCard.classList.add("expanded");
    synopsisToggleBtn.textContent = synopsisCard.classList.contains("expanded") ? "Свернуть" : "Читать далее";
    synopsisToggleBtn.setAttribute("aria-expanded", synopsisCard.classList.contains("expanded"));
}

if (synopsisCard && synopsisToggleBtn) {
    synopsisToggleBtn.addEventListener("click", () => {
        const isExpanded = synopsisCard.classList.toggle("expanded");
        synopsisToggleBtn.textContent = isExpanded ? "Свернуть" : "Читать далее";
        synopsisToggleBtn.setAttribute("aria-expanded", isExpanded);
    });

    // Поворот экрана / смена ширины окна — пересчитать, нужна ли кнопка
    let synopsisResizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(synopsisResizeTimer);
        synopsisResizeTimer = setTimeout(updateSynopsisClamp, 150);
    });

    // Шрифты подгружаются позже текста — высота строк может измениться
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(updateSynopsisClamp);
}
