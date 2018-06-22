declare module ECPay {
    namespace Payment {
        interface Result {
            /**
             * 特店編號
             * ex: 2000132
             */
            MerchantID: string,

            /**
             * 特店交易編號；訂單產生時傳送給綠界的特店交易編號。英數字大小寫混合
             * ex: 123456abc
             */
            MerchantTradeNo: string,

            /**
             * 特店商店代碼；提供特店填入店家代碼使用，僅可用英數字大小寫混合。
             */
            StoreID?: string,

            /**
             * 交易狀態；若回傳值為 1 時，為付款成功，其餘代碼皆為交易失敗，請勿出貨。
             * ex: 1
             */
            RtnCode: string,

            /*
             * 交易訊息
             * ex: 交易成功
             */
            RtnMsg: string,

            /*
             * 綠界的交易編號；請保存綠界的交易編號與特店交易編號[MerchantTradeNo]的關連。
             * ex: 201203151740582564
             */
            TradeNo: string,

            /**
             * 交易金額
             * ex: 20000
             */
            TradeAmt: number,

            /**
             * 付款時間；格式為 yyyy/MM/dd HH:mm:ss
             * ex: 2012/03/16 12:03:12
             */
            PaymentDate: string,

            /**
             * 特店選擇的付款方式
             * ex: Credit_CreditCard
             */
            PaymentType: string,

            /**
             * 通路費(手續費)
             * ex: 25
             */
            PaymentTypeChargeFee: number,

            /**
             * 訂單成立時間；格式為 yyyy/MM/dd HH:mm:ss
             * ex: 2012/03/15 17:40:58
             */
            TradeDate: string,

            /**
             * 是否為模擬付款
             * 回傳值：
             * 若為 1 時，代表此交易為模擬付款，請勿出貨。
             * 若為 0 時，代表此交易非模擬付款。
             * 注意事項：特店可透過廠商後台網站來針對單筆訂單模擬綠界回傳付款通知，以方便介接 API 的測試。
             * ex: 1
             */
            SimulatePaid: number,

            /**
             * 自訂名稱欄位 1；提供合作廠商使用記錄用客製化使用欄位
             */
            CustomField1: string,

            /**
             * 自訂名稱欄位 2；提供合作廠商使用記錄用客製化使用欄位
             */
            CustomField2: string,

            /**
             * 自訂名稱欄位 3；提供合作廠商使用記錄用客製化使用欄位
             */
            CustomField3: string,

            /**
             * 自訂名稱欄位 4；提供合作廠商使用記錄用客製化使用欄位
             */
            CustomField4: string,

            /**
             * 特店必須檢查檢查碼[CheckMacValue]來驗證
             */
            CheckMacValue: string
        }
    }
}