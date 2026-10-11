/* ========================================
   BUSY BEE — TRANSLATOR PAGE INTERACTION
   ======================================== */

// Note: the heart (.favorite-btn) and bookmark (.mini-bookmark) icons already
// on the page when it loads are wired up globally by script.js — no extra
// code needed here for those. Everything rendered by THIS file (posts,
// translation cards, recommend cards, collection cards) is injected after
// page load, so each render step below binds its own click handlers right
// after creating the markup.

document.addEventListener("DOMContentLoaded", () => {

    /* ----------------------------------------------------------------
       Shared helpers — русские окончания, дата "N дней назад", и
       привязка лайк/закладка-переключателей к динамически созданным
       карточкам (общий .favorite-btn / .mini-bookmark паттерн иконок
       используется в нескольких местах на этой странице)
       ---------------------------------------------------------------- */

    function pluralizeRu(n, one, few, many) {
        const mod10 = n % 10;
        const mod100 = n % 100;
        if (mod10 === 1 && mod100 !== 11) return one;
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
        return many;
    }

    function formatRelativeRu(isoDate) {
        const date = new Date(isoDate);
        if (isNaN(date)) return "";
        const diffDays = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) return "сегодня";
        if (diffDays === 1) return "вчера";
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

    function latestChapterNumber(novel) {
        if (!novel.chapters || novel.chapters.length === 0) return null;
        return [...novel.chapters].sort((a, b) => new Date(b.date) - new Date(a.date))[0].number;
    }

    // Вешает переключатель outline/filled на все .favorite-btn и
    // .mini-bookmark внутри scope — используется после каждого рендера
    // карточек новелл, потому что script.js разбирает такие кнопки
    // только один раз, при первой загрузке страницы
    function bindFavoriteAndBookmarkButtons(scope) {
        scope.querySelectorAll(".favorite-btn").forEach((button) => {
            const icon = button.querySelector("img");
            button.addEventListener("click", () => {
                const isSaved = button.classList.toggle("active");
                button.setAttribute("aria-pressed", isSaved);
                icon.src = isSaved ? icon.dataset.filled : icon.dataset.outline;
            });
        });

        // Закладки на карточках новелл (есть data-novel-id) ведёт общая
        // bindNovelBookmarks из script.js — «Буду читать». Закладки на
        // посты (.bookmark-btn) переключает bindPostLikeButtons ниже — если
        // навесить обработчик и здесь, кнопка переключится дважды и
        // визуально не изменится. Так что здесь остаются только прочие
        // .mini-bookmark.
        bindNovelBookmarks(scope);

        scope.querySelectorAll(".mini-bookmark:not([data-novel-id]):not(.bookmark-btn)").forEach((button) => {
            const icon = button.querySelector("img");
            button.addEventListener("click", (event) => {
                event.stopPropagation();
                const isSaved = button.classList.toggle("active");
                button.setAttribute("aria-pressed", isSaved);
                icon.src = isSaved ? icon.dataset.filled : icon.dataset.outline;
            });
        });
    }

    // Тот же outline/filled свап для лайков под постами (иконка + счётчик)
    function bindPostLikeButtons(scope) {
        scope.querySelectorAll(".post-footer .like-btn").forEach((likeBtn) => {
            const icon = likeBtn.querySelector("img");
            likeBtn.addEventListener("click", () => {
                const isLiked = likeBtn.classList.toggle("liked");
                icon.src = isLiked ? icon.dataset.filled : icon.dataset.outline;
            });
        });

        scope.querySelectorAll(".post-footer .bookmark-btn").forEach((button) => {
            const icon = button.querySelector("img");
            button.addEventListener("click", () => {
                const isSaved = button.classList.toggle("active");
                button.setAttribute("aria-pressed", isSaved);
                icon.src = isSaved ? icon.dataset.filled : icon.dataset.outline;
            });
        });
    }

    /* ----------------------------------------------------------------
       Card renderers — одна функция на тип карточки, переиспользуется
       и в карусели на "Обзоре", и в полной сетке на своей вкладке
       ---------------------------------------------------------------- */

    function renderTranslationCard(novel) {
        const isCompleted = novel.translationStatus === "Полностью переведено";
        const status = isCompleted ? "completed" : "ongoing";
        const badge = isCompleted
            ? `<span class="badge-completed">Завершено</span>`
            : `<span class="badge-ongoing">Выходит</span>`;

        const chInfo = isCompleted
            ? `${novel.totalChapters} ${pluralizeRu(novel.totalChapters, "глава", "главы", "глав")}`
            : `Глава ${latestChapterNumber(novel) ?? "?"} из ${novel.totalChapters ?? "?"}`;

        const novelHref = `novel.html?id=${novel.id}`;

        return `
            <div class="translation-card" data-status="${status}">
                <div class="cover-box">
                    ${badge}
                    <a href="${novelHref}"><img src="${novel.cover}" alt="${novel.title}"></a>
                </div>
                <h4><a href="${novelHref}" class="hero-title-link">${novel.title}</a></h4>
                <p class="author">${novel.author?.name || ""}</p>
                <p class="ch-info">${chInfo}</p>
                <div class="card-footer">
                    <button type="button" class="favorite-btn" aria-label="Like" aria-pressed="false"><img src="images/icons/heart.svg" alt="" data-outline="images/icons/heart.svg" data-filled="images/icons/heart-filled.svg"></button>
                    <button type="button" class="mini-bookmark" data-novel-id="${novel.id}" aria-label="Save to bookmarks" aria-pressed="false"><img src="images/icons/bookmark.svg" alt="" data-outline="images/icons/bookmark.svg" data-filled="images/icons/bookmark-filled-gold.svg"></button>
                </div>
            </div>`;
    }

    function renderRecommendCard(novel) {
        const novelHref = `novel.html?id=${novel.id}`;
        const quoteHtml = novel.busyBeeNotes
            ? `<blockquote class="quote">«${novel.busyBeeNotes}»</blockquote>`
            : "";

        return `
            <div class="recommend-card">
                <a href="${novelHref}"><img src="${novel.cover}" alt="${novel.title}"></a>
                <h4><a href="${novelHref}" class="hero-title-link">${novel.title}</a></h4>
                <p class="author">${novel.author?.name || ""}</p>
                ${quoteHtml}
                <button type="button" class="fav-btn favorite-btn" aria-label="Like" aria-pressed="false"><img src="images/icons/heart.svg" alt="" data-outline="images/icons/heart.svg" data-filled="images/icons/heart-filled.svg"></button>
            </div>`;
    }

    function renderCollectionCard(col) {
        return `
            <a href="#" class="collection-card">
                <img src="images/collections/${col.slug}.png" alt="${col.alt}">
                <div class="collection-card-info">
                    <h3>${col.title}</h3>
                </div>
            </a>`;
    }

    function renderPostCard(post) {
        const header = `
            <div class="post-author-header">
                <div class="author-sm-avatar"></div>
                <div>
                    <strong>Busy Bee <span class="v-icon">✓</span></strong>
                    <span class="post-date">${post.date}</span>
                </div>
                <button class="btn-more">···</button>
            </div>`;

        if (post.type === "poll") {
            const optionsHtml = post.options
                .map(
                    (option) => `
                    <div class="poll-item">
                        <div class="poll-bar" style="width: ${option.percent}%;"></div>
                        <span class="option-name">${option.name}</span>
                        <span class="option-percent">${option.percent}%</span>
                    </div>`
                )
                .join("");

            return `
                <article class="post-card">
                    ${header}
                    <p class="post-text">${post.text}</p>
                    <div class="poll-options">${optionsHtml}</div>
                    <span class="poll-meta">${post.pollMeta}</span>
                    <div class="post-footer">
                        <button type="button" class="action-btn like-btn" aria-pressed="false"><img src="images/icons/heart.svg" alt="" data-outline="images/icons/heart.svg" data-filled="images/icons/heart-filled.svg"> ${post.likes}</button>
                        <button type="button" class="action-btn comment-btn"><img src="images/icons/comment.svg" alt=""> ${post.comments}</button>
                        <button type="button" class="action-btn bookmark-btn mini-bookmark" aria-label="Save to bookmarks" aria-pressed="false"><img src="images/icons/bookmark.svg" alt="" data-outline="images/icons/bookmark.svg" data-filled="images/icons/bookmark-filled-gold.svg"></button>
                    </div>
                </article>`;
        }

        if (post.type === "image") {
            return `
                <article class="post-card">
                    ${header}
                    <div class="post-image-layout">
                        <img src="${post.image}" alt="Workspace">
                        <p class="post-text">${post.text}</p>
                    </div>
                </article>`;
        }

        // "text" — обычный текстовый пост
        return `
            <article class="post-card">
                ${header}
                <p class="post-text">${post.text}</p>
                <div class="post-footer">
                    <button type="button" class="action-btn like-btn" aria-pressed="false"><img src="images/icons/heart.svg" alt="" data-outline="images/icons/heart.svg" data-filled="images/icons/heart-filled.svg"> ${post.likes}</button>
                    <button type="button" class="action-btn comment-btn"><img src="images/icons/comment.svg" alt=""> ${post.comments}</button>
                    <button type="button" class="action-btn bookmark-btn mini-bookmark" aria-label="Save to bookmarks" aria-pressed="false"><img src="images/icons/bookmark.svg" alt="" data-outline="images/icons/bookmark.svg" data-filled="images/icons/bookmark-filled-gold.svg"></button>
                </div>
            </article>`;
    }

    /* ----------------------------------------------------------------
       Data — посты и коллекции не приходят из novels.json (это не
       новеллы), поэтому лежат прямо здесь. Первые 4 поста и первая
       часть коллекций также используются в превью на вкладке "Обзор".
       ---------------------------------------------------------------- */

    const postsData = [
        {
            type: "text",
            date: "12 августа, 2026",
            text: 'Вышла 7 глава "Книги грёз"! Спасибо всем за поддержку💛',
            likes: 512,
            comments: 68,
        },
        {
            type: "text",
            date: "8 августа, 2026",
            text: "Скоро выйдет новая новелла! Ждёте? ✨",
            likes: 430,
            comments: 54,
        },
        {
            type: "poll",
            date: "25 июля, 2026 • Poll",
            text: "Какую новеллу вы бы хотели, чтобы я перевела?",
            options: [
                { name: "Дворцовые интриги", percent: 48 },
                { name: "Месть", percent: 32 },
                { name: "Уся / Боевые искусства", percent: 20 },
            ],
            pollMeta: "1,248 голосов • Голосование закончено",
            likes: 212,
            comments: 37,
        },
        {
            type: "image",
            date: "18 июля, 2026",
            image: "https://placehold.co/120x90",
            text: "Маленький уголок моего рабочего пространства, где происходит вся магия. Что вы сегодня читаете? 📖",
        },
        {
            type: "text",
            date: "2 июля, 2026",
            text: "Спасибо всем, кто проголосовал в опросе! Дворцовые интриги победили — уже присматриваюсь к новому проекту 👀",
            likes: 356,
            comments: 41,
        },
        {
            type: "text",
            date: "20 июня, 2026",
            text: "Небольшой перерыв на этой неделе — вернусь с новыми главами в понедельник. Спасибо за терпение! 🍯",
            likes: 289,
            comments: 22,
        },
    ];

    const OVERVIEW_POSTS_COUNT = 4;

    const collectionsData = [
        { title: "Атмосферные истории", slug: "atmospheric-stories", alt: "Atmospheric Stories" },
        { title: "Второй шанс", slug: "second-chances", alt: "Second Chances" },
        { title: "Герои, которых невозможно забыть", slug: "unforgettable-heroes", alt: "Unforgettable Heroes" },
        { title: "Дворцовые интриги", slug: "court-intrigues", alt: "Court Intrigues" },
        { title: "Для спокойного вечера", slug: "for-a-quiet-evening", alt: "For a Quiet Evening" },
        { title: "Для чтения поздним вечером", slug: "late-night-reads", alt: "Late Night Reads" },
        { title: "Завершённые истории", slug: "completed-stories", alt: "Completed Stories" },
        { title: "Истории о мести", slug: "revenge-stories", alt: "Revenge Stories" },
        { title: "Когда всё пошло не по плану", slug: "when-plans-fall-apart", alt: "When Plans Fall Apart" },
        { title: "Медленная любовь", slug: "slow-burn-romance", alt: "Slow Burn Romance" },
        { title: "Перерождение", slug: "rebirth", alt: "Rebirth" },
        { title: "Приготовьте салфетки", slug: "grab-the-tissues", alt: "Grab the Tissues" },
        { title: "Сильные героини", slug: "strong-heroines", alt: "Strong Heroines" },
        { title: "Уютное чтение", slug: "cozy-reads", alt: "Cozy Reads" },
    ];

    /* ----------------------------------------------------------------
       0. Featured Project — новелла с самой свежей опубликованной
       главой среди всех переводов Busy Bee. Показывается одинаково на
       всех вкладках, поэтому живёт вне tab-panel'ей.
       ---------------------------------------------------------------- */
    const featuredCard = document.querySelector(".featured-project-card");

    if (featuredCard) {
        fetch("novels/novels.json")
            .then((response) => response.json())
            .then((novelsIndex) => Promise.all(novelsIndex.map((entry) => getNovelData(entry.id))))
            .then((novels) => {
                const withLatestChapter = novels
                    .map((novel) => {
                        if (!novel.chapters || novel.chapters.length === 0) return null;
                        const latestChapter = [...novel.chapters].sort(
                            (a, b) => new Date(b.date) - new Date(a.date)
                        )[0];
                        return { novel, chapter: latestChapter };
                    })
                    .filter(Boolean)
                    .sort((a, b) => new Date(b.chapter.date) - new Date(a.chapter.date));

                if (withLatestChapter.length === 0) return;

                const { novel, chapter } = withLatestChapter[0];
                const isCompleted = novel.translationStatus === "Полностью переведено";
                const percent = novel.totalChapters
                    ? Math.min(100, Math.round((chapter.number / novel.totalChapters) * 100))
                    : 0;

                const badgeEl = featuredCard.querySelector(".badge-ongoing, .badge-completed");
                if (badgeEl) {
                    badgeEl.className = isCompleted ? "badge-completed" : "badge-ongoing";
                    badgeEl.textContent = isCompleted ? "Завершено" : "Выходит";
                }

                const coverImg = featuredCard.querySelector(".featured-cover-box img");
                if (coverImg) {
                    coverImg.src = novel.cover;
                    coverImg.alt = novel.title;
                }

                const titleEl = featuredCard.querySelector(".featured-info-box h2");
                if (titleEl) titleEl.textContent = novel.title;

                const origTitleEl = featuredCard.querySelector(".orig-title");
                if (origTitleEl) origTitleEl.textContent = novel.originalTitle || "";

                const authorsEl = featuredCard.querySelector(".authors");
                if (authorsEl) {
                    authorsEl.innerHTML = `автор — <strong>${novel.author?.name || ""}</strong><span class="authors-translator"> <span>|</span> перевод — <strong>Busy Bee</strong></span>`;
                }

                const descEl = featuredCard.querySelector(".featured-desc");
                if (descEl) descEl.textContent = (novel.synopsis || [])[0] || "";

                const tagsEl = featuredCard.querySelector(".featured-tags");
                if (tagsEl) {
                    tagsEl.innerHTML = (novel.genres || []).map((genre) => `<span>${genre}</span>`).join("");
                }

                const chapterTitleEl = featuredCard.querySelector(".chapter-status-title");
                if (chapterTitleEl) chapterTitleEl.textContent = `Глава ${chapter.number}`;

                const chapterSubtitleEl = featuredCard.querySelector(".chapter-status-subtitle");
                if (chapterSubtitleEl) chapterSubtitleEl.textContent = `опубликовано ${formatRelativeRu(chapter.date)}`;

                const fillEl = featuredCard.querySelector(".mini-progress-bar .fill");
                if (fillEl) fillEl.style.width = `${percent}%`;

                const percentLabelEl = featuredCard.querySelector(".percent-label");
                if (percentLabelEl) percentLabelEl.textContent = `${percent}%`;

                const readNowBtn = featuredCard.querySelector(".btn-read-now");
                if (readNowBtn) readNowBtn.href = `chapter.html?novel=${novel.id}&chapter=${chapter.number}`;

                const viewDetailsBtn = featuredCard.querySelector(".btn-view-details");
                if (viewDetailsBtn) viewDetailsBtn.href = `novel.html?id=${novel.id}`;
            })
            .catch((error) => console.error("Failed to load featured project:", error));
    }

    /* ----------------------------------------------------------------
       Overview panel — превью-версии постов, переводов, рекомендаций
       и коллекций (карусели на 8 штук)
       ---------------------------------------------------------------- */

    // Посты — первые несколько из общего списка
    const overviewPostsList = document.getElementById("overviewPostsList");
    if (overviewPostsList) {
        overviewPostsList.innerHTML = postsData
            .slice(0, OVERVIEW_POSTS_COUNT)
            .map(renderPostCard)
            .join("");
        bindPostLikeButtons(overviewPostsList);
        bindFavoriteAndBookmarkButtons(overviewPostsList);
    }

    // Коллекции — карусель со всеми 14 (столько же, сколько на вкладке,
    // просто в горизонтальной прокрутке вместо сетки)
    const overviewCollectionsTrack = document.getElementById("overviewCollectionsTrack");
    if (overviewCollectionsTrack) {
        overviewCollectionsTrack.innerHTML = collectionsData.map(renderCollectionCard).join("");

        // Карточки только что появились — глобальный вызов setupCarousel()
        // в начале script.js застал этот трек ещё пустым (card = null,
        // setupCarousel вышел без дела), поэтому стрелки нужно привязать
        // заново, теперь когда карточки на месте — как уже сделано ниже
        // для "Последних переводов" и "Busy Bee рекомендует"
        const collectionsWrapper = overviewCollectionsTrack.closest(".collection-carousel");
        if (collectionsWrapper && typeof setupCarousel === "function") setupCarousel(collectionsWrapper);
    }

    // Последние переводы — карусель, максимум 8 новелл
    const translationsTrack = document.getElementById("translatorTranslationsTrack");
    const MAX_TRANSLATIONS = 8;

    if (translationsTrack) {
        fetch("novels/novels.json")
            .then((response) => response.json())
            .then((novelsIndex) =>
                Promise.all(novelsIndex.slice(0, MAX_TRANSLATIONS).map((entry) => getNovelData(entry.id)))
            )
            .then((novels) => {
                translationsTrack.innerHTML = novels.map(renderTranslationCard).join("");
                bindFavoriteAndBookmarkButtons(translationsTrack);

                const wrapper = translationsTrack.closest(".book-carousel");
                if (wrapper && typeof setupCarousel === "function") setupCarousel(wrapper);
            })
            .catch((error) => console.error("Failed to load latest translations:", error));
    }

    // Busy Bee рекомендует — карусель, максимум 8 новелл
    const recommendsTrack = document.getElementById("translatorRecommendsTrack");
    const MAX_RECOMMENDS = 8;

    if (recommendsTrack) {
        fetch("novels/novels.json")
            .then((response) => response.json())
            .then((novelsIndex) =>
                Promise.all(novelsIndex.slice(0, MAX_RECOMMENDS).map((entry) => getNovelData(entry.id)))
            )
            .then((novels) => {
                recommendsTrack.innerHTML = novels.map(renderRecommendCard).join("");
                bindFavoriteAndBookmarkButtons(recommendsTrack);

                const wrapper = recommendsTrack.closest(".recommends-carousel");
                if (wrapper && typeof setupCarousel === "function") setupCarousel(wrapper);
            })
            .catch((error) => console.error("Failed to load recommendations:", error));
    }

    /* ----------------------------------------------------------------
       Полные вкладки — контент подгружается один раз, при первом
       переключении на вкладку ("лениво"), а не сразу при загрузке
       страницы
       ---------------------------------------------------------------- */

    let postsFullLoaded = false;
    function loadPostsTab() {
        if (postsFullLoaded) return;
        postsFullLoaded = true;

        const list = document.getElementById("tabPostsList");
        if (!list) return;

        list.innerHTML = postsData.map(renderPostCard).join("");
        bindPostLikeButtons(list);
        bindFavoriteAndBookmarkButtons(list);
    }

    let collectionsFullLoaded = false;
    function loadCollectionsTab() {
        if (collectionsFullLoaded) return;
        collectionsFullLoaded = true;

        const grid = document.getElementById("tabCollectionsGrid");
        if (!grid) return;

        grid.innerHTML = collectionsData.map(renderCollectionCard).join("");
    }

    let allTranslationNovels = [];
    let translationsFullLoaded = false;
    function renderTranslationsTab(statusFilter) {
        const grid = document.getElementById("tabTranslationsGrid");
        if (!grid) return;

        const filtered =
            statusFilter === "all"
                ? allTranslationNovels
                : allTranslationNovels.filter((novel) => {
                      const isCompleted = novel.translationStatus === "Полностью переведено";
                      return statusFilter === "completed" ? isCompleted : !isCompleted;
                  });

        grid.innerHTML = filtered.map(renderTranslationCard).join("");
        bindFavoriteAndBookmarkButtons(grid);
    }

    function loadTranslationsTab() {
        if (translationsFullLoaded) return;
        translationsFullLoaded = true;

        fetch("novels/novels.json")
            .then((response) => response.json())
            .then((novelsIndex) => Promise.all(novelsIndex.map((entry) => getNovelData(entry.id))))
            .then((novels) => {
                allTranslationNovels = novels;
                renderTranslationsTab("all");
            })
            .catch((error) => console.error("Failed to load translations tab:", error));
    }

    document.querySelectorAll(".status-filter-btn").forEach((button) => {
        button.addEventListener("click", () => {
            document.querySelectorAll(".status-filter-btn").forEach((b) => b.classList.remove("active"));
            button.classList.add("active");
            renderTranslationsTab(button.dataset.statusFilter);
        });
    });

    let recommendationsFullLoaded = false;
    function loadRecommendationsTab() {
        if (recommendationsFullLoaded) return;
        recommendationsFullLoaded = true;

        const grid = document.getElementById("tabRecommendationsGrid");
        if (!grid) return;

        fetch("novels/novels.json")
            .then((response) => response.json())
            .then((novelsIndex) => Promise.all(novelsIndex.map((entry) => getNovelData(entry.id))))
            .then((novels) => {
                grid.innerHTML = novels.map(renderRecommendCard).join("");
                bindFavoriteAndBookmarkButtons(grid);
            })
            .catch((error) => console.error("Failed to load recommendations tab:", error));
    }

    /* ----------------------------------------------------------------
       Переключение вкладок — показывает нужную .tab-panel, подсвечивает
       кнопку и лениво подгружает контент вкладки при первом заходе на
       неё. "Анонсы" пока без своей панели (сознательно отложено) —
       клик по ней просто подсвечивает кнопку, контент не меняется.
       ---------------------------------------------------------------- */
    const tabButtons = document.querySelectorAll(".profile-tabs .tab-btn");
    const tabPanels = document.querySelectorAll("[data-tab-panel]");

    const tabLoaders = {
        posts: loadPostsTab,
        translations: loadTranslationsTab,
        collections: loadCollectionsTab,
        recommendations: loadRecommendationsTab,
    };

    function activateTab(tabName) {
        const targetPanel = document.querySelector(`[data-tab-panel="${tabName}"]`);
        if (!targetPanel) return; // "announcements" — намеренно пока без панели

        tabButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tabName));
        tabPanels.forEach((panel) => panel.classList.toggle("active", panel === targetPanel));

        if (tabLoaders[tabName]) tabLoaders[tabName]();
    }

    tabButtons.forEach((tab) => {
        tab.addEventListener("click", () => activateTab(tab.dataset.tab));
    });

    // Ссылки "Посмотреть всё" на вкладке "Обзор" переключают на
    // соответствующую полную вкладку вместо перехода по мёртвой "#"
    document.querySelectorAll("[data-goto-tab]").forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            activateTab(link.dataset.gotoTab);
        });
    });

    // Ссылка вида translator.html?tab=recommendations (например, кнопка
    // «Рекомендации переводчика» на странице новеллы) сразу открывает
    // нужную вкладку и прокручивает к ней. Значение сверяется со списком
    // реальных вкладок, а не подставляется в селектор как есть.
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (requestedTab && Array.from(tabButtons).some((btn) => btn.dataset.tab === requestedTab)) {
        activateTab(requestedTab);
        const tabsNav = document.querySelector(".profile-tabs");
        if (tabsNav) tabsNav.scrollIntoView({ block: "start" });
    }

    /* ----------------------------------------------------------------
       Интерактивная пчёлка рядом с именем — клик отправляет её в
       полёт по экрану: она облетает 2-3 случайные точки по плавным
       дугам и возвращается на своё место, оставляя за собой золотой
       пыльцевой след. Путь каждый раз новый (координаты случайные),
       позиция считается в реальных экранных координатах, поэтому
       пчела никогда не улетает за пределы видимой области.
       ---------------------------------------------------------------- */
    const bee = document.getElementById("interactive-bee");

    function spawnPollenDot() {
        const rect = bee.getBoundingClientRect();
        const dot = document.createElement("span");
        dot.className = "pollen-dot";
        dot.style.left = `${rect.left + rect.width / 2}px`;
        dot.style.top = `${rect.top + rect.height / 2}px`;
        document.body.appendChild(dot);

        dot.addEventListener("animationend", () => dot.remove());
        setTimeout(() => dot.remove(), 800);
    }

    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function quadBezier(p0, p1, p2, t) {
        const u = 1 - t;
        return {
            x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
            y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
        };
    }

    if (bee) {
        let isFlying = false;

        bee.addEventListener("click", () => {
            if (isFlying) return;
            isFlying = true;

            const startRect = bee.getBoundingClientRect();
            const home = {
                x: startRect.left + startRect.width / 2,
                y: startRect.top + startRect.height / 2,
            };

            const margin = 60;
            const stopCount = 2 + Math.floor(Math.random() * 2);
            const points = [home];
            for (let i = 0; i < stopCount; i++) {
                points.push({
                    x: margin + Math.random() * (window.innerWidth - margin * 2),
                    y: margin + Math.random() * (window.innerHeight - margin * 2),
                });
            }
            points.push(home);

            const legs = [];
            for (let i = 1; i < points.length; i++) {
                const from = points[i - 1];
                const to = points[i];
                const midX = (from.x + to.x) / 2;
                const midY = (from.y + to.y) / 2;
                const dx = to.x - from.x;
                const dy = to.y - from.y;
                const bow = (Math.random() - 0.5) * 0.7;
                legs.push({
                    from,
                    to,
                    control: { x: midX - dy * bow, y: midY + dx * bow },
                });
            }

            const legDurations = legs.map((leg) =>
                Math.max(300, Math.hypot(leg.to.x - leg.from.x, leg.to.y - leg.from.y) / 0.6)
            );

            bee.classList.add("bee-flying");
            const pollenInterval = setInterval(spawnPollenDot, 45);

            let legIndex = 0;
            let legStartTime = null;

            function step(timestamp) {
                if (legStartTime === null) legStartTime = timestamp;
                const legDuration = legDurations[legIndex];
                const rawT = Math.min(1, (timestamp - legStartTime) / legDuration);
                const t = easeInOutCubic(rawT);
                const leg = legs[legIndex];
                const pos = quadBezier(leg.from, leg.control, leg.to, t);

                const wobble = Math.sin(timestamp / 110) * 8;

                bee.style.transform = `translate(${pos.x - home.x}px, ${pos.y - home.y}px) rotate(${wobble}deg)`;

                if (rawT >= 1) {
                    legIndex += 1;
                    legStartTime = timestamp;

                    if (legIndex >= legs.length) {
                        clearInterval(pollenInterval);
                        bee.style.transform = "";
                        bee.classList.remove("bee-flying");
                        isFlying = false;
                        return;
                    }
                }

                requestAnimationFrame(step);
            }

            requestAnimationFrame(step);
        });
    }

    /* ----------------------------------------------------------------
       Подписка на переводчика + колокольчик уведомлений (как на YouTube).
       Состояние пока хранится только в браузере (localStorage) — когда
       появится бэкенд, достаточно заменить load/save на запросы.
       Колокольчик виден только после подписки; при подписке
       уведомления включаются сразу, при отписке сбрасываются.
       ---------------------------------------------------------------- */
    const subscribeBtn = document.getElementById("subscribeBtn");
    const notifyBtn = document.getElementById("notifyBtn");

    if (subscribeBtn && notifyBtn) {
        const STORAGE_KEY = "busybee:translator:busybee:subscription";
        const subscribeLabel = subscribeBtn.querySelector(".subscribe-label");

        function loadSubscription() {
            try {
                const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
                if (saved && typeof saved.subscribed === "boolean") {
                    return { subscribed: saved.subscribed, notify: saved.notify !== false };
                }
            } catch (error) { /* нет доступа к storage — работаем без сохранения */ }
            return { subscribed: false, notify: true };
        }

        function saveSubscription(state) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            } catch (error) { /* ignore */ }
        }

        const subscription = loadSubscription();

        function renderSubscription() {
            subscribeBtn.setAttribute("aria-pressed", String(subscription.subscribed));
            subscribeLabel.textContent = subscription.subscribed ? "Вы подписаны" : "Подписаться";

            notifyBtn.hidden = !subscription.subscribed;
            notifyBtn.setAttribute("aria-pressed", String(subscription.notify));
            const notifyText = subscription.notify ? "Уведомления включены" : "Уведомления выключены";
            notifyBtn.setAttribute("aria-label", notifyText);
            notifyBtn.title = notifyText;
        }

        subscribeBtn.addEventListener("click", () => {
            subscription.subscribed = !subscription.subscribed;
            subscription.notify = true;
            saveSubscription(subscription);
            renderSubscription();
        });

        notifyBtn.addEventListener("click", () => {
            subscription.notify = !subscription.notify;
            saveSubscription(subscription);
            renderSubscription();
        });

        renderSubscription();
    }

});
