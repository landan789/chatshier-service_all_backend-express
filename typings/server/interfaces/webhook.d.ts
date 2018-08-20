declare module Webhook {
    namespace Chatshier {
        interface Information {
            serverAddress: string,
            eventType?: string,
            isPostback?: boolean,
            isEcho?: boolean,
            platfromAppId?: string,
            platformGroupId?: string,
            platformGroupType?: string,
            platformUid: string,
            replyToken?: string
        }

        interface Profile {
            type: 'LINE' | 'FACEBOOK' | 'WECHAT' | 'CHATSHIER',
            name: string,
            photo: string,
            photoOriginal: string,
            gender?: string
        }

        interface PostbackActions {
            CHANGE_RICHMENU: string,
            SEND_REPLY_TEXT: string,
            SEND_TEMPLATE: string,
            SEND_IMAGEMAP: string,
            SEND_CONSUMER_FORM: string,
            PAYMENT_CONFIRM: string,

            SEND_APPOINTMENT_CATEGORIES: string,
            SEND_APPOINTMENT_PRODUCTS: string,
            SEND_APPOINTMENT_DATES: string,
            SEND_APPOINTMENT_TIMES: string,
            SEND_APPOINTMENT_CONFIRM: string,
            APPOINTMENT_FINISH: string,
            SEND_CONSUMER_APPOINTMENTS: string,
            CANCEL_APPOINTMENT: string
        }

        interface PostbackPayload {
            action: string,
            richmenuId?: string,
            templateId?: string,
            imagemapId?: string,
            additionalText?: string,
            replyText?: string,
            
            // Appointment
            categoryId?: string,
            receptionistId?: string,
            productId?: string,
            scheduleId?: string,
            appointmentDate?: string,
            startedTime?: string,
            endedTime?: string,
            appointmentId?: string,
            lastAppointmentDate?: Date | number,
            timestamp?: number
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
            messaging: Messaging[],
        }
        
        /**
         * https://developers.facebook.com/docs/messenger-platform/reference/webhook-events#messaging
         */
        interface Messaging {
            sender: {
                id: string
            },
            recipient: {
                id: string
            },
            timestamp: number,
            message: Message,
            postback?: Postback
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

        /**
         * https://developers.facebook.com/docs/messenger-platform/reference/webhook-events/messaging_postbacks
         */
        interface Postback {
            title: string,  
            payload: string,
            referral?: {
              ref: string,
              source: string,
              type: string,
            }
        }
    }
}