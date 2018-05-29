module.exports = (function() {
    class TimerHelper {
        /**
         * 輸入 unix time 回傳分鐘化的 unix time
         *
         * @param {Date | number} unixTime
         * @returns {number}
         */
        minutedUnixTime(unixTime) {
            if ('number' !== typeof unixTime) {
                unixTime = new Date(unixTime).getTime();
            }

            let minutedUnixTime = Math.floor(unixTime / 60000);
            minutedUnixTime = minutedUnixTime * 60000;
            return minutedUnixTime;
        }
    }
    return new TimerHelper();
})();
