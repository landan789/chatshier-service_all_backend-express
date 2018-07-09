declare module Chatshier {
    namespace Models {
        interface AppsKeywordreplies {
            [appId: string]: {
                keywordreplies: Keywordreplies
            }
        }

        interface Keywordreplies {
            [keywordreplyId: string]: Keywordreply
        }

        interface Keywordreply extends BaseProperty, Reply {
            keyword: string,
            subKeywords: string[],
            replyCount: number,
            // false 為草稿，true 為開放
            status: boolean
        }
    }
}