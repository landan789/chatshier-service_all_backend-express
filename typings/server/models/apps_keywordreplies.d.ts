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

        interface Keywordreply {
            _id: any,
            createdTime: Date | number,
            updatedTime: Date | number,
            isDeleted: boolean,
            keyword: string,
            subKeywords: string[],
            replyCount: number,
            // false 為草稿，true 為開放
            status: boolean,
            text: string,
            type: 'text' | 'image' | 'imagemap' | 'template',
            src: string,
            template_id: string,
            imagemap_id: string
        }
    }
}