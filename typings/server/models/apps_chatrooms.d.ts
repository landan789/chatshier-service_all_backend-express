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

        interface Chatroom {
            _id: any,
            createdTime: Date | number,
            updatedTime: Date | number,
            isDeleted: boolean,
            name: string,
            platformGroupId: string,
            platformGroupType: string,
            messagers: Messagers,
            messages: Messages
        }

        interface Messagers {
            [messagerId: string]: Messager
        }

        interface Messager {
            _id: any,
            createdTime: Date | number,
            updatedTime: Date | number,
            type: 'CHATSHIER' | 'LINE' | 'FACEBOOK' | 'WECHAT',
            namings: {
                [platformUid: string]: string
            },
            age: number,
            custom_fields: {
                [fieldId: string]: {
                    value: any
                }
            },
            email: string,
            gender: 'MALE' | 'FEMALE',
            phone: string,
            platformUid: string,
            isDeleted: boolean,
            lastTime: Date | number,
            chatCount: number,
            unRead: number,
            remark: string,
            assigned_ids: string[],
            tags: string[],
            isUnfollow: boolean
        }

        interface Messages {
            [messageId: string]: Message
        }

        interface Message {
            _id: any,
            from: 'SYSTEM' | 'CHATSHIER' | 'LINE' | 'FACEBOOK' | 'WECHAT',
            isDeleted: boolean,
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
                actions: {
                    type: 'message' | 'uri' | 'postback' | 'datetimepicker',
                    label: string,
                    text?: string,
                    data?: string,
                    displayText?: string,
                    uri?: string,

                    // datetimepicker
                    // https://developers.line.me/en/docs/messaging-api/reference/#datetime-picker-action
                    mode?: 'date' | 'time' | 'datetime',
                    initial?: string,
                    max?: string,
                    min?: string
                }[]
            },
            imagemap?: {
                type: 'imagemap',
                baseUri: string,
                altText: string,
                baseSize: {
                    width: number,
                    height: number
                },
                actions: {
                    type: 'message' | 'uri',
                    label?: string,
                    linkUri? : string,
                    text?: string,
                    area: {
                        x: number,
                        y: number,
                        width: number,
                        height: number
                    }
                }
            }
        }
    }
}