declare module Chatshier {
    namespace Models {
        interface AppsFields {
            [appId: string]: {
                fields: Fields
            }
        }

        interface Fields {
            [fieldId: string]: Field
        }

        interface Field extends BaseProperty {
            text: string,
            alias: string,
            type: 'SYSTEM' | 'DEFAULT' | 'CUSTOM',
            sets: any[],
            setsType: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'MULTI_SELECT' | 'CHECKBOX',
            order: number,
            canShowingOnForm: boolean
        }
    }
}