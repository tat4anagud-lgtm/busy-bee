/* ========================================
   BUSY BEE — ЧИТАЛКА (reader.html + chapter.html)
   ========================================
   Весь код двух режимов чтения:
     • READER MODE (reader.html): настройки, прокрутка/страницы,
       закладка, прогресс;
     • WEB-MODE CHAPTER PAGE (chapter.html): подстановка главы,
       комментарии, навигация;
     • общее: оглавление-модалка, панель выделения текста,
       сохранённые цитаты и заметки.

   ПОДКЛЮЧАТЬ ПОСЛЕ script.js — здесь используются его общие функции
   (getNovelData, chapterContentUrl, formatChapterParagraph,
   setupFootnotePopover, getNovelAndChapterFromUrl, saveReadingProgress,
   getChapterBookmark/saveChapterBookmark/removeChapterBookmark,
   savedEntryNovelId):
       <script src="script.js"></script>
       <script src="reader-script.js"></script>
   Каждый блок сам проверяет, есть ли нужные элементы на странице. */

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
