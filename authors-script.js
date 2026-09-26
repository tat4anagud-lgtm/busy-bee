/* ========================================
   BUSY BEE — СТРАНИЦА «АВТОРЫ» (список)
   ========================================
   Список берётся из authors/authors.json:

     [{ "id": "qian-shan-cha-ke" }]

   Полные данные — из authors/<id>/<id>.json (см. author-script.js на
   самой странице автора — та же схема). «Переведено новелл» на
   карточке считаем по факту: фетчим каждую работу автора через
   getNovelData() и берём количество тех, что реально загрузились —
   так же, как на author.html, а не по отдельному счётчику в JSON,
   чтобы не могло разъехаться.

   pluralRu / escapeHtml / getNovelData — общие хелперы из script.js,
   здесь своих копий не заводим.
   ======================================== */

document.addEventListener("DOMContentLoaded", async () => {

    const $ = (id) => document.getElementById(id);
    const grid = $("auGrid");
    const emptyEl = $("auEmpty");
    const countEl = $("auCount");
    const chips = $("auChips");
    const searchInput = $("auSearchInput");

    function novelsLabel(n) {
        return `${n} ${pluralRu(n, "переведённая новелла", "переведённые новеллы", "переведённых новелл")}`;
    }

    function followersLabel(n) {
        return `${n.toLocaleString("ru-RU")} ${pluralRu(n, "подписчик", "подписчика", "подписчиков")}`;
    }

    /* ---------- Загрузка индекса ---------- */
    let index;
    try {
        const response = await fetch("authors/authors.json");
        if (!response.ok) throw new Error("No index");
        index = await response.json();
    } catch (error) {
        emptyEl.textContent = "Не удалось загрузить список авторов. Попробуйте обновить страницу.";
        emptyEl.hidden = false;
        return;
    }

    async function loadAuthor(entry) {
        try {
            const response = await fetch(`authors/${encodeURIComponent(entry.id)}/${encodeURIComponent(entry.id)}.json`);
            if (!response.ok) throw new Error("Not found");
            const data = await response.json();

            // Только те работы, что реально загрузились — как на
            // author.html: нет файла новеллы, значит и не считаем её
            const works = (await Promise.all(
                (data.works || []).map((id) => getNovelData(id).catch(() => null))
            )).filter(Boolean);

            return {
                id: data.id || entry.id,
                name: data.name,
                originalName: data.originalName || "",
                avatar: data.avatar,
                bio: (data.bio || []).join(" "),
                genres: (data.favoriteGenres && data.favoriteGenres.length ? data.favoriteGenres : data.mainGenres) || [],
                translatedNovels: works.length,
                followers: (data.stats && data.stats.followers) || 0,
            };
        } catch (error) {
            // нет файла автора — пропускаем карточку, а не ломаем список
            return null;
        }
    }

    const authors = (await Promise.all(index.map(loadAuthor))).filter(Boolean);


    /* ---------- Карточка ---------- */
    function cardHtml(item) {
        const tags = item.genres.slice(0, 3)
            .map((g) => `<span class="au-tag">${escapeHtml(g)}</span>`).join("");

        return `
            <a href="author.html?id=${encodeURIComponent(item.id)}" class="au-card">
                <img class="au-card-avatar" src="${escapeHtml(item.avatar)}" alt="${escapeHtml(item.name)}">
                <div class="au-card-body">
                    <h3 class="au-card-name">${escapeHtml(item.name)}</h3>
                    ${item.originalName ? `<p class="au-card-original">${escapeHtml(item.originalName)}</p>` : ""}
                    ${item.bio ? `<p class="au-card-bio">${escapeHtml(item.bio)}</p>` : ""}
                    ${tags ? `<div class="au-card-tags">${tags}</div>` : ""}
                    <div class="au-card-foot">
                        <span>${novelsLabel(item.translatedNovels)}</span>
                        <span>${followersLabel(item.followers)}</span>
                    </div>
                </div>
            </a>`;
    }

    const EMPTY_TEXT = {
        search: "Никого не нашлось. Проверьте написание имени или попробуйте другой запрос.",
        default: "Авторов пока нет. Загляните позже — мы скоро добавим переводчиков."
    };

    /* ---------- Рендер: поиск по имени + сортировка ---------- */
    function render() {
        const activeChip = chips.querySelector(".au-chip.active");
        const sort = activeChip ? activeChip.dataset.sort : "default";
        const query = searchInput.value.trim().toLowerCase();

        let list = authors.slice();

        if (query) {
            list = list.filter((a) =>
                a.name.toLowerCase().includes(query) ||
                a.originalName.toLowerCase().includes(query)
            );
        }

        if (sort === "popular") {
            list.sort((a, b) => b.followers - a.followers);
        } else if (sort === "alphabet") {
            list.sort((a, b) => a.name.localeCompare(b.name, "ru"));
        }

        grid.innerHTML = list.map(cardHtml).join("");
        emptyEl.textContent = query ? EMPTY_TEXT.search : EMPTY_TEXT.default;
        emptyEl.hidden = list.length > 0;
        countEl.textContent = list.length
            ? `${list.length} ${pluralRu(list.length, "автор", "автора", "авторов")}`
            : "";
    }

    chips.addEventListener("click", (event) => {
        const chip = event.target.closest(".au-chip");
        if (!chip) return;

        chips.querySelectorAll(".au-chip").forEach((c) => {
            const active = c === chip;
            c.classList.toggle("active", active);
            c.setAttribute("aria-pressed", active);
        });
        render();
    });

    let searchTimer = null;
    searchInput.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(render, 150);
    });

    render();
});
