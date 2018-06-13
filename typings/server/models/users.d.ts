declare module Chatshier {
    namespace Models {
        interface Users {
            [userId: string]: User
        }

        interface User {
            _id: any,
            createdTime: Date | number,
            updatedTime: Date | number,
            address: string,
            calendar_ids: string[],
            company: string,
            email: string,
            phone: string,
            isDeleted: boolean,
            password?: string,
            name: string,
            group_ids: string[]
        }
    }
}