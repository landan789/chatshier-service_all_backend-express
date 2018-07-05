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

        interface Member extends BaseProperty {
            status: boolean,
            type: string,
            user_id: string
        }
    }
}