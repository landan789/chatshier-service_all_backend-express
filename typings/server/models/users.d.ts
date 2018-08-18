declare module Chatshier {
    namespace Models {
        interface Users {
            [userId: string]: User
        }

        interface User extends BaseProperty {
            address: string,
            calendar_ids: string[],
            company: string,
            email: string,
            phone: string,
            password?: string,
            name: string,
            group_ids: string[],
            oneSignals: OneSignals
        }
    }
}