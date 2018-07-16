declare module Chatshier {
    namespace Models {
        interface AppsTemplates {
            [appId: string]: {
                templates: Templates
            }
        }

        interface Templates {
            [templateId: string]: Template
        }

        interface Template extends BaseProperty {
            altText: string,
            type: 'template',
            template: {
                type: 'buttons' | 'confirm' | 'carousel' | 'image_carousel',
                text?: string,
                thumbnailImageUrl?: string,
                imageAspectRatio?: string,
                imageSize?: string,
                title?: string,
                actions: TemplateAction[],
                columns?: TemplateColumn[]
            }
        }

        interface TemplateColumn {
            thumbnailImageUrl?: string,
            imageBackgroundColor?: string,
            title?: string,
            text: string,
            defaultAction?: TemplateAction,
            actions: TemplateAction[]
        }

        interface TemplateAction {
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
        }
    }
}