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
   TESTING TOGGLE — Homepage hero variant
   ========================================
   The homepage has two hero states:
   - HAS_ACTIVE_NOVEL = true  -> "Continue Reading" hero (.hero-continue)
   - HAS_ACTIVE_NOVEL = false -> "Welcome" search hero  (.hero-welcome)

   Change this one value and reload the page to preview either state.
   Later this will come from real data (does the user have a novel
   in progress?) instead of being hardcoded here.
   ======================================== */
const HAS_ACTIVE_NOVEL = true;

const heroContinue = document.querySelector(".hero-continue");
const heroWelcome = document.querySelector(".hero-welcome");

// Guarded: only the homepage has a hero section at all, so this is a
// no-op (not an error) on every other page, like the novel page
if (heroContinue && heroWelcome) {
    heroContinue.style.display = HAS_ACTIVE_NOVEL ? "flex" : "none";
    heroWelcome.style.display = HAS_ACTIVE_NOVEL ? "none" : "flex";
}


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


/* ---------- Profile dropdown ---------- */

const userButton = document.querySelector(".user-button");
const userDropdown = document.querySelector(".user-dropdown");

if (userButton && userDropdown) {
    userButton.addEventListener("click", (event) => {
        event.stopPropagation();
        userDropdown.classList.toggle("open");
    });
}

// "Theme" row inside the profile dropdown: swaps the moon/sun icon.
// Placeholder for now — it doesn't switch the site's colors yet.
const themeToggle = document.querySelector(".theme-toggle");

