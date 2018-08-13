declare module Chatshier {
    namespace Models {
        interface Orders {
            [orderId: string]: Order
        }

        interface Order extends BaseProperty {
            products: {
                product_id: string,
                name: string,
                description: string,
                count: number,
                unitPrice: number,
                unit: string,
                remark: string
            }[],
            tradeId: string,
            tradeDate: Date | number,
            tradeAmount: number,
            tradeDescription: string,
            isPaid: boolean,
            isInvoiceIssued: boolean,
            invoiceId: string,
            invoiceNumber: string,
            invoiceRandomNumber: string,
            taxId: string,
            consumer_id: string,
            payerName: string,
            payerEmail: string,
            payerPhone: string,
            payerAddress: string,
            app_id: string
        }
    }
}