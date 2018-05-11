window.chatshierCookie = (function() {
    var CHSR_COOKIE = {
        USER_EMAIL: '_chsr_email',
        USER_NAME: '_chsr_username'
    };

    var domain = window.location.host.replace(/:\d+$/i, '');
    var DEFAULT_DOMAIN = domain.replace(/^[\w-]+\./i, '.');
    var INIT_TIME = 'Thu, 01 Jan 1970 00:00:00 UTC';

    var minTimeGap = 60 * 1000;
    var hourTimeGap = 60 * minTimeGap;
    var dayTimeGap = 24 * hourTimeGap;
    var yearTimeGap = 365 * dayTimeGap;

    var cookieManager = {
        /**
         * @param {string} name
         * @param {string} [val]
         * @param {string} [expires]
         * @param {string} [domain]
         * @param {string} [path]
         * @returns {boolean}
         */
        setCookie: function(name, val, expires, domain, path) {
            if (!name) {
                return false;
            }

            val = val || '';
            expires = expires || new Date(Date.now() + yearTimeGap).toGMTString();
            domain = domain || DEFAULT_DOMAIN;
            path = path || '/';

            document.cookie = name + '=' + encodeURIComponent(unescape(val)) + ';expires=' + expires + ';domain=' + domain + ';path=' + path;
            return true;
        },
        /**
         * @param {string} name
         */
        getCookie: function(name) {
            var cookieValues = '; ' + document.cookie;
            var parts = cookieValues.split('; ' + name + '=');

            if (parts.length >= 2) {
                return unescape(decodeURIComponent(parts.pop().split(';').shift()));
            }
            return '';
        },
        /**
         * @param {string} name
         * @returns {boolean}
         */
        deleteCookie: function(name) {
            let hasCookie = !!cookieManager.getCookie(name);
            if (hasCookie) {
                cookieManager.setCookie(name, '', INIT_TIME);
                hasCookie = !!cookieManager.getCookie(name);

                // 確保 cookie 有被清除
                if (hasCookie) {
                    // 如果沒有被清除試著將 domain 的層級往上提升一層
                    let domainSplits = DEFAULT_DOMAIN.split('.');
                    domainSplits.shift();

                    while (hasCookie && domainSplits.length >= 2) {
                        domainSplits.shift();
                        let domain = '.' + domainSplits.join('.');
                        cookieManager.setCookie(name, '', INIT_TIME, domain);
                        hasCookie = !!cookieManager.getCookie(name);
                    }
                }
            }
            return true;
        }
    };

    // 刪除之前使用的 cookie 數值
    cookieManager.getCookie('name') && cookieManager.deleteCookie('name');
    cookieManager.getCookie('email') && cookieManager.deleteCookie('email');

    return {
        CHSR_COOKIE: CHSR_COOKIE,
        manager: cookieManager
    };
})();
