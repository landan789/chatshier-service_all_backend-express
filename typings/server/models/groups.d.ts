declare module Chatshier {
    namespace Models {
        interface Groups {
            [groupId: string]: Group
        }

        interface Group extends BaseProperty {
            app_ids: string[],
            members: GroupMembers,
            name: string
        }
    }
}