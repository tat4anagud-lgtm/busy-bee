/* ========================================
   BUSY BEE — ANNOUNCEMENTS PAGE INTERACTION
   ======================================== */

// Note: the header's search, notifications, theme toggle, and user menu
// are all wired up globally by script.js — nothing page-specific needed
// here for those. This file covers category filtering, likes, bookmarks
// and the poll card, all specific to this page's feed.

document.addEventListener("DOMContentLoaded", () => {

    const sidebarCategoryMenu = document.getElementById("sidebarCategoryMenu");
    const feedCards = document.querySelectorAll(".feed-card");

    /* Фильтр по категориям — сравниваем по data-category (слаги вроде
       "new-chapters", а не видимый русский текст кнопки) */
    if (sidebarCategoryMenu) {
        sidebarCategoryMenu.addEventListener("click", (event) => {
            const btn = event.target.closest(".menu-item");
            if (!btn) return;

            document.querySelectorAll(".menu-item").forEach((m) => m.classList.remove("active"));
            btn.classList.add("active");

            // На телефоне меню — горизонтальный ряд с прокруткой: частично
            // видимую «пилюлю» подводим к центру. block: "nearest" — чтобы
            // страница при этом не прыгала по вертикали.
            btn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });

            const selectedCategory = btn.getAttribute("data-category");

            feedCards.forEach((card) => {
                const cardCategory = card.getAttribute("data-category");
                card.style.display =
                    selectedCategory === "all" || cardCategory === selectedCategory ? "block" : "none";
            });
        });
    }

    /* Лайки — тот же outline/filled свап иконки (heart.svg → heart-filled.svg)
       и класс .liked, что и у постов на странице переводчика, плюс +1 к
       счётчику под кнопкой, раз он у неё уже был */
    document.querySelectorAll(".like-btn").forEach((btn) => {
        const icon = btn.querySelector("img");
        const countSpan = btn.querySelector(".stat-count");

        btn.addEventListener("click", () => {
            const isLiked = btn.classList.toggle("liked");
            btn.setAttribute("aria-pressed", isLiked);
            if (icon) icon.src = isLiked ? icon.dataset.filled : icon.dataset.outline;

            let baseLikes = parseInt(btn.getAttribute("data-likes"), 10) || 0;
            baseLikes += isLiked ? 1 : 0;

            if (countSpan) {
                countSpan.textContent = baseLikes >= 1000 ? (baseLikes / 1000).toFixed(1) + "K" : baseLikes;
            }
        });
    });

    /* Закладки не биндим здесь — кнопки несут класс .mini-bookmark и уже
       подхватываются общим обработчиком в script.js (тот же outline/filled
       свап bookmark.svg → bookmark-filled-gold.svg, что и везде на сайте) */

    /* Опрос */
    const pollCard = document.querySelector(".poll-card");
    if (pollCard) {
        const voteBtn = pollCard.querySelector(".btn-secondary");
        const radios = pollCard.querySelectorAll('input[type="radio"]');

        if (voteBtn) {
            voteBtn.addEventListener("click", () => {
                const selected = Array.from(radios).find((r) => r.checked);
                if (selected) {
                    voteBtn.textContent = "Голос принят!";
                    voteBtn.style.backgroundColor = "var(--honey)";
                    voteBtn.style.color = "#FFFFFF";
                    voteBtn.disabled = true;
                } else {
                    alert("Пожалуйста, выберите вариант ответа.");
                }
            });
        }
    }

});
