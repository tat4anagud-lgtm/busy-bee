/* ========================================
   BUSY BEE — СЕЗОННЫЕ ЭФФЕКТЫ
   ========================================
   Опадающие листья осенью, снегопад зимой (и «заготовка» под
   остальные сезоны — китайский Новый год, сакура, лето: см. SEASONS
   ниже).

   Подключение (только на тех страницах, где эффект нужен — сейчас
   главная):
       <link rel="stylesheet" href="seasonal-effects.css">
       ...
       <script src="seasonal-effects.js"></script>
   Разметку страницы менять не нужно: холст и кнопку скрипт создаёт
   сам. Файл самостоятельный — от script.js ничего не использует.

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
       index.html?season=winter */

(() => {
    "use strict";

    /* ---------- Настройки ---------- */

    const RUN_MS = 11000;                      // сколько листья «сыплются» за один запуск
    const OFF_KEY = "busybee_seasonal_off";    // localStorage: "1" — автозапуск выключен пользователем
    const SEEN_KEY = "busybee_seasonal_seen";  // sessionStorage: в этом визите уже играли
    const MOBILE_MAX_WIDTH = 768;              // как в style.css

    // Рубильник украшений (шапочка на логотипе и т.п.): false — вернёт сайт
    // как было, а снег и листья продолжат работать
    const DECORATIONS_ENABLED = true;

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
        }
        // { id: "sakura", title: "Лепестки сакуры", from: [3, 20], to: [4, 30], icon: "...", effect: () => sakuraEffect() },
    ];


    /* ---------- Какой сезон сейчас ---------- */

    function inRange(date, from, to) {
        const value = (date.getMonth() + 1) * 100 + date.getDate();
        const start = from[0] * 100 + from[1];
        const end = to[0] * 100 + to[1];
        // диапазон через Новый год (старт позже конца) — «или», а не «и»
        return start <= end ? value >= start && value <= end : value >= start || value <= end;
    }

    function currentSeason() {
        const forced = new URLSearchParams(location.search).get("season");
        if (forced) return SEASONS.find((s) => s.id === forced) || null;

        const now = new Date();
        return SEASONS.find((s) => inRange(now, s.from, s.to)) || null;
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

    function addSantaHats() {
        document.querySelectorAll(".logo img").forEach((img) => {
            if (img.parentElement.classList.contains("seasonal-hat-wrap")) return;

            const wrap = document.createElement("span");
            wrap.className = "seasonal-hat-wrap";
            img.parentNode.insertBefore(wrap, img);
            wrap.appendChild(img);
            wrap.insertAdjacentHTML("beforeend", HAT_SVG);
        });
    }

    if (DECORATIONS_ENABLED && season && typeof season.decorate === "function") {
        season.decorate();
    }

    // Дальше — холст со снегом/листьями. Ему не место при «уменьшить анимацию»
    if (!season || reduceMotion) return;


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
