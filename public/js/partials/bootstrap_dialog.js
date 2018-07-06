/// <reference path='../../../typings/client/index.d.ts' />

window.bootstrapDialog = (function() {
    class BootstrapDialog {
        constructor() {
            this.cancelText = '取消';
            this.confirmText = '確定';

            this.$docBody = $(document.body);

            this.show = this.show.bind(this);
        }

        /**
         * @param {string} bodyHtml
         * @param {string} titleText
         * @param {string} [confirmText]
         * @param {string} [cancelText]
         */
        show(bodyHtml, titleText, confirmText, cancelText) {
            bodyHtml = bodyHtml || '';
            titleText = titleText || '';
            confirmText = confirmText || this.confirmText;
            cancelText = cancelText || this.cancelText;

            return new Promise((resolve) => {
                let isConfirm = false;
                let $dialogModal = $(
                    '<div class="chsr modal fade" id="dialogModal" tabindex="-1" role="dialog">' +
                        '<div class="modal-dialog" role="document">' +
                            '<div class="modal-content">' +
                                '<div class="modal-header">' +
                                    '<h4 class="modal-title">' + titleText + '</h4>' +
                                '</div>' +
                                '<div class="modal-body">' + bodyHtml + '</div>' +
                                '<div class="modal-footer">' +
                                    '<button type="button" class="btn btn-secondary" data-dismiss="modal">' + this.cancelText + '</button>' +
                                    '<button type="button" class="btn btn-primary btn-confirm">' + this.confirmText + '</button>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>'
                );
                $dialogModal.on('hidden.bs.modal', () => {
                    $dialogModal.remove();
                    resolve(isConfirm);
                });
                $dialogModal.on('click', '.btn-confirm', () => {
                    isConfirm = true;
                    $dialogModal.modal('hide');
                });

                this.$docBody.append($dialogModal);

                let $modalHeader = $dialogModal.find('.modal-header');
                !this.titleText ? $modalHeader.addClass('d-none') : $modalHeader.removeClass('d-none');
                $modalHeader.find('.modal-title').text(titleText);
                $dialogModal.find('.modal-body').html(bodyHtml);

                $dialogModal.modal('show');
            });
        }
    }

    return new BootstrapDialog();
})();
