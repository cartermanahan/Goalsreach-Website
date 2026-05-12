document.addEventListener("DOMContentLoaded", () => {
    const prefersReducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const revealElements = document.querySelectorAll(".reveal");
    const navAnchors = document.querySelectorAll('.navbar .nav-links a[href^="#"]');
    const observedSections = Array.from(navAnchors)
        .map((anchor) => document.querySelector(anchor.getAttribute("href")))
        .filter(Boolean);
    const faqItems = document.querySelectorAll(".faq-item");

    if (!("IntersectionObserver" in window) || prefersReducedMotionQuery.matches) {
        revealElements.forEach((element) => element.classList.add("visible"));
    } else {
        const revealObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) {
                        return;
                    }

                    entry.target.classList.add("visible");
                    revealObserver.unobserve(entry.target);
                });
            },
            {
                threshold: 0.14,
                rootMargin: "0px 0px -40px 0px",
            }
        );

        revealElements.forEach((element) => revealObserver.observe(element));
    }

    if ("IntersectionObserver" in window && observedSections.length) {
        const navObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) {
                        return;
                    }

                    const activeId = `#${entry.target.id}`;
                    navAnchors.forEach((anchor) => {
                        anchor.classList.toggle("is-active", anchor.getAttribute("href") === activeId);
                    });
                });
            },
            {
                threshold: 0.3,
                rootMargin: "-90px 0px -55% 0px",
            }
        );

        observedSections.forEach((section) => navObserver.observe(section));
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

    initHeroScrollScrub(prefersReducedMotionQuery);
    initScrollScenes(prefersReducedMotionQuery);
});

