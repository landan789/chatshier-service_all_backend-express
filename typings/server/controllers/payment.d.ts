declare module Chatshier {
    namespace Controllers {
        interface PaymentSubmit {
            tradeDescription: string,
            itemName: string,
            itemCount: number,
            itemUnitPrice: number,
            itemUnit: string,
            itemRemark?: string,
            amount: number,
            payerName: string,
            payerEmail: string,
            payerPhone: string,
            payerAddress: string,
            hasRequestInvoice: boolean,
            taxId?: string
        }
    }
}