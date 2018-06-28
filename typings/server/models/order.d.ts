declare module Chatshier {
    namespace Models {
        interface Orders {
            [orderId: string]: Order
        }

        interface Order {
            _id: any,
            createdTime: Date | number,
            updatedTime: Date | number,
            isDeleted: boolean,
            commodities: {
                commodity_id: string,
                name: string,
                description: string
            }[],
            tradeId: string,
            tradeDate: Date | number,
            tradeAmount: number,
            tradeDescription: string,
            isPaid: boolean,
            invoiceId: string,
            taxId: string,
            consumerUid: string,
            payerName: string,
            payerEmail: string,
            payerPhone: string,
            payerAddress: string,
            app_id: string
        }
    }
}