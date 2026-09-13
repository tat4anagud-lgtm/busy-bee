/* ========================================
   BUSY BEE — COLLECTION INTERACTION LOGIC
   ======================================== */

document.addEventListener("DOMContentLoaded", () => {
    
    /* 1. Toggle Follow Collection Button */
    const btnFollow = document.getElementById("btnFollow");
    if (btnFollow) {
        btnFollow.addEventListener("click", () => {
            btnFollow.classList.toggle("following");
            const heart = btnFollow.querySelector(".heart-icon");
            const label = btnFollow.querySelector("span:last-child");

            if (btnFollow.classList.contains("following")) {
                heart.textContent = "♥";
                label.textContent = "Following";
            } else {
                heart.textContent = "♡";
                label.textContent = "Follow collection";
            }
        });
    }

    /* 2. Switch Grid / List View Modes */
    const viewGrid = document.getElementById("viewGrid");
    const viewList = document.getElementById("viewList");
    const novelsGrid = document.getElementById("novelsGrid");

    if (viewGrid && viewList && novelsGrid) {
        viewGrid.addEventListener("click", () => {
            viewGrid.classList.add("active");
            viewList.classList.remove("active");
            novelsGrid.classList.remove("list-view");
        });

        viewList.addEventListener("click", () => {
            viewList.classList.add("active");
            viewGrid.classList.remove("active");
            novelsGrid.classList.add("list-view");
        });
    }

    /* 3. Bookmark Toggle on Novel Cards */
    const bookmarkBtns = document.querySelectorAll(".card-bookmark-btn, .card-bookmark-overlay");
    bookmarkBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            btn.classList.toggle("active");
            btn.style.opacity = btn.classList.contains("active") ? "1" : "0.6";
        });
    });

    /* 4. Show More Button Mock Handler */
    const btnShowMore = document.getElementById("btnShowMore");
    if (btnShowMore) {
        btnShowMore.addEventListener("click", () => {
            btnShowMore.querySelector("span").textContent = "Loading...";
            setTimeout(() => {
                btnShowMore.querySelector("span").textContent = "All items loaded";
                btnShowMore.disabled = true;
                btnShowMore.style.opacity = "0.6";
            }, 600);
        });
    }
});