/* ========================================
   BUSY BEE — AUTHOR PAGE INTERACTION
   ========================================
   Данные — из authors/<id>/<id>.json (id берётся из ?id=, как на
   novel.html из novels/<id>/<id>.json). Работы автора хранятся прямо
   в его файле, отдельно каждую новеллу не фетчим — так же, как
   novel.json не фетчит отдельного автора, а хранит name/href сразу
   в себе (см. novel.author в script.js).
   ======================================== */

document.addEventListener("DOMContentLoaded", () => {

    /* ---------- Вкладки страницы автора ---------- */
    const tabs = document.querySelectorAll(".author-tabs .tab-btn");
    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            tabs.forEach((t) => t.classList.remove("active"));
            tab.classList.add("active");
        });
    });

    /* ---------- Общие форматтеры (та же логика, что в script.js на
       novel.html/catalog.html, но своя копия — там она объявлена
       внутри if-блока и снаружи недоступна) ---------- */

    // pluralizeRu(5, "глава", "главы", "глав") -> "глав"
    function pluralizeRu(n, one, few, many) {
        const mod10 = n % 10;
        const mod100 = n % 100;
        if (mod10 === 1 && mod100 !== 11) return one;
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
        return many;
    }

    // 128000 -> "128K", 900 -> "900"
    function formatCompactRu(n) {
        if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1).replace(".", ",")}K`;
        return String(n);
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, (ch) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
        }[ch]));
    }

    /* ---------- Плашка статуса перевода — тот же набор вариантов
       (класс/иконка/текст), что script.js использует на карточках
       каталога (см. badgeClass/badgeIcon/badgeText там) ---------- */
    function statusBadge(translationStatus) {
        if (translationStatus === "Полностью переведено") {
            return { cls: "badge-completed", icon: "images/icons/check-circle.svg", text: "Завершено" };
        }
        if (translationStatus === "Приостановлено") {
            return { cls: "badge-hiatus", icon: "images/icons/pause-circle.svg", text: "На паузе" };
        }
        return { cls: "badge-ongoing", icon: "images/icons/clock.svg", text: "Выходит" };
    }

    function workCardHtml(work) {
        const badge = statusBadge(work.translationStatus);
        const isDone = work.translationStatus === "Полностью переведено";
        const footer = isDone
            ? `<span>Глава ${work.currentChapter} из ${work.totalChapters}</span><span class="check-icon">✓</span>`
            : `<span>Глава ${work.currentChapter}</span><a href="novel.html?id=${encodeURIComponent(work.id)}" class="btn-continue">Продолжить</a>`;

        return `
            <article class="work-card">
                <div class="work-cover-box">
                    <span class="badge ${badge.cls}"><img src="${badge.icon}" alt="">${badge.text}</span>
                    <button type="button" class="btn-dots" aria-label="Ещё">···</button>
                    <a href="novel.html?id=${encodeURIComponent(work.id)}"><img src="${escapeHtml(work.cover)}" alt="${escapeHtml(work.title)}"></a>
                </div>
                <h3><a href="novel.html?id=${encodeURIComponent(work.id)}">${escapeHtml(work.title)}</a></h3>
                <p class="orig-title">${escapeHtml(work.originalTitle || "")}</p>
                <p class="translator-info">Переводчик: <span>${escapeHtml(work.translator || "Busy Bee")}</span></p>
                <div class="work-tags">${(work.genres || []).map((g) => `<span>${escapeHtml(g)}</span>`).join("")}</div>
                <div class="work-footer">${footer}</div>
            </article>`;
    }

    /* ---------- Загрузка страницы автора ---------- */
    async function loadAuthorPage() {
        const params = new URLSearchParams(window.location.search);
        const authorId = params.get("id") || "mo-xiang-tong-xiu";

        let author;
        try {
            const response = await fetch(`authors/${authorId}/${authorId}.json`);
            if (!response.ok) throw new Error("Not found");
            author = await response.json();
        } catch (error) {
            const nameEl = document.getElementById("authorName");
            if (nameEl) nameEl.textContent = "Автор не найден";
            return;
        }

        /* ---- Заголовок вкладки и хлебные крошки ---- */
        const pageTitleEl = document.getElementById("pageTitle");
        if (pageTitleEl) pageTitleEl.textContent = `${author.name} — Busy Bee`;
        const breadcrumbEl = document.getElementById("breadcrumbAuthorName");
        if (breadcrumbEl) breadcrumbEl.textContent = author.name;

        /* ---- Шапка карточки автора ---- */
        const avatarImg = document.getElementById("authorAvatarImg");
        if (avatarImg) {
            avatarImg.src = author.avatar;
            avatarImg.alt = author.name;
        }

        const nameEl = document.getElementById("authorName");
        if (nameEl) nameEl.textContent = author.name;

        const originalNameEl = document.getElementById("authorOriginalName");
        if (originalNameEl) originalNameEl.textContent = author.originalName || "";

        // Первое имя в списке — как «главный» highlight-tag (обычно
        // это сокращение вроде MXTX), остальные — просто через точку
        const akaLineEl = document.getElementById("authorAkaLine");
        if (akaLineEl && (author.akaNames || []).length) {
            const [first, ...rest] = author.akaNames;
            const restHtml = rest.map((n) => escapeHtml(n)).join(" • ");
            akaLineEl.innerHTML = `<span>Другие имена: <strong class="highlight-tag">${escapeHtml(first)}</strong>${restHtml ? ` • ${restHtml}` : ""}</span>`;
        }

        const originLineEl = document.getElementById("authorOriginLine");
        if (originLineEl) {
            const years = author.activeSince ? `Пишет с ${author.activeSince} года` : "";
            originLineEl.innerHTML = `<span>${escapeHtml(author.country || "")}</span>${years ? ` • <span>${years}</span>` : ""}`;
        }

        const bioEl = document.getElementById("authorBio");
        if (bioEl) bioEl.textContent = (author.bio || []).join(" ");

        const writingStyleEl = document.getElementById("authorWritingStyle");
        if (writingStyleEl) writingStyleEl.textContent = (author.writingStyle || []).join(" • ");

        const mainGenresEl = document.getElementById("authorMainGenres");
        if (mainGenresEl) mainGenresEl.textContent = (author.mainGenres || []).join(" • ");

        /* ---- Карточки статистики ---- */
        const works = author.works || [];

        const statNovelsEl = document.getElementById("statTranslatedNovels");
        if (statNovelsEl) statNovelsEl.textContent = works.length;

        const statChaptersEl = document.getElementById("statTotalChapters");
        if (statChaptersEl && author.stats) {
            statChaptersEl.textContent = (author.stats.totalChapters || 0).toLocaleString("ru-RU");
        }

        if (author.stats && author.stats.rating) {
            const scoreEl = document.getElementById("statRatingScore");
            const starsEl = document.getElementById("statRatingStars");
            const votesEl = document.getElementById("statRatingVotes");
            if (scoreEl) scoreEl.textContent = author.stats.rating.score.toFixed(1);
            if (starsEl) {
                const fullStars = Math.round(author.stats.rating.score);
                starsEl.textContent = "★".repeat(fullStars) + "☆".repeat(Math.max(0, 5 - fullStars));
            }
            if (votesEl) {
                const votesLabel = pluralizeRu(author.stats.rating.votes, "голос", "голоса", "голосов");
                votesEl.textContent = `(${formatCompactRu(author.stats.rating.votes)} ${votesLabel})`;
            }
        }

        const statFollowersEl = document.getElementById("statFollowers");
        if (statFollowersEl && author.stats) {
            statFollowersEl.textContent = formatCompactRu(author.stats.followers || 0);
        }

        const favoriteGenresEl = document.getElementById("statFavoriteGenres");
        if (favoriteGenresEl) favoriteGenresEl.textContent = (author.favoriteGenres || []).join(", ");

        /* ---- Работы автора ---- */
        const worksGridEl = document.getElementById("worksGrid");
        if (worksGridEl) worksGridEl.innerHTML = works.map(workCardHtml).join("");

        /* ---- «Почему читатели любят этого автора» ---- */
        const reasonsListEl = document.getElementById("reasonsList");
        if (reasonsListEl) {
            reasonsListEl.innerHTML = (author.reasons || [])
                .map((reason) => `
                    <li>
                        <div>
                            <strong>${escapeHtml(reason.title)}</strong>
                            <p>${escapeHtml(reason.text)}</p>
                        </div>
                    </li>`)
                .join("");
        }

        const readingOrderLinkEl = document.getElementById("recommendedReadingOrderLink");
        if (readingOrderLinkEl && author.recommendedReadingOrderHref) {
            readingOrderLinkEl.href = author.recommendedReadingOrderHref;
        }

        /* ---- Заметки переводчика ---- */
        if (author.translatorNote) {
            const noteTextEl = document.getElementById("translatorNoteText");
            if (noteTextEl) {
                noteTextEl.innerHTML = (author.translatorNote.lines || [])
                    .map((line) => escapeHtml(line))
                    .join("<br>");
            }
            const signatureEl = document.getElementById("translatorNoteSignature");
            if (signatureEl) signatureEl.textContent = `— ${author.translatorNote.signature || "Busy Bee"} 🐝`;
        }

        /* ---- Любимые цитаты — те же классы/поведение (лайк меняет
           heart.svg на heart-filled.svg), что на novel.html ---- */
        const quotesListEl = document.getElementById("quotesList");
        if (quotesListEl) {
            quotesListEl.innerHTML = (author.quotes || [])
                .map((quote) => `
                    <div class="quote-card">
                        <p class="quote-text">«${escapeHtml(quote.text)}»</p>
                        <div class="quote-footer">
                            <span>— <a href="novel.html?id=${encodeURIComponent(quote.novelId)}">${escapeHtml(quote.novelTitle)}</a>, гл. ${quote.chapter}</span>
                            <button type="button" class="like-btn"><img src="images/icons/heart.svg" alt="" data-outline="images/icons/heart.svg" data-filled="images/icons/heart-filled.svg"> ${formatCompactRu(quote.likes)}</button>
                        </div>
                    </div>`)
                .join("");

            // Кнопки лайка только что созданы — вешаем обработчик здесь
            quotesListEl.querySelectorAll(".like-btn").forEach((likeBtn) => {
                const icon = likeBtn.querySelector("img");
                likeBtn.addEventListener("click", () => {
                    const isLiked = likeBtn.classList.toggle("liked");
                    if (icon) icon.src = isLiked ? icon.dataset.filled : icon.dataset.outline;
                });
            });
        }

        /* ---- Читателям этого автора также нравятся ---- */
        const relatedGridEl = document.getElementById("relatedAuthorsGrid");
        if (relatedGridEl) {
            const cardsHtml = (author.relatedAuthors || [])
                .map((related) => `
                    <a href="author.html?id=${encodeURIComponent(related.id)}" class="author-mini-card">
                        <img src="${escapeHtml(related.avatar)}" alt="${escapeHtml(related.name)}">
                        <strong>${escapeHtml(related.name)}</strong>
                        <div class="mini-tags">${(related.genres || []).map((g) => `<span>${escapeHtml(g)}</span>`).join("")}</div>
                    </a>`)
                .join("");
            // "Больше авторов" — статичная карточка в конце разметки,
            // остальные вставляем перед ней
            relatedGridEl.insertAdjacentHTML("afterbegin", cardsHtml);
        }
    }

    loadAuthorPage();

});
