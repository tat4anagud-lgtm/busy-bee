/* ========================================
   BUSY BEE — ГЛАВНАЯ СТРАНИЦА (JS)
   ========================================
   Шапка/футер, дропдауны, карусели, корзина закладок и другие общие
   вещи по-прежнему в script.js — подключайте его первым. Здесь —
   только то, что специфично для index.html: переключение hero
   («Продолжить чтение» / «Добро пожаловать»), блок «Избранные
   авторы» (Follow/Following) и два виджета, которые тянут данные из
   novels.json — «Busy Bee рекомендует» и «Последние обновления».

   getNovelData, novelDataCache, bindNovelBookmarks — общие хелперы
   из script.js, здесь не переопределяются. */

document.addEventListener("DOMContentLoaded", () => {

    /* ========================================
       Hero — "Continue Reading" vs "Welcome" search
       ========================================
       Shows .hero-continue (last chapter the reader had open, picked
       from busybee_reading_progress) if there's any reading history in
       this browser, otherwise falls back to .hero-welcome. */

    const heroContinue = document.querySelector(".hero-continue");
    const heroWelcome = document.querySelector(".hero-welcome");

    if (heroContinue && heroWelcome) {
        // Most recently updated novel across everything in localStorage —
        // that's "the thing I was last reading", regardless of which novel
        let mostRecentNovelId = null;
        let mostRecentChapterNumber = null;
        try {
            const allProgress = JSON.parse(localStorage.getItem("busybee_reading_progress")) || {};
            Object.entries(allProgress).forEach(([novelId, entry]) => {
                if (!mostRecentNovelId || entry.updatedAt > allProgress[mostRecentNovelId].updatedAt) {
                    mostRecentNovelId = novelId;
                    mostRecentChapterNumber = entry.chapter;
                }
            });
        } catch (error) {
            // No valid progress saved — falls through to the welcome hero below
        }

        if (mostRecentNovelId) {
            getNovelData(mostRecentNovelId)
                .then((novel) => {
                    const coverImg = document.getElementById("heroCoverImg");
                    if (coverImg) {
                        coverImg.src = novel.cover;
                        coverImg.alt = novel.title;
                    }

                    const titleLink = document.getElementById("heroTitleLink");
                    if (titleLink) {
                        titleLink.textContent = novel.title;
                        titleLink.href = `novel.html?id=${mostRecentNovelId}`;
                    }

                    if (novel.author) {
                        const authorName = document.getElementById("heroAuthorName");
                        const authorLink = document.getElementById("heroAuthorLink");
                        if (authorName) authorName.textContent = novel.author.name;
                        if (authorLink) authorLink.href = novel.author.href || "#";
                    }

                    const translatorLink = document.getElementById("heroTranslatorLink");
                    if (translatorLink && novel.translator) {
                        translatorLink.textContent = novel.translator.name;
                        translatorLink.href = novel.translator.href || "#";
                    }

                    const descriptionEl = document.getElementById("heroDescription");
                    if (descriptionEl) descriptionEl.textContent = (novel.synopsis || []).join(" ");

                    const progressLabel = document.getElementById("heroProgressLabel");
                    const progressPercent = document.getElementById("heroProgressPercent");
                    const progressBar = document.getElementById("heroProgressBar");
                    if (novel.totalChapters) {
                        const percent = Math.min(100, Math.round((mostRecentChapterNumber / novel.totalChapters) * 100));
                        if (progressLabel) progressLabel.textContent = `Глава ${mostRecentChapterNumber} из ${novel.totalChapters}`;
                        if (progressPercent) progressPercent.textContent = `${percent}%`;
                        if (progressBar) progressBar.style.width = `${percent}%`;
                    }

                    const continueBtn = document.getElementById("heroContinueBtn");
                    if (continueBtn) continueBtn.href = `chapter.html?novel=${mostRecentNovelId}&chapter=${mostRecentChapterNumber}`;

                    // Закладка на карточке «Продолжить чтение» — та же новелла
                    const heroBookmark = heroContinue.querySelector(".hero-bookmark-button");
                    if (heroBookmark) {
                        heroBookmark.dataset.novelId = mostRecentNovelId;
                        bindNovelBookmarks(heroContinue);
                    }

                    heroContinue.style.display = "flex";
                    heroWelcome.style.display = "none";
                })
                .catch(() => {
                    // Saved novel no longer exists (renamed/removed) — fall
                    // back to the welcome hero rather than showing a broken card
                    heroContinue.style.display = "none";
                    heroWelcome.style.display = "flex";
                });
        } else {
            heroContinue.style.display = "none";
            heroWelcome.style.display = "flex";
        }
    }


    /* ---------- Featured Authors: Follow / Following toggle ---------- */

    document.querySelectorAll(".follow-button").forEach((button) => {
        const icon = button.querySelector("img");

        button.addEventListener("click", () => {
            const isFollowing = button.classList.toggle("following");

            if (icon) {
                icon.src = isFollowing ? "images/icons/following.svg" : "images/icons/follow.svg";
                icon.alt = isFollowing ? "Following" : "Follow";
            }
        });
    });


    /* ====================================================================
       "Busy Bee рекомендует" carousel, populated from novels.json (the
       shared index) instead of hardcoded cards. As more novels get added
       there, they'll show up here automatically.
       ==================================================================== */

    const recommendationsTrack = document.getElementById("recommendationsTrack");

    if (recommendationsTrack) {
        fetch("novels/novels.json")
            .then((response) => response.json())
            .then((novelsIndex) => Promise.all(novelsIndex.map((entry) => getNovelData(entry.id))))
            .then((novels) => {
                recommendationsTrack.innerHTML = novels
                    .map((novel) => `
                        <article class="book-card">
                            <img src="${novel.cover}" alt="${novel.title}">
                            <div class="book-card-info">
                                <h3><a href="novel.html?id=${novel.id}" class="hero-title-link">${novel.title}</a></h3>
                                <p><a href="${novel.author?.href || "#"}" class="hero-text-link">${novel.author?.name || ""}</a></p>
                                <div class="book-meta">
                                    <span class="rating">★ ${novel.rating ? novel.rating.score.toFixed(1) : "—"}</span>
                                    <button type="button" class="mini-bookmark" data-novel-id="${novel.id}" aria-label="Сохранить в закладки" aria-pressed="false">
                                        <img src="images/icons/bookmark.svg" alt="" data-outline="images/icons/bookmark.svg" data-filled="images/icons/bookmark-filled-gold.svg">
                                    </button>
                                </div>
                            </div>
                        </article>`)
                    .join("");

                // Закладка на карточке = «Буду читать» (см. bindNovelBookmarks);
                // привязываем здесь, потому что этих кнопок ещё не было, когда
                // общая привязка .mini-bookmark в script.js отработала при загрузке
                bindNovelBookmarks(recommendationsTrack);
            })
            .catch((error) => console.error("Failed to load recommendations:", error));
    }


    /* ====================================================================
       "Последние обновления", also built from novels.json: takes each
       novel's most recent chapter, sorts everything by date, and shows
       at most 4 — capped so this block can't stretch past its 4-item
       design as more novels/chapters get added.
       ==================================================================== */

    const latestReleasesList = document.getElementById("latestReleasesList");
    const MAX_LATEST_RELEASES = 4;

    if (latestReleasesList) {
        // "2 дня назад" / "Вчера" / "Сегодня" — falls back to a plain date
        // once it's more than a week old, since "13 дней назад" reads worse
        // than just the date at that point
        function formatRelativeRu(isoDate) {
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
                // One entry per novel — its own latest chapter
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
                    .slice(0, MAX_LATEST_RELEASES);

                latestReleasesList.innerHTML = latestPerNovel
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
                                    <span>${formatRelativeRu(chapter.date)}</span>
                                    ${isNew ? "<b>Новое</b>" : ""}
                                </div>
                            </article>`;
                    })
                    .join("");
            })
            .catch((error) => console.error("Failed to load latest releases:", error));
    }

});
