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

        interface InvoiceParameters {
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
            ClearanceMark: '1' | '2'

            /**
             * 
             */
            TaxType: '1' | '2',

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
             * 商品名稱，若有兩項以上商品時請用管線符號 "|" 分隔。
             */
            InvoiceItemName: string,

            /**
             * 商品數量，若有兩項以上商品時請用管線符號 "|" 分隔。
             */
            InvoiceItemCount: string,

            /**
             * 商品單位，若有兩項以上商品時請用管線符號 "|" 分隔。
             */
            InvoiceItemWord: string,

            /**
             * 商品價格，若有兩項以上商品時請用管線符號 "|" 分隔。
             */
            InvoiceItemPrice: string,

            /**
             * 商品課稅類別，若有兩項以上商品時請用管線符號 "|" 分隔。
             */
            InvoiceItemTaxType: string,

            /**
             * 商品備註，若有兩項以上商品時請用管線符號 "|" 分隔。
             */
            InvoiceRemark: string,

            /**
             * 發票開立延遲天數。
             * 本參數值請帶 0 ~ 15(天)，當天數為 0 時，則付款完成後立即開立發票。
             */
            DelayDay: string,

            /**
             * 一般稅額: 07
             * 特種稅額: 08
             */
            InvType: '07' | '08'
        }
    }
}