/* ========================================
   BUSY BEE — СТРАНИЦА «КОЛЛЕКЦИИ»
   ========================================
   Список берётся из collections/collections.json:

     [{ "id": "rebirth", "featured": true, "addedAt": "2026-09-01" }]

   • id        — папка collections/<id>/<id>.json (её же читает
                 collection.html);
   • featured  — «Коллекция недели» (одна; если не отмечена ни одна,
                 берётся первая);
   • addedAt   — для фильтра «Новые».

   Название, описание, баннер и подписчики — из JSON самой коллекции,
   количество новелл и жанры считаются по novels/<id>/<id>.json.
   В списке показываются только коллекции, добавленные в индекс, —
   заготовки без файла сюда не попадают.

   «Мои подписки» — те же данные, что ставит кнопка на странице
   коллекции (localStorage, busybee_followed_collections). */

document.addEventListener("DOMContentLoaded", async () => {

    const FOLLOWED_KEY = "busybee_followed_collections";

    const $ = (id) => document.getElementById(id);
    const featuredEl = $("clFeatured");
    const grid = $("clGrid");
    const emptyEl = $("clEmpty");
    const countEl = $("clCount");
    const chips = $("clChips");

    function readFollowed() {
        try {
            return JSON.parse(localStorage.getItem(FOLLOWED_KEY)) || {};
        } catch (error) {
            return {};
        }
    }

    function novelsLabel(n) {
        return `${n} ${pluralRu(n, "новелла", "новеллы", "новелл")}`;
    }

    function followersLabel(n) {
        return `${n.toLocaleString("ru-RU")} ${pluralRu(n, "подписчик", "подписчика", "подписчиков")}`;
    }


    /* ---------- Загрузка ---------- */
    let index;
    try {
        const response = await fetch("collections/collections.json");
        if (!response.ok) throw new Error("No index");
        index = await response.json();
    } catch (error) {
        emptyEl.textContent = "Не удалось загрузить коллекции. Попробуйте обновить страницу.";
        emptyEl.hidden = false;
        return;
    }

    async function loadCollection(entry) {
        try {
            const response = await fetch(`collections/${encodeURIComponent(entry.id)}/${encodeURIComponent(entry.id)}.json`);
            if (!response.ok) throw new Error("Not found");
            const data = await response.json();

            const novels = (await Promise.all(
                (data.novels || []).map((n) => getNovelData(n.id).catch(() => null))
            )).filter(Boolean);

            // жанры по частоте, до трёх
            const counts = new Map();
            novels.forEach((novel) => (novel.genres || []).forEach((g) => counts.set(g, (counts.get(g) || 0) + 1)));
            const genres = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => g);

            return {
                id: data.id || entry.id,
                title: data.title,
                description: data.description || "",
                banner: data.banner || "",
                followers: data.followers || 0,
                novelsCount: novels.length,
                genres,
                addedAt: entry.addedAt || "",
                featured: Boolean(entry.featured)
            };
        } catch (error) {
            // нет файла коллекции — пропускаем, а не ломаем список
            return null;
        }
    }

    const collections = (await Promise.all(index.map(loadCollection))).filter(Boolean);


    /* ---------- Коллекция недели ---------- */
    function renderFeatured() {
        const item = collections.find((c) => c.featured) || collections[0];
        if (!item) return;

        const href = `collection.html?id=${encodeURIComponent(item.id)}`;
        const meta = [novelsLabel(item.novelsCount), ...item.genres].join("  •  ");

        featuredEl.innerHTML = `
            <a href="${href}" class="cl-featured-media" tabindex="-1" aria-hidden="true">
                <img src="${escapeHtml(item.banner)}" alt="">
            </a>
            <div class="cl-featured-body">
                <span class="cl-featured-badge"><img src="images/icons/bee-icon.svg" alt="">Коллекция недели</span>
                <h2 class="cl-featured-title"><a href="${href}">${escapeHtml(item.title)}</a></h2>
                <p class="cl-featured-text">${escapeHtml(item.description)}</p>
                <p class="cl-featured-meta">${escapeHtml(meta)}</p>
                <a href="${href}" class="cl-btn">Открыть коллекцию</a>
            </div>`;
        featuredEl.hidden = false;
    }


    /* ---------- Сетка ---------- */
    function cardHtml(item, followed) {
        const isFollowed = Boolean(followed[item.id]);
        const followers = item.followers + (isFollowed ? 1 : 0);
        const tags = item.genres.slice(0, 2)
            .map((g) => `<span class="cl-tag">${escapeHtml(g)}</span>`).join("");

        return `
            <a href="collection.html?id=${encodeURIComponent(item.id)}" class="cl-card">
                <div class="cl-card-media">
                    <img src="${escapeHtml(item.banner)}" alt="">
                    ${isFollowed ? `<span class="cl-card-followed"><img src="images/icons/heart-filled.svg" alt="">Вы подписаны</span>` : ""}
                </div>
                <div class="cl-card-body">
                    <h3 class="cl-card-title">${escapeHtml(item.title)}</h3>
                    ${item.description ? `<p class="cl-card-desc">${escapeHtml(item.description)}</p>` : ""}
                    ${tags ? `<div class="cl-card-tags">${tags}</div>` : ""}
                    <div class="cl-card-foot">
                        <span>${novelsLabel(item.novelsCount)}</span>
                        <span>${followersLabel(followers)}</span>
                    </div>
                </div>
            </a>`;
    }

    const EMPTY_TEXT = {
        followed: "Вы пока ни на что не подписаны. Откройте коллекцию и нажмите «Подписаться на коллекцию» — она появится здесь.",
        default: "Коллекций пока нет. Загляните позже — мы скоро добавим подборки."
    };

    function render(filter) {
        const followed = readFollowed();
        let list = collections.slice();

        if (filter === "popular") {
            list.sort((a, b) =>
                (b.followers + (followed[b.id] ? 1 : 0)) - (a.followers + (followed[a.id] ? 1 : 0)));
        } else if (filter === "new") {
            list.sort((a, b) => String(b.addedAt).localeCompare(String(a.addedAt)));
        } else if (filter === "followed") {
            list = list.filter((c) => followed[c.id]);
        }

        grid.innerHTML = list.map((c) => cardHtml(c, followed)).join("");
        emptyEl.textContent = EMPTY_TEXT[filter] || EMPTY_TEXT.default;
        emptyEl.hidden = list.length > 0;
        countEl.textContent = list.length
            ? `${list.length} ${pluralRu(list.length, "коллекция", "коллекции", "коллекций")}`
            : "";
    }

    chips.addEventListener("click", (event) => {
        const chip = event.target.closest(".cl-chip");
        if (!chip) return;

        chips.querySelectorAll(".cl-chip").forEach((c) => {
            const active = c === chip;
            c.classList.toggle("active", active);
            c.setAttribute("aria-pressed", active);
        });
        render(chip.dataset.filter);
    });

    // Вернулись назад после подписки на странице коллекции —
    // подписки должны обновиться, а не остаться из кэша страницы
    window.addEventListener("pageshow", (event) => {
        if (!event.persisted) return;
        const active = chips.querySelector(".cl-chip.active");
        render(active ? active.dataset.filter : "all");
    });

    renderFeatured();
    render("all");
});
