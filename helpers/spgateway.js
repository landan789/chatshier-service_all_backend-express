// 智付通 Spgateway 串接 API
module.exports = (function() {
    const request = require('request');
    const cipherHlp = require('./cipher');

    const TEST = 'TEST';
    const PRODUTION = 'PRODUTION';
    const PAYMENT_ENDPOINT = {
        [TEST]: 'https://ccore.spgateway.com/MPG/mpg_gateway',
        [PRODUTION]: 'https://core.spgateway.com/MPG/mpg_gateway'
    };

    const INVOICE_ENDPOINT = {
        [TEST]: 'https://cinv.pay2go.com/API/invoice_issue',
        [PRODUTION]: 'https://inv.pay2go.com/API/invoice_issue'
    };

    class SpgatewayHelper {
        constructor() {
            this._mode = TEST;
        }

        /**
         * @param {'TEST' | 'PRODUTION'} value
         */
        set mode(value) {
            this._mode = value;
        }

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

            let paymentWays = {
                CREDIT: 1,
                // ANDROIDPAY: 0,
                // SAMSUNGPAY: 0,
                // UNIONPAY: 0,
                WEBATM: 1
                // VACC: 0,
                // CVS: 0,
                // BARCODE: 0,
                // P2G: 0,
                // CVSCOM: 0
            };
            Object.assign(tradeInfo, paymentWays);

            let encryptStr = this.encryptJsonToStr(tradeInfo, hashKey, hashIV);
            let tradeShaHash = this.generateTradeHash(encryptStr, hashKey, hashIV);

            /** @type {Spgateway.Payment.MPGParameter} */
            let params = {
                MerchantID: tradeInfo.MerchantID,
                TradeInfo: encryptStr,
                TradeSha: tradeShaHash,
                Version: tradeInfo.Version
            };

            let formId = 'spgatewayMPGForm';
            let html = (
                '<form id="' + formId + '" action="' + PAYMENT_ENDPOINT[this._mode] + '" method="POST">' +
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
         * @param {any} json
         * @param {string} hashKey
         * @param {string} hashIV
         */
        encryptJsonToStr(json, hashKey, hashIV) {
            let payloadQuery = this._jsonToQueryString(json);
            payloadQuery = this._appendPadding(payloadQuery);
            let encryptStr = cipherHlp.aesEncrypt(payloadQuery, hashKey, hashIV, 'aes-256-cbc', true);
            return encryptStr;
        }

        /**
         * @param {string} encryptStr
         * @param {string} hashKey
         * @param {string} hashIV
         */
        decryptStrToJson(encryptStr, hashKey, hashIV) {
            let plainText = decodeURIComponent(cipherHlp.aesDecrypt(encryptStr, hashKey, hashIV));

            let canParseToJSON = (
                'string' === typeof plainText && plainText.length > 0 &&
                ((plainText.startsWith('{') && plainText.endsWith('}')) || (plainText.startsWith('[') && plainText.endsWith(']')))
            );
            if (canParseToJSON) {
                return JSON.parse(plainText);
            }

            let splits = plainText.split('&');

            /** @type {any} */
            let json = splits.reduce((output, split) => {
                let values = split.split('=');
                output[values[0]] = values[1] ? values[1].replace(/\+/g, ' ') : '';
                return output;
            }, {});
            return json;
        }

        /**
         * @param {string} encryptStr
         * @param {string} hashKey
         * @param {string} hashIV
         */
        generateTradeHash(encryptStr, hashKey, hashIV) {
            let tradeShaHash = `HashKey=${hashKey}&${encryptStr}&HashIV=${hashIV}`;
            tradeShaHash = cipherHlp.createHash(tradeShaHash, 'sha-256').toUpperCase();
            return tradeShaHash;
        }

        /**
         * @param {Chatshier.Models.Order} order
         * @param {string} merchantId
         * @param {string} hashKey
         * @param {string} hashIV
         * @returns {Promise<Spgateway.Pay2Go.IssueResponseResult>}
         */
        issueInvoice(order, merchantId, hashKey, hashIV) {
            /** @type {Spgateway.Pay2Go.InvoicePostData} */
            let postData = {
                RespondType: 'JSON',
                Version: '1.4',
                TimeStamp: '' + Math.floor(Date.now() / 1000),
                MerchantOrderNo: order.invoiceId,
                Status: '1',
                Category: order.taxId ? 'B2B' : 'B2C',
                BuyerName: order.payerName,
                BuyerAddress: order.payerAddress,
                BuyerEmail: order.payerEmail,
                PrintFlag: 'Y',
                TaxType: '1',
                TaxRate: 5,
                CustomsClearance: '1',
                Amt: order.tradeAmount * 0.95,
                TaxAmt: order.tradeAmount * 0.05,
                TotalAmt: order.tradeAmount,
                ItemName: order.commodities.map((commodity) => commodity.name).join('|'),
                ItemCount: order.commodities.map((commodity) => commodity.count).join('|'),
                ItemUnit: order.commodities.map((commodity) => commodity.unit).join('|'),
                ItemPrice: order.commodities.map((commodity) => commodity.unitPrice).join('|'),
                ItemAmt: order.commodities.map((commodity) => commodity.count * commodity.unitPrice).join('|')
            };
            order.taxId && (postData.BuyerUBN = order.taxId);
            let encryptStr = this.encryptJsonToStr(postData, hashKey, hashIV);

            /** @type {Spgateway.Pay2Go.InvoicePostParams} */
            let invoiceParams = {
                MerchantID_: merchantId,
                PostData_: encryptStr
            };

            let options = {
                method: 'POST',
                url: INVOICE_ENDPOINT[this._mode],
                formData: invoiceParams
            };

            return this._sendRequest(options).then((resJson) => {
                /** @type {Spgateway.Pay2Go.IssueInvoiceResponse} */
                let invoiceRes = resJson;

                if ('SUCCESS' !== invoiceRes.Status) {
                    // 智付寶錯誤代碼 LIB10001 - '已無任何本期(4)字軌資料可使用，請確認'
                    // 代表 Pay2Go 電子發票服務平台已經無法即時開立發票，已無可開立張數
                    // 此時將 Status 設為 '0' 代表將此發票建立但等待手動開立
                    if ('LIB10001' === invoiceRes.Status) {
                        postData.MerchantOrderNo = cipherHlp.generateRandomHex(30);
                        postData.Status = '0';
                        invoiceParams.PostData_ = this.encryptJsonToStr(postData, hashKey, hashIV);
                        options.formData = invoiceParams;

                        return this._sendRequest(options).then((_resJson) => {
                            /** @type {Spgateway.Pay2Go.IssueInvoiceResponse} */
                            invoiceRes = _resJson;
                            if ('SUCCESS' !== invoiceRes.Status) {
                                return Promise.reject(new Error(invoiceRes.Message));
                            }
                            return Promise.resolve(JSON.parse(invoiceRes.Result));
                        });
                    }
                    return Promise.reject(new Error(invoiceRes.Message));
                }
                return Promise.resolve(JSON.parse(invoiceRes.Result));
            });
        }

        /**
         * @param {any} json
         */
        _jsonToQueryString(json) {
            return Object.keys(json).sort((a, b) => {
                return a.localeCompare(b);
            }).filter((prop) => {
                return !!json[prop];
            }).map((prop) => {
                let str = prop + '=' + encodeURIComponent(json[prop]).replace(/%20/g, '+');
                return str;
            }).join('&');
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

        _sendRequest(options) {
            return new Promise((resolve, reject) => {
                request(options, (error, res, body) => {
                    let canParseJSON =
                        (res.headers['Content-Type'] && res.headers['Content-Type'].includes('application/json')) ||
                        (res.headers['content-type'] && res.headers['content-type'].includes('application/json')) ||
                        ('string' === typeof body && body.length > 0 &&
                        ((body.startsWith('{') && body.endsWith('}')) || (body.startsWith('[') && body.endsWith(']'))));

                    body = canParseJSON && 'string' === typeof body ? JSON.parse(body) : body;

                    if (error || res.statusCode >= 300) {
                        return reject(body);
                    }
                    resolve(body);
                });
            });
        }
    }

    SpgatewayHelper.TEST = TEST;
    SpgatewayHelper.PRODUTION = PRODUTION;

    return new SpgatewayHelper();
})();
