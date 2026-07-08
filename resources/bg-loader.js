window.__cwerReady = false;
Promise.all([
    document.fonts.ready,
    new Promise(function(r) { window.addEventListener('load', r); })
]).then(function() {
    requestAnimationFrame(function() { window.__cwerReady = true; });
});

(function() {
    var bgUrls = [
        'https://t.alcy.cc/mp',
        'https://t.alcy.cc/moemp',
        'https://api.r10086.com/' + encodeURIComponent('樱道随机图片api接口.php') + '?' + encodeURIComponent('图片系列') + '=' + encodeURIComponent('动漫综合2,动漫综合1竖屏系列1') + '&参数=json'
    ];
    var maxRetries = 1;
    var currentIndex = 0;
    var currentRetry = 0;
    var bgEl = document.getElementById('bgImage');
    var fallbackApplied = false;

    function applyFallback() {
        if (fallbackApplied) return;
        fallbackApplied = true;
        if (bgEl) {
            bgEl.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';
            bgEl.classList.add('loaded');
        }
    }

    function tryLoadBg(url, isJson) {
        if (isJson) {
            fetch(url)
                .then(function(res) { return res.json(); })
                .then(function(data) {
                    var imgUrl = data.url || data.img || data.image || data.data;
                    if (imgUrl) {
                        var img = new Image();
                        img.onload = function() {
                            bgEl.style.backgroundImage = 'url(' + imgUrl + ')';
                            bgEl.classList.add('loaded');
                        };
                        img.onerror = function() { advanceOrFallback(); };
                        img.src = imgUrl;
                    } else {
                        advanceOrFallback();
                    }
                })
                .catch(function() { advanceOrFallback(); });
        } else {
            var img = new Image();
            img.onload = function() {
                bgEl.style.backgroundImage = 'url(' + url + ')';
                bgEl.classList.add('loaded');
            };
            img.onerror = function() { advanceOrFallback(); };
            img.src = url;
        }
    }

    function advanceOrFallback() {
        currentRetry++;
        if (currentRetry <= maxRetries) {
            tryLoadBg(bgUrls[currentIndex], bgUrls[currentIndex].indexOf('参数=json') > -1);
        } else {
            currentIndex++;
            currentRetry = 0;
            if (currentIndex < bgUrls.length) {
                tryNext();
            } else {
                applyFallback();
            }
        }
    }

    function tryNext() {
        if (currentIndex >= bgUrls.length) { applyFallback(); return; }
        var url = bgUrls[currentIndex];
        var isJson = url.indexOf('参数=json') > -1;
        currentRetry = 0;
        tryLoadBg(url, isJson);
    }

    tryNext();
    setTimeout(applyFallback, 8000);
})();
