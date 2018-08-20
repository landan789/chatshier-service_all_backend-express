module.exports = (function() {
    class LineService {
        /**
         * @param {Chatshier.Models.Template} templateMessage
         */
        templateMessageToFlexMessage(templateMessage) {
            let template = templateMessage.template;
            let columns = template.columns ? template.columns : [template];
            let contents = columns.map((column) => {
                let content = {
                    type: 'bubble',
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        spacing: 'sm',
                        /** @type {any[]} */
                        contents: []
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        contents: column.actions.map((action) => ({
                            type: 'button',
                            action: action
                        }))
                    }
                };

                if (column.thumbnailImageUrl) {
                    content.hero = {
                        type: 'image',
                        url: column.thumbnailImageUrl,
                        size: 'full',
                        aspectMode: 'cover'
                    };
                    column.defaultAction && (content.hero.action = column.defaultAction);
                }

                column.title && content.body.contents.push({
                    type: 'text',
                    text: column.title,
                    weight: 'bold',
                    size: 'lg'
                });

                column.text && content.body.contents.push({
                    type: 'text',
                    text: column.text,
                    color: '#6c757d',
                    size: 'xs',
                    wrap: !!column.title
                }, {
                    type: 'separator',
                    margin: 'md'
                });

                return content;
            });

            /** @type {any} */
            let flexMessage = {
                type: 'flex',
                altText: templateMessage.altText,
                contents: {}
            };

            let isCarousel = contents.length > 1;
            if (isCarousel) {
                flexMessage.contents.type = 'carousel';
                flexMessage.contents.contents = contents;
            } else {
                Object.assign(flexMessage.contents, contents[0]);
            }
            return flexMessage;
        }
    }

    return new LineService();
})();
