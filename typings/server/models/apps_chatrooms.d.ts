declare module Chatshier {
    namespace Models {
        interface AppsChatrooms {
            [appId: string]: {
                chatrooms: Chatrooms
            }
        }

        interface Chatrooms {
            [chatroomId: string]: Chatroom
        }

        interface Chatroom extends BaseProperty {
            name: string,
            platformGroupId: string,
            platformGroupType: string,
            messagers: Messagers,
            messages: Messages
        }

        interface Messagers {
            [messagerId: string]: Messager
        }

        interface Messager extends BaseProperty {
            type: 'CHATSHIER' | 'LINE' | 'FACEBOOK' | 'WECHAT',
            namings: {
                [platformUid: string]: string
            },
            age: number,
            address: string,
            custom_fields: {
                [fieldId: string]: {
                    value: any
                }
            },
            email: string,
            gender: 'MALE' | 'FEMALE',
            phone: string,
            platformUid: string,
            lastTime: Date | number,
            chatCount: number,
            unRead: number,
            remark: string,
            assigned_ids: string[],
            tags: string[],
            isUnfollowed: boolean
        }

        interface Messages {
            [messageId: string]: Message
        }

        interface Message {
            _id: any,
            isDeleted: boolean,
            from: 'SYSTEM' | 'CHATSHIER' | 'LINE' | 'FACEBOOK' | 'WECHAT',
            messager_id: string,
            src: string,
            text: string,
            time: Date | number,
            type: 'text' | 'image' | 'sticker' | 'audio' | 'video' | 'file' | 'template' | 'imagemap' | 'location',
            template?: {
                type: 'buttons' | 'confirm' | 'carousel',
                text?: string,
                thumbnailImageUrl?: string,
                title?: string,
                actions: TemplateAction[]
            },
            imagemap?: {
                type: 'imagemap',
                baseUrl: string,
                altText: string,
                baseSize: {
                    width: number,
                    height: number
                },
                actions: ImagemapAction[]
            }
        }
    }
}