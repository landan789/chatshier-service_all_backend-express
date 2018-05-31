namespace Webhook {
    namespace Chatshier {
        interface Information {
            eventType?: string,
            isEcho?: boolean,
            platfromAppId?: string,
            platformGroupId?: string,
            platformGroupType?: string,
            platformUid: string,
        }
    }
    
    namespace Line {
        /**
         * https://developers.line.me/en/docs/messaging-api/reference/#webhook-event-objects
         */
        interface EventBody {
            events: Event[];
        }
        
        interface Event {
            replyToken: string,
            type: 'message' | 'follow' | 'unfollow' | 'join' | 'leave' | 'postback' | 'beacon',
            timestamp: number,
            source: {
                type: 'user' | 'room' | 'group',
                roomId: string,
                groupId: string,
                userId: string
            },
            message: {
                id: string,
                type: 'text' | 'sticker' | 'image' | 'video' | 'audio' | 'location' | 'file' | 'template',
                text: string,
        
                /**
                 * type sticker
                 */
                packageId: string,
        
                /**
                 * type sticker
                 */
                stickerId: string,
        
                /**
                 * type file
                 */
                fileName: string,
        
                /**
                 * type file
                 */
                fileSize: number,
        
                /**
                 * type location
                 */
                title: string,
        
                /**
                 * type location
                 */
                address: string,
                
                /**
                 * type location
                 */
                latitude: number,
                
                /**
                 * type location
                 */
                longitude: number,

                /**
                 * type template
                 */
                template: any
            },
            /**
             * type postback
             */
            postback: {
                /**
                 * ex: 'storeId=12345'
                 */
                data: string,
                params: {
                    /**
                     * ex: '2017-12-25' (date mode)
                     */
                    date: string,
        
                    /**
                    * ex: '01:00' (time mode)
                    */
                    time: string,
        
                    /**
                    * ex: '2017-12-25T01:00' (datetime mode)
                    */
                    datetime: string
                }
            },
            beacon: {
                hwid: string,
                type: 'enter'
            }
        }
        
        interface Message {
            type: 'text' | 'sticker' | 'image' | 'video' | 'audio' | 'location',
            /**
             * type: text
             */
            text?: string,
        
            /**
             * type: sticker
             */
            packageId?: string,
        
            /**
             * type: sticker
             */
            stickerId?: string,
        
            /**
             * type: image | video | audio
             */
            originalContentUrl?: string,
        
            /**
             * type: image | video
             */
            previewImageUrl?: string,
        
            /**
             * type: audio
             */
            duration?: number,
        
            /**
             * type: location
             */
            title?: string,
        
            /**
             * type: location
             */
            address?: string,
        
            /**
             * type: location
             */
            latitude?: number,
        
            /**
             * type: location
             */
            longitude?: number,
        }
    }
    
    namespace Facebook {
        /**
         * https://developers.facebook.com/docs/messenger-platform/webhook
         */
        interface EventBody {
            object: 'page',
            entry: Entry[]
        }
        
        /**
         * https://developers.facebook.com/docs/messenger-platform/reference/webhook-events/#entry
         */
        interface Entry {
            id: string,
            time: number,
            messaging: MessagingObject[],
        }
        
        /**
         * https://developers.facebook.com/docs/messenger-platform/reference/webhook-events#messaging
         */
        interface MessagingObject {
            sender: {
                id: string
            },
            recipient: {
                id: string
            },
            timestamp: number,
            message: Message
        }
        
        /**
         * https://developers.facebook.com/docs/messenger-platform/reference/webhook-events/messages
         */
        interface Message {
            is_echo?: boolean,
            app_id?: string,
            mid: string,
            text: string,
            quick_reply: {
                payload: string
            },
            attachments: {
                type: 'image' | 'fallback' | 'audio' | 'file' | 'image' | 'location' | 'video',
                payload: {
                    /** 
                     * image, audio, video, file only
                     */
                    url: string,
                    /**
                     * location only
                     */
                    coordinates: {
                        lat: number,
                        long: number
                    }
                },
                /**
                 * fallback only
                 */
                fallback: {
                    title: string,
                    url: string,
                    payload: null,
                    type: string
                }
            }[]
        }    
    }
}