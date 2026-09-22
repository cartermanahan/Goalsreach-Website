document.addEventListener("DOMContentLoaded", () => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cinematicHero = window.matchMedia("(min-width: 921px) and (pointer: fine)");
    const revealElements = Array.from(document.querySelectorAll(".reveal"));
    const scrollScenes = Array.from(document.querySelectorAll("[data-scroll-scene]"));
    const faqItems = Array.from(document.querySelectorAll(".faq-item"));
    let scrollFrame = 0;

    document.querySelectorAll(".review-stars").forEach((stars) => {
        stars.setAttribute("role", "img");
        stars.setAttribute("aria-label", "5 out of 5 stars");
    });

    revealElements.forEach((element, index) => {
        element.style.setProperty("--reveal-order", String(index % 4));
    });

    const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);

    function updateRevealState() {
        if (reducedMotion.matches) {
            revealElements.forEach((element) => {
                element.style.setProperty("--reveal-progress", "1");
                element.classList.add("is-visible", "is-complete");
            });
            return;
        }

        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const revealStart = viewportHeight * 0.94;
        const revealEnd = viewportHeight * 0.62;
        const revealDistance = Math.max(1, revealStart - revealEnd);

        revealElements.forEach((element) => {
            const rect = element.getBoundingClientRect();
            const progress = clamp((revealStart - rect.top) / revealDistance);
            element.style.setProperty("--reveal-progress", progress.toFixed(4));
            element.classList.toggle("is-visible", progress > 0.01);
            element.classList.toggle("is-complete", progress > 0.995);
        });
    }

    function updateSceneState() {
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

        if (!cinematicHero.matches || reducedMotion.matches) {
            scrollScenes.forEach((scene) => scene.style.setProperty("--scene-progress", "1"));
            return;
        }

        scrollScenes.forEach((scene) => {
            const rect = scene.getBoundingClientRect();
            const entryDistance = viewportHeight * 0.78;
            const scrollRange = Math.max(1, rect.height - viewportHeight + entryDistance);
            const progress = clamp((entryDistance - rect.top) / scrollRange);
            scene.style.setProperty("--scene-progress", progress.toFixed(4));
        });
    }

    function updateScrollState() {
        scrollFrame = 0;
        updateRevealState();
        updateSceneState();
    }

    function requestScrollUpdate() {
        if (scrollFrame) {
            return;
        }

        scrollFrame = window.requestAnimationFrame(updateScrollState);
    }

    faqItems.forEach((item) => {
        item.addEventListener("toggle", () => {
            if (!item.open) {
                return;
            }

            faqItems.forEach((otherItem) => {
                if (otherItem !== item) {
                    otherItem.open = false;
                }
            });
        });
    });

    const heroController = initHeroScrollScrub({ cinematicHero, reducedMotion, clamp });

    window.addEventListener("scroll", requestScrollUpdate, { passive: true });
    window.addEventListener("resize", () => {
        requestScrollUpdate();
        heroController?.resize();
    }, { passive: true });
    window.addEventListener("pageshow", () => {
        requestScrollUpdate();
        heroController?.sync();
    });
    reducedMotion.addEventListener("change", () => {
        requestScrollUpdate();
        heroController?.syncMode();
    });
    cinematicHero.addEventListener("change", () => {
        requestScrollUpdate();
        heroController?.syncMode();
    });

    updateScrollState();
    document.documentElement.classList.add("motion-ready");
});

