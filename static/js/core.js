let loaderTimer = null;
let activeRequests = 0;

function getLoader() {
    return document.getElementById("global-loader");
}

function setLoaderText(text) {
    const el = document.querySelector("#global-loader p");
    if (el) el.textContent = text;
}

function showLoader(text = "Processing...") {
    const loader = getLoader();
    if (!loader) return;

    activeRequests++;
    setLoaderText(text);

    if (!loaderTimer) {
        loaderTimer = setTimeout(() => {
            loader.classList.add("active");
            document.body.classList.add("loading");
        }, 300); // lebih smooth
    }
}

function hideLoader() {
    const loader = getLoader();
    if (!loader) return;

    activeRequests--;

    if (activeRequests <= 0) {
        activeRequests = 0;
        clearTimeout(loaderTimer);
        loaderTimer = null;
        loader.classList.remove("active");
        document.body.classList.remove("loading");
    }
}