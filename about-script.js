/* ========================================
   BUSY BEE — ABOUT PAGE INTERACTION
   Шапка, поиск, уведомления и переключатель темы подключаются глобально
   через script.js — здесь только сцена «Почему Busy Bee?»:
   качающееся дерево (canvas) + дощечки с пожеланиями.
   ======================================== */

document.addEventListener("DOMContentLoaded", () => {
    const frame = document.getElementById("treeFrame");
    if (!frame) return;

    const stage = document.getElementById("treeStage");
    const scene = document.getElementById("treeScene");
    const plant = document.getElementById("treePlant");
    const cv = document.getElementById("treeCanvas");
    const dim = document.getElementById("treeDim");
    const ctx = cv.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---------- данные дощечек из списка #treeData ---------- */
    const TABLETS = [...document.querySelectorAll("#treeData li")].map((li) => ({
        x: parseFloat(li.dataset.x),
        y: parseFloat(li.dataset.y),
        len: parseFloat(li.dataset.len) || 3,
        title: li.querySelector("strong").textContent.trim(),
        text: li.querySelector("span").textContent.trim()
    }));

    /* ---------- ветер ---------- */
    const sceneStyle = getComputedStyle(scene);
    let S = 0.4, V = 0.6;
    function readWind() {
        S = parseFloat(sceneStyle.getPropertyValue("--wind-strength"));
        V = parseFloat(sceneStyle.getPropertyValue("--wind-speed"));
        if (isNaN(S)) S = 0.4;
        if (isNaN(V)) V = 0.6;
    }
    /* Заготовка под погоду: BB_WIND.set(сила, скорость) */
    window.BB_WIND = {
        set(strength, speed) {
            scene.style.setProperty("--wind-strength", strength);
            if (speed != null) scene.style.setProperty("--wind-speed", speed);
            readWind();
        }
    };
    readWind();

    /* Смещение по горизонтали на высоте y (0 — верх дерева, 1 — низ):
       корни неподвижны, чем выше — тем сильнее гнётся. */
    let iw = 0, ih = 0;
    function dx(y, t) {
        const hf = Math.max(0, Math.min(1, (0.86 - y) / 0.86));
        const ph = t * V - hf * 1.3;
        const w = Math.sin(ph * 0.9) * 0.55 + Math.sin(ph * 1.7 + 1.3) * 0.3 + Math.sin(ph * 0.37) * 0.45;
        return 0.018 * iw * S * hf * hf * w;
    }

    /* ---------- дощечки ---------- */
    const anchors = TABLETS.map((o, i) => {
        const a = document.createElement("div");
        a.className = "tree-anchor";
        a.style.left = o.x + "%";
        a.style.top = o.y + "%";

        const b = document.createElement("button");
        b.className = "tree-tablet";
        b.type = "button";
        b.setAttribute("aria-expanded", "false");
        b.setAttribute("aria-label", o.title);
        b.style.cssText = "--len:" + o.len + ";--dur:" + (2.6 + i * 0.37).toFixed(2) +
            ";--delay:-" + (i * 0.9).toFixed(1) + "s;--a:" + (2.2 + (i % 3) * 0.7);
        b.innerHTML = '<span class="tree-thread"></span><span class="tree-plate"><span class="tree-title"></span><span class="tree-mark" aria-hidden="true">蜜</span></span>';
        b.querySelector(".tree-title").textContent = o.title;
        b.addEventListener("click", (e) => { e.stopPropagation(); show(i, b); });

        a.appendChild(b);
        plant.appendChild(a);
        return a;
    });

    /* ---------- большая дощечка ----------
       На странице у .page-shell стоит zoom: 0.9, поэтому координаты из
       getBoundingClientRect приводим к «внутренним» пикселям сцены
       через коэффициент k. */
    let cur = -1, big = null;

    function sceneK() {
        return (scene.getBoundingClientRect().width / scene.offsetWidth) || 1;
    }

    function startTransform(i, b) {
        const k = sceneK();
        const s = scene.getBoundingClientRect();
        const r = anchors[i].querySelector(".tree-plate").getBoundingClientRect();
        const bw = b.offsetWidth, bh = b.offsetHeight;
        const cx = (r.left - s.left + r.width / 2) / k;
        const cy = (r.top - s.top + r.height / 2) / k;
        return "translate(" + (cx - (b.offsetLeft + bw / 2)) + "px," + (cy - (b.offsetTop + bh / 2)) + "px) scale(" + ((r.width / k) / bw) + ")";
    }

    function show(i, btn) {
        if (cur === i) { hide(); return; }
        hide(true);
        cur = i;
        const T = TABLETS[i];

        big = document.createElement("div");
        big.className = "tree-big";
        big.setAttribute("role", "dialog");
        big.setAttribute("aria-modal", "true");
        big.setAttribute("aria-label", T.title);
        big.innerHTML = '<span class="tree-mark" aria-hidden="true">蜜</span><div class="t"><h3></h3><hr><p></p></div><button class="tree-close" type="button" aria-label="Закрыть">×</button>';
        big.querySelector("h3").textContent = T.title;
        big.querySelector("p").textContent = T.text;
        big.style.left = "0";
        big.style.top = "0";
        scene.appendChild(big);

        /* ставим по центру видимой части (важно при зуме и прокрутке) */
        const bw = big.offsetWidth, bh = big.offsetHeight;
        const cx = stage.scrollLeft + stage.clientWidth / 2;
        const cy = stage.scrollTop + stage.clientHeight / 2;
        big.style.left = Math.max(8, Math.min(scene.clientWidth - bw - 8, cx - bw / 2)) + "px";
        big.style.top = Math.max(8, Math.min(scene.clientHeight - bh - 8, cy - bh / 2)) + "px";

        const from = startTransform(i, big);
        btn.classList.add("away");
        btn.setAttribute("aria-expanded", "true");
        dim.hidden = false;
        void dim.offsetWidth;
        dim.classList.add("on");

        if (!reduce) {
            big.animate(
                [{ transform: from, opacity: 0.9 }, { transform: "none", opacity: 1 }],
                { duration: 520, easing: "cubic-bezier(.2,1.05,.3,1)" }
            );
        }
        const close = big.querySelector(".tree-close");
        close.addEventListener("click", () => hide());
        close.focus({ preventScroll: true });
    }

    function hide(immediate) {
        if (cur === -1) return;
        const i = cur, b = big, btn = anchors[i].firstChild;
        cur = -1;
        big = null;
        dim.classList.remove("on");

        const done = () => {
            b.remove();
            btn.classList.remove("away");
            btn.setAttribute("aria-expanded", "false");
            if (cur === -1) dim.hidden = true;
            if (!immediate) btn.focus({ preventScroll: true });
        };
        if (immediate || reduce) { done(); return; }

        b.animate(
            [{ transform: "none", opacity: 1 }, { transform: startTransform(i, b), opacity: 0.9 }],
            { duration: 380, easing: "cubic-bezier(.5,0,.75,0)", fill: "forwards" }
        ).onfinish = done;
    }

    dim.addEventListener("click", () => hide());
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") hide(); });

    /* ---------- дерево: рисуем полосками, чем выше — тем сильнее сдвиг ---------- */
    const img = new Image();
    let ready = false, visible = true;

    function resize() {
        const d = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.round(plant.clientWidth * d);
        cv.height = Math.round(plant.clientHeight * d);
        draw(0);
    }

    function draw(t) {
        if (!ready) return;
        const k = cv.width / iw;
        ctx.clearRect(0, 0, cv.width, cv.height);
        for (let sy = 0; sy < ih; sy += 3) {
            const o = dx((sy + 1.5) / ih, t) * k;
            ctx.drawImage(img, 0, sy, iw, 3, o, sy * k, cv.width, 3 * k + 1);
        }
        /* дощечки двигаются вместе с веткой, на которой висят */
        const pxk = plant.clientWidth / iw;
        TABLETS.forEach((o, i) => {
            anchors[i].style.transform = "translateX(" + (dx(o.y / 100, t) * pxk).toFixed(2) + "px)";
        });
    }

    const t0 = performance.now();
    let frameCount = 0;
    function loop(now) {
        if (visible && !document.hidden) {
            if (++frameCount % 60 === 0) readWind();
            draw((now - t0) / 1000);
        }
        requestAnimationFrame(loop);
    }

    img.onload = () => {
        iw = img.naturalWidth;
        ih = img.naturalHeight;
        ready = true;
        frame.classList.add("is-live");
        resize();
        if (!reduce) requestAnimationFrame(loop);
    };
    img.src = cv.dataset.src;

    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(plant);
    if ("IntersectionObserver" in window) {
        new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; }).observe(stage);
    }

    /* ---------- зум (кнопки + и − и двойной клик / тап) ---------- */
    let z = 1;
    function setZoom(n) {
        n = Math.max(1, Math.min(2.2, n));
        const ratio = n / z, cw = stage.clientWidth, ch = stage.clientHeight;
        const cx = stage.scrollLeft + cw / 2, cy = stage.scrollTop + ch / 2;
        z = n;
        scene.style.setProperty("--z", z);
        stage.classList.toggle("zoomed", z > 1);
        hide(true);
        stage.scrollLeft = cx * ratio - cw / 2;
        stage.scrollTop = cy * ratio - ch / 2;
    }
    document.getElementById("treeZoomIn").addEventListener("click", () => setZoom(z + 0.4));
    document.getElementById("treeZoomOut").addEventListener("click", () => setZoom(z - 0.4));
    document.getElementById("treeZoomReset").addEventListener("click", () => setZoom(1));
    scene.addEventListener("dblclick", (e) => {
        if (!e.target.closest(".tree-tablet")) setZoom(z > 1 ? 1 : 1.8);
    });
});
