declare module Chatshier {
    namespace Models {
        interface Groups {
            [groupId: string]: Group
        }

        interface Group {
            _id: any,
            createdTime: Date | number,
            updatedTime: Date | number,
            app_ids: string[],
            isDeleted: boolean,
            members: GroupMembers,
            name: string
        }
    }
}