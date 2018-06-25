// 智付通 Spgateway 串接 API

module.exports = (function() {
    const cipherHlp = require('./cipher');
    const ENDPOINT = 'https://ccore.spgateway.com/MPG/mpg_gateway'; // testing
    // const ENDPOINT = 'https://core.spgateway.com/MPG/mpg_gateway'; // prodution

    class SpgatewayHelper {
        /**
         * @param {Spgateway.Payment.TradeInformation} tradeInfo
         * @param {string} hashKey
         * @param {string} hashIV
         */
        generateMPGFormHtml(tradeInfo, hashKey, hashIV) {
            if ('object' !== typeof tradeInfo) {
                throw new Error('Missing payload.');
            }

            if (!hashKey) {
                throw new Error('Missing parameter. hashKey is required.');
            }

            if (!hashIV) {
                throw new Error('Missing parameter. hashIV is required.');
            }

            let tradeInfoEncrypt = this.encryptTradeInfo(tradeInfo, hashKey, hashIV);
            let tradeShaHash = this.generateTradeHash(tradeInfoEncrypt, hashKey, hashIV);

            /** @type {Spgateway.Payment.MPGParameter} */
            let params = {
                MerchantID: tradeInfo.MerchantID,
                TradeInfo: tradeInfoEncrypt,
                TradeSha: tradeShaHash,
                Version: tradeInfo.Version
            };

            let formId = 'spgatewayMPGForm';
            let html = (
                '<form id="' + formId + '" action="' + ENDPOINT + '" method="POST">' +
                    (() => Object.keys(params).map((prop) => {
                        let param = params[prop];
                        return '<input type="hidden" name="' + prop + '" value="' + param + '" />';
                    }).join(''))() +
                '</form>' +
                '<script type="text/javascript">document.getElementById("' + formId + '").submit();</script>'
            );
            return html;
        }

        /**
         * @param {Spgateway.Payment.TradeInformation} tradeInfo
         * @param {string} hashKey
         * @param {string} hashIV
         */
        encryptTradeInfo(tradeInfo, hashKey, hashIV) {
            let payloadQuery = this._tradeInfoToQueryString(tradeInfo);
            payloadQuery = this._appendPadding(payloadQuery);
            let tradeInfoEncrypt = cipherHlp.aesEncrypt(payloadQuery, hashKey, hashIV, 'aes-256-cbc');
            return tradeInfoEncrypt;
        }

        /**
         * @param {string} encryptStr
         * @param {string} hashKey
         * @param {string} hashIV
         * @returns {Spgateway.Payment.TradeInformation}
         */
        decryptTradeInfo(encryptStr, hashKey, hashIV) {
            let plainText = decodeURIComponent(cipherHlp.aesDecrypt(encryptStr, hashKey, hashIV));
            let splits = plainText.split('&');

            /** @type {any} */
            let tradeInfo = splits.reduce((output, split) => {
                let values = split.split('=');
                output[values[0]] = values[1].replace(/\+/g, ' ');
                return output;
            }, {});
            return tradeInfo;
        }

        generateTradeHash(tradeInfoEncrypt, hashKey, hashIV) {
            let tradeShaHash = `HashKey=${hashKey}&${tradeInfoEncrypt}&HashIV=${hashIV}`;
            tradeShaHash = cipherHlp.createHash(tradeShaHash, 'sha-256').toUpperCase();
            return tradeShaHash;
        }

        /**
         * @param {Spgateway.Payment.TradeInformation} tradeInfo
         */
        _tradeInfoToQueryString(tradeInfo) {
            let props = Object.keys(tradeInfo).sort((a, b) => {
                return a.toLowerCase().localeCompare(b.toLowerCase());
            });
            let queryString = props.map((prop) => {
                let str = prop + '=' + encodeURIComponent(tradeInfo[prop]).replace(/%20/g, '+');
                return str;
            }).join('&');
            return queryString;
        }

        /**
         * @param {string} str
         * @param {number} [blocksize=32]
         */
        _appendPadding(str, blocksize = 32) {
            let len = str.length;
            let pad = blocksize - (len % blocksize);
            str += String.fromCharCode(pad).repeat(pad);
            return str.trim();
        }
    }

    return new SpgatewayHelper();
})();
