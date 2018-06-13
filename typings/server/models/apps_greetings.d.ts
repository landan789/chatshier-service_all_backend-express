declare module Chatshier {
    namespace Models {
        interface AppsGreetings {
            [appId: string]: {
                greetings: Greetings
            }
        }

        interface Greetings {
            [GreetingId: string]: Greeting
        }

        interface Greeting {
            _id: any,
            createdTime: Date | number,
            updatedTime: Date | number,
            text: string,
            type: 'text'
        }
    }
}