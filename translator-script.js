/* ========================================
   BUSY BEE — TRANSLATOR PAGE INTERACTION
   ======================================== */

// Note: the heart (.favorite-btn) and bookmark (.mini-bookmark) icons already
// on the page when it loads are wired up globally by script.js — no extra
// code needed here for those. The exceptions are: the like-count button in
// each post's footer (icon + number), handled below the same way script.js
// handles quote likes; and the favorite/bookmark buttons inside the
// "Последние переводы" and "Busy Bee рекомендует" cards, which are injected
// after page load (see sections 3 and 4 below) and so need their own click
// handlers, added right after they're created.

document.addEventListener("DOMContentLoaded", () => {

    /* 0. Featured Project — новелла с самой свежей опубликованной
       главой среди всех переводов Busy Bee. Тот же принцип, что и в
       "Последних обновлениях" на главной: для каждой новеллы берём её
       последнюю по дате главу, а затем среди всех новелл — ту, чья
       глава самая свежая. */
    const featuredCard = document.querySelector(".featured-project-card");

    if (featuredCard) {

        // "сегодня" / "вчера" / "3 дня назад" — та же логика, что и в
        // script.js для "Последних обновлений", только в нижнем
        // регистре, чтобы вписываться в фразу "опубликовано …"
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

        fetch("novels/novels.json")
            .then((response) => response.json())
            .then((novelsIndex) => Promise.all(novelsIndex.map((entry) => getNovelData(entry.id))))
            .then((novels) => {
                // Один элемент на новеллу — её собственная последняя глава,
                // затем сортировка по дате этой главы среди всех новелл
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
                    authorsEl.innerHTML = `автор — <strong>${novel.author?.name || ""}</strong> <span>|</span> перевод — <strong>Busy Bee</strong>`;
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

    /* 1. Переключение вкладок профиля */
    const tabs = document.querySelectorAll(".profile-tabs .tab-btn");

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            tabs.forEach((t) => t.classList.remove("active"));
            tab.classList.add("active");
        });
    });

    /* 2. Лайки под постами (иконка + счётчик) — тот же outline/filled
       свап, что и у .quote-footer .like-btn в script.js, только для
       постов на этой странице */
    const postLikeButtons = document.querySelectorAll(".post-footer .like-btn");

    postLikeButtons.forEach((likeBtn) => {
        const icon = likeBtn.querySelector("img");

        likeBtn.addEventListener("click", () => {
            const isLiked = likeBtn.classList.toggle("liked");
            icon.src = isLiked ? icon.dataset.filled : icon.dataset.outline;
        });
    });

    /* 3. "Последние переводы" — та же логика, что у карусели "Busy Bee
       рекомендует" на главной странице: список id читается из
       novels/novels.json, полные данные каждой новеллы подгружаются
       через getNovelData() (общая функция и общий кэш из script.js).
       Ограничение — 8 новелл, чтобы карусель не разрасталась вместе
       с каталогом. */
    const translationsTrack = document.getElementById("translatorTranslationsTrack");
    const MAX_TRANSLATIONS = 8;

    if (translationsTrack) {

        // Тот же алгоритм русских окончаний, что и в script.js
        // (там он объявлен внутри блока novel.html и здесь недоступен)
        function pluralizeRu(n, one, few, many) {
            const mod10 = n % 10;
            const mod100 = n % 100;
            if (mod10 === 1 && mod100 !== 11) return one;
            if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
            return many;
        }

        // Номер самой свежей опубликованной главы — по дате, как в
        // блоке "Последние обновления" на главной
        function latestChapterNumber(novel) {
            if (!novel.chapters || novel.chapters.length === 0) return null;
            return [...novel.chapters].sort((a, b) => new Date(b.date) - new Date(a.date))[0].number;
        }

        fetch("novels/novels.json")
            .then((response) => response.json())
            .then((novelsIndex) =>
                Promise.all(novelsIndex.slice(0, MAX_TRANSLATIONS).map((entry) => getNovelData(entry.id)))
            )
            .then((novels) => {
                translationsTrack.innerHTML = novels
                    .map((novel) => {
                        const isCompleted = novel.translationStatus === "Полностью переведено";
                        const badge = isCompleted
                            ? `<span class="badge-completed">Завершено</span>`
                            : `<span class="badge-ongoing">Выходит</span>`;

                        const chInfo = isCompleted
                            ? `${novel.totalChapters} ${pluralizeRu(novel.totalChapters, "глава", "главы", "глав")}`
                            : `Глава ${latestChapterNumber(novel) ?? "?"} из ${novel.totalChapters ?? "?"}`;

                        const novelHref = `novel.html?id=${novel.id}`;

                        return `
                            <div class="translation-card">
                                <div class="cover-box">
                                    ${badge}
                                    <a href="${novelHref}"><img src="${novel.cover}" alt="${novel.title}"></a>
                                </div>
                                <h4><a href="${novelHref}" class="hero-title-link">${novel.title}</a></h4>
                                <p class="author">${novel.author?.name || ""}</p>
                                <p class="ch-info">${chInfo}</p>
                                <div class="card-footer">
                                    <button type="button" class="favorite-btn" aria-label="Like" aria-pressed="false"><img src="images/icons/heart.svg" alt="" data-outline="images/icons/heart.svg" data-filled="images/icons/heart-filled.svg"></button>
                                    <button type="button" class="mini-bookmark" aria-label="Save to bookmarks" aria-pressed="false"><img src="images/icons/bookmark.svg" alt="" data-outline="images/icons/bookmark.svg" data-filled="images/icons/bookmark-filled-gold.svg"></button>
                                </div>
                            </div>`;
                    })
                    .join("");

                // script.js уже разобрало все .favorite-btn / .mini-bookmark,
                // существовавшие на странице при загрузке — карточки,
                // добавленные сейчас, нужно подключить отдельно, тем же
                // способом (outline/filled свап иконки)
                translationsTrack.querySelectorAll(".favorite-btn").forEach((button) => {
                    const icon = button.querySelector("img");
                    button.addEventListener("click", () => {
                        const isSaved = button.classList.toggle("active");
                        button.setAttribute("aria-pressed", isSaved);
                        icon.src = isSaved ? icon.dataset.filled : icon.dataset.outline;
                    });
                });

                translationsTrack.querySelectorAll(".mini-bookmark").forEach((button) => {
                    const icon = button.querySelector("img");
                    button.addEventListener("click", (event) => {
                        event.stopPropagation();
                        const isSaved = button.classList.toggle("active");
                        button.setAttribute("aria-pressed", isSaved);
                        icon.src = isSaved ? icon.dataset.filled : icon.dataset.outline;
                    });
                });

                // Карусель (script.js) настраивала стрелки ещё когда трек был
                // пустым, поэтому у неё не было первой карточки, по которой
                // считается шаг прокрутки — переинициализируем её теперь,
                // когда карточки уже на месте
                const wrapper = translationsTrack.closest(".book-carousel");
                if (wrapper && typeof setupCarousel === "function") setupCarousel(wrapper);
            })
            .catch((error) => console.error("Failed to load latest translations:", error));
    }

    /* 4. "Busy Bee рекомендует" — та же логика и тот же список из
       novels/novels.json, тоже ограничение в 8 новелл. Цитата под
       обложкой — это novel.busyBeeNotes (личная заметка переводчика,
       которая на странице новеллы выводится в блоке "Busy Bee Notes");
       если её нет, карточка обходится без цитаты. */
    const recommendsTrack = document.getElementById("translatorRecommendsTrack");
    const MAX_RECOMMENDS = 8;

    if (recommendsTrack) {
        fetch("novels/novels.json")
            .then((response) => response.json())
            .then((novelsIndex) =>
                Promise.all(novelsIndex.slice(0, MAX_RECOMMENDS).map((entry) => getNovelData(entry.id)))
            )
            .then((novels) => {
                recommendsTrack.innerHTML = novels
                    .map((novel) => {
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
                    })
                    .join("");

                recommendsTrack.querySelectorAll(".favorite-btn").forEach((button) => {
                    const icon = button.querySelector("img");
                    button.addEventListener("click", () => {
                        const isSaved = button.classList.toggle("active");
                        button.setAttribute("aria-pressed", isSaved);
                        icon.src = isSaved ? icon.dataset.filled : icon.dataset.outline;
                    });
                });

                const wrapper = recommendsTrack.closest(".recommends-carousel");
                if (wrapper && typeof setupCarousel === "function") setupCarousel(wrapper);
            })
            .catch((error) => console.error("Failed to load recommendations:", error));
    }

    /* 5. Интерактивная пчёлка рядом с именем — клик запускает
       "мёртвую петлю" (класс .do-loop, см. translator-style.css),
       через секунду (длительность CSS-анимации) класс снимается,
       чтобы пчёлка вернулась к обычному парению и петлю можно было
       запустить снова */
    const bee = document.getElementById("interactive-bee");

    if (bee) {
        bee.addEventListener("click", () => {
            if (bee.classList.contains("do-loop")) return;

            bee.classList.add("do-loop");

            setTimeout(() => {
                bee.classList.remove("do-loop");
            }, 1000);
        });
    }

});