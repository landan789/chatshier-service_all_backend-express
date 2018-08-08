declare module Chatshier {
    namespace Models {
        interface AppsProducts {
            [appId: string]: {
                products: Products
            }
        }

        interface Products {
            [productId: string]: Product
        }

        interface Product extends BaseProperty {
            type: 'NORMAL' | 'APPOINTMENT',
            name: string,
            description: string,
            price: number,
            quantity: number,
            src: string,
            isOnShelf: boolean,
            receptionist_ids: string[]
        }
    }
}