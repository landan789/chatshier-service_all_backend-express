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

    namespace Invoice {
        interface IssueParameters {
            /**
             * 時間戳記
             * 綠界科技會利用此參數將當下的時間轉為 UnixTimeStamp 來驗證此次介接的時間區間。
             * 注意事項：
             * 1. 驗證時間區間暫訂為 5 分鐘內有效，若超過此驗證時間則此次訂單將無法建立
             * 參考資料：http://www.epochconverter.com/。
             * 2. 合作特店須進行主機「時間校正」，避免主機產生時差，延伸 API 無法正常運作。
             */
            TimeStamp: string,

            /**
             * 合作特店編號
             * 1. 測試環境合作特店編號
             * 2. 正式環境金鑰取得
             */
            MerchantID: string,

            /**
             * 發票關聯號碼，請用 30 碼 UID
             */
            RelateNumber: string,
            
            /**
             * 客戶代號
             */
            CustomerID: string,

            /**
             * 統一編號，固定 8 位長度數字
             */
            CustomerIdentifier: string,
            
            /**
             * 買受人姓名，須為中英文及數字
             */
            CustomerName: string,

            /**
             * 買受人地址
             */
            CustomerAddr: string,

            /**
             * 買受人電話(純數字)
             */
            CustomerPhone: string,

            /**
             * 買受人電子郵件
             */
            CustomerEmail: string,

            /**
             * 經海關出口: 1
             * 非經海關出口: 2
             */
            ClearanceMark: '' | '1' | '2'

            /**
             * 課稅類別
             * 1. 若為應稅，請帶 1。
             * 2. 若為零稅率，請帶 2。
             * 3. 若為免稅，請帶 3。
             * 4. 若為混合應稅與免稅時(限收銀機發票無法分辨時使用，且需通過申請核可)，則請帶 9。
             */
            TaxType: '1' | '2' | '3' | '9',

            /**
             * 載具類別:
             * 無載具: 空字串
             * 會員載具: 1
             * 自然人憑證: 2
             * 手機條碼: 3
             */
            CarruerType: '' | '1' | '2' | '3',
            
            /**
             * 1. 當載具類別[CarruerType]為空字串 (無載具) 或 1 (會員載具) 時，則請帶空字串。
             * 2. 當載具類別[CarruerType]為 2 (自然人憑證)時，則請 帶固定長度為 16 且格式為 2 碼大小寫字母 加上 14 碼數字。
             * 3. 當載具類別[CarruerType]為 3 (買受人之手機條碼) 時，則請帶固定長度 為 8 且格式為 1 碼斜線「/ 加上 由 7 碼數字及大小寫字母組成
             */
            CarruerNum: string,
            
            /**
             * 是否捐贈發票
             * 捐贈: 1
             * 不捐贈: 2
             */
            Donation: '1' | '2',

            /**
             * 受捐贈單位愛心碼
             */
            LoveCode: string,

            /**
             * 列印: 1
             * 不列印: 0
             */
            Print: '0' | '1',

            /**
             * 發票總金額 (含稅)
             * 1. 請帶整數，不可有小數點。
             * 2. 僅限新台幣。
             * 3. 金額不可為 0 元。
             */
            SalesAmount: string,

            /**
             * 商品備註，若有兩項以上商品時請用管線符號 "|" 分隔。
             */
            InvoiceRemark: string,

            /**
             * 商品名稱，若有兩項以上商品時請用管線符號 "|" 分隔。
             */
            ItemName: string,

            /**
             * 商品數量，若有兩項以上商品時請用管線符號 "|" 分隔。
             */
            ItemCount: string,

            /**
             * 商品單位，若有兩項以上商品時請用管線符號 "|" 分隔。
             */
            ItemWord: string,

            /**
             * 商品價格，若有兩項以上商品時請用管線符號 "|" 分隔。
             */
            ItemPrice: string,

            /**
             * 商品課稅類別，若有兩項以上商品時請用管線符號 "|" 分隔。
             */
            ItemTaxType: string,

            /**
             * 商品合計
             * 此為含稅小計金額若超過二筆以上請以「|」符號區隔。
             */
            ItemAmount: string,

            /**
             * 商品備註說明
             * 1. 若超過二筆以上請以「|」符號區隔。
             * 2. 每個備註的預設最大長度為 40 碼。
             * 3. 將參數值做 UrlEncode。
             * 4. 計算檢查碼時，需將此參數排除。
             * 注意事項：
             * 備註裡面有「|」，請以「##」取代「|」。我方會在上傳財政部時協助轉回「|」。
             */
            ItemRemark: string,

            /**
             * 發票開立延遲天數。
             * 本參數值請帶 0 ~ 15(天)，當天數為 0 時，則付款完成後立即開立發票。
             */
            DelayDay?: string,

            /**
             * 一般稅額: 07
             * 特種稅額: 08
             */
            InvType: '07' | '08',

            /**
             * 商品單價是否含稅
             * 預設為含稅價
             * 0: 未稅
             * 1: 含稅
             */
            vat: '0' | '1'
        }

        interface IssueResponse {
            /**
             * 回應代碼
             * 1 為成功，其餘為失敗。
             */
            RtnCode: string,

            /**
             * 回應訊息
             * ex: 開立發票成功
             */
            RtnMsg: string,

            /**
             * 發票號碼
             * 若開立成功，則會回傳一組發票號碼
             * 若開立失敗，則會回傳空值。
             * ex: EV00004242
             */
            InvoiceNumber: string,

            /**
             * 發票開立時間
             * ex: 2012-03-16 12:03:12
             */
            InvoiceDate: string,

            /**
             * 隨機碼
             */
            RandomNumber: string,

            /**
             * 檢查碼
             */
            CheckMacValue: string
        }
    }
}