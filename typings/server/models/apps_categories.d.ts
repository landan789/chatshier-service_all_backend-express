declare module Chatshier {
    namespace Models {
        interface AppsCategories {
            [appId: string]: {
                categories: Categories
            }
        }

        interface Categories {
            [categoryId: string]: Category
        }

        interface Category extends BaseProperty {
            parent_id: string,
            class: string,
            description: string,
            products: Products
        }

        interface Products {
            [productId: string]: Product
        }

        interface Product extends BaseProperty {
            name: string,
            description: string,
            price: number,
            thumbnailImageUrl: string
        }
    }
}