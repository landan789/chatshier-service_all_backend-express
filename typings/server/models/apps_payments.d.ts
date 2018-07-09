declare module Chatshier {
    namespace Models {
        interface AppsPayments {
            [appId: string]: {
                payments: Payments
            }
        }

        interface Payments {
            [paymentId: string]: Payment
        }

        interface Payment extends BaseProperty {
            type: 'ECPAY' | 'SPGATEWAY',
            merchantId: string,
            hashKey: string,
            hashIV: string,
            canIssueInvoice: boolean,
            invoiceMerchantId: string,
            invoiceHashKey: string,
            invoiceHashIV: string
        }
    }
}