declare module Chatshier {
    namespace Models {
        interface GroupsMembers {
            [groupId: string]: {
                members: GroupMembers
            }
        }

        interface GroupMembers {
            [groupMemberId: string]: GroupMember
        }

        interface GroupMember {
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