declare module Chatshier {
    namespace Models {
        interface AppsImagemaps {
            [appId: string]: {
                imagemaps: Imagemaps
            }
        }

        interface Imagemaps {
            [imagemapId: string]: Imagemap
        }

        interface Imagemap extends BaseProperty {
            type: 'imagemap',
            baseUrl: string,
            altText: string,
            form: 'form1' | 'form2' | 'form3' | 'form4' | 'form5' | 'form6' | 'form7' | 'form8'
            title: string,
            baseSize: {
                width: number,
                height: number
            },
            actions: ImagemapAction[]
        }

        interface ImagemapAction {
            type: 'message' | 'uri',
            linkUri: string,
            text: string,
            area: {
                x: number,
                y: number,
                width: number,
                height: number
            }
        }
    }
}