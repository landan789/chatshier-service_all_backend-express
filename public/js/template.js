/// <reference path='../../typings/client/index.d.ts' />
(function() {
    var api = window.restfulAPI;
    var $jqDoc = $(document);

    var $appDropdown = $('.app-dropdown');
    var $appSelector = $('#app-select');
    var nowSelectAppId = '';
    var appId = '';
    var keyword = '';
    var previewImage = '';
    var file;
    var imageFile = {};
    var btnImage;
    var carouselImage = [];
    const NO_PERMISSION_CODE = '3.16';

    var userId;
    try {
        var payload = window.jwt_decode(window.localStorage.getItem('jwt'));
        userId = payload.uid;
    } catch (ex) {
        userId = '';
    }

    $(document).on('change', '#template-type', switchTemplateType);
    $('.template-view').addClass('d-none');
    $('#carousel-container').on('slide.bs.carousel', checkCarouselSide);
    $(document).on('click', '.image-upload', clickImageUpload);
    $(document).on('click', '#image-upload', uploadImageFromButton);
    $(document).on('change', '.image-ghost', uploadImage);
    $(document).on('click', '#modal-save', insertTemplate);
    $(document).on('click', '#edit-btn', editTemplate);
    $(document).on('click', '#delete-btn', removeTemplate);
    $(document).on('click', '#edit-modal-save', updateTemplate);
    $(document).on('click', '#show-template-modal', clearModal);
    $(document).on('focus', 'input[type="text"]', function() {
        $(this).select();
    });

    return api.apps.findAll(userId).then(function(respJson) {
        var appsData = respJson.data;
        var $dropdownMenu = $appDropdown.find('.dropdown-menu');
        $jqDoc.find('button.inner-add').attr('disabled', true);

        for (var appId in appsData) {
            var app = appsData[appId];
            if (app.isDeleted || app.type === api.apps.enums.type.CHATSHIER) {
                delete appsData[appId];
                continue;
            }

            $dropdownMenu.append('<li><a class="dropdown-item" id="' + appId + '">' + appsData[appId].name + '</a></li>');
            $appSelector.append('<option id="' + appId + '">' + appsData[appId].name + '</option>');
            $appDropdown.find('#' + appId).on('click', appSourceChanged);
            nowSelectAppId = nowSelectAppId || appId;
        }

        if (nowSelectAppId) {
            $appDropdown.find('.dropdown-text').text(appsData[nowSelectAppId].name);
            loadTemplates(nowSelectAppId, userId);
            $jqDoc.find('button.inner-add').removeAttr('disabled'); // 資料載入完成，才開放USER按按鈕
        }
    });

    function appSourceChanged(ev) {
        nowSelectAppId = ev.target.id;
        $appDropdown.find('.dropdown-text').text(ev.target.text);
    }

    function loadTemplates(appId, userId) {
        $('#template-tables').empty();
        return api.appsTemplates.findAll(appId, userId).then(function(resJson) {
            let appsTemplates = resJson.data;
            if (!(appsTemplates && appsTemplates[appId])) {
                return;
            }

            let templates = appsTemplates[appId].templates;
            for (let templateId in templates) {
                let template = templates[templateId];

                $('#template-tables').append(
                    '<tr id="' + templateId + '" rel="' + appId + '">' +
                        '<th id="altText" data-title="data-title">' + template.altText + '</th>' +
                        '<td id="type">' + template.template.type + '</td>' +
                        '<td id="keyword">' + template.keyword + '</td>' +
                        '<td>' +
                            '<button type="button" class="mb-1 mr-1 btn btn-border btn-light fas fa-edit update" id="edit-btn" data-toggle="modal" data-target="#template-modal" aria-hidden="true"></button>' +
                            '<button type="button" class="mb-1 mr-1 btn btn-danger fas fa-trash-alt remove" id="delete-btn"></button>' +
                        '</td>' +
                    '</tr>'
                );
            }
        });
    }

    // =====load template start=====
    // function loadChannelInfo(userId, callback) {
    //     socket.emit('request channels', userId, (data) => {
    //         if (data.chanId_1 && data.name1) appendToView(data.chanId_1, data.name1);
    //         if (data.chanId_2 && data.name2) appendToView(data.chanId_2, data.name2);
    //         // if( data.fbPageId && data.fbName ) container.append('<option value="'+data.fbPageId+'">'+data.fbName+'</option>');
    //         loadTemplate();
    //     });

    //     function appendToView(id, name) {
    //         let select = $('.channel-select');
    //         let navTabs = $('#appSelector>.nav-tabs');
    //         let tabContent = $('#appSelector>.tab-content');
    //         select.append('<option value="' + id + '">' + name + '</option>');
    //         navTabs.append('<li><a data-toggle="tab" href="#' + id + '">' + name + '</a></li>');
    //         tabContent.append('<div class="tab-pane fade" id="' + id + '"></div>');
    //     }
    // }

    // =====load template end=====

    // =====view template start=====

    function clearModal() {
        imageFile = {
            0: '',
            1: '',
            2: ''
        };

        let modal = $('#template-modal');
        $('.template-upload-desc').removeClass('d-none');
        $('#template-type').val('').trigger('change');
        modal.find('input').val('');
        modal.find('textarea').val('');
        modal.find('.line-thumbnailImageUrl').val('');
        modal.find('.image-upload').attr('src', 'image/upload.png');
        modal.find('.carousel-inner').find('.carousel-item:first').addClass('active').siblings('.carousel-item').removeClass('active');
        modal.find('.app-select-bar').removeClass('d-none');
        modal.find('#edit-modal-save').addClass('d-none');
        modal.find('#modal-save').removeClass('d-none');
        checkCarouselSide();
    }

    function editTemplate() {
        clearModal();
        $('#show-template-modal').removeClass('d-none');
        $('.carousel-inner').carousel(0);
        $('.carousel-inner').carousel('pause');
        imageFile = {
            0: '',
            1: '',
            2: ''
        };
        carouselImage = [];
        btnImage = '';
        let modal = $('#template-modal');
        modal.find('.app-select-bar').addClass('d-none');
        modal.find('#modal-save').addClass('d-none');
        modal.find('#edit-modal-save').removeClass('d-none');
        let appId = $(this).parent().parent().attr('rel');
        let templateId = $(this).parent().parent().attr('id');

        return api.appsTemplates.findOne(appId, templateId, userId).then(function(resJson) {
            let data = resJson.data;
            let templates = data[appId].templates[templateId];
            let template = data[appId].templates[templateId].template;
            let type = template.type;
            $('#template-id').text(templateId);
            $('#template-keyword').val(templates.keyword);
            $('#template-type').val(template.type).trigger('change');
            $('#template-altText').val(templates.altText);
            if ('confirm' === type) {
                showConfirm(template);
            } ;
            if ('buttons' === type) {
                showButtons(template);
            };
            if ('carousel' === type) {
                showCarousel(template);
            };
        }).catch((ERR) => {
            return $.notify('載入失敗', { type: 'danger' });
        });
    }

    function showConfirm(template) {
        let container = $('.template-view[rel="confirm"] .rounded-border');
        container.find('.line-text').val(template.text);
        showAction(container, template.actions);
    }

    function showCarousel(template) {
        $('.template-upload-desc').addClass('d-none');
        let items = $('#carousel-container .carousel-item .rounded-border');
        for (let i = 0; i < template.columns.length; i++) {
            showColumn(items.eq(i), template.columns[i]);
            carouselImage[i] = template.columns[i].thumbnailImageUrl;
        }
    }

    function showButtons(template) {
        $('.template-upload-desc').addClass('d-none');
        let container = $('#carousel-container .carousel-item.active .rounded-border');
        btnImage = template.thumbnailImageUrl;
        container.find('.line-thumbnailImageUrl').val(template.thumbnailImageUrl);
        container.find('.line-thumbnailImageUrl>img').attr('src', template.thumbnailImageUrl);
        container.find('.line-title').val(template.title);
        container.find('.line-text').val(template.text);
        showAction(container, template.actions);
    }

    function showColumn(container, column) {
        container.find('.line-thumbnailImageUrl').val(column.thumbnailImageUrl);
        container.find('.line-thumbnailImageUrl>img').attr('src', column.thumbnailImageUrl);
        container.find('.line-title').val(column.title);
        container.find('.line-text').val(column.text);
        showAction(container, column.actions);
    }

    function showAction(container, action) {
        let $actions = container.find('.line-action');
        for (let i = 0; i < action.length; i++) {
            let dom = $actions.eq(i);
            let data = action[i];
            dom.find('.row-label').val(data.label);
            if (!data.text) {
                dom.find('.row-text').val(data.uri);
            } else {
                dom.find('.row-text').val(data.text);
            }
        }
    }

    function updateTemplate() {
        $('#edit-modal-save').attr('disabled', true);
        let appId = $('#app-select option:selected').attr('id');
        let altText = $('#template-altText').val();
        let keyword = $('#template-keyword').val();
        let type = $('#template-type').val();
        let templateId = $('#template-id').text();

        if (!altText) {
            $('#edit-modal-save').removeAttr('disabled');
            $.notify('電腦版替代文字不可為空', { type: 'warning' });
            return null;
        } else {
            let template = null;
            if ('confirm' === type) {
                template = createConfirm();
            } else if ('buttons' === type) {
                template = createButtons();
            } else if ('carousel' === type) {
                template = createCarousel();
            } else {
                return Promise.resolve([]);
            }

            let putTemplate = {
                type: 'template',
                keyword: keyword,
                altText: altText,
                template: template
            };

            return Promise.all(Object.keys(imageFile).map((imageFileNum) => {
                return Promise.resolve().then(() => {
                    if (imageFile[imageFileNum]) {
                        return api.bot.uploadFile(appId, userId, imageFile[imageFileNum]).then((resJson) => {
                            return resJson.data.url;
                        });
                    }
                    return '';
                });
            })).then((imageUrls) => {
                if ('buttons' === putTemplate.template.type) {
                    putTemplate.template.thumbnailImageUrl = imageUrls[0] || btnImage || carouselImage[0];
                }

                if ('carousel' === putTemplate.template.type) {
                    for (let i in putTemplate.template.columns) {
                        putTemplate.template.columns[i].thumbnailImageUrl = imageUrls[i] || carouselImage[i] || btnImage;
                    }
                }
            }).then(() => {
                return api.appsTemplates.update(appId, templateId, userId, putTemplate);
            }).then(() => {
                $('#template-modal').modal('hide');
                $.notify('修改成功！', { type: 'success' });
                $('#edit-modal-save').removeAttr('disabled');
                return loadTemplates(appId, userId);
            }).catch((resJson) => {
                if (undefined === resJson.status) {
                    $('#template-modal').modal('hide');
                    $.notify('失敗', { type: 'danger' });
                    $('#edit-modal-save').removeAttr('disabled');
                }

                if (NO_PERMISSION_CODE === resJson.code) {
                    $('#template-modal').modal('hide');
                    $.notify('無此權限', { type: 'danger' });
                    $('#edit-modal-save').removeAttr('disabled');
                }
            });
        }
    }
    // =====view template end=====

    // =====edit template start=====
    function switchTemplateType() {
        let type = $(this).val();
        let viewClass = '.template-view';
        let typeSelect = '[rel~="' + type + '"]';
        $(viewClass + ':not(' + typeSelect + ')').addClass('d-none');
        $(viewClass + typeSelect).removeClass('d-none');
        if ('carousel' === type) checkCarouselSide();
    }

    function clickImageUpload() {
        $(this).parents('.line-thumbnailImageUrl').find('.image-ghost').click();
    }

    function uploadImageFromButton() {
        let name = $(this).attr('id');
        $(`.carousel-item.template-view.active .${name}`).parents('.line-thumbnailImageUrl').find('.image-ghost').click();
    }

    function uploadImage() {
        /** @type {HTMLInputElement} */
        let input = this;
        let activeIndex = $(this).parents('.carousel-item.active').index();

        if (input.files && input.files[0]) {
            /** @type {File} */
            file = input.files[0];
            imageFile[activeIndex] = file;

            var config = window.chatshier.config;
            if (file.type.indexOf('image') >= 0 && file.size > config.imageFileMaxSize) {
                $('#modal-save').removeAttr('disabled');
                $('#edit-modal-save').removeAttr('disabled');
                $.notify('圖像檔案過大，檔案大小限制為: ' + Math.floor(config.imageFileMaxSize / (1024 * 1000)) + ' MB');
                return;
            }

            return new Promise(function(resolve, reject) {
                var fileReader = new FileReader();
                fileReader.onload = function() {
                    resolve(fileReader.result);
                };
                fileReader.readAsDataURL(file);
            }).then(function(imgBase64) {
                previewImage = imgBase64;
                $(input).siblings('img').attr('src', imgBase64);
                $('.template-upload-desc').addClass('d-none');
            }).catch((ERR) => {
                return $.notify('載入失敗', { type: 'danger' });
            });
        }
    }

    function checkCarouselSide() {
        let container = $('#carousel-container');
        if ($('.carousel-inner .carousel-item:first').hasClass('.active')) {
            container.find('.carousel-item-left.carousel-control').addClass('d-none');
            container.find('.carousel-item-right.carousel-control').removeClass('d-none');
        } else if ($('.carousel-inner .carousel-item:last').hasClass('active')) {
            container.find('.carousel-item-right.carousel-control').addClass('d-none');
            container.find('.carousel-item-left.carousel-control').removeClass('d-none');
        } else {
            container.find('.carousel-control').removeClass('d-none');
        }
    }

    function insertTemplate() {
        $('#modal-save').attr('disabled', true);
        appId = $('#app-select option:selected').attr('id');
        keyword = $('#template-keyword').val();
        let type = $('#template-type').val();

        if (!keyword || !type) {
            $('#modal-save').removeAttr('disabled');
            return $.notify('發送群組、觸發關鍵字及類型不可為空', { type: 'warning' });
        } else {
            let template = createTemplate(type);
            if (!template) {
                $('#modal-save').removeAttr('disabled');
                $.notify('模板資料輸入有誤，請完成正確的模板設定', { type: 'warning' });
                return;
            }

            return Promise.all(Object.keys(imageFile).map((imageFileNum) => {
                return Promise.resolve().then(() => {
                    if (imageFile[imageFileNum]) {
                        return api.bot.uploadFile(appId, userId, imageFile[imageFileNum]).then((resJson) => {
                            return resJson.data.url;
                        });
                    }
                    return '';
                });
            })).then((imageUrls) => {
                if (!(template && template.template)) {
                    return;
                }

                if ('buttons' === template.template.type) {
                    template.template.thumbnailImageUrl = imageUrls[0];
                } else if ('carousel' === template.template.type) {
                    for (let i in template.template.columns) {
                        template.template.columns[i].thumbnailImageUrl = imageUrls[i];
                    }
                }
            }).then(() => {
                return api.appsTemplates.insert(appId, userId, template);
            }).then(() => {
                $('#template-modal').modal('hide');
                $('#modal-save').removeAttr('disabled');
                $.notify('新增成功！', { type: 'success' });
                return loadTemplates(appId, userId);
            });
        }
    }

    function createTemplate(type) {
        let altText = $('#template-altText').val();
        if (!altText) {
            $('#modal-save').removeAttr('disabled');
            $.notify('電腦版替代文字不可為空', { type: 'warning' });
            return null;
        } else {
            let template = null;
            if ('confirm' === type) {
                template = createConfirm();
            } else if ('buttons' === type) {
                template = createButtons();
            } else if ('carousel' === type) {
                template = createCarousel();
            }

            if (!template) {
                return null;
            }

            let postTemplate = {
                'type': 'template',
                'keyword': keyword,
                'altText': altText,
                'template': template
            };
            return postTemplate;
        }
    }

    function createConfirm() {
        let container = $('.template-view[rel="confirm"] .rounded-border');
        let text = container.find('.line-text').val();
        if (!text) {
            $('#modal-save').removeAttr('disabled');
            $('#edit-modal-save').removeAttr('disabled');
            $.notify('說明文字不可為空', { type: 'warning' });
            return null;
        }

        let actions = getAction(container);
        let template = {
            'type': 'confirm',
            'text': text,
            'actions': actions
        };
        return template;
    }

    function createButtons() {
        let container = $('#carousel-container .carousel-item.active .rounded-border');
        let thumbnailImageUrl = previewImage;
        let title = container.find('.line-title').val();
        let text = container.find('.line-text').val();
        let actions = getAction(container);

        if (!text) {
            $('#modal-save').removeAttr('disabled');
            $('#edit-modal-save').removeAttr('disabled');
            $.notify('說明文字不可為空', { type: 'warning' });
            return null;
        }

        let template = {
            'type': 'buttons',
            'text': text,
            'title': title,
            'thumbnailImageUrl': thumbnailImageUrl,
            'actions': actions
        };
        return template;
    }

    function createCarousel() {
        let items = $('#carousel-container .carousel-item .rounded-border');
        let columns = [];
        items.each(function() {
            let col = getColumn($(this));
            col && columns.push(col);
        });

        if (columns.length > 0) {
            let template = {
                type: 'carousel',
                columns: columns
            };
            return template;
        } else {
            return null;
        }
    }

    function getColumn(container) {
        let thumbnailImageUrl = previewImage;
        let title = container.find('.line-title').val();
        let text = container.find('.line-text').val();

        if (!text) {
            return null;
        }

        let column = {
            text: text || '',
            title: title || '',
            actions: getAction(container),
            thumbnailImageUrl: thumbnailImageUrl || ''
        };
        return column;
    }

    function getAction(container) {
        let $actions = container.find('.line-action');
        let actionArr = [];
        let textslice;
        $actions.each(function() {
            let label = $(this).find('.row-label').val();
            let text = $(this).find('.row-text').val();
            if (!label) label = '---';
            if ('---' === label) text = ' ';
            else if (!text) text = label;
            textslice = text.slice(0, 5);
            if ('https' === textslice) {
                actionArr.push({
                    'type': 'uri',
                    'label': label,
                    'uri': text
                });
            } else {
                actionArr.push({
                    'type': 'message',
                    'label': label,
                    'text': text
                });
            }
        });
        return actionArr;
    }

    // =====edit template end=====

    function removeTemplate() {
        let appId = $(this).parent().parent().attr('rel');
        let templateId = $(this).parent().parent().attr('id');
        return showDialog('確定要刪除嗎？').then(function(isOK) {
            if (!isOK) {
                return;
            }
            return api.appsTemplates.remove(appId, templateId, userId);
        }).then(function(resJson) {
            $('#' + templateId).remove();
            $.notify('刪除成功！', { type: 'success' });
        }).catch((resJson) => {
            if (undefined === resJson.status) {
                $.notify('失敗', { type: 'danger' });
            }
            if (NO_PERMISSION_CODE === resJson.code) {
                $.notify('無此權限', { type: 'danger' });
            }
        });
    }

    function showDialog(textContent) {
        return new Promise(function(resolve) {
            $('#textContent').text(textContent);

            var isOK = false;
            var $dialogModal = $('#dialog_modal');

            $dialogModal.find('.btn-primary').on('click', function() {
                isOK = true;
                resolve(isOK);
                $dialogModal.modal('hide');
            });

            $dialogModal.find('.btn-secondary').on('click', function() {
                resolve(isOK);
                $dialogModal.modal('hide');
            });

            $dialogModal.modal({
                backdrop: false,
                show: true
            });
        });
    }
})();
