declare module Chatshier {
    namespace Models {
        interface AppsComposes {
            [appId: string]: {
                composes: Composes
            }
        }

        interface Composes {
            [composeId: string]: Compose
        }

        interface Compose extends BaseProperty, Reply {
            conditions: ComposeCondition[],
            // false 為草稿, true 為開放
            status: boolean,
            time: Date | number
        }

        interface ComposeCondition {
            type: 'AGE_RANGE' | 'GENDER' | 'TAGS' | 'CUSTOM_FIELD',
            values: any[],
            field_id?: string
        }
    }
}