/* ========================================
   BUSY BEE — «ЧАЙНЫЙ ПЕРЕРЫВ» (reader.html + chapter.html)
   ========================================
   Если читатель долго читает без перерыва, в углу экрана мягко
   появляется карточка: «Вы читаете уже 2 часа без перерыва. Сделайте
   глоток чая и дайте глазам отдохнуть…» и кнопка «Я в порядке, читаем
   дальше». Ничего не блокирует и не прячет — кнопки навигации остаются
   на месте.

   ПОДКЛЮЧАТЬ ПОСЛЕ script.js (берём оттуда pluralRu; если его нет —
   есть запасная копия ниже), на обеих страницах чтения:
       <script src="script.js"></script>
       <script src="reader-script.js"></script>
       <script src="tea-break.js"></script>
   Стили карточки — в конце reader-style.css (блок «ЧАЙНЫЙ ПЕРЕРЫВ»).

   КАК СЧИТАЕТСЯ ВРЕМЯ
   Это не таймер, который тикает в фоне, а сумма промежутков между
   действиями читателя. Действие — прокрутка, колесо, касание, клик,
   клавиша, открытие страницы. Каждый раз, когда оно случилось, мы
   смотрим, сколько прошло с прошлого действия, и прибавляем это время
   к счётчику — вот почему три минуты спокойного чтения одной страницы
   на большом экране засчитываются полностью. Правила:
     • один промежуток засчитывается не больше MAX_STEP_MS (5 минут):
       если человек отвлёкся, а вкладку не закрыл, это не «чтение»;
     • пауза без действий дольше BREAK_MS (15 минут) — настоящий перерыв,
       читатель уже отдохнул, счётчик начинается с нуля;
     • время, пока вкладка была скрыта (ушёл в другое окно, заблокировал
       телефон), не считается;
     • счётчик лежит в localStorage, а не в памяти страницы: у вас каждая
       глава — отдельная страница, и без этого он обнулялся бы при
       переходе к следующей главе. Несколько вкладок делят один счётчик.

   КОГДА ПОЯВЛЯЕТСЯ
   Когда счётчик дошёл до REMIND_AFTER_MS, но не посреди прокрутки, а
   после короткой паузы (CALM_MS) — чтобы карточка не выскочила под
   пальцем. Показали — значит учли: следующее напоминание только после
   SNOOZE_MS новой активности, даже если кнопку не нажали (иначе при
   каждом переходе к главе она всплывала бы снова). Сам по себе, без
   действий читателя, показ не запускается.

   ДЛЯ ПРОВЕРКИ (ничего не нужно менять в коде):
     • адрес с ?tea=10 — порог и «отложить» = 10 секунд (запоминается на
       время вкладки, переходы по главам его не сбрасывают);
     • ?tea=reset — обнулить счётчик и вернуть обычные времена;
     • в консоли localStorage.setItem("busybee_tea_break_off", "1") —
       выключить напоминания совсем (так же будет работать выключатель
       в настройках, когда он появится); удалить ключ — включить. */

