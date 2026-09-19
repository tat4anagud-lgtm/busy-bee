/* ========================================
   BUSY BEE — ABOUT PAGE INTERACTION
   ======================================== */

// Note: the header's search, notifications, theme toggle, and user menu
// are all wired up globally by script.js — nothing page-specific needed
// here for those. This file only covers the "Почему Busy Bee" feature
// cards' entrance animation.

document.addEventListener("DOMContentLoaded", () => {

    /* Плавное появление карточек в блоке "Почему Busy Bee" при
       прокрутке до них */
    const featureCards = document.querySelectorAll(".feature-card");

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry, index) => {
                    if (entry.isIntersecting) {
                        setTimeout(() => {
                            entry.target.style.opacity = "1";
                            entry.target.style.transform = "translateY(0)";
                        }, index * 60);
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.1 }
        );

        featureCards.forEach((card) => {
            card.style.opacity = "0";
            card.style.transform = "translateY(12px)";
            card.style.transition = "opacity 0.4s ease, transform 0.4s ease, border-color 0.2s";
            observer.observe(card);
        });
    }

});
