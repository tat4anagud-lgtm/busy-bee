/* ========================================
   BUSY BEE — СЕЗОННЫЕ ЭФФЕКТЫ
   ========================================
   Опадающие листья осенью, снегопад зимой, лепестки сакуры весной,
   одуванчики с пчёлкой летом (и «заготовка» под остальные сезоны —
   например, китайский Новый год: см. SEASONS ниже).

   Подключение: отдельно на каждой странице подключать не нужно — его
   сам подгружает общий script.js (блок «Сезонные эффекты» в начале
   файла), так что работает на всех страницах сразу. Повторное
   подключение вручную (как на главной раньше) тоже безвредно — второй
   экземпляр сам отключится.

   Что где показывается:
   - шапочка на логотипе — на ВСЕХ страницах, где есть логотип
     (шапка, футер, меню на телефоне);
   - снег/листья и кнопка в углу — только на страницах из
     EFFECT_PAGES (сейчас главная). Лишние страницы туда не добавляй
     без нужды: падающие частицы мешают, например, читать.
   Холст и кнопку скрипт создаёт сам, а нужные ему стили (seasonal-
   effects.css) подгружает только там, где они действительно нужны.

   КАК ЭТО ВЕДЁТ СЕБЯ
   - Заходишь на страницу в «сезонные» даты → один раз за визит
     (за вкладку/сессию) листья сыплются около 11 секунд и затихают.
   - Дальше — по кнопке в углу экрана: нажал → сыплются ещё раз,
     нажал во время падения → остановились.
   - Если человек сам остановил листья кнопкой, автозапуск при
     следующих заходах отключается (запоминается в localStorage),
     пока он сам не запустит их снова. Чтобы никого не раздражать.
   - Эффект не ловит клики (pointer-events: none), не работает при
     «уменьшить анимацию» в системе (кнопки тогда тоже нет), ставится
     на паузу, когда вкладка не видна, на телефоне листьев меньше.

   КАК ДОБАВИТЬ СЕЗОН
   Допиши объект в SEASONS: id, название (для подсказки на кнопке),
   даты from/to как [месяц, день] (можно через Новый год, например
   from: [12, 15], to: [1, 15]) и effect — описание частиц (см.
   leavesEffect: как создаётся частица, как двигается, как рисуется).
   Сам движок (холст, цикл, кнопка, пауза) менять не нужно.

   КАК ПРОВЕРИТЬ ВНЕ СЕЗОНА
   Добавь к адресу ?season=autumn (id сезона из SEASONS):
       index.html?season=autumn
       index.html?season=winter
       index.html?season=spring
       index.html?season=summer
       index.html?season=cny       (китайский Новый год)
       index.html?season=lantern   (Праздник фонарей) */

