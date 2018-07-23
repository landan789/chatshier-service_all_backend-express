declare module Chatshier {
    namespace Models {
        interface BaseProperty {
            _id: any,
            createdTime: Date | number,
            updatedTime: Date | number,
            isDeleted: boolean
        }

        interface Reply {
            text: string,
            type: 'text' | 'image' | 'imagemap' | 'template',
            src: string,
            template_id: string,
            imagemap_id: string
        }

    }
}