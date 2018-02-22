module.exports = (function() {
    function Timer() {};
    /**
     * 輸入 unix time 回傳分鐘化的 unix time
     * @param {int} unixTime
     * @returns {int} unixTime
     */
    Timer.prototype.minutedUnixTime = function(unixTime) {
        var minutedUnixTime;
        minutedUnixTime = Math.floor(unixTime / 60000);
        minutedUnixTime = minutedUnixTime * 60000;
        return minutedUnixTime;
    };
    return new Timer();
})();