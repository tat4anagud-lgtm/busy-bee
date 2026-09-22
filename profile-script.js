/* ========================================
   BUSY BEE — USER PROFILE INTERACTION
   ======================================== */

document.addEventListener("DOMContentLoaded", () => {

    /* 1. Карусели («Продолжить чтение», «Избранное»)
       Схема как на главной: .profile-carousel = стрелка + дорожка + стрелка.
       Прокрутку и зацикливание ведёт общая setupCarousel из script.js.
       Здесь её подключаем и прячем стрелки, когда все карточки и так
       помещаются. ResizeObserver пересчитывает это при любом изменении
       размера дорожки — в том числе когда вкладка «Избранного» из
       скрытой становится видимой. */
    document.querySelectorAll(".profile-carousel").forEach((carousel) => {
        const track = carousel.querySelector(".carousel-track");
        const arrows = carousel.querySelectorAll(".carousel-arrow");
        if (!track) return;

        if (typeof setupCarousel === "function") {
            setupCarousel(carousel);
        }

        const updateArrows = () => {
            // у скрытой вкладки размеры нулевые — тогда ничего не трогаем
            if (track.clientWidth === 0) return;

            const fits = track.scrollWidth <= track.clientWidth + 1;
            arrows.forEach((arrow) => {
                arrow.style.display = fits ? "none" : "";
            });
        };

        updateArrows();
        new ResizeObserver(updateArrows).observe(track);
    });

    /* 2. Чипы «Избранного»: Новеллы / Цитаты / Коллекции
       Переключают панель внутри блока. Стрелки ← → на клавиатуре
       двигают выбор между чипами (стандартное поведение вкладок). */
    document.querySelectorAll(".chip-row").forEach((row) => {
        const tabs = Array.from(row.querySelectorAll('[role="tab"]'));

        const select = (tab) => {
            tabs.forEach((t) => {
                const isActive = t === tab;
                t.classList.toggle("active", isActive);
                t.setAttribute("aria-selected", isActive);
                t.tabIndex = isActive ? 0 : -1;

                const panel = document.getElementById(t.getAttribute("aria-controls"));
                if (panel) panel.hidden = !isActive;
            });
        };

        tabs.forEach((tab, index) => {
            tab.addEventListener("click", () => select(tab));

            tab.addEventListener("keydown", (event) => {
                if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
                event.preventDefault();

                const step = event.key === "ArrowRight" ? 1 : -1;
                const next = tabs[(index + step + tabs.length) % tabs.length];
                select(next);
                next.focus();
            });
        });
    });

    /* Левое меню: активный пункт («Мой профиль») задан прямо в HTML
       и на каждой странице раздела ставится самой страницей,
       поэтому переключать его кликом не нужно. */

    /* 3. Лайк под цитатами — тот же outline/filled свап иконки сердца,
       что и у .favorite-btn на других страницах, плюс ±1 к счётчику */
    document.querySelectorAll(".btn-like").forEach((button) => {
        const icon = button.querySelector("img");
        const countEl = button.querySelector(".like-count");
        if (!icon) return;

        // \s ловит и обычный, и неразрывный пробел («1 250»)
        const baseCount = countEl ? Number(countEl.textContent.replace(/\s/g, "")) || 0 : 0;

        button.addEventListener("click", () => {
            const isLiked = button.classList.toggle("active");
            button.setAttribute("aria-pressed", isLiked);
            icon.src = isLiked ? icon.dataset.filled : icon.dataset.outline;

            if (countEl) {
                countEl.textContent = (baseCount + (isLiked ? 1 : 0)).toLocaleString("ru-RU");
            }
        });
    });

});