(function () {
    "use strict";

    /* ---------- Времена (миллисекунды) ---------- */

    // ТЕСТОВЫЕ значения — чтобы посмотреть, как это выглядит. В бою:
    //   REMIND_AFTER_MS = 2 * 60 * 60 * 1000   (два часа активного чтения)
    //   SNOOZE_MS       = 60 * 60 * 1000       (следующее — через час)
    const REMIND_AFTER_MS = 2 * 60 * 1000;
    const SNOOZE_MS = 1 * 60 * 1000;

    const MAX_STEP_MS = 5 * 60 * 1000;   // максимум за один промежуток между действиями
    const BREAK_MS = 15 * 60 * 1000;     // пауза дольше — перерыв был, счётчик с нуля
    const CALM_MS = 1500;                // показать после стольких мс без действий
    const THROTTLE_MS = 700;             // прокрутка шлёт десятки событий в секунду — считаем реже

    const STATE_KEY = "busybee_tea_break";       // { activeMs, lastActionAt, remindAtMs }
    const OFF_KEY = "busybee_tea_break_off";     // "1" — напоминания выключены
    const TEST_KEY = "busybee_tea_break_test";   // sessionStorage: секунды из ?tea=N


    /* ---------- Режим проверки: ?tea=10 / ?tea=reset ---------- */

    let testSeconds = 0;

    try {
        const teaParam = new URLSearchParams(location.search).get("tea");

        if (teaParam === "reset") {
            localStorage.removeItem(STATE_KEY);
            sessionStorage.removeItem(TEST_KEY);
        } else if (teaParam && Number(teaParam) > 0) {
            sessionStorage.setItem(TEST_KEY, String(Number(teaParam)));
            localStorage.removeItem(STATE_KEY); // с этим адресом всегда начинаем с нуля
        }

        testSeconds = Number(sessionStorage.getItem(TEST_KEY)) || 0;
    } catch (error) { /* хранилище недоступно — работаем с обычными временами */ }

    const remindAfterMs = testSeconds ? testSeconds * 1000 : REMIND_AFTER_MS;
    const snoozeMs = testSeconds ? testSeconds * 1000 : SNOOZE_MS;


    /* ---------- Хранилище ---------- */

    function isOff() {
        try {
            return localStorage.getItem(OFF_KEY) === "1";
        } catch (error) {
            return false;
        }
    }

    function loadState() {
        try {
            const raw = JSON.parse(localStorage.getItem(STATE_KEY));
            if (raw && Number.isFinite(raw.activeMs) && Number.isFinite(raw.lastActionAt) && Number.isFinite(raw.remindAtMs)) {
                return raw;
            }
        } catch (error) { /* мусор в хранилище — начнём заново */ }
        return null;
    }

    function saveState(state) {
        try {
            localStorage.setItem(STATE_KEY, JSON.stringify(state));
        } catch (error) { /* не сохранилось — не страшно */ }
    }

    function freshState(now) {
        return { activeMs: 0, lastActionAt: now, remindAtMs: remindAfterMs };
    }


    /* ---------- Подсчёт ---------- */

    let lastHandledAt = 0;

    function registerAction(force) {
        if (isOff() || document.visibilityState === "hidden") return;

        const now = Date.now();
        if (!force && now - lastHandledAt < THROTTLE_MS) return;
        lastHandledAt = now;

        let state = loadState();

        if (!state || now - state.lastActionAt > BREAK_MS) {
            // первый раз или после настоящего перерыва — с нуля
            state = freshState(now);
        } else {
            state.activeMs += Math.min(Math.max(now - state.lastActionAt, 0), MAX_STEP_MS);
            state.lastActionAt = now;
        }

        saveState(state);

        if (state.activeMs >= state.remindAtMs) scheduleShow();
    }

    // Вкладку скрыли или уходим со страницы: докидываем в счётчик то, что
    // успели прочитать с прошлого действия (иначе последняя страница
    // чтения перед уходом пропала бы). Если пауза и так была перерывом,
    // не трогаем — следующее действие само начнёт с нуля.
    function flush() {
        if (isOff()) return;

        const state = loadState();
        if (!state) return;

        const now = Date.now();
        const gap = now - state.lastActionAt;
        if (gap > BREAK_MS) return;

        state.activeMs += Math.min(Math.max(gap, 0), MAX_STEP_MS);
        state.lastActionAt = now;
        saveState(state);
    }

    // Вернулись на вкладку: время, пока её не было видно, не считаем
    // (если оно было дольше перерыва, счётчик сбросится на следующем действии)
    function resume() {
        if (isOff()) return;

        const state = loadState();
        if (!state) return;

        const now = Date.now();
        if (now - state.lastActionAt <= BREAK_MS) {
            state.lastActionAt = now;
            saveState(state);
        }
    }


    /* ---------- Текст ---------- */

    function plural(n, one, few, many) {
        if (typeof pluralRu === "function") return pluralRu(n, one, few, many);
        const mod10 = n % 10;
        const mod100 = n % 100;
        if (mod10 === 1 && mod100 !== 11) return one;
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
        return many;
    }

    // «2 минуты» / «1 час 10 мин» / «2 часа» — реальное время, а не всегда «два часа»
    function formatDuration(ms) {
        const totalMin = Math.max(1, Math.round(ms / 60000));

        if (totalMin < 60) {
            return `${totalMin} ${plural(totalMin, "минуту", "минуты", "минут")}`;
        }

        let hours = Math.floor(totalMin / 60);
        let minutes = Math.round((totalMin % 60) / 5) * 5; // до пяти минут, «58 мин» звучит странно
        if (minutes === 60) {
            hours += 1;
            minutes = 0;
        }

        const hoursText = `${hours} ${plural(hours, "час", "часа", "часов")}`;
        return minutes ? `${hoursText} ${minutes} мин` : hoursText;
    }

    // Фраз несколько — чтобы карточка не говорила одно и то же. Обращение
    // нейтральное: пола читателя мы не знаем.
    const MESSAGES = [
        (t) => `Вы читаете уже ${t} без перерыва. Сделайте глоток чая и дайте глазам отдохнуть, почтенный читатель.`,
        (t) => `Ваш чай, должно быть, давно остыл: вы читаете уже ${t} подряд. Немного отдыха не повредит, почтенный читатель.`,
        (t) => `${t} без перерыва! Самое время налить свежего чая и немного размяться, почтенный читатель.`
    ];


    /* ---------- Карточка ---------- */

    let card = null;
    let cardVisible = false;
    let calmTimer = null;

    function ensureCard() {
        if (card) return card;

        card = document.createElement("aside");
        card.className = "tea-break";
        card.setAttribute("role", "status");
        card.setAttribute("aria-live", "polite");
        card.innerHTML = `
            <span class="tea-break-icon" aria-hidden="true">☕</span>
            <div class="tea-break-body">
                <p class="tea-break-text"></p>
                <button type="button" class="tea-break-btn">Я в порядке, читаем дальше</button>
            </div>`;

        card.querySelector(".tea-break-btn").addEventListener("click", hideCard);
        document.body.appendChild(card);
        return card;
    }

    function scheduleShow() {
        if (cardVisible) return;
        clearTimeout(calmTimer);
        calmTimer = setTimeout(showCard, CALM_MS);
    }

    function showCard() {
        if (cardVisible || isOff() || document.visibilityState === "hidden") return;

        // Перечитываем: за это время другая вкладка могла уже показать карточку
        const state = loadState();
        if (!state || state.activeMs < state.remindAtMs) return;

        // Показали — значит учли: следующее напоминание через SNOOZE активного времени
        state.remindAtMs = state.activeMs + snoozeMs;
        saveState(state);

        const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
        ensureCard().querySelector(".tea-break-text").textContent = message(formatDuration(state.activeMs));

        cardVisible = true;
        // Класс — на следующем кадре, иначе плавное появление не сработает
        requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add("is-visible")));
    }

    function hideCard() {
        if (!card) return;
        cardVisible = false;
        card.classList.remove("is-visible");
    }


    /* ---------- Что считается действием читателя ---------- */

    // capture: true — чтобы поймать прокрутку любого блока на странице
    // (scroll не всплывает, но в фазе перехвата доходит до document)
    ["scroll", "wheel", "keydown", "pointerdown", "touchstart", "touchmove"].forEach((type) => {
        document.addEventListener(type, () => registerAction(false), { capture: true, passive: true });
    });

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") flush();
        else resume();
    });

    window.addEventListener("pagehide", flush);

    // Открыть страницу тоже действие: так время непрерывно идёт при
    // переходе от главы к главе
    registerAction(true);
})();
