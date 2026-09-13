/* ========================================
   BUSY BEE — TRANSLATOR PAGE INTERACTION
   ======================================== */

// Note: the heart (.favorite-btn) and bookmark (.mini-bookmark) icons used
// throughout this page are already wired up globally by script.js — no
// extra code needed here for those. The only icon-toggle specific to this
// page is the like-count button in each post's footer (icon + number),
// handled below the same way script.js handles quote likes.

document.addEventListener("DOMContentLoaded", () => {

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

});