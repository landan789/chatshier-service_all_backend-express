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
            type: 'NORMAL' | 'APPOINTMENT',
            parent_id: string,
            name: string,
            product_ids: string[]
        }
    }
}