if (themeToggle) {
    const themeIcon = themeToggle.querySelector("img");
    let isDarkTheme = false;

    themeToggle.addEventListener("click", (event) => {
        // Keep the profile dropdown open so the icon swap stays visible
        event.stopPropagation();

        isDarkTheme = !isDarkTheme;
        themeIcon.src = isDarkTheme
            ? "images/icons/sun.svg"
            : "images/icons/moon.svg";
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


/* ---------- Featured Authors: Follow / Following toggle ---------- */

const followButtons = document.querySelectorAll(".follow-button");

followButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const isFollowing = button.classList.toggle("following");
        button.textContent = isFollowing ? "Following" : "Follow";
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


/* ========================================
   NOVEL PAGE
   ======================================== */

/* ---------- Favorite toggle (independent of reading status) ---------- */

const favoriteStatusBtn = document.getElementById("favoriteStatusBtn");

if (favoriteStatusBtn) {
    const icon = favoriteStatusBtn.querySelector("img");

    favoriteStatusBtn.addEventListener("click", () => {
        const isFavorited = favoriteStatusBtn.classList.toggle("active");
        favoriteStatusBtn.setAttribute("aria-pressed", isFavorited);
        icon.src = isFavorited ? icon.dataset.filled : icon.dataset.outline;
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

    readingStatusDropdown.querySelectorAll(".reading-status-option").forEach((option) => {
        option.addEventListener("click", () => {
            readingStatusDropdown.querySelectorAll(".reading-status-option").forEach((o) => o.classList.remove("active"));
            option.classList.add("active");

            if (readingStatusIcon) readingStatusIcon.src = option.dataset.icon;
            if (readingStatusLabel) readingStatusLabel.textContent = option.querySelector("span").textContent;

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
// Table starts newest-first (chapter 124 at the top, then Extras last).
// Clicking the other arrow reverses the whole list — Extras included —
// so the numbers/dates/progress stay attached to the correct chapter
// instead of just re-labeling them.

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

/* ---------- Filters + search + sort (combined) ---------- */
// Same idea as the chapters table's applyChapterFilters: every control
// narrows down the same set of cards together, instead of one control
// overriding another. Status/Length/Genre are OR'd within their own
// group and AND'd across groups; search matches title or author.
//
// Sort by Highest Rated / Most Popular uses each card's data-rating —
// there's no separate "popularity" number in the mock data, so both
// options sort by the same value for now. Newest Added has no real
// "date added" either, so it just reverses the default card order.

const catalogCards = Array.from(document.querySelectorAll(".catalog-grid > .novel-card"));
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
    const ofMatch = statusText.match(/of (\d+)/);
    if (ofMatch) return parseInt(ofMatch[1], 10);
    const totalMatch = statusText.match(/(\d+) Chapters/);
    return totalMatch ? parseInt(totalMatch[1], 10) : 0;
}

function getCardLengthBucket(card) {
    const total = getCardChapterCount(card);
    if (total <= 100) return "short";
    if (total <= 300) return "medium";
    return "long";
}

if (catalogCards.length && catalogGrid) {
    const originalOrder = catalogCards.slice();

    function applyCatalogFilters() {
        const statusFilters = getCheckedValues("status");
        const lengthFilters = getCheckedValues("length");
        const genreFilters = getCheckedValues("genre");
        const searchTerm = catalogSearchInput ? catalogSearchInput.value.trim().toLowerCase() : "";

        let visibleCount = 0;

        catalogCards.forEach((card) => {
            const cardStatus = card.querySelector(".badge-completed") ? "completed" : "ongoing";
            const cardGenres = Array.from(card.querySelectorAll(".novel-tags span")).map((el) => el.textContent.trim().toLowerCase());
            const cardTitle = (card.querySelector("h3")?.textContent || "").toLowerCase();
            const cardAuthor = (card.querySelector(".author-name")?.textContent || "").toLowerCase();

            const matchesStatus = statusFilters.length === 0 || statusFilters.includes(cardStatus);
            const matchesLength = lengthFilters.length === 0 || lengthFilters.includes(getCardLengthBucket(card));
            const matchesGenre = genreFilters.length === 0 || genreFilters.some((g) => cardGenres.includes(g));
            const matchesSearch = searchTerm === "" || cardTitle.includes(searchTerm) || cardAuthor.includes(searchTerm) || cardGenres.some((g) => g.includes(searchTerm));

            const isVisible = matchesStatus && matchesLength && matchesGenre && matchesSearch;
            card.style.display = isVisible ? "" : "none";
            if (isVisible) visibleCount += 1;
        });

        if (resultsCountEl) {
            resultsCountEl.textContent = `${visibleCount} of ${catalogCards.length} demo stories shown`;
        }

        if (catalogNoResults) catalogNoResults.hidden = visibleCount !== 0;
    }

    function applyCatalogSort() {
        const activeSort = sortDropdown?.querySelector(".sort-option.active")?.textContent.trim();
        let sorted;

        if (activeSort === "Highest Rated" || activeSort === "Most Popular") {
            sorted = catalogCards.slice().sort((a, b) => parseFloat(b.dataset.rating || 0) - parseFloat(a.dataset.rating || 0));
        } else if (activeSort === "Newest Added") {
            sorted = originalOrder.slice().reverse();
        } else {
            sorted = originalOrder;
        }

        sorted.forEach((card) => catalogGrid.appendChild(card));
    }

    document.querySelectorAll('.filter-group[data-filter-group] input[type="checkbox"]').forEach((input) => {
        input.addEventListener("change", applyCatalogFilters);
    });

    if (catalogSearchInput) {
        catalogSearchInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") applyCatalogFilters();
        });
    }

    if (catalogSearchBtn) {
        catalogSearchBtn.addEventListener("click", applyCatalogFilters);
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

            applyCatalogFilters();
        });
    });

    if (clearAllFiltersBtn) {
        clearAllFiltersBtn.addEventListener("click", () => {
            document.querySelectorAll('.filter-group[data-filter-group] input[type="checkbox"]').forEach((input) => { input.checked = false; });
            if (catalogSearchInput) catalogSearchInput.value = "";
            applyCatalogFilters();
        });
    }

    // Exposed so the sort dropdown (defined below) can trigger a re-sort
    // right after it updates which option is active
    window.applyCatalogSort = applyCatalogSort;
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

document.querySelectorAll(".card-menu").forEach((menu) => {
    const toggleBtn = menu.querySelector(".btn-card-menu");
    const dropdown = menu.querySelector(".card-menu-dropdown");
    if (!toggleBtn || !dropdown) return;

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

document.addEventListener("click", (event) => {
    if (!event.target.closest(".card-menu")) {
        document.querySelectorAll(".card-menu-dropdown.open").forEach((d) => d.classList.remove("open"));
        document.querySelectorAll(".btn-card-menu[aria-expanded='true']").forEach((b) => b.setAttribute("aria-expanded", "false"));
    }
});

/* ---------- Pagination (visual only for now) ---------- */
// Only 8 demo cards exist, so there's nothing real to page through yet —
// this just makes the control feel alive (active state, arrow disabling).
// Once real novel data exists, wire this up the same way as the chapters
// table's pagination (see applyChapterFilters / renderChapterPagination).

const catalogPagination = document.querySelector(".catalog-pagination");

if (catalogPagination) {
    const pagePrev = document.getElementById("catalogPagePrevBtn");
    const pageNext = document.getElementById("catalogPageNextBtn");
    const pageNumberBtns = Array.from(catalogPagination.querySelectorAll(".page-number"));

    const setActivePage = (btn) => {
        pageNumberBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        const pageNum = parseInt(btn.textContent, 10);
        if (pagePrev) pagePrev.disabled = pageNum <= 1;
        if (pageNext) pageNext.disabled = pageNum >= parseInt(pageNumberBtns[pageNumberBtns.length - 1].textContent, 10);
    };

    pageNumberBtns.forEach((btn) => {
        btn.addEventListener("click", () => setActivePage(btn));
    });

    if (pagePrev) {
        pagePrev.addEventListener("click", () => {
            const active = catalogPagination.querySelector(".page-number.active");
            const currentIndex = pageNumberBtns.indexOf(active);
            if (currentIndex > 0) setActivePage(pageNumberBtns[currentIndex - 1]);
        });
    }

    if (pageNext) {
        pageNext.addEventListener("click", () => {
            const active = catalogPagination.querySelector(".page-number.active");
            const currentIndex = pageNumberBtns.indexOf(active);
            if (currentIndex < pageNumberBtns.length - 1) setActivePage(pageNumberBtns[currentIndex + 1]);
        });
    }
}

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

    /* 1b. Bookmark Chapter Toggle — same outline/filled icon-swap
       pattern as .favorite-btn (heart.svg / heart-filled.svg), just
       with its own filled icon colored ink-brown instead of gold */
    const btnBookmark = document.getElementById("btnBookmark");
    if (btnBookmark) {
        const btnBookmarkIcon = btnBookmark.querySelector(".tool-icon img");

        btnBookmark.addEventListener("click", () => {
            const isSaved = btnBookmark.classList.toggle("active");
            btnBookmark.setAttribute("aria-pressed", isSaved);
            if (btnBookmarkIcon) {
                btnBookmarkIcon.src = isSaved
                    ? btnBookmarkIcon.dataset.filled
                    : btnBookmarkIcon.dataset.outline;
            }
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
            toggleReadingModeBtn.title = enabled ? "Switch to Scroll mode" : "Switch to Book mode";
        }
        if (readingModeLabel) readingModeLabel.textContent = enabled ? "Book" : "Scroll";

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

    /* 8. Chapter loading (test data) — fetches chapters/chapter-N.json
       and renders it into the prose. Only chapters 124–126 exist for
       now; swap this for a real API call once there's a backend. */
    const chapterLabel = document.getElementById("chapterLabel");
    const chapterTitleEl = document.getElementById("chapterTitle");
    const chapterSubtitle = document.getElementById("chapterSubtitle");
    const novelTitle = readerHeader.querySelector(".novel-title");

    const AVAILABLE_CHAPTERS = [123, 124, 125, 126];

    // Lets chapter.html hand off to a specific chapter via
    // reader.html?chapter=125 — falls back to 124 if the param is
    // missing or isn't one of the chapters we actually have
    const readerUrlParams = new URLSearchParams(window.location.search);
    const readerChapterFromUrl = parseInt(readerUrlParams.get("chapter"), 10);
    let currentChapterNumber = AVAILABLE_CHAPTERS.includes(readerChapterFromUrl)
        ? readerChapterFromUrl
        : 124;

    async function loadChapter(chapterNumber) {
        try {
            const response = await fetch(`chapters/chapter-${chapterNumber}.json`);
            if (!response.ok) throw new Error(`Chapter ${chapterNumber} not found`);
            const chapter = await response.json();

            currentChapterNumber = chapter.number;

            const webVersionLink = document.getElementById("webVersionLink");
            if (webVersionLink) webVersionLink.href = `chapter.html?chapter=${chapter.number}`;

            if (chapterLabel) chapterLabel.textContent = `Chapter ${chapter.number}`;
            if (chapterTitleEl) chapterTitleEl.textContent = chapter.title;
            if (chapterSubtitle) chapterSubtitle.textContent = `Chapter ${chapter.number}: ${chapter.title}`;
            document.title = `Chapter ${chapter.number}: ${chapter.title} — ${novelTitle ? novelTitle.textContent : "Busy Bee"}`;

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
                    .map((paragraph) => `<p>${paragraph}</p>`)
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
            const errorHtml = `<p>Couldn't load this chapter (${chapterNumber}). ${error.message}</p>`;
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
        const index = AVAILABLE_CHAPTERS.indexOf(currentChapterNumber);

        if (prevChapterLink) {
            const hasPrev = index > 0;
            prevChapterLink.style.opacity = hasPrev ? "1" : "0.3";
            prevChapterLink.style.pointerEvents = hasPrev ? "auto" : "none";
        }
        if (nextChapterLink) {
            const hasNext = index >= 0 && index < AVAILABLE_CHAPTERS.length - 1;
            nextChapterLink.style.opacity = hasNext ? "1" : "0.3";
            nextChapterLink.style.pointerEvents = hasNext ? "auto" : "none";
        }
    }

    if (prevChapterLink) {
        prevChapterLink.addEventListener("click", (event) => {
            event.preventDefault();
            const index = AVAILABLE_CHAPTERS.indexOf(currentChapterNumber);
            if (index > 0) loadChapter(AVAILABLE_CHAPTERS[index - 1]);
        });
    }

    if (nextChapterLink) {
        nextChapterLink.addEventListener("click", (event) => {
            event.preventDefault();
            const index = AVAILABLE_CHAPTERS.indexOf(currentChapterNumber);
            if (index < AVAILABLE_CHAPTERS.length - 1) loadChapter(AVAILABLE_CHAPTERS[index + 1]);
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
        if (progressText) progressText.textContent = `${percent}% through the chapter`;

        if (pagesRemainingEl) {
            if (isBookMode) {
                const pageWidth = prose.clientWidth + BOOK_COLUMN_GAP;
                const totalPages = Math.max(1, Math.round((prose.scrollWidth + BOOK_COLUMN_GAP) / pageWidth));
                const currentPage = Math.round((prose.scrollLeft / pageWidth)) + 1;
                const pagesLeft = Math.max(0, totalPages - currentPage);
                pagesRemainingEl.textContent =
                    pagesLeft === 1 ? "1 page left in chapter" : `${pagesLeft} pages left in chapter`;
            } else {
                const pagesLeft = Math.max(
                    0,
                    currentChapterTotalPages - Math.round((currentChapterTotalPages * percent) / 100)
                );
                pagesRemainingEl.textContent =
                    pagesLeft === 1 ? "1 page left in chapter" : `${pagesLeft} pages left in chapter`;
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
            const index = AVAILABLE_CHAPTERS.indexOf(currentChapterNumber);
            if (direction < 0 && index > 0) {
                loadChapter(AVAILABLE_CHAPTERS[index - 1]);
            } else if (direction > 0 && index >= 0 && index < AVAILABLE_CHAPTERS.length - 1) {
                loadChapter(AVAILABLE_CHAPTERS[index + 1]);
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
    // Same set as the Reading-mode block — duplicated here rather than
    // shared, since the two blocks live on different pages and don't
    // share a scope. If chapters are ever added/removed, update both.
    const WEB_AVAILABLE_CHAPTERS = [123, 124, 125, 126];

    const urlParams = new URLSearchParams(window.location.search);
    const chapterFromUrl = parseInt(urlParams.get("chapter"), 10);
    const webChapterNumber = WEB_AVAILABLE_CHAPTERS.includes(chapterFromUrl)
        ? chapterFromUrl
        : 124;

    const breadcrumbChapter = document.getElementById("breadcrumbChapter");
    const chapterLabel = document.getElementById("chapterLabel");
    const chapterTitle = document.getElementById("chapterTitle");
    const chapterWebInfo = document.getElementById("chapterWebInfo");
    const readingModeBtn = document.getElementById("readingModeBtn");
    const prevChapterBtn = document.getElementById("prevChapterBtn");
    const nextChapterBtn = document.getElementById("nextChapterBtn");

    async function loadWebChapter(chapterNumber) {
        try {
            const response = await fetch(`chapters/chapter-${chapterNumber}.json`);
            const chapter = await response.json();

            document.title = `Chapter ${chapter.number}: ${chapter.title} — A Dream Within a Dream | Busy Bee`;
            if (breadcrumbChapter) breadcrumbChapter.textContent = `Chapter ${chapter.number}`;
            if (chapterLabel) chapterLabel.textContent = `Chapter ${chapter.number}`;
            if (chapterTitle) chapterTitle.textContent = chapter.title;

            // Rough reading-time estimate (~200 words/minute) — just a
            // nice-to-have for the meta line, not meant to be precise
            const wordCount = chapter.paragraphs.join(" ").trim().split(/\s+/).length;
            const minutes = Math.max(1, Math.round(wordCount / 200));
            if (chapterWebInfo) {
                chapterWebInfo.textContent = `Chapter ${chapter.number} · ~${minutes} min read`;
            }

            chapterWebText.innerHTML = chapter.paragraphs
                .map((paragraph) => `<p>${paragraph}</p>`)
                .join("");

            // Carry the chapter number over into Reading mode, so
            // switching modes lands on the same chapter you were on
            if (readingModeBtn) readingModeBtn.href = `reader.html?chapter=${chapter.number}`;

            const index = WEB_AVAILABLE_CHAPTERS.indexOf(chapterNumber);
            if (prevChapterBtn) {
                const hasPrev = index > 0;
                prevChapterBtn.classList.toggle("disabled", !hasPrev);
                prevChapterBtn.href = hasPrev
                    ? `chapter.html?chapter=${WEB_AVAILABLE_CHAPTERS[index - 1]}`
                    : "#";
            }
            if (nextChapterBtn) {
                const hasNext = index >= 0 && index < WEB_AVAILABLE_CHAPTERS.length - 1;
                nextChapterBtn.classList.toggle("disabled", !hasNext);
                nextChapterBtn.href = hasNext
                    ? `chapter.html?chapter=${WEB_AVAILABLE_CHAPTERS[index + 1]}`
                    : "#";
            }

            window.scrollTo({ top: 0 });
        } catch (error) {
            chapterWebText.innerHTML = "<p>Couldn't load this chapter.</p>";
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

    const listUrlParams = new URLSearchParams(window.location.search);
    const listChapterFromUrl = parseInt(listUrlParams.get("chapter"), 10);
    const currentListChapter = Number.isInteger(listChapterFromUrl) ? listChapterFromUrl : 124;

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

    fetch("chapters/chapter-list.json")
        .then((response) => response.json())
        .then((chapters) => {
            // Table already comes sorted newest-first from novel.html
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
                            <span class="item-title">${chapter.title || "Not yet translated"}</span>
                            ${statusHtml}
                        </button>
                    `;
                })
                .join("");

            chapterListItems.querySelectorAll(".chapter-list-item:not(.is-locked)").forEach((item) => {
                item.addEventListener("click", () => {
                    window.location.href = `${targetPage}?chapter=${item.dataset.chapter}`;
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
        list.push({ ...entry, savedAt: new Date().toISOString() });
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
        const chapterNumber = parseInt(params.get("chapter"), 10) || 124;
        return {
            title: title ? title.textContent : document.title,
            number: chapterNumber,
        };
    }

    const selCopyBtn = document.getElementById("selCopyBtn");
    if (selCopyBtn) {
        selCopyBtn.addEventListener("click", () => {
            navigator.clipboard
                .writeText(pendingSelectedText)
                .then(() => showToast("Copied to clipboard"))
                .catch(() => showToast("Couldn't copy — try again"));
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
            showToast("Passage bookmarked");
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
            showToast("Saved as quote");
            hideSelectionToolbar();
        });
    }

    function openComposer(mode) {
        if (!selectionComposer) return;
        pendingComposerKey = mode === "note" ? "busybee_notes" : "busybee_comments";

        if (selectionComposerLabel) {
            selectionComposerLabel.textContent = mode === "note" ? "Add a note" : "Add a comment";
        }
        if (selectionComposerInput) {
            selectionComposerInput.placeholder =
                mode === "note" ? "Jot something down…" : "Share your thoughts…";
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
                showToast("Write something first");
                return;
            }
            saveToLocalList(pendingComposerKey, {
                quotedText: pendingSelectedText,
                content,
                chapterTitle: currentChapterContext().title,
                chapterNumber: currentChapterContext().number,
                url: window.location.href,
            });
            showToast(pendingComposerKey === "busybee_notes" ? "Note saved" : "Comment posted");
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
        return parseInt(params.get("chapter"), 10) || 124;
    }

    function formatSavedDate(isoString) {
        const date = new Date(isoString);
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }

    function renderSavedItems(storageKey) {
        const chapterNumber = currentReaderChapterNumber();
        const isNotes = storageKey === "busybee_notes";
        const allItems = getStoredList(storageKey);
        const items = allItems
            .map((item, index) => ({ ...item, originalIndex: index }))
            .filter((item) => item.chapterNumber === chapterNumber);

        if (savedItemsTitle) savedItemsTitle.textContent = isNotes ? "Notes" : "Quotes";

        if (items.length === 0) {
            savedItemsList.innerHTML = `<div class="saved-items-empty">No ${isNotes ? "notes" : "quotes"} saved from this chapter yet.</div>`;
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
                            <button type="button" class="saved-item-delete" data-storage-key="${storageKey}">Remove</button>
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
