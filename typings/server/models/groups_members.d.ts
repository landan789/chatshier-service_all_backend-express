declare module Chatshier {
    namespace Models {
        interface GroupsMembers {
            [groupId: string]: {
                members: Members
            }
        }

        interface Members {
            [groupMemberId: string]: Member
        }

        interface Member {
            _id: any,
            createdTime: Date | number,
            updatedTime: Date | number,
            isDeleted: boolean,
            status: boolean,
            type: string,
            user_id: string
        }
    }
}