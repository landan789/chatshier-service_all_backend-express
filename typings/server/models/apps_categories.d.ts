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
            name: string,
            description: string,
            product_ids: string[]
        }
    }
}