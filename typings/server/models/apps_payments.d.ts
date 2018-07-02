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

        interface Payment {
            _id: any,
            createdTime: Date | number,
            updatedTime: Date | number,
            isDeleted: boolean,
            type: 'ECPay' | 'Spgateway',
            merchantId: string,
            hashKey: string,
            hashIV: string,
            invoiceMerchantId: string,
            invoiceHashKey: string,
            invoiceHashIV: string
        }
    }
}