(() => {
    "use strict";

    // Файл могут подгрузить дважды (script.js сам + строка в HTML) — второй
    // экземпляр тихо выходит, иначе были бы два холста и две кнопки
    if (window.__busyBeeSeasonal) return;
    window.__busyBeeSeasonal = true;

    // Адрес этого файла — от него считаем путь к seasonal-effects.css
    const SELF_SRC = document.currentScript ? document.currentScript.src : location.href;

    /* ---------- Настройки ---------- */

    // Страницы, где сыплется снег/листья и есть кнопка. Остальные получают
    // только украшения (шапочка)
    const EFFECT_PAGES = ["index.html"];

    const RUN_MS = 11000;                      // сколько листья «сыплются» за один запуск
    const OFF_KEY = "busybee_seasonal_off";    // localStorage: "1" — автозапуск выключен пользователем
    const SEEN_KEY = "busybee_seasonal_seen";  // sessionStorage: в этом визите уже играли
    const MOBILE_MAX_WIDTH = 768;              // как в style.css

    // Рубильник украшений (шапочка на логотипе и т.п.): false — вернёт сайт
    // как было, а снег и листья продолжат работать
    const DECORATIONS_ENABLED = true;

    // Китайский Новый год (первый день года по лунному календарю) каждый год
    // выпадает на другую дату, поэтому его сезоны заданы не «с месяца-дня по
    // месяц-день», а списком окон по годам (windows). Праздник фонарей — 15-й
    // день года, то есть через 14 дней после Нового года.
    // Даты сверены с календарём праздников (на 2027–2035); когда список
    // закончится, допиши следующие годы сюда.
    const CNY_DATES = [
        [2027, 2, 6], [2028, 1, 26], [2029, 2, 13], [2030, 2, 3], [2031, 1, 23],
        [2032, 2, 11], [2033, 1, 31], [2034, 2, 19], [2035, 2, 8]
    ];

    // Окно в днях относительно Нового года: fromShift = -7 — за неделю до,
    // toShift = 12 — до 12-го дня включительно
    function cnyWindows(fromShift, toShift) {
        return CNY_DATES.map(([y, m, d]) => ({
            from: new Date(y, m - 1, d + fromShift, 0, 0, 0),
            to: new Date(y, m - 1, d + toShift, 23, 59, 59)
        }));
    }

    // icon — содержимое <svg viewBox="0 0 24 24"> для кнопки (обводкой, 1.7px)
    const SEASONS = [
        {
            id: "autumn",
            title: "Опадающие листья",
            from: [10, 1],
            to: [11, 30],
            icon: '<path d="M12 3C17.5 5.5 19.5 11 12 21C4.5 11 6.5 5.5 12 3Z"/><path d="M12 8V21"/>',
            effect: () => leavesEffect()
        },
        {
            id: "winter",
            title: "Снегопад",
            from: [12, 1],      // через Новый год — движок это понимает
            to: [1, 14],
            icon: '<path d="M12 12L21.0 12.0M17.8 12.0L19.6 13.8M17.8 12.0L19.6 10.2M12 12L16.5 19.8M14.9 17.0L14.2 19.5M14.9 17.0L17.4 17.7M12 12L7.5 19.8M9.1 17.0L6.6 17.7M9.1 17.0L9.8 19.5M12 12L3.0 12.0M6.2 12.0L4.4 10.2M6.2 12.0L4.4 13.8M12 12L7.5 4.2M9.1 7.0L9.8 4.5M9.1 7.0L6.6 6.3M12 12L16.5 4.2M14.9 7.0L17.4 6.3M14.9 7.0L14.2 4.5"/>',
            decorate: () => addSantaHats(),   // украшения вне холста — см. addSantaHats
            effect: () => snowEffect()
        },
        {
            id: "spring",
            title: "Лепестки сакуры",
            from: [3, 1],
            to: [5, 15],
            // пять лепестков вокруг центра — контурная иконка в стиле остальных
            icon: '<ellipse cx="12" cy="6.8" rx="3.1" ry="4.4"/><ellipse cx="12" cy="6.8" rx="3.1" ry="4.4" transform="rotate(72 12 12)"/><ellipse cx="12" cy="6.8" rx="3.1" ry="4.4" transform="rotate(144 12 12)"/><ellipse cx="12" cy="6.8" rx="3.1" ry="4.4" transform="rotate(216 12 12)"/><ellipse cx="12" cy="6.8" rx="3.1" ry="4.4" transform="rotate(288 12 12)"/><circle cx="12" cy="12" r="1.1"/>',
            effect: () => sakuraEffect()
        },
        {
            id: "summer",
            title: "Одуванчики",
            from: [5, 16],       // продолжает весну без пропуска...
            to: [9, 30],         // ...и доходит до начала осени
            icon: '<path d="M12 21V10.5"/><path d="M12 10.5L4.6 8.9"/><circle cx="4.6" cy="8.9" r="0.9"/><path d="M12 10.5L6.0 5.8"/><circle cx="6.0" cy="5.8" r="0.9"/><path d="M12 10.5L8.7 3.7"/><circle cx="8.7" cy="3.7" r="0.9"/><path d="M12 10.5L12.0 2.9"/><circle cx="12.0" cy="2.9" r="0.9"/><path d="M12 10.5L15.3 3.7"/><circle cx="15.3" cy="3.7" r="0.9"/><path d="M12 10.5L18.0 5.8"/><circle cx="18.0" cy="5.8" r="0.9"/><path d="M12 10.5L19.4 8.9"/><circle cx="19.4" cy="8.9" r="0.9"/>',
            effect: () => dandelionEffect()
        },
        {
            // Китайский Новый год: с недели до праздника по 12-й день года.
            // Висят красные фонарики (на всех страницах), на главной падают
            // красные конверты и монетки. Позже сюда же — дракон: ещё один
            // тип частицы со своим draw, как bee у «summer»
            id: "cny",
            title: "Красные конверты",
            windows: cnyWindows(-7, 12),
            icon: '<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M6 8.5L12 13.2l6-4.7"/><circle cx="12" cy="14.8" r="1.4"/>',
            decorate: () => addLanterns("cny"),
            effect: () => envelopesEffect()
        },
        {
            // Праздник фонарей (15-й день года) и день до/после: фонарики
            // другие — разноцветные и круглее, а вместо падающих конвертов
            // вверх поднимаются небесные фонарики
            id: "lantern",
            title: "Небесные фонарики",
            windows: cnyWindows(13, 15),
            icon: '<path d="M12 2v2.5"/><rect x="9" y="4.5" width="6" height="2" rx="0.6"/><ellipse cx="12" cy="12" rx="6.2" ry="5.6"/><path d="M12 6.4v11.2M8.5 8.3c-1.4 2.2-1.4 5.2 0 7.4M15.5 8.3c1.4 2.2 1.4 5.2 0 7.4"/><rect x="9" y="17.6" width="6" height="1.8" rx="0.6"/><path d="M12 19.4V22"/>',
            decorate: () => addLanterns("festival"),
            effect: () => skyLanternsEffect()
        }
    ];


    /* ---------- Какой сезон сейчас ---------- */

    function inRange(date, from, to) {
        const value = (date.getMonth() + 1) * 100 + date.getDate();
        const start = from[0] * 100 + from[1];
        const end = to[0] * 100 + to[1];
        // диапазон через Новый год (старт позже конца) — «или», а не «и»
        return start <= end ? value >= start && value <= end : value >= start || value <= end;
    }

    // Сезон активен сейчас? Либо по окнам-годам (windows — китайский Новый
    // год), либо по месяцу-дню без года (from/to — остальные)
    function seasonIsActive(season, now) {
        if (season.windows) return season.windows.some((w) => now >= w.from && now <= w.to);
        return inRange(now, season.from, season.to);
    }

    function currentSeason() {
        const forced = new URLSearchParams(location.search).get("season");
        if (forced) return SEASONS.find((s) => s.id === forced) || null;

        const now = new Date();
        return SEASONS.find((s) => seasonIsActive(s, now)) || null;
    }

    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const season = currentSeason();


    /* ---------- Украшения (не анимация) ----------
       Шапочка Деда Мороза на логотипе. Она статичная, поэтому «уменьшить
       анимацию» её не отключает; отключается рубильником
       DECORATIONS_ENABLED выше.

       Как устроено: каждую картинку внутри .logo (шапка, футер, бургер-меню —
       везде один и тот же класс) скрипт оборачивает в <span
       class="seasonal-hat-wrap"> и кладёт рядом SVG-шапочку. Положение и
       размер шапочки заданы в процентах от картинки (seasonal-effects.css),
       поэтому она сидит на голове пчёлки при любом размере логотипа.
       Разметку header.js / footer.js / mobile-nav.js менять не нужно.

       viewBox шапочки — в пикселях самого логотипа (832×841): голова
       пчёлки — эллипс с центром (417, 264), контур по краю ~18px. Контур
       шапочки такой же толщины и цвета (#381A02), чтобы она «рисовалась
       той же рукой». */

    const HAT_SVG = `
        <svg class="seasonal-hat" viewBox="240 30 380 190" aria-hidden="true" focusable="false">
            <defs>
                <clipPath id="seasonalHatBody">
                    <path d="M290 175 C292 105 345 55 420 50 C485 46 540 78 566 128 C540 112 505 110 488 126 C500 140 504 158 506 175 Z"/>
                </clipPath>
            </defs>
            <g transform="rotate(-7 417 175)" stroke="#381A02" stroke-width="15" stroke-linejoin="round" stroke-linecap="round">
                <!-- колпак -->
                <path d="M290 175 C292 105 345 55 420 50 C485 46 540 78 566 128 C540 112 505 110 488 126 C500 140 504 158 506 175 Z" fill="#E34848"/>
                <!-- тень на правой стороне колпака (без контура, обрезана по форме колпака) -->
                <path clip-path="url(#seasonalHatBody)" stroke="none" fill="#C93434" d="M420 50 C485 46 540 78 566 128 C540 112 505 110 488 126 C478 100 450 70 420 50 Z"/>
                <!-- меховая опушка -->
                <rect x="262" y="147" width="310" height="56" rx="28" fill="#FFFFFF"/>
                <path stroke="none" fill="#F2E7D5" d="M270 184 Q417 204 564 184 Q560 196 548 198 L286 198 Q274 196 270 184 Z"/>
                <!-- помпон -->
                <circle cx="574" cy="138" r="30" fill="#FFFFFF"/>
            </g>
        </svg>`;

    // Стили шапочки живут здесь, а не в seasonal-effects.css: так достаточно
    // одного подключаемого файла, и на обычных страницах не нужен лишний
    // запрос CSS. Обёртка — размером ровно с картинку логотипа, шапочка
    // позиционируется в процентах от неё (числа под логотип 832×841:
    // viewBox шапочки 240 30 380 190 в пикселях картинки).
    const HAT_CSS = `
        .seasonal-hat-wrap { position: relative; display: block; flex: none; }
        .seasonal-hat {
            position: absolute;
            left: 28.846%;      /* 240 / 832 */
            top: 3.567%;        /* 30 / 841 */
            width: 45.673%;     /* 380 / 832 */
            height: auto;
            overflow: visible;
            pointer-events: none;
        }`;

    function addSantaHats() {
        if (!document.getElementById("seasonalHatStyle")) {
            const style = document.createElement("style");
            style.id = "seasonalHatStyle";
            style.textContent = HAT_CSS;
            document.head.appendChild(style);
        }

        document.querySelectorAll(".logo img").forEach((img) => {
            if (img.parentElement.classList.contains("seasonal-hat-wrap")) return;

            const wrap = document.createElement("span");
            wrap.className = "seasonal-hat-wrap";
            img.parentNode.insertBefore(wrap, img);
            wrap.appendChild(img);
            wrap.insertAdjacentHTML("beforeend", HAT_SVG);
        });
    }

    /* ---------- Гирлянда фонариков (китайский Новый год, Праздник фонарей) ----------
       Несколько фонариков на верёвочках свисают с верхнего края шапки
       сайта по центру — в пустом промежутке между меню и поиском. Они не
       двигают вёрстку (absolute внутри .header, который для этого получает
       position: relative), не ловят клики и слегка покачиваются (при
       «уменьшить анимацию» стоят неподвижно). Включаются на всех страницах
       и, как шапочка, отключаются рубильником DECORATIONS_ENABLED.

       Фонарики Нового года ("cny") — все красные овальные. Фонарики
       Праздника фонарей ("festival") — разноцветные и круглее. Рисунок в
       стиле логотипа: контур тёмно-коричневый #381A02, плоские цвета.

       Количество зависит от ширины экрана (на узких меньше), чтобы не
       наезжать на меню и иконки — правила в LANTERN_CSS ниже. */

    const LANTERN_SETS = {
        cny: [
            { body: "#D93A32", rib: "#9E2420", wide: 26 },
            { body: "#D93A32", rib: "#9E2420", wide: 26 },
            { body: "#D93A32", rib: "#9E2420", wide: 26 },
            { body: "#D93A32", rib: "#9E2420", wide: 26 },
            { body: "#D93A32", rib: "#9E2420", wide: 26 }
        ],
        festival: [
            { body: "#F08A24", rib: "#B8600F", wide: 28 },
            { body: "#E8638A", rib: "#A9395D", wide: 28 },
            { body: "#D93A32", rib: "#9E2420", wide: 28 },
            { body: "#F2B93B", rib: "#B8861F", wide: 28 },
            { body: "#F08A24", rib: "#B8600F", wide: 28 }
        ]
    };

    // Свисание верёвочки, время и фаза покачивания — у каждого фонарика свои,
    // чтобы они не качались в унисон
    const LANTERN_LOOK = [
        { drop: 8, dur: 3.4, delay: -0.4 },
        { drop: 20, dur: 2.9, delay: -1.6 },
        { drop: 2, dur: 3.8, delay: -2.4 },
        { drop: 14, dur: 3.1, delay: -0.9 },
        { drop: 6, dur: 3.6, delay: -2.1 }
    ];

    function lanternSvg(item, round) {
        const rx = round ? 28 : 26;
        return `
            <svg viewBox="0 0 60 100" aria-hidden="true" focusable="false">
                <g stroke="#381A02" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
                    <ellipse cx="30" cy="44" rx="${rx}" ry="${round ? 28 : 30}" fill="${item.body}"/>
                    <g fill="none" stroke="${item.rib}" stroke-width="2.4">
                        <path d="M30 15V73"/>
                        <path d="M30 15C13 26 13 62 30 73"/>
                        <path d="M30 15C47 26 47 62 30 73"/>
                    </g>
                    <ellipse cx="19" cy="30" rx="4" ry="7" fill="#FFFFFF" fill-opacity="0.28" stroke="none" transform="rotate(25 19 30)"/>
                    <rect x="17" y="2" width="26" height="9" rx="3" fill="#D4981F"/>
                    <rect x="17" y="72" width="26" height="9" rx="3" fill="#D4981F"/>
                    <g fill="none" stroke="#D4981F" stroke-width="2.6">
                        <path d="M30 81V98"/>
                        <path d="M25 81L23.5 96"/>
                        <path d="M35 81L36.5 96"/>
                    </g>
                    <circle cx="30" cy="85" r="2.6" fill="#D4981F"/>
                </g>
            </svg>`;
    }

    const LANTERN_CSS = `
        .header { position: relative; }

        .seasonal-garland {
            position: absolute;
            left: 50%;
            top: 0;
            transform: translateX(-50%);
            z-index: 4;
            display: flex;
            align-items: flex-start;
            gap: 18px;
            pointer-events: none;
        }

        .seasonal-lantern {
            display: block;
            flex: none;
            width: var(--w, 26px);
            transform-origin: 50% 0;
            animation: seasonalSway var(--dur, 3.2s) ease-in-out var(--delay, 0s) infinite alternate;
        }

        /* верёвочка, на которой висит фонарик */
        .seasonal-lantern::before {
            content: "";
            display: block;
            width: 1.5px;
            height: calc(var(--drop, 8px) + 6px);
            margin: 0 auto;
            background: #381A02;
        }

        .seasonal-lantern svg {
            display: block;
            width: 100%;
            height: auto;
            overflow: visible;
        }

        @keyframes seasonalSway {
            from { transform: rotate(-4deg); }
            to   { transform: rotate(4deg); }
        }

        @media (prefers-reduced-motion: reduce) {
            .seasonal-lantern { animation: none; }
        }

        /* Поиск на телефоне раскрылся поверх шапки — гирлянда тоже прячется */
        .header:has(.search.expanded) .seasonal-garland { visibility: hidden; }

        /* Свободное место между меню и поиском зависит от ширины экрана
           (проверено замером на 260–1400px, чтобы фонарики не наезжали на
           меню, поиск и иконки):
             от 1100px  — пять фонариков;
             1000–1099  — три (крайние скрыты);
             769–999    — ни одного: в шапке для них нет места;
             до 768px   — один маленький по центру: логотип слева, иконки
                          справа, между ними хватает;
             до 300px   — снова ни одного (сложенный Galaxy Z Flip). */
        @media (max-width: 1099px) {
            .seasonal-garland .seasonal-lantern:nth-child(1),
            .seasonal-garland .seasonal-lantern:nth-child(5) { display: none; }
        }

        @media (max-width: 999px) {
            .seasonal-garland { display: none; }
        }

        @media (max-width: 768px) {
            .seasonal-garland { display: flex; }
            .seasonal-garland .seasonal-lantern:nth-child(2),
            .seasonal-garland .seasonal-lantern:nth-child(4) { display: none; }
            .seasonal-garland .seasonal-lantern { width: calc(var(--w, 26px) * 0.85); }
        }

        @media (max-width: 300px) {
            .seasonal-garland { display: none; }
        }
    `;

    function addLanterns(kind) {
        if (!document.getElementById("seasonalLanternStyle")) {
            const style = document.createElement("style");
            style.id = "seasonalLanternStyle";
            style.textContent = LANTERN_CSS;
            document.head.appendChild(style);
        }

        const items = LANTERN_SETS[kind] || LANTERN_SETS.cny;
        const round = kind === "festival";

        document.querySelectorAll(".header").forEach((header) => {
            if (header.querySelector(".seasonal-garland")) return;

            const garland = document.createElement("div");
            garland.className = "seasonal-garland";
            garland.setAttribute("aria-hidden", "true");
            garland.innerHTML = items.map((item, i) => {
                const look = LANTERN_LOOK[i % LANTERN_LOOK.length];
                return `<span class="seasonal-lantern" style="--w:${item.wide}px;--drop:${look.drop}px;--dur:${look.dur}s;--delay:${look.delay}s">${lanternSvg(item, round)}</span>`;
            }).join("");
            header.appendChild(garland);
        });
    }

    if (DECORATIONS_ENABLED && season && typeof season.decorate === "function") {
        season.decorate();
    }

    // Дальше — холст со снегом/листьями и кнопка. Ему не место при «уменьшить
    // анимацию» и на страницах не из EFFECT_PAGES (читать со снегом неудобно)
    const thisPage = location.pathname.split("/").pop() || "index.html";
    if (!season || reduceMotion || !EFFECT_PAGES.includes(thisPage)) return;

    // Стили холста и кнопки — только там, где они нужны (если на странице уже
    // подключены вручную — второй раз не добавляем)
    if (!document.querySelector('link[href*="seasonal-effects.css"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = new URL("seasonal-effects.css", SELF_SRC).href;
        document.head.appendChild(link);
    }


    /* ---------- Хранилище (с защитой: в приватном режиме может падать) ---------- */

    const store = {
        get(area, key) { try { return window[area].getItem(key); } catch (e) { return null; } },
        set(area, key, value) { try { window[area].setItem(key, value); } catch (e) { /* не страшно */ } },
        remove(area, key) { try { window[area].removeItem(key); } catch (e) { /* не страшно */ } }
    };


    /* ---------- Эффект «листья» ---------- */

    // Палитра — оттенки сайта: медовый (--honey), терракота, охра
    const LEAF_COLORS = ["#D8A03A", "#E0B24E", "#C8742E", "#B5452E", "#A8672B", "#C99A3C"];

    // Два силуэта листа в «единичном» размере (±10): заострённый и округлый
    const LEAF_SHAPES = [
        new Path2D("M0 -10 C7 -7 9 0 0 10 C-9 0 -7 -7 0 -10 Z"),
        new Path2D("M0 -9 C8 -9 10 -1 0 9 C-10 -1 -8 -9 0 -9 Z")
    ];
    const LEAF_VEIN = new Path2D("M0 -9 L0 9");

    function leavesEffect() {
        const rand = (min, max) => min + Math.random() * (max - min);

        return {
            // сколько новых частиц в секунду — на телефоне меньше
            rate: (mobile) => (mobile ? 3.5 : 6),

            spawn(width) {
                return {
                    x: rand(-20, width + 20),
                    y: rand(-60, -15),
                    size: rand(7, 13),               // «радиус» листа в px
                    stretch: rand(0.85, 1.25),       // вытянутость
                    vy: rand(55, 105),               // падение, px/с
                    drift: rand(-14, 14),            // снос в сторону
                    amp: rand(18, 42),               // размах покачивания
                    freq: rand(0.9, 1.8),            // частота покачивания
                    phase: rand(0, Math.PI * 2),
                    rot: rand(0, Math.PI * 2),
                    spin: rand(-1.2, 1.2),           // вращение, рад/с
                    flipSpeed: rand(1.2, 2.4),       // «переворот» листа
                    age: 0,
                    color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
                    shape: LEAF_SHAPES[Math.floor(Math.random() * LEAF_SHAPES.length)]
                };
            },

            update(p, dt) {
                p.age += dt;
                p.y += p.vy * dt;
                p.x += (p.drift + Math.cos(p.age * p.freq + p.phase) * p.amp) * dt;
                p.rot += p.spin * dt;
            },

            isGone(p, width, height) {
                return p.y - p.size * 2 > height || p.x < -80 || p.x > width + 80;
            },

            draw(ctx, p) {
                // «переворот»: лист сужается по ширине, как будто поворачивается ребром
                const flip = 0.3 + 0.7 * Math.abs(Math.cos(p.age * p.flipSpeed + p.phase));

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.scale((p.size / 10) * flip, (p.size / 10) * p.stretch);

                ctx.fillStyle = p.color;
                ctx.fill(p.shape);

                ctx.lineWidth = 0.9;
                ctx.strokeStyle = "rgba(73, 53, 38, 0.28)";
                ctx.stroke(LEAF_VEIN);
                ctx.restore();
            }
        };
    }


    /* ---------- Эффект «снег» ----------
       Фон сайта светлый, поэтому чисто белые хлопья на нём не видны:
       хлопья светло-голубые с голубовато-серым контуром. Два вида:
       мелкие круглые (их много) и крупные снежинки-кристаллы. У каждой
       частицы своя «глубина» z (0 — далёкая, 1 — близкая): далёкие
       мельче, медленнее и прозрачнее — так снег выглядит объёмным. */

    const CRYSTAL = new Path2D();
    for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const ux = Math.cos(a);
        const uy = Math.sin(a);
        CRYSTAL.moveTo(0, 0);
        CRYSTAL.lineTo(ux * 10, uy * 10);
        for (const side of [1, -1]) {
            const bx = ux * 6.5;
            const by = uy * 6.5;
            const ba = a + side * (Math.PI / 4);
            CRYSTAL.moveTo(bx, by);
            CRYSTAL.lineTo(bx + Math.cos(ba) * 3.2, by + Math.sin(ba) * 3.2);
        }
    }

    function snowEffect() {
        const rand = (min, max) => min + Math.random() * (max - min);

        return {
            rate: (mobile) => (mobile ? 5 : 9),

            spawn(width) {
                const z = Math.random();
                const crystal = Math.random() < 0.2;

                return {
                    x: rand(-20, width + 20),
                    y: rand(-30, -8),
                    crystal,
                    size: crystal ? rand(5, 8) + z * 2 : 1.6 + z * 2.6,   // радиус, px
                    vy: crystal ? rand(40, 70) : 36 + z * 50,
                    drift: rand(-8, 8),
                    amp: 8 + z * 16,
                    freq: rand(0.6, 1.3),
                    phase: rand(0, Math.PI * 2),
                    rot: rand(0, Math.PI * 2),
                    spin: crystal ? rand(-0.7, 0.7) : 0,
                    alpha: 0.55 + z * 0.4,
                    age: 0
                };
            },

            update(p, dt) {
                p.age += dt;
                p.y += p.vy * dt;
                p.x += (p.drift + Math.cos(p.age * p.freq + p.phase) * p.amp) * dt;
                p.rot += p.spin * dt;
            },

            isGone(p, width, height) {
                return p.y - p.size * 2 > height || p.x < -60 || p.x > width + 60;
            },

            draw(ctx, p) {
                if (p.crystal) {
                    const scale = p.size / 10;
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.rot);
                    ctx.scale(scale, scale);
                    ctx.lineWidth = 1.3 / scale;     // толщина линии одна и та же при любом размере
                    ctx.lineCap = "round";
                    ctx.strokeStyle = `rgba(132, 162, 194, ${p.alpha})`;
                    ctx.stroke(CRYSTAL);
                    ctx.restore();
                    return;
                }

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                // заливка заметно голубее фона, контур еле виден — получаются
                // мягкие снежные «точки», а не пузырьки с обводкой
                ctx.fillStyle = `rgba(196, 216, 238, ${p.alpha})`;
                ctx.fill();
                ctx.lineWidth = 0.8;
                ctx.strokeStyle = `rgba(160, 188, 216, ${p.alpha * 0.45})`;
                ctx.stroke();
            }
        };
    }


    /* ---------- Эффект «сакура» ----------
       Два вида частиц: отдельные лепестки (с характерной выемкой на
       конце) и изредка целый цветок из пяти лепестков. Падают медленнее
       листьев, заметно покачиваются и их сносит ветром в одну сторону
       (у лепестков drift положительный). Цвета — оттенки розового:
       на светлом фоне сайта они хорошо видны. */

    const SAKURA_COLORS = ["#F7C1CF", "#F4A9BC", "#FADADF", "#F0A0B5", "#F8B8C8", "#EE97AE"];

    // Лепесток в «единичном» размере (±10): узкое основание сверху, широкий
    // конец снизу с выемкой посередине
    const PETAL = new Path2D(
        "M0 -10 C3 -8 8 -2 7 5 C6 9 2 10 0 7 C-2 10 -6 9 -7 5 C-8 -2 -3 -8 0 -10 Z"
    );
    const PETAL_VEIN = new Path2D("M0 -8 L0 3");

    function sakuraEffect() {
        const rand = (min, max) => min + Math.random() * (max - min);
        const pick = (list) => list[Math.floor(Math.random() * list.length)];

        return {
            rate: (mobile) => (mobile ? 4 : 7),

            spawn(width) {
                const flower = Math.random() < 0.14;

                return {
                    // чуть левее экрана тоже: ветер сносит вправо, и иначе
                    // левый край оставался бы пустым
                    x: rand(-width * 0.15, width + 20),
                    y: rand(-60, -15),
                    flower,
                    size: flower ? rand(7.5, 10.5) : rand(5, 9),
                    stretch: rand(0.9, 1.2),
                    vy: rand(34, 68),
                    drift: rand(8, 34),
                    amp: rand(22, 52),
                    freq: rand(0.7, 1.5),
                    phase: rand(0, Math.PI * 2),
                    rot: rand(0, Math.PI * 2),
                    spin: flower ? rand(-0.5, 0.5) : rand(-1.6, 1.6),
                    flipSpeed: rand(1.1, 2.2),
                    age: 0,
                    color: pick(SAKURA_COLORS)
                };
            },

            update(p, dt) {
                p.age += dt;
                p.y += p.vy * dt;
                p.x += (p.drift + Math.cos(p.age * p.freq + p.phase) * p.amp) * dt;
                p.rot += p.spin * dt;
            },

            isGone(p, width, height) {
                return p.y - p.size * 2 > height || p.x < -120 || p.x > width + 100;
            },

            draw(ctx, p) {
                // лепесток «переворачивается» (сужается по ширине), цветок —
                // лишь слегка пружинит, чтобы оставаться похожим на цветок
                const raw = Math.abs(Math.cos(p.age * p.flipSpeed + p.phase));
                const flip = p.flower ? 0.7 + 0.3 * raw : 0.3 + 0.7 * raw;
                const scale = p.size / 10;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.scale(scale * flip, scale * p.stretch);

                if (p.flower) {
                    ctx.fillStyle = p.color;
                    ctx.strokeStyle = "rgba(200, 100, 130, 0.3)";
                    ctx.lineWidth = 0.7;
                    for (let i = 0; i < 5; i++) {
                        ctx.save();
                        ctx.rotate((i * Math.PI * 2) / 5);
                        ctx.translate(0, -5.2);
                        ctx.scale(0.6, 0.6);
                        ctx.fill(PETAL);
                        ctx.stroke(PETAL);
                        ctx.restore();
                    }
                    ctx.beginPath();
                    ctx.arc(0, 0, 1.7, 0, Math.PI * 2);
                    ctx.fillStyle = "#D9657F";
                    ctx.fill();
                } else {
                    ctx.fillStyle = p.color;
                    ctx.fill(PETAL);
                    ctx.lineWidth = 0.7;
                    ctx.strokeStyle = "rgba(200, 100, 130, 0.32)";
                    ctx.stroke(PETAL_VEIN);
                }

                ctx.restore();
            }
        };
    }


    /* ---------- Эффект «одуванчики + пчёлка» ----------
       Летят пушинки одуванчика: тонкий стебелёк с веером нитей. Нити
       не белые, а светлая хаки — на светлом фоне сайта белое не видно
       (а на тёмной теме хаки по-прежнему читается).

       Пчёлка — та же, что рядом с именем на странице переводчика
       (translator.html, .custom-bee): те же три контура и те же цвета,
       так что это один и тот же персонаж. Крыло машет, как там
       (сжатие по высоте 1 → 0.55 вокруг точки крепления), пчёлка слегка
       покачивается и оставляет за собой золотой пыльцевой след (такие
       же точки, как .pollen-dot в translator-style.css). За один запуск
       пчёлка пролетает через экран один раз по волнистой траектории;
       в следующий запуск (например, по кнопке) — в обратную сторону
       (картинка при этом зеркалится). */

    const FLUFF_COLOR = [176, 154, 114];   // нити пушинки (rgb)
    const SEED_BODY = "#8C6B3E";           // семечко

    // Пушинка в «единичном» размере: веер из 11 нитей над точкой (0, 0),
    // на концах — крошечные «пуховки»; семечко и стебелёк — внизу
    const FLUFF = new Path2D();
    const FLUFF_TIPS = new Path2D();
    for (let i = 0; i < 11; i++) {
        const a = ((-158 + i * (136 / 10)) * Math.PI) / 180;
        const x = Math.cos(a) * 11;
        const y = Math.sin(a) * 11;
        FLUFF.moveTo(0, 0);
        FLUFF.lineTo(x, y);
        FLUFF_TIPS.moveTo(x + 1, y);
        FLUFF_TIPS.arc(x, y, 1, 0, Math.PI * 2);
    }
    const SEED_STALK = new Path2D("M0 0 L0 6");

    // Пчёлка со страницы переводчика — контуры в системе координат
    // viewBox 0 0 512 512, смотрит вправо (жало слева, голова и усик справа).
    // Порядок отрисовки как в исходном SVG: тело, крыло, тёмные детали.
    const BEE_BODY = new Path2D("M267.89 247.32C268.76 251.53 273.65 257.62 275.66 261.8C279.9 270.63 283.12 279.76 285.79 289.17C297.02 328.82 287.61 369.22 267.52 403.88C259.22 404.38 250.76 403.95 242.44 403.95C237.2 403.95 230.89 404.4 225.88 402.72C226.54 397.77 232.04 388.29 233.82 382.7C238.49 367.98 242.05 352.79 242.93 337.27C244.06 317.19 242.03 297.13 236.8 277.79C234.95 270.94 232.43 264.17 229.81 257.61C228.58 254.5 226.42 251.46 225.79 248.18C227.08 247.96 228.37 247.73 229.66 247.51C242.41 247.45 255.15 247.38 267.89 247.32ZM385.43 268.36C382.75 274.47 386.4 279 392.87 276.22C399.27 282.3 403.38 291.93 406.2 300.05C418.17 334.55 403.75 374.04 372.38 392.76C351.92 404.98 327.14 405.28 303.86 403.88C304.02 400.37 309.23 390.73 310.77 386.79C314.42 377.42 316.96 367.33 318.82 357.45C325.86 319.97 319.64 281.48 303.52 247.34C310.05 247.28 316.57 247.22 323.1 247.16C340.33 245.84 358.57 249.4 373.18 258.75C377.15 261.29 382.83 264.31 385.43 268.36ZM196.28 259.41C216.39 300.18 217.73 350.85 196.28 391.5C185.49 387.55 171.96 369.18 167.21 359.04C165.65 355.71 164.13 348.43 161.93 346.12C162.44 341.27 160.08 334.66 159.9 329.41C159.59 320.82 161.37 313.05 162.2 304.64C164.12 302.39 166.42 293.48 168.18 290.01C174.09 278.41 184.24 265.16 196.28 259.41ZM367.88 305.06C351.25 308.74 358.38 335.97 375.92 329.86C390.88 324.64 384.26 301.44 367.88 305.06Z");
    const BEE_WING = new Path2D("M323.1 247.16C316.57 247.22 310.05 247.28 303.52 247.34C291.65 247.33 279.77 247.33 267.89 247.32C255.15 247.38 242.41 247.45 229.66 247.51C225.94 244.6 221.28 242.26 217.63 239.02C215.39 237.03 212.9 234.28 210.22 232.73C209.53 232.33 209.37 231.46 208.96 230.93C204.64 225.5 198.22 221.46 194.7 215.57C193.6 213.72 191.48 211.78 190.1 210.18C185.96 205.33 181.99 198.96 178.87 193.39C172.55 182.12 168.09 169.57 164.67 157.33C164.3 156.01 165.03 154.53 164.57 153.15C163.34 149.46 163.61 144.84 163.85 140.74C163.94 139.15 163.33 137.37 163.68 135.83C166.26 124.63 171.95 114.65 183.06 109.85C185.8 108.67 195.53 107.04 198.49 107.64C199.2 107.78 199.68 108.37 200.37 108.43C203.31 108.66 206.19 108.85 209.01 110.12C212.3 109.5 217.37 112.4 220.26 113.74C227.74 117.2 235.19 120.6 241.83 125.95C244.26 127.9 247.04 128.79 248.99 131.39C251.7 132.26 253.05 135.18 255.35 136.61C262.03 140.79 270.37 152.08 275.64 158C277.46 156.24 278.69 154.22 280.07 152.34C283.7 147.39 288.95 143.57 292.95 138.94C295.89 135.53 301.13 133.16 304.01 129.88C306.62 126.93 310.85 124.98 314.16 122.71C324.52 115.59 337.67 109.33 350 108.15C355.18 107.65 363.74 108.31 368.28 109.97C370.51 110.79 372.47 112.89 374.77 113.18C376.71 115.47 379.15 117.32 381.14 119.49C385.31 124.03 388.4 138.38 388.15 144.72C388.09 146.5 387.24 147.97 387.1 149.86C387.02 151.05 387.5 152.47 387.26 153.6C387.06 154.5 386.42 155.02 386.21 155.94C385.66 158.32 385.87 160.68 385.24 162.97C384.55 165.47 383.12 167.21 383.32 169.97C381.37 171.61 381.12 175.23 380.14 177.53C378.24 181.98 376.32 186.41 374.04 190.52C366.74 203.67 357.2 216.94 345.87 227.83C343.17 230.42 340.42 233.53 337.51 235.89C336.06 237.07 334.34 237.88 332.99 239.21C332.53 239.66 332.26 240.49 331.68 240.83C329.81 241.96 323.73 245.29 323.1 247.16Z");
    const BEE_DARK = new Path2D("M392.87 276.22C386.4 279 382.75 274.47 385.43 268.36C399.13 261.07 411.04 247.31 414.06 231.98C415.17 226.37 416.05 218.11 410.68 214.22C407.16 211.67 399.15 211.73 399.24 217.66C399.33 222.91 405.03 226.33 405.21 231.25C405.32 234.5 401.95 237.61 398.69 236.56C395.29 235.46 393.31 230.9 391.8 227.98C386.58 217.9 388.7 206.43 400.36 202.76C403.07 201.91 406.41 201.45 409.25 202.19C422.49 205.66 425.71 217.51 425.08 229.82C424.34 244.38 414.66 258.3 404.23 267.93C400.74 271.16 396.67 273.47 392.87 276.22ZM303.52 247.34C319.64 281.48 325.86 319.97 318.82 357.45C316.96 367.33 314.42 377.42 310.77 386.79C309.23 390.73 304.02 400.37 303.86 403.88C291.74 403.88 279.63 403.88 267.52 403.88C287.61 369.22 297.02 328.82 285.79 289.17C283.12 279.76 279.9 270.63 275.66 261.8C273.65 257.62 268.76 251.53 267.89 247.32C279.77 247.33 291.65 247.33 303.52 247.34ZM225.79 248.18C226.42 251.46 228.58 254.5 229.81 257.61C232.43 264.17 234.95 270.94 236.8 277.79C242.03 297.13 244.06 317.19 242.93 337.27C242.05 352.79 238.49 367.98 233.82 382.7C232.04 388.29 226.54 397.77 225.88 402.72C223.46 403.47 220.05 401.74 217.66 401.16C210.84 399.52 201.4 396.65 196.28 391.5C217.73 350.85 216.39 300.18 196.28 259.41C201.77 254 210.86 251.97 217.89 249.79C220.23 249.06 223.31 247.8 225.79 248.18ZM162.2 304.64C161.37 313.05 159.59 320.82 159.9 329.41C160.08 334.66 162.44 341.27 161.93 346.12C138.89 339.3 115.86 332.49 92.82 325.67C96.65 322.69 103.13 322.27 107.74 320.71C119.69 316.68 132 313.36 144.12 309.82C148.55 308.52 158.01 304.41 162.2 304.64ZM367.88 305.06C384.26 301.44 390.88 324.64 375.92 329.86C358.38 335.97 351.25 308.74 367.88 305.06Z");
    const BEE_CENTER = { x: 259, y: 256.5 };       // центр габаритов пчёлки (332×297)
    const BEE_WIDTH = 332;                          // ширина габаритов в единицах viewBox
    const BEE_WING_PIVOT = { x: 295, y: 247 };      // где крыло крепится к телу

    const POLLEN_LIFE = 0.7;       // секунд, как pollenFade в translator-style.css
    const POLLEN_EVERY = 0.045;    // как setInterval(spawnPollenDot, 45) на странице переводчика

    function dandelionEffect() {
        const rand = (min, max) => min + Math.random() * (max - min);

        let beesLeft = 0;     // сколько раз ещё пролетит пчёлка за этот запуск (сейчас — один)
        let beeIn = 0;        // через сколько пушинок она появится
        let nextDir = 1;      // 1 — слева направо, -1 — справа налево; меняется после каждого пролёта

        function makeBee(width, height) {
            const dir = nextDir;
            nextDir = -nextDir;
            const small = width <= MOBILE_MAX_WIDTH;
            return {
                bee: true,
                dir,
                x: dir > 0 ? -50 : width + 50,
                y0: rand(height * 0.22, height * 0.6),
                y: 0,
                vx: rand(95, 125),
                size: small ? 22 : 28,                  // ширина пчёлки, px
                age: 0,
                dots: [],                               // пыльцевой след
                dotClock: 0
            };
        }

        // высота полёта и её производная (нужна для наклона по ходу)
        const flightY = (age) => Math.sin(age * 1.7) * 26 + Math.sin(age * 0.6 + 1) * 16;
        const flightVy = (age) => 26 * 1.7 * Math.cos(age * 1.7) + 16 * 0.6 * Math.cos(age * 0.6 + 1);

        return {
            rate: (mobile) => (mobile ? 3 : 5),

            // движок зовёт при каждом запуске (автозапуск, кнопка)
            start() {
                beesLeft = 1;
                beeIn = 12;
            },

            spawn(width, height) {
                if (beeIn > 0 && --beeIn === 0) {
                    const bee = makeBee(width, height);
                    beesLeft -= 1;
                    beeIn = beesLeft > 0 ? 30 : 0;
                    return bee;
                }

                const z = Math.random();   // глубина: 0 — далёкая, 1 — близкая
                return {
                    x: rand(-width * 0.2, width + 20),
                    y: rand(-60, -15),
                    size: 0.7 + z * 0.55,              // масштаб пушинки
                    vy: rand(26, 50),
                    drift: rand(26, 58),               // ветер сносит вправо
                    amp: rand(18, 42),
                    freq: rand(0.6, 1.3),
                    phase: rand(0, Math.PI * 2),
                    bob: rand(8, 18),                  // лёгкое «подпрыгивание» вверх-вниз
                    tilt: rand(0.25, 0.6),
                    alpha: 0.5 + z * 0.45,
                    age: 0
                };
            },

            update(p, dt) {
                p.age += dt;

                if (p.bee) {
                    p.x += p.dir * p.vx * dt;
                    p.y = p.y0 + flightY(p.age);

                    // пыльцевой след: новая точка каждые POLLEN_EVERY секунд,
                    // живёт POLLEN_LIFE и гаснет (рисуется в draw)
                    p.dotClock += dt;
                    while (p.dotClock >= POLLEN_EVERY) {
                        p.dotClock -= POLLEN_EVERY;
                        p.dots.push({ x: p.x, y: p.y, age: 0 });
                    }
                    p.dots = p.dots.filter((dot) => (dot.age += dt) < POLLEN_LIFE);
                    return;
                }

                p.y += (p.vy + Math.sin(p.age * 0.9 + p.phase) * p.bob) * dt;
                p.x += (p.drift + Math.cos(p.age * p.freq + p.phase) * p.amp) * dt;
            },

            isGone(p, width, height) {
                if (p.bee) return p.dir > 0 ? p.x > width + 80 : p.x < -80;
                return p.y - 30 > height || p.x > width + 100 || p.x < -140;
            },

            draw(ctx, p) {
                if (p.bee) {
                    // пыльца: золотая точка с мягким ореолом, всплывает на 14px и тает
                    for (const dot of p.dots) {
                        const t = dot.age / POLLEN_LIFE;
                        const alpha = 0.9 * (1 - t);
                        const y = dot.y - 14 * (1 - Math.pow(1 - t, 2));   // ease-out, как в CSS
                        const r = 2.5 * (1 - 0.7 * t);

                        ctx.beginPath();
                        ctx.arc(dot.x, y, r * 2.4, 0, Math.PI * 2);
                        ctx.fillStyle = `rgba(216, 160, 58, ${alpha * 0.25})`;
                        ctx.fill();

                        ctx.beginPath();
                        ctx.arc(dot.x, y, r, 0, Math.PI * 2);
                        ctx.fillStyle = `rgba(216, 160, 58, ${alpha})`;
                        ctx.fill();
                    }

                    // наклон по ходу полёта (слабее реального, чтобы не «клевала носом»)
                    // и лёгкое покачивание ±8°, как на странице переводчика
                    const tilt = p.dir * Math.atan2(flightVy(p.age), p.vx) * 0.6;
                    const wobble = Math.sin(p.age * (1000 / 110)) * ((8 * Math.PI) / 180);
                    // крыло: сжатие по высоте 1 → 0.55 и обратно, полный цикл 0.36 с
                    const flap = 0.775 + 0.225 * Math.cos((p.age * Math.PI) / 0.18);
                    const k = p.size / BEE_WIDTH;

                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(tilt + wobble);
                    ctx.scale(p.dir * k, k);                     // dir = -1 зеркалит пчёлку
                    ctx.translate(-BEE_CENTER.x, -BEE_CENTER.y);

                    ctx.fillStyle = "#fed402";
                    ctx.fill(BEE_BODY);

                    ctx.save();
                    ctx.translate(BEE_WING_PIVOT.x, BEE_WING_PIVOT.y);
                    ctx.scale(1, flap);
                    ctx.translate(-BEE_WING_PIVOT.x, -BEE_WING_PIVOT.y);
                    ctx.fillStyle = "#fbe6b7";
                    ctx.fill(BEE_WING);
                    ctx.restore();

                    ctx.fillStyle = "#414143";
                    ctx.fill(BEE_DARK);
                    ctx.restore();
                    return;
                }

                const scale = p.size;
                const sway = Math.sin(p.age * p.freq + p.phase) * p.tilt;   // пушинка покачивается

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(sway);
                ctx.scale(scale, scale);

                ctx.lineCap = "round";
                ctx.lineWidth = 0.8 / scale + 0.15;
                ctx.strokeStyle = `rgba(${FLUFF_COLOR[0]}, ${FLUFF_COLOR[1]}, ${FLUFF_COLOR[2]}, ${p.alpha})`;
                ctx.stroke(FLUFF);
                ctx.stroke(SEED_STALK);
                ctx.fillStyle = `rgba(${FLUFF_COLOR[0]}, ${FLUFF_COLOR[1]}, ${FLUFF_COLOR[2]}, ${p.alpha})`;
                ctx.fill(FLUFF_TIPS);

                ctx.beginPath();
                ctx.ellipse(0, 7.2, 1.1, 1.9, 0, 0, Math.PI * 2);
                ctx.fillStyle = SEED_BODY;
                ctx.globalAlpha = p.alpha;
                ctx.fill();
                ctx.restore();
            }
        };
    }


    /* ---------- Эффект «красные конверты» (китайский Новый год) ----------
       Падают красные конверты хунбао (рисунок red-envelope.svg) и изредка
       золотые монетки с квадратным отверстием. Движение как у листьев: кувыркаются,
       «переворачиваются» (сужаются по ширине) и покачиваются.

       Место под дракона: он будет ещё одним типом частицы (как bee у
       «одуванчиков»): spawn иногда возвращает { dragon: true, ... }, а в
       update/isGone/draw для неё своя ветка. Ни движок, ни остальные
       частицы менять не придётся. */

    // Монетка: круг с квадратным отверстием (evenodd — отверстие прозрачное)
    const COIN = new Path2D("M-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0 M-2.2 -2.2 h4.4 v4.4 h-4.4 Z");

    // Красный конверт — рисунок red-envelope.svg (viewBox 512×512): корпус
    // красный (с вырезом под печать), верхний клапан тёмно-красный, золотая
    // печать с иероглифом. Рисуются в таком порядке, evenodd как в исходнике.
    // Габариты конверта в единицах viewBox: x 104–401, y 41–473.
    const ENV_BODY = new Path2D("M400.89 462.9C401.05 470.84 393.27 472.87 386.92 472.87C370.71 472.87 354.5 472.87 338.29 472.87C278.29 472.87 218.28 472.87 158.28 472.87C143.63 472.87 128.44 474.05 113.86 472.84C108.52 472.39 103.77 467.98 104.1 462.44C104.23 337.85 104.37 213.26 104.5 88.68C107.53 98.3 115.29 103.98 122.85 110.24C139.83 124.3 158.86 135.06 179.21 143.23C183.14 144.81 187.87 146.17 189.74 150.42C192.4 156.46 188.81 164.14 196.32 167.67C201.95 170.32 218.72 168.75 225.61 168.75C244.31 168.75 263.01 168.75 281.72 168.75C288.66 168.75 301.76 170.14 307.92 167.95C318.92 164.05 309.59 149.92 320.82 145.24C342.47 136.22 362.82 126.13 381.13 111.1C389.08 104.57 397.35 98.63 400.48 88.55C400.62 213.33 400.75 338.12 400.89 462.9ZM247.71 184.42C228.18 187.64 218.01 200.52 204.82 213.93C190.6 228.39 176.03 242.5 161.8 256.95C155 263.85 147.19 270.32 141.18 277.94C133.6 287.56 129.91 300.37 132.19 312.59C134.8 326.68 144.1 335.62 153.86 345.29C165.52 356.85 177.16 368.43 188.68 380.12C195.65 387.18 202.74 394.11 209.71 401.17C223.67 415.3 234.37 427.02 256 425.93C272.58 425.09 283.5 413.13 294.34 402.11C312.5 383.66 331.03 365.56 349.27 347.18C363.67 332.67 376.48 320.66 372.85 297.99C370.57 283.75 360.87 274.6 351.15 264.88C339.78 253.49 328.47 242.05 317.02 230.74C308.71 222.54 300.41 214.3 292.23 205.97C280.18 193.7 266.5 181.33 247.71 184.42ZM250.04 205.95C261.64 205.22 267.73 212.06 275.3 219.62C283.34 227.64 291.35 235.69 299.39 243.71C311.72 256 323.99 268.36 336.33 280.65C342.9 287.2 350.34 293.03 351.74 302.76C353.55 315.27 342.44 323.36 334.7 331.2C316.73 349.39 298.55 367.37 280.46 385.43C272.58 393.3 264.88 404.24 252.73 404.41C243.31 404.53 237.72 398.61 231.53 392.45C222.86 383.83 214.24 375.15 205.59 366.49C193.27 354.18 181.03 341.79 168.65 329.56C162.05 323.03 154.63 317.13 153.22 307.43C151.45 295.24 162 287.35 169.6 279.71C187.86 261.35 206.44 243.3 224.56 224.8C231.47 217.74 239.39 206.62 250.04 205.95ZM299.83 252.73C298.03 249.98 294.02 250.81 291.07 250.81C283.73 250.81 275.91 250.04 268.62 250.96C265.56 251.34 262.43 252.99 263.01 256.4C267.17 260.06 279.88 256.44 285.46 258.05C285.46 259.59 280.52 268.49 279.11 269.06C277.09 269.88 274.48 269.1 272.37 269.33C264.67 270.16 258.33 274.25 258.2 282.65C258.15 285.73 260.23 287.08 261.09 289.67C259.84 292.03 254.81 292.66 256.34 296.57C256.76 297.64 257.86 298.44 258.4 299.48C257.44 301.97 247.11 306.24 244.31 306.77C242.57 303.31 248.78 299.79 248.86 296.21C247.03 293.98 244.52 295.31 242.44 293.9C242.51 291.81 244.56 289.38 242.49 287.51C237.39 282.92 233.83 288.93 230.63 290.71C226.01 293.27 216.35 294.25 211.11 294.24C207.93 294.23 202.75 294.17 201 291.07C202.25 288.25 207.98 287.01 210.72 285.8C217.55 282.77 226.03 278.98 228.86 271.43C227.12 269.03 223.61 269.56 221.42 267.44C216.13 262.29 218.46 250.61 207.07 257.35C198.82 262.24 212.11 272.3 214.84 275.64C211.41 280.74 200.46 284.04 194.9 286.79C192.23 288.11 187.97 289.48 186.93 292.47C189.41 302.46 205.43 298.73 209.85 301.36C208.46 303.5 205.23 304.11 202.97 305.14C197.45 307.64 184.16 316.47 189.09 324.1C191.23 327.39 196.03 325.59 199.08 325.18C205.61 324.31 219.92 321.14 225.61 321.72C226.68 324.84 224.57 329.47 224.17 332.77C223.25 340.38 222.89 349.05 226.22 356.13C227.74 359.37 231.13 364.12 234.96 364.77C238.31 365.34 244.46 363.05 243.84 359.1C241.88 357.09 239.52 355.71 238.17 353.12C233.9 344.97 235.31 326.53 239.17 318.26C245.25 315.9 251.33 313.54 257.4 311.17C259.53 313.35 257.89 318.26 257.29 321.03C255.63 328.57 251.44 336.99 253.04 344.82C254.18 350.37 259.86 351.95 264.45 353.44C272.82 356.16 282.94 354.61 291.54 354.07C296.41 353.76 302.31 353.29 306.63 350.82C309.94 348.93 311.1 344.8 312.19 341.45C315.13 332.41 316.96 322.53 317.8 313.04C318.16 308.87 318.2 304.61 314.99 301.49C311.8 298.38 306.6 296.77 302.29 296.05C300.16 295.69 295.92 295.61 294.67 293.87C295.88 291.03 299.56 289.45 300.9 286.21C302.91 281.33 302.29 275.57 303.87 270.49C300.66 267.43 295.22 270.86 291.74 268.62C294.44 263.33 297.14 258.03 299.83 252.73ZM290.6 275.32C290.8 277.37 290.71 284.2 289.05 285.54C287.35 286.92 283.77 286.34 281.72 286.33C273.64 286.28 267.75 284.6 271.43 275.23C276.09 273.66 276.95 276.89 280.78 276.87C284.15 276.86 287.39 273.97 290.6 275.32ZM280.31 302.66C282.12 305.72 282.64 318.11 281.61 321.46C278.94 322.07 272.61 319.81 270.49 317.96C269.91 315.49 270.32 303.36 271.41 301.36C274.38 301.79 277.35 302.23 280.31 302.66ZM232.69 302.76C233.02 304.66 232.15 305.61 231.33 307.31C230.75 308.51 230.44 310.13 229.5 311.1C227.84 312.82 217.14 313.79 214.39 314.11C211.84 314.41 207.86 316.08 205.69 314.45C206.71 312.26 209.81 311.59 211.96 310.81C216.46 309.17 221.06 307.58 225.45 305.62C227.66 304.64 230.25 302.68 232.69 302.76ZM303.69 325.43C300.97 326.25 296.53 326.14 294.01 324.73C293.24 320.15 294.13 314.93 293.97 310.24C293.9 308.17 293.2 305.96 294.29 304.16C296.46 304.11 298.94 304.98 300.98 305.69C307.44 307.95 306.5 312.72 305.34 318.66C304.88 321.02 304.93 323.28 303.69 325.43ZM280.78 330.34C280.5 334.48 278.24 342.83 274.7 345.31C272.14 345.46 267.07 345.05 265.48 342.63C263.5 339.65 266.33 328.8 268.9 326.6C271.75 326.56 278.86 328.28 280.78 330.34ZM301.92 331.07C301.13 335.19 300.34 339.31 299.56 343.44C297.12 345.23 291.29 346.01 288.73 344.51C290.22 340.03 291.71 335.55 293.21 331.07C296.11 331.07 299.02 331.07 301.92 331.07Z");
    const ENV_FLAP = new Path2D("M400.95 50.97C400.98 58.15 401.01 65.33 401.04 72.51C400.99 202.64 400.94 332.77 400.89 462.9C400.75 338.12 400.62 213.33 400.48 88.55C397.35 98.63 389.08 104.57 381.13 111.1C362.82 126.13 342.47 136.22 320.82 145.24C309.59 149.92 318.92 164.05 307.92 167.95C301.76 170.14 288.66 168.75 281.72 168.75C263.01 168.75 244.31 168.75 225.61 168.75C218.72 168.75 201.95 170.32 196.32 167.67C188.81 164.14 192.4 156.46 189.74 150.42C187.87 146.17 183.14 144.81 179.21 143.23C158.86 135.06 139.83 124.3 122.85 110.24C115.29 103.98 107.53 98.3 104.5 88.68C104.37 213.26 104.23 337.85 104.1 462.44C104.05 337.75 104.01 213.06 103.96 88.37C103.99 75.9 104.01 63.44 104.04 50.97C103.92 42.04 111.98 40.74 119 40.74C134.9 40.74 150.79 40.74 166.69 40.74C226.7 40.74 286.7 40.74 346.71 40.74C360.43 40.74 374.14 40.74 387.86 40.74C394.43 40.74 401.03 43.18 400.95 50.97Z");
    const ENV_GOLD = new Path2D("M104.04 50.97C104.01 63.44 103.99 75.9 103.96 88.37C103.99 75.9 104.01 63.44 104.04 50.97ZM400.95 50.97C400.98 58.15 401.01 65.33 401.04 72.51C401.01 65.33 400.98 58.15 400.95 50.97ZM247.71 184.42C266.5 181.33 280.18 193.7 292.23 205.97C300.41 214.3 308.71 222.54 317.02 230.74C328.47 242.05 339.78 253.49 351.15 264.88C360.87 274.6 370.57 283.75 372.85 297.99C376.48 320.66 363.67 332.67 349.27 347.18C331.03 365.56 312.5 383.66 294.34 402.11C283.5 413.13 272.58 425.09 256 425.93C234.37 427.02 223.67 415.3 209.71 401.17C202.74 394.11 195.65 387.18 188.68 380.12C177.16 368.43 165.52 356.85 153.86 345.29C144.1 335.62 134.8 326.68 132.19 312.59C129.91 300.37 133.6 287.56 141.18 277.94C147.19 270.32 155 263.85 161.8 256.95C176.03 242.5 190.6 228.39 204.82 213.93C218.01 200.52 228.18 187.64 247.71 184.42ZM250.04 205.95C239.39 206.62 231.47 217.74 224.56 224.8C206.44 243.3 187.86 261.35 169.6 279.71C162 287.35 151.45 295.24 153.22 307.43C154.63 317.13 162.05 323.03 168.65 329.56C181.03 341.79 193.27 354.18 205.59 366.49C214.24 375.15 222.86 383.83 231.53 392.45C237.72 398.61 243.31 404.53 252.73 404.41C264.88 404.24 272.58 393.3 280.46 385.43C298.55 367.37 316.73 349.39 334.7 331.2C342.44 323.36 353.55 315.27 351.74 302.76C350.34 293.03 342.9 287.2 336.33 280.65C323.99 268.36 311.72 256 299.39 243.71C291.35 235.69 283.34 227.64 275.3 219.62C267.73 212.06 261.64 205.22 250.04 205.95ZM299.83 252.73C297.14 258.03 294.44 263.33 291.74 268.62C295.22 270.86 300.66 267.43 303.87 270.49C302.29 275.57 302.91 281.33 300.9 286.21C299.56 289.45 295.88 291.03 294.67 293.87C295.92 295.61 300.16 295.69 302.29 296.05C306.6 296.77 311.8 298.38 314.99 301.49C318.2 304.61 318.16 308.87 317.8 313.04C316.96 322.53 315.13 332.41 312.19 341.45C311.1 344.8 309.94 348.93 306.63 350.82C302.31 353.29 296.41 353.76 291.54 354.07C282.94 354.61 272.82 356.16 264.45 353.44C259.86 351.95 254.18 350.37 253.04 344.82C251.44 336.99 255.63 328.57 257.29 321.03C257.89 318.26 259.53 313.35 257.4 311.17C251.33 313.54 245.25 315.9 239.17 318.26C235.31 326.53 233.9 344.97 238.17 353.12C239.52 355.71 241.88 357.09 243.84 359.1C244.46 363.05 238.31 365.34 234.96 364.77C231.13 364.12 227.74 359.37 226.22 356.13C222.89 349.05 223.25 340.38 224.17 332.77C224.57 329.47 226.68 324.84 225.61 321.72C219.92 321.14 205.61 324.31 199.08 325.18C196.03 325.59 191.23 327.39 189.09 324.1C184.16 316.47 197.45 307.64 202.97 305.14C205.23 304.11 208.46 303.5 209.85 301.36C205.43 298.73 189.41 302.46 186.93 292.47C187.97 289.48 192.23 288.11 194.9 286.79C200.46 284.04 211.41 280.74 214.84 275.64C212.11 272.3 198.82 262.24 207.07 257.35C218.46 250.61 216.13 262.29 221.42 267.44C223.61 269.56 227.12 269.03 228.86 271.43C226.03 278.98 217.55 282.77 210.72 285.8C207.98 287.01 202.25 288.25 201 291.07C202.75 294.17 207.93 294.23 211.11 294.24C216.35 294.25 226.01 293.27 230.63 290.71C233.83 288.93 237.39 282.92 242.49 287.51C244.56 289.38 242.51 291.81 242.44 293.9C244.52 295.31 247.03 293.98 248.86 296.21C248.78 299.79 242.57 303.31 244.31 306.77C247.11 306.24 257.44 301.97 258.4 299.48C257.86 298.44 256.76 297.64 256.34 296.57C254.81 292.66 259.84 292.03 261.09 289.67C260.23 287.08 258.15 285.73 258.2 282.65C258.33 274.25 264.67 270.16 272.37 269.33C274.48 269.1 277.09 269.88 279.11 269.06C280.52 268.49 285.46 259.59 285.46 258.05C279.88 256.44 267.17 260.06 263.01 256.4C262.43 252.99 265.56 251.34 268.62 250.96C275.91 250.04 283.73 250.81 291.07 250.81C294.02 250.81 298.03 249.98 299.83 252.73ZM290.6 275.32C287.39 273.97 284.15 276.86 280.78 276.87C276.95 276.89 276.09 273.66 271.43 275.23C267.75 284.6 273.64 286.28 281.72 286.33C283.77 286.34 287.35 286.92 289.05 285.54C290.71 284.2 290.8 277.37 290.6 275.32ZM280.31 302.66C277.35 302.23 274.38 301.79 271.41 301.36C270.32 303.36 269.91 315.49 270.49 317.96C272.61 319.81 278.94 322.07 281.61 321.46C282.64 318.11 282.12 305.72 280.31 302.66ZM232.69 302.76C230.25 302.68 227.66 304.64 225.45 305.62C221.06 307.58 216.46 309.17 211.96 310.81C209.81 311.59 206.71 312.26 205.69 314.45C207.86 316.08 211.84 314.41 214.39 314.11C217.14 313.79 227.84 312.82 229.5 311.1C230.44 310.13 230.75 308.51 231.33 307.31C232.15 305.61 233.02 304.66 232.69 302.76ZM303.69 325.43C304.93 323.28 304.88 321.02 305.34 318.66C306.5 312.72 307.44 307.95 300.98 305.69C298.94 304.98 296.46 304.11 294.29 304.16C293.2 305.96 293.9 308.17 293.97 310.24C294.13 314.93 293.24 320.15 294.01 324.73C296.53 326.14 300.97 326.25 303.69 325.43ZM280.78 330.34C278.86 328.28 271.75 326.56 268.9 326.6C266.33 328.8 263.5 339.65 265.48 342.63C267.07 345.05 272.14 345.46 274.7 345.31C278.24 342.83 280.5 334.48 280.78 330.34ZM301.92 331.07C299.02 331.07 296.11 331.07 293.21 331.07C291.71 335.55 290.22 340.03 288.73 344.51C291.29 346.01 297.12 345.23 299.56 343.44C300.34 339.31 301.13 335.19 301.92 331.07Z");
    const ENV_CENTER = { x: 252.5, y: 257 };
    const ENV_HEIGHT = 432;

    function envelopesEffect() {
        const rand = (min, max) => min + Math.random() * (max - min);

        return {
            rate: (mobile) => (mobile ? 2.5 : 4),

            spawn(width) {
                const coin = Math.random() < 0.2;
                return {
                    x: rand(-20, width + 20),
                    y: rand(-60, -15),
                    coin,
                    size: coin ? rand(6, 9) : rand(8, 12),     // «радиус», px
                    vy: rand(52, 98),
                    drift: rand(-12, 12),
                    amp: rand(14, 32),
                    freq: rand(0.8, 1.6),
                    phase: rand(0, Math.PI * 2),
                    rot: rand(0, Math.PI * 2),
                    spin: coin ? rand(-2.2, 2.2) : rand(-1.1, 1.1),
                    flipSpeed: rand(1.4, 2.6),
                    age: 0
                };
            },

            update(p, dt) {
                p.age += dt;
                p.y += p.vy * dt;
                p.x += (p.drift + Math.cos(p.age * p.freq + p.phase) * p.amp) * dt;
                p.rot += p.spin * dt;
            },

            isGone(p, width, height) {
                return p.y - p.size * 2.5 > height || p.x < -80 || p.x > width + 80;
            },

            draw(ctx, p) {
                const flip = 0.35 + 0.65 * Math.abs(Math.cos(p.age * p.flipSpeed + p.phase));
                const scale = p.size / 10;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.scale(scale * flip, scale);

                if (p.coin) {
                    ctx.fillStyle = "#e0b118";
                    ctx.fill(COIN, "evenodd");
                    ctx.lineWidth = 0.9;
                    ctx.strokeStyle = "rgba(139, 94, 12, 0.55)";
                    ctx.stroke(COIN);
                } else {
                    // конверт из red-envelope.svg: масштабируем так, чтобы его
                    // высота (432 ед.) равнялась прежним 24 локальным единицам
                    const k = 24 / ENV_HEIGHT;
                    ctx.scale(k, k);
                    ctx.translate(-ENV_CENTER.x, -ENV_CENTER.y);
                    ctx.fillStyle = "#d82b20";
                    ctx.fill(ENV_BODY, "evenodd");
                    ctx.fillStyle = "#a62027";
                    ctx.fill(ENV_FLAP, "evenodd");
                    ctx.fillStyle = "#e0b118";
                    ctx.fill(ENV_GOLD, "evenodd");
                }

                ctx.restore();
            }
        };
    }


    /* ---------- Эффект «небесные фонарики» (Праздник фонарей) ----------
       Тёплые бумажные фонарики медленно поднимаются снизу вверх, мягко
       светятся и покачиваются — как запускают небесные фонарики на
       Праздник фонарей. В отличие от остальных эффектов частицы здесь
       летят ВВЕРХ: спавнятся под нижним краем (у спавна есть height) и
       уходят за верхний. */

    function skyLanternsEffect() {
        const rand = (min, max) => min + Math.random() * (max - min);

        return {
            rate: (mobile) => (mobile ? 0.9 : 1.4),

            spawn(width, height) {
                return {
                    x: rand(width * 0.04, width * 0.96),
                    y: height + 50,
                    size: rand(9, 15),                 // половина ширины фонарика, px
                    vy: -rand(26, 50),                 // вверх
                    drift: rand(2, 14),
                    amp: rand(8, 22),
                    freq: rand(0.5, 1.1),
                    phase: rand(0, Math.PI * 2),
                    flicker: rand(1.6, 3.2),           // мерцание огонька
                    age: 0
                };
            },

            update(p, dt) {
                p.age += dt;
                p.y += p.vy * dt;
                p.x += (p.drift + Math.cos(p.age * p.freq + p.phase) * p.amp) * dt;
            },

            isGone(p, width, height) {
                return p.y + p.size * 4 < 0 || p.x < -100 || p.x > width + 100;
            },

            draw(ctx, p) {
                const r = p.size;
                const w = r;                           // половина ширины
                const h = r * 1.35;                    // половина высоты
                const glow = 0.8 + 0.2 * Math.sin(p.age * p.flicker + p.phase);
                const sway = Math.sin(p.age * p.freq + p.phase) * 0.1;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(sway);

                // свечение вокруг (мягкий круг, который гаснет к краю)
                const halo = ctx.createRadialGradient(0, h * 0.3, 0, 0, h * 0.3, r * 3.4);
                halo.addColorStop(0, `rgba(255, 190, 90, ${0.5 * glow})`);
                halo.addColorStop(1, "rgba(255, 190, 90, 0)");
                ctx.fillStyle = halo;
                ctx.beginPath();
                ctx.arc(0, h * 0.3, r * 3.4, 0, Math.PI * 2);
                ctx.fill();

                // бумажный корпус: сверху уже, книзу шире, как колокол
                ctx.beginPath();
                ctx.moveTo(-w * 0.55, -h);
                ctx.lineTo(w * 0.55, -h);
                ctx.lineTo(w, h * 0.85);
                ctx.lineTo(-w, h * 0.85);
                ctx.closePath();
                const body = ctx.createLinearGradient(0, -h, 0, h);
                body.addColorStop(0, "#F59A38");
                body.addColorStop(1, "#FFD98A");
                ctx.fillStyle = body;
                ctx.fill();
                ctx.lineWidth = 1;
                ctx.strokeStyle = "rgba(139, 70, 12, 0.5)";
                ctx.stroke();

                // вертикальные рёбра
                ctx.lineWidth = 0.8;
                ctx.strokeStyle = "rgba(139, 70, 12, 0.3)";
                ctx.beginPath();
                ctx.moveTo(0, -h);
                ctx.lineTo(0, h * 0.85);
                ctx.moveTo(-w * 0.28, -h);
                ctx.lineTo(-w * 0.5, h * 0.85);
                ctx.moveTo(w * 0.28, -h);
                ctx.lineTo(w * 0.5, h * 0.85);
                ctx.stroke();

                // горящее «дно» — огонёк внутри
                const flame = ctx.createRadialGradient(0, h * 0.85, 0, 0, h * 0.85, w);
                flame.addColorStop(0, `rgba(255, 244, 190, ${0.95 * glow})`);
                flame.addColorStop(1, "rgba(255, 220, 130, 0)");
                ctx.fillStyle = flame;
                ctx.beginPath();
                ctx.ellipse(0, h * 0.85, w * 0.95, w * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }
        };
    }


    /* ---------- Движок: холст, цикл, запуск/остановка ---------- */

    const canvas = document.createElement("canvas");
    canvas.className = "seasonal-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const effect = season.effect();
    let particles = [];
    let width = 0;
    let height = 0;
    let spawnUntil = 0;     // до какого момента (performance.now) сыплются новые
    let spawnDebt = 0;      // накопленная «доля» частицы между кадрами
    let lastTime = null;
    let frameId = 0;

    const isMobile = () => window.innerWidth <= MOBILE_MAX_WIDTH;

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    let resizeQueued = false;
    window.addEventListener("resize", () => {
        if (resizeQueued) return;
        resizeQueued = true;
        requestAnimationFrame(() => { resizeQueued = false; resize(); });
    });
    resize();

    const isSpawning = () => performance.now() < spawnUntil;

    function frame(now) {
        frameId = 0;

        // вкладку не видно — не крутим цикл вхолостую; продолжим, когда вернётся
        if (document.hidden) { lastTime = null; return; }

        const dt = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        if (isSpawning()) {
            spawnDebt += effect.rate(isMobile()) * dt;
            while (spawnDebt >= 1) { particles.push(effect.spawn(width, height)); spawnDebt -= 1; }
        }

        ctx.clearRect(0, 0, width, height);

        particles = particles.filter((p) => {
            effect.update(p, dt, width, height);
            if (effect.isGone(p, width, height)) return false;
            effect.draw(ctx, p);
            return true;
        });

        paintButton();

        // всё упало и новых нет — цикл останавливается совсем
        if (particles.length || isSpawning()) {
            frameId = requestAnimationFrame(frame);
        } else {
            ctx.clearRect(0, 0, width, height);
            lastTime = null;
        }
    }

    function ensureLoop() {
        if (!frameId) frameId = requestAnimationFrame(frame);
    }

    document.addEventListener("visibilitychange", () => {
        if (!document.hidden && (particles.length || isSpawning())) ensureLoop();
    });

    function start() {
        if (effect.start) effect.start();
        spawnUntil = performance.now() + RUN_MS;
        store.set("sessionStorage", SEEN_KEY, "1");
        paintButton();
        ensureLoop();
    }

    // Остановка — только новые перестают появляться, уже летящие
    // долетают до низа (так естественнее, чем исчезновение на месте)
    function stop() {
        spawnUntil = 0;
        paintButton();
    }


    /* ---------- Кнопка ---------- */

    const button = document.createElement("button");
    button.type = "button";
    button.className = "seasonal-toggle";
    button.title = season.title;
    button.setAttribute("aria-label", season.title);
    button.setAttribute("aria-pressed", "false");
    button.innerHTML = `
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            ${season.icon}
        </svg>`;
    document.body.appendChild(button);

    function paintButton() {
        button.setAttribute("aria-pressed", isSpawning() ? "true" : "false");
    }

    button.addEventListener("click", () => {
        if (isSpawning()) {
            // человек сам остановил — в следующие заходы не включаем сами
            store.set("localStorage", OFF_KEY, "1");
            stop();
        } else {
            store.remove("localStorage", OFF_KEY);
            start();
        }
    });


    /* ---------- Автозапуск: один раз за визит ---------- */

    const alreadySeen = store.get("sessionStorage", SEEN_KEY);
    const userTurnedOff = store.get("localStorage", OFF_KEY) === "1";

    if (!alreadySeen && !userTurnedOff) {
        setTimeout(start, 700);
    }
})();
