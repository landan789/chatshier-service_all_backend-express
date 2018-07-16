declare module Chatshier {
    namespace Models {
        interface GroupMembers {
            [groupMemberId: string]: Member
        }

        interface Member extends BaseProperty {
            status: boolean,
            type: string,
            user_id: string
        }
    }
}