declare module Chatshier {
    namespace Models {
        interface AppsRichmenus {
            [appId: string]: {
                richmenus: Richmenus
            }
        }

        interface Richmenus {
            [richmenuId: string]: Richmenu
        }

        interface Richmenu extends BaseProperty {
            selected: boolean,
            chatBarText: string,
            form: 'form1' | 'form2' | 'form3' | 'form4' | 'form5' | 'form6' | 'form7' | 'form8' | 'form9',
            name: string,
            src: string,
            platformMenuId: string,
            isActivated: boolean,
            isDefault: boolean,
            size: {
                width: number,
                height: number
            },
            areas: {
                bounds: RichmenuBounds,
                action: TemplateAction
            }[]
        }

        interface RichmenuBounds {
            x: number,
            y: number,
            width: number,
            height: number
        }
    }
}