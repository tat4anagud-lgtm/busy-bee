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

            const selectedCategory = btn.getAttribute("data-category");

            feedCards.forEach((card) => {
                const cardCategory = card.getAttribute("data-category");
                card.style.display =
                    selectedCategory === "all" || cardCategory === selectedCategory ? "block" : "none";
            });
        });
    }

    /* Лайки */
    document.querySelectorAll(".like-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const isLiked = btn.classList.contains("active");
            const countSpan = btn.querySelector(".stat-count");
            let baseLikes = parseInt(btn.getAttribute("data-likes"), 10) || 0;

            if (!isLiked) {
                btn.classList.add("active");
                baseLikes += 1;
            } else {
                btn.classList.remove("active");
            }

            if (countSpan) {
                countSpan.textContent = baseLikes >= 1000 ? (baseLikes / 1000).toFixed(1) + "K" : baseLikes;
            }
        });
    });

    /* Закладки */
    document.querySelectorAll(".bookmark-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            btn.classList.toggle("active");
        });
    });

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