function initHeroScrollScrub({ cinematicHero, reducedMotion, clamp }) {
    const section = document.querySelector("[data-scroll-scrub-section]");
    const canvas = section?.querySelector("[data-scroll-scrub-canvas]");
    const context = canvas?.getContext("2d", { alpha: false, desynchronized: true });

    if (!section || !canvas || !context) {
        return null;
    }

    const primaryCount = Number.parseInt(canvas.dataset.frameCount || "0", 10);
    const secondaryCount = Number.parseInt(canvas.dataset.secondaryFrameCount || "0", 10);
    const primaryPrefix = canvas.dataset.framePrefix || "";
    const secondaryPrefix = canvas.dataset.secondaryFramePrefix || "";
    const primaryExtension = canvas.dataset.frameExtension || ".webp";
    const secondaryExtension = canvas.dataset.secondaryFrameExtension || primaryExtension;
    const totalCount = primaryCount + secondaryCount;
    const frameCache = new Map();
    const pendingFrames = new Map();
    let currentImage = null;
    let currentIndex = -1;
    let requestedIndex = 0;
    let previousRequestedIndex = 0;
    let heroFrame = 0;
    let canvasWidth = 0;
    let canvasHeight = 0;
    let isCinematic = cinematicHero.matches && !reducedMotion.matches;
    let activeLoads = 0;

    if (!primaryCount || !totalCount || !primaryPrefix) {
        return null;
    }

    const framePath = (index) => {
        if (index >= primaryCount && secondaryCount && secondaryPrefix) {
            const secondaryIndex = index - primaryCount + 1;
            return `${secondaryPrefix}${String(secondaryIndex).padStart(3, "0")}${secondaryExtension}`;
        }

        return `${primaryPrefix}${String(index + 1).padStart(3, "0")}${primaryExtension}`;
    };

    const progressToFrame = (progress) => {
        if (!secondaryCount) {
            return Math.round(progress * (primaryCount - 1));
        }

        if (progress <= 0.38) {
            return Math.round((progress / 0.38) * (primaryCount - 1));
        }

        if (progress <= 0.58) {
            return primaryCount - 1;
        }

        const secondaryProgress = clamp((progress - 0.58) / 0.392);
        return primaryCount + Math.round(secondaryProgress * (secondaryCount - 1));
    };

    const resizeCanvas = () => {
        const bounds = canvas.getBoundingClientRect();
        const pixelRatio = isCinematic ? Math.min(window.devicePixelRatio || 1, 1.5) : 1;
        const nextWidth = Math.max(1, Math.round(bounds.width * pixelRatio));
        const nextHeight = Math.max(1, Math.round(bounds.height * pixelRatio));

        if (nextWidth === canvasWidth && nextHeight === canvasHeight) {
            return;
        }

        canvasWidth = nextWidth;
        canvasHeight = nextHeight;
        canvas.width = nextWidth;
        canvas.height = nextHeight;

        if (currentImage) {
            drawFrame(currentImage);
        }
    };

    const drawFrame = (image) => {
        if (!image) {
            return;
        }

        resizeCanvas();
        const imageWidth = image.naturalWidth || image.width;
        const imageHeight = image.naturalHeight || image.height;
        const scale = Math.max(canvasWidth / imageWidth, canvasHeight / imageHeight);
        const width = imageWidth * scale;
        const height = imageHeight * scale;
        const x = (canvasWidth - width) / 2;
        const y = (canvasHeight - height) / 2;
        context.drawImage(image, x, y, width, height);
    };

    const pruneCache = () => {
        const cacheLimit = isCinematic ? 8 : 1;

        if (frameCache.size <= cacheLimit) {
            return;
        }

        const protectedFrames = new Set([0, currentIndex, requestedIndex]);
        const candidates = Array.from(frameCache.keys())
            .filter((index) => !protectedFrames.has(index))
            .sort((a, b) => Math.abs(b - requestedIndex) - Math.abs(a - requestedIndex));

        while (frameCache.size > cacheLimit && candidates.length) {
            frameCache.delete(candidates.shift());
        }
    };

    const loadFrame = (index, priority = false) => {
        const safeIndex = clamp(Math.round(index), 0, totalCount - 1);

        if (frameCache.has(safeIndex)) {
            const cachedImage = frameCache.get(safeIndex);
            frameCache.delete(safeIndex);
            frameCache.set(safeIndex, cachedImage);
            return Promise.resolve(cachedImage);
        }

        if (pendingFrames.has(safeIndex)) {
            return pendingFrames.get(safeIndex);
        }

        if (!priority && activeLoads >= 2) {
            return Promise.resolve(null);
        }

        if (priority && activeLoads >= 4) {
            return new Promise((resolve) => {
                window.setTimeout(() => {
                    if (safeIndex !== requestedIndex) {
                        resolve(null);
                        return;
                    }

                    loadFrame(safeIndex, true).then(resolve);
                }, 48);
            });
        }

        const request = new Promise((resolve) => {
            const image = new Image();
            activeLoads += 1;
            image.decoding = "async";
            image.fetchPriority = priority ? "high" : "low";
            image.onload = () => {
                activeLoads = Math.max(0, activeLoads - 1);
                frameCache.set(safeIndex, image);
                pendingFrames.delete(safeIndex);
                pruneCache();
                resolve(image);
            };
            image.onerror = () => {
                activeLoads = Math.max(0, activeLoads - 1);
                pendingFrames.delete(safeIndex);
                resolve(null);
            };
            image.src = framePath(safeIndex);
        });

        pendingFrames.set(safeIndex, request);
        return request;
    };

    const displayFrame = async (index) => {
        requestedIndex = clamp(Math.round(index), 0, totalCount - 1);
        const image = await loadFrame(requestedIndex, true);

        if (!image || requestedIndex !== index) {
            return;
        }

        currentIndex = requestedIndex;
        currentImage = image;
        drawFrame(image);
    };

    const warmNearbyFrames = (index) => {
        if (!isCinematic) {
            return;
        }

        const direction = index >= previousRequestedIndex ? 1 : -1;
        previousRequestedIndex = index;
        const nearby = [index + direction, index + (direction * 2), index - direction];

        const warm = () => nearby.forEach((nearbyIndex) => {
            if (nearbyIndex >= 0 && nearbyIndex < totalCount) {
                loadFrame(nearbyIndex);
            }
        });

        if ("requestIdleCallback" in window) {
            window.requestIdleCallback(warm, { timeout: 180 });
        } else {
            window.setTimeout(warm, 40);
        }
    };

    const syncStageClasses = (progress) => {
        section.classList.toggle("is-detail-stage", isCinematic && progress >= 0.28 && progress < 0.66);
        section.classList.toggle("is-followthrough-stage", isCinematic && progress >= 0.66);
    };

    const updateHero = () => {
        heroFrame = 0;

        if (!isCinematic) {
            section.style.setProperty("--hero-scrub-progress", "0");
            syncStageClasses(0);
            return;
        }

        const rect = section.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const scrollRange = Math.max(1, rect.height - viewportHeight);
        const progress = clamp(-rect.top / scrollRange);
        const nextIndex = progressToFrame(progress);
        section.style.setProperty("--hero-scrub-progress", progress.toFixed(4));
        syncStageClasses(progress);

        if (nextIndex !== requestedIndex || currentIndex < 0) {
            displayFrame(nextIndex);
            warmNearbyFrames(nextIndex);
        }
    };

    const requestHeroUpdate = () => {
        if (!isCinematic) {
            return;
        }

        if (!heroFrame) {
            heroFrame = window.requestAnimationFrame(updateHero);
        }
    };

    const syncMode = () => {
        isCinematic = cinematicHero.matches && !reducedMotion.matches;
        section.classList.toggle("has-scroll-scrub", isCinematic);
        section.classList.toggle("is-static-hero", !isCinematic);
        frameCache.clear();
        pendingFrames.clear();
        currentImage = null;
        currentIndex = -1;
        requestedIndex = isCinematic ? progressToFrame(0) : 0;
        resizeCanvas();

        if (isCinematic) {
            updateHero();
        } else {
            section.style.setProperty("--hero-scrub-progress", "0");
            displayFrame(0);
        }
    };

    window.addEventListener("scroll", requestHeroUpdate, { passive: true });
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            requestHeroUpdate();
        }
    });

    syncMode();

    return {
        sync: requestHeroUpdate,
        resize: () => {
            resizeCanvas();
            requestHeroUpdate();
        },
        syncMode,
    };
}