function initHeroScrollScrub(prefersReducedMotionQuery) {
    const section = document.querySelector("[data-scroll-scrub-section]");
    const canvas = section?.querySelector("[data-scroll-scrub-canvas]");
    const context = canvas?.getContext("2d", { alpha: false });

    if (!section || !canvas || !context) {
        return;
    }

    const primaryFrameCount = Number.parseInt(canvas.dataset.frameCount || "0", 10);
    const primaryFramePrefix = canvas.dataset.framePrefix || "";
    const primaryFrameExtension = canvas.dataset.frameExtension || "";
    const secondaryFrameCount = Number.parseInt(canvas.dataset.secondaryFrameCount || "0", 10);
    const secondaryFramePrefix = canvas.dataset.secondaryFramePrefix || "";
    const secondaryFrameExtension = canvas.dataset.secondaryFrameExtension || primaryFrameExtension;
    const hasSecondarySequence = secondaryFrameCount > 0 && Boolean(secondaryFramePrefix);
    const totalFrameCount = primaryFrameCount + (hasSecondarySequence ? secondaryFrameCount : 0);

    if (!primaryFrameCount || !primaryFramePrefix || !primaryFrameExtension || !totalFrameCount) {
        return;
    }

    const mobileQuery = window.matchMedia("(max-width: 920px), (pointer: coarse)");
    const segmentPrimaryVisualEnd = hasSecondarySequence ? 0.38 : 0.84;
    const segmentPrimaryHoldEnd = hasSecondarySequence ? 0.58 : 1;
    const segmentSecondaryVisualEnd = 0.972;
    const firstStageRelease = 0.58;
    const wheelProgressCapPrimary = 0.012;
    const wheelProgressCapSecondary = 0.0062;
    const touchProgressCapPrimary = 0.016;
    const touchProgressCapSecondary = 0.0086;
    const maxDesktopStepPrimary = 0.0066;
    const maxDesktopStepSecondary = 0.0034;
    const maxMobileStepPrimary = 0.0055;
    const maxMobileStepSecondary = 0.0039;
    const frames = new Array(totalFrameCount).fill(null);
    const keyboardProgressKeys = new Map([
        ["ArrowDown", 0.06],
        ["PageDown", 0.1],
        [" ", 0.1],
        ["ArrowUp", -0.06],
        ["PageUp", -0.1],
    ]);
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const framePath = (index) => {
        if (hasSecondarySequence && index >= primaryFrameCount) {
            const secondaryIndex = index - primaryFrameCount;

            return `${secondaryFramePrefix}${String(secondaryIndex + 1).padStart(3, "0")}${secondaryFrameExtension}`;
        }

        return `${primaryFramePrefix}${String(index + 1).padStart(3, "0")}${primaryFrameExtension}`;
    };
    const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);
    const buildTailWeightedSequence = (frameCount, tailSpan = 18, maxExtraCopies = 5) => {
        const sequence = [];
        const tailStartIndex = Math.max(0, frameCount - tailSpan);

        for (let index = 0; index < frameCount; index += 1) {
            sequence.push(index);

            if (index < tailStartIndex || index === (frameCount - 1)) {
                continue;
            }

            const tailProgress = (index - tailStartIndex) / Math.max(1, (frameCount - 1) - tailStartIndex);
            const extraCopies = 1 + Math.round(Math.pow(tailProgress, 1.3) * maxExtraCopies);

            for (let copyIndex = 0; copyIndex < extraCopies; copyIndex += 1) {
                sequence.push(index);
            }
        }

        return sequence;
    };
    const buildCinematicSecondarySequence = (frameCount) => {
        const sequence = [];

        for (let index = 0; index < frameCount; index += 1) {
            const progress = index / Math.max(1, frameCount - 1);
            const edgeDistance = Math.min(progress, 1 - progress);
            const edgeBoost = Math.max(0, 1 - (edgeDistance / 0.18));
            const centerBoost = Math.max(0, 1 - (Math.abs(progress - 0.56) / 0.26));
            const baseCopies = index === (frameCount - 1) ? 0 : 1;
            const edgeCopies = index === (frameCount - 1)
                ? 0
                : Math.round(Math.pow(edgeBoost, 1.15) * 1);
            const centerCopies = index === (frameCount - 1)
                ? 0
                : Math.round(Math.pow(centerBoost, 1.28) * 2);
            const extraCopies = baseCopies + edgeCopies + centerCopies;

            sequence.push(index);

            for (let copyIndex = 0; copyIndex < extraCopies; copyIndex += 1) {
                sequence.push(index);
            }
        }

        return sequence;
    };
    const primaryFrameSequence = buildTailWeightedSequence(primaryFrameCount, 18, 5);
    const secondaryFrameSequence = hasSecondarySequence
        ? buildCinematicSecondarySequence(secondaryFrameCount)
        : [];

    let activeFrameIndex = -1;
    let currentProgress = 0;
    let targetProgress = 0;
    let animationFrameId = 0;
    let autoLoopDirection = 1;
    let lastLoopTime = 0;
    let lastTouchY = 0;
    let canvasWidth = 0;
    let canvasHeight = 0;

    section.classList.add("has-scroll-scrub");

    const getMaxProgress = () => 1;

    const mapPrimarySequenceProgress = (value) => {
        if (value <= firstStageRelease) {
            return value;
        }

        const tailProgress = (value - firstStageRelease) / (1 - firstStageRelease);
        return firstStageRelease + ((1 - firstStageRelease) * easeOutCubic(tailProgress));
    };

    const getSequenceFrameIndex = (sequence, progress) => {
        const sequenceIndex = Math.round(clamp(progress, 0, 1) * (sequence.length - 1));
        return sequence[sequenceIndex];
    };

    const isSecondaryVisualPhase = (progress) => hasSecondarySequence && progress > segmentPrimaryHoldEnd;

    const syncHeroStageState = (value) => {
        const storyProgress = clamp(value, 0, 1);
        const isDetailStage = !mobileQuery.matches && !prefersReducedMotionQuery.matches && storyProgress >= 0.28;
        const isFollowThroughStage = !mobileQuery.matches && !prefersReducedMotionQuery.matches && storyProgress >= 0.66;
        section.classList.toggle("is-detail-stage", isDetailStage);
        section.classList.toggle("is-followthrough-stage", isFollowThroughStage);
    };

    const setProgress = (value) => {
        const storyProgress = clamp(value, 0, 1);
        section.style.setProperty("--hero-scrub-progress", storyProgress.toFixed(4));
        syncHeroStageState(storyProgress);
    };

    const getFrameIndexForProgress = (value) => {
        const clampedValue = clamp(value, 0, 1);

        if (clampedValue <= segmentPrimaryVisualEnd) {
            const primaryProgress = mapPrimarySequenceProgress(clampedValue / segmentPrimaryVisualEnd);
            return getSequenceFrameIndex(primaryFrameSequence, primaryProgress);
        }

        if (clampedValue <= segmentPrimaryHoldEnd || !hasSecondarySequence) {
            return primaryFrameCount - 1;
        }

        if (clampedValue <= segmentSecondaryVisualEnd) {
            const secondaryProgress = (clampedValue - segmentPrimaryHoldEnd) / (segmentSecondaryVisualEnd - segmentPrimaryHoldEnd);
            return primaryFrameCount + getSequenceFrameIndex(secondaryFrameSequence, secondaryProgress);
        }

        return totalFrameCount - 1;
    };

    const getRenderableFrame = (index) => {
        if (frames[index]) {
            return frames[index];
        }

        for (let offset = 1; offset < totalFrameCount; offset += 1) {
            const previousIndex = index - offset;
            const nextIndex = index + offset;

            if (previousIndex >= 0 && frames[previousIndex]) {
                return frames[previousIndex];
            }

            if (nextIndex < totalFrameCount && frames[nextIndex]) {
                return frames[nextIndex];
            }
        }

        return null;
    };

    const resizeCanvas = () => {
        const bounds = canvas.getBoundingClientRect();
        const nextWidth = Math.max(1, Math.round(bounds.width * Math.min(window.devicePixelRatio || 1, 2)));
        const nextHeight = Math.max(1, Math.round(bounds.height * Math.min(window.devicePixelRatio || 1, 2)));

        if (nextWidth === canvasWidth && nextHeight === canvasHeight) {
            return;
        }

        canvasWidth = nextWidth;
        canvasHeight = nextHeight;
        canvas.width = nextWidth;
        canvas.height = nextHeight;
        activeFrameIndex = -1;
    };

    const drawCoverFrame = (image) => {
        if (!image) {
            return;
        }

        resizeCanvas();

        const imageWidth = image.naturalWidth || image.width;
        const imageHeight = image.naturalHeight || image.height;
        const scale = Math.max(canvasWidth / imageWidth, canvasHeight / imageHeight);
        const drawWidth = imageWidth * scale;
        const drawHeight = imageHeight * scale;
        const drawX = (canvasWidth - drawWidth) / 2;
        const drawY = (canvasHeight - drawHeight) / 2;

        context.clearRect(0, 0, canvasWidth, canvasHeight);
        context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    };

    const renderFrame = () => {
        const storyProgress = clamp(currentProgress, 0, 1);
        const nextFrameIndex = getFrameIndexForProgress(storyProgress);

        if (nextFrameIndex === activeFrameIndex) {
            setProgress(storyProgress);
            return;
        }

        const frame = getRenderableFrame(nextFrameIndex);

        if (!frame) {
            return;
        }

        activeFrameIndex = nextFrameIndex;
        drawCoverFrame(frame);
        setProgress(storyProgress);
    };

    const stopAnimationLoop = () => {
        if (!animationFrameId) {
            return;
        }

        cancelAnimationFrame(animationFrameId);
        animationFrameId = 0;
    };

    const animationStep = (timestamp) => {
        if (mobileQuery.matches && !prefersReducedMotionQuery.matches) {
            const delta = lastLoopTime ? timestamp - lastLoopTime : 16;
            lastLoopTime = timestamp;
            targetProgress = clamp(targetProgress + (delta * 0.00018 * autoLoopDirection), 0, 1);

            if (targetProgress >= 1) {
                targetProgress = 1;
                autoLoopDirection = -1;
            } else if (targetProgress <= 0) {
                targetProgress = 0;
                autoLoopDirection = 1;
            }
        }

        const progressDelta = targetProgress - currentProgress;

        if (Math.abs(progressDelta) > 0.0006) {
            const inSecondaryPhase = isSecondaryVisualPhase(currentProgress);
            const maxStep = mobileQuery.matches
                ? (inSecondaryPhase ? maxMobileStepSecondary : maxMobileStepPrimary)
                : (inSecondaryPhase ? maxDesktopStepSecondary : maxDesktopStepPrimary);
            const easingFactor = inSecondaryPhase ? 0.058 : 0.072;
            currentProgress += clamp(progressDelta * easingFactor, -maxStep, maxStep);
        } else {
            currentProgress = targetProgress;
        }

        renderFrame();

        if (mobileQuery.matches && !prefersReducedMotionQuery.matches) {
            animationFrameId = window.requestAnimationFrame(animationStep);
            return;
        }

        if (Math.abs(targetProgress - currentProgress) > 0.0006) {
            animationFrameId = window.requestAnimationFrame(animationStep);
            return;
        }

        animationFrameId = 0;
    };

    const startAnimationLoop = () => {
        if (animationFrameId) {
            return;
        }

        animationFrameId = window.requestAnimationFrame(animationStep);
    };

    const updateTargetProgress = (nextProgress) => {
        const clampedProgress = clamp(nextProgress, 0, getMaxProgress());

        if (clampedProgress === targetProgress) {
            return;
        }

        targetProgress = clampedProgress;
        startAnimationLoop();
    };

    const isHeroScrollLockActive = () => {
        if (prefersReducedMotionQuery.matches || mobileQuery.matches) {
            return false;
        }

        const heroRect = section.getBoundingClientRect();
        const pageIsAtTop = window.scrollY <= 2;

        return pageIsAtTop && heroRect.top <= 2 && heroRect.bottom > window.innerHeight * 0.5;
    };

    const isTextEntry = (target) => {
        if (!(target instanceof HTMLElement)) {
            return false;
        }

        return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
    };

    const handleWheel = (event) => {
        if (!isHeroScrollLockActive()) {
            return;
        }

        const maxProgress = getMaxProgress();
        const canScrubDown = event.deltaY > 0 && targetProgress < (maxProgress - 0.001);
        const canScrubUp = event.deltaY < 0 && targetProgress > 0.001;

        if (!canScrubDown && !canScrubUp) {
            return;
        }

        event.preventDefault();
        const inSecondaryPhase = isSecondaryVisualPhase(targetProgress);
        const wheelStep = inSecondaryPhase ? event.deltaY * 0.000032 : event.deltaY * 0.00014;
        const wheelCap = inSecondaryPhase ? wheelProgressCapSecondary : wheelProgressCapPrimary;
        updateTargetProgress(targetProgress + clamp(wheelStep, -wheelCap, wheelCap));
    };

    const handleTouchStart = (event) => {
        lastTouchY = event.touches[0]?.clientY ?? 0;
    };

    const handleTouchMove = (event) => {
        if (!isHeroScrollLockActive()) {
            return;
        }

        const currentTouchY = event.touches[0]?.clientY ?? lastTouchY;
        const deltaY = lastTouchY - currentTouchY;

        if (Math.abs(deltaY) < 1) {
            return;
        }

        const maxProgress = getMaxProgress();
        const isScrubbingDown = deltaY > 0 && targetProgress < (maxProgress - 0.001);
        const isScrubbingUp = deltaY < 0 && targetProgress > 0.001;

        if (!isScrubbingDown && !isScrubbingUp) {
            return;
        }

        event.preventDefault();
        lastTouchY = currentTouchY;
        const inSecondaryPhase = isSecondaryVisualPhase(targetProgress);
        const touchStep = inSecondaryPhase ? deltaY * 0.00006 : deltaY * 0.00024;
        const touchCap = inSecondaryPhase ? touchProgressCapSecondary : touchProgressCapPrimary;
        updateTargetProgress(targetProgress + clamp(touchStep, -touchCap, touchCap));
    };

    const handleKeyDown = (event) => {
        if (!isHeroScrollLockActive() || isTextEntry(event.target)) {
            return;
        }

        const maxProgress = getMaxProgress();

        if (event.key === "End" && targetProgress < (maxProgress - 0.001)) {
            event.preventDefault();
            updateTargetProgress(maxProgress);
            return;
        }

        if (event.key === "Home" && targetProgress > 0.001) {
            event.preventDefault();
            updateTargetProgress(0);
            return;
        }

        const progressDelta = keyboardProgressKeys.get(event.key);

        if (progressDelta === undefined) {
            return;
        }

        const nextProgress = clamp(targetProgress + progressDelta, 0, maxProgress);

        if (nextProgress === targetProgress) {
            return;
        }

        event.preventDefault();
        updateTargetProgress(nextProgress);
    };

    const syncMode = () => {
        if (prefersReducedMotionQuery.matches) {
            stopAnimationLoop();
            targetProgress = 0;
            currentProgress = 0;
            lastLoopTime = 0;
            autoLoopDirection = 1;
            renderFrame();
            return;
        }

        if (mobileQuery.matches) {
            lastLoopTime = 0;
            startAnimationLoop();
            return;
        }

        stopAnimationLoop();
        renderFrame();
    };

    const loadFrame = (index) => new Promise((resolve) => {
        const image = new Image();
        image.decoding = "async";
        image.src = framePath(index);
        image.onload = async () => {
            try {
                if (typeof image.decode === "function") {
                    await image.decode();
                }
            } catch (error) {
                // Ignore decode errors and keep the loaded image.
            }

            frames[index] = image;
            resolve(image);
        };
        image.onerror = () => resolve(null);
    });

    const loadFrames = async () => {
        await loadFrame(0);
        renderFrame();
        syncMode();

        const preloadJobs = [];

        for (let index = 1; index < totalFrameCount; index += 1) {
            preloadJobs.push(loadFrame(index));
        }

        await Promise.all(preloadJobs);
        renderFrame();
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", () => {
        resizeCanvas();
        renderFrame();
    }, { passive: true });
    document.addEventListener("visibilitychange", () => {
        if (document.hidden && mobileQuery.matches) {
            stopAnimationLoop();
            return;
        }

        syncMode();
    });
    prefersReducedMotionQuery.addEventListener("change", syncMode);
    mobileQuery.addEventListener("change", syncMode);

    loadFrames();
}

function initScrollScenes(prefersReducedMotionQuery) {
    const scenes = document.querySelectorAll("[data-scroll-scene]");

    if (!scenes.length) {
        return;
    }

    let animationFrameId = 0;
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const updateScenes = () => {
        animationFrameId = 0;

        scenes.forEach((scene) => {
            if (prefersReducedMotionQuery.matches) {
                scene.style.setProperty("--scene-progress", "1");
                return;
            }

            const rect = scene.getBoundingClientRect();
            const scrollRange = Math.max(1, rect.height - window.innerHeight);
            const progress = clamp((-rect.top) / scrollRange, 0, 1);
            scene.style.setProperty("--scene-progress", progress.toFixed(4));
        });
    };

    const requestUpdate = () => {
        if (animationFrameId) {
            return;
        }

        animationFrameId = window.requestAnimationFrame(updateScenes);
    };

    updateScenes();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    prefersReducedMotionQuery.addEventListener("change", requestUpdate);
}
