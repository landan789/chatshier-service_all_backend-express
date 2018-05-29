module.exports = (function() {

    class DomainHelper {
        /**
         * get doamin via hostname
         * @param {string} password
         */
        get(hostname) {
            let patt = new RegExp(/(\w+)\.(\w+)\.([\w\.]+)/);
            let reg = patt.exec(hostname);
            let bra = reg[2];
            let domain = '.' + reg[2] + '.' + reg[3];
            return domain;
        }
    }
    return new DomainHelper();
})();
