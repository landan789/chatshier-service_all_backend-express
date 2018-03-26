/// <reference path='../../typings/client/index.d.ts' />
(function() {
    $('#loading').fadeOut();

    const socket = io.connect();
    var api = window.restfulAPI;
    var $jqDoc = $(document);
    var $templateEditModal = $('#edit-modal');
    var editForm = $('#edit-form');
    var templateData = {};
    var $appDropdown = $('.app-dropdown');
    var $appSelector = $('#app-select');
    var nowSelectAppId = '';
    var appId = '';
    var keyword = '';
    const NO_PERMISSION_CODE = '3.16';

    var userId;
    try {
        var payload = window.jwt_decode(window.localStorage.getItem('jwt'));
        userId = payload.uid;
    } catch (ex) {
        userId = '';
    }

    $(document).on('change', '#template-type', switchTemplateType);
    $('.template-view').hide();
    $('#carousel-container').on('slid.bs.carousel', checkCarouselSide);
    $(document).on('click', '.image-upload', clickImageUpload);
    $(document).on('change', '.image-ghost', uploadImage);
    $(document).on('click', '#modal-save', saveTemplate);
    $(document).on('click', '#edit-btn', editTemplate);
    $(document).on('click', '#delete-btn', dataRemove);
    $(document).on('click', '#show-template-modal', clearModal);
    $(document).on('focus', 'input[type="text"]', function() {
        $(this).select();
    });
    return api.apps.findAll(userId).then(function(respJson) {
        var appsData = respJson.data;
        var $dropdownMenu = $appDropdown.find('.dropdown-menu');

        let nowSelectAppId = '';
        for (var appId in appsData) {
            var app = appsData[appId];
            if (app.isDeleted || app.type === api.apps.enums.type.CHATSHIER) {
                delete appsData[appId];
                continue;
            }

            $dropdownMenu.append('<li><a id="' + appId + '">' + appsData[appId].name + '</a></li>');
            $appSelector.append('<option id="' + appId + '">' + appsData[appId].name + '</option>');
            $appDropdown.find('#' + appId).on('click', appSourceChanged);
            nowSelectAppId = nowSelectAppId || appId;
        }

        if (nowSelectAppId) {
            $appDropdown.find('.dropdown-text').text(appsData[nowSelectAppId].name);
            loadTemplates(nowSelectAppId, userId);
            $jqDoc.find('button.btn-default.inner-add').removeAttr('disabled'); // 資料載入完成，才開放USER按按鈕
        }
    });

    function appSourceChanged(ev) {
        nowSelectAppId = ev.target.id;
        $appDropdown.find('.dropdown-text').text(ev.target.text);
        loadTemplates(nowSelectAppId, userId);
    }

    function loadTemplates(appId, userId) {
        $('#template-tables').empty();
        return api.appsTemplates.findAll(appId, userId).then(function(resJson) {
            let templates = resJson.data[appId].templates;
            for (let templateId in templates) {
                let template = templates[templateId];

                $('#template-tables').append(
                    '<tr id="' + templateId + '" rel="' + appId + '">' +
                        '<th id="altText" data-title="data-title">' + template.altText + '</th>' +
                        '<td id="type">' + template.template.type + '</td>' +
                        '<td id="keyword">' + template.keyword + '</td>' +
                        '<td>' +
                            '<button type="button" class="btn btn-grey fa fa-pencil" id="edit-btn" data-toggle="modal" data-target="#template-modal" aria-hidden="true"></button>' +
                            '<button type="button" class="btn btn-danger fa fa-trash-o" id="delete-btn"></button>' +
                        '</td>' +
                    '</tr>'
                );
            }
        });
    }
    // =====load template start=====
    // function loadChannelInfo(userId, callback) {
    //     socket.emit('request channels', userId, (data) => {
    //         console.log(data);
    //         if (data.chanId_1 && data.name1) appendToView(data.chanId_1, data.name1);
    //         if (data.chanId_2 && data.name2) appendToView(data.chanId_2, data.name2);
    //         // if( data.fbPageId && data.fbName ) container.append('<option value="'+data.fbPageId+'">'+data.fbName+'</option>');
    //         loadTemplate();
    //     });

    //     function appendToView(id, name) {
    //         let select = $('.channel-select');
    //         let navTabs = $('#view-all>.nav-tabs');
    //         let tabContent = $('#view-all>.tab-content');
    //         select.append('<option value="' + id + '">' + name + '</option>');
    //         navTabs.append('<li><a data-toggle="tab" href="#' + id + '">' + name + '</a></li>');
    //         tabContent.append('<div class="tab-pane fade" id="' + id + '"></div>');
    //     }
    // }

    // =====load template end=====

    // =====view template start=====

    function clearModal() {
        let a = $(this);
        let modal = $('#template-modal');
        modal.find('input').val('');
        modal.find('textarea').val('');
        $('#template-type').val('').trigger('change');
        modal.find('.line-thumbnailImageUrl').val('');
        modal.find('.image-upload').attr('src', '');
        modal.find('.carousel-inner').find('.item:first').addClass('active').siblings('.item').removeClass('active');
        checkCarouselSide();
    }

    function editTemplate() {
        $('#show-template-modal').show();

        let appId = $(this).parent().parent().attr('rel');
        let templateId = $(this).parent().parent().attr('id');
        return api.appsTemplates.findOne(appId, templateId, userId).then(function(resJson) {
            let data = resJson.data;
            let template = data[appId].template;
            console.log(data);
            let type = template.type;
            $('#template-keyword').val(template.keyword);
            $('#template-type').val(template.type).trigger('change');
            $('#template-altText').val(template.altText);
            if ('text' === type) showText(template.text);
            else if ('confirm' === type) showConfirm(template);
            else if ('buttons' === type) showButtons(template);
            else if ('carousel' === type) showCarousel(template);
        });

        function showText(text) {
            $('#template-text').val(text);
        }

        function showConfirm(template) {
            let container = $('.template-view[rel="confirm"] .rounded-border');
            container.find('.line-text').val(template.text);
            showAction(container, template.actions);
        }

        function showCarousel(template) {
            let items = $('#carousel-container .item .rounded-border');
            for (let i = 0; i < template.columns.length; i++) {
                showColumn(items.eq(i), template.columns[i]);
            }
        }

        function showButtons(template) {
            let container = $('#carousel-container .item.active .rounded-border');
            showColumn(container, template);
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
                dom.find('.row-text').val(data.text);
            }
        }
    }
    // =====view template end=====

    // =====edit template start=====
    function switchTemplateType() {
        let type = $(this).val();
        let viewClass = '.template-view';
        let typeSelect = '[rel~="' + type + '"]';
        $(viewClass + ':not(' + typeSelect + ')').hide();
        $(viewClass + typeSelect).show();
        if ('carousel' === type) checkCarouselSide();
    }

    function clickImageUpload() {
        let imageGhost = $(this).parents('.line-thumbnailImageUrl').find('.image-ghost').click();
    }

    function uploadImage() {
        let input = this;
        if (input.files && input.files[0]) {
            let file = input.files[0];
            let storageRef = firebase.storage().ref();
            let fileRef = storageRef.child(file.lastModified + '_' + file.name);
            fileRef.put(file).then(function(snapshot) {
                let url = snapshot.downloadURL;
                $(input).parents('.line-thumbnailImageUrl').val(url);
                $(input).siblings('img').attr('src', url);
            });
        }
    }

    function checkCarouselSide() {
        let container = $('#carousel-container');
        if ($('.carousel-inner .item:first').hasClass('active')) {
            container.find('.left.carousel-control').hide();
            container.find('.right.carousel-control').show();
        } else if ($('.carousel-inner .item:last').hasClass('active')) {
            container.find('.right.carousel-control').hide();
            container.find('.left.carousel-control').show();
        } else {
            container.find('.carousel-control').show();
        }
    }

    function saveTemplate() {
        appId = $('#app-select option:selected').attr('id');
        keyword = $('#template-keyword').val();
        let type = $('#template-type').val();
        if (!keyword || !type) {
            $.notify('發送群組、觸發關鍵字及類型不可為空', { type: 'warning' });
        } else {
            let template = createTemplate(type);
            if (template) {
                let data = {
                    appId: appId,
                    keyword: keyword,
                    template: template
                };
                $('#template-modal').modal('toggle');
            }
        }
    }

    function createTemplate(type) {
        let altText = $('#template-altText').val();
        if (!altText) {
            $.notify('電腦版替代文字不可為空', { type: 'warning' });
            return null;
        } else {
            let template = null;
            if ('confirm' === type) template = createConfirm();
            else if ('buttons' === type) template = createButtons();
            else if ('carousel' === type) template = createCarousel();

            if (!template) return null;
            else {
                let postTemplate = {
                    'type': 'template',
                    'keyword': keyword,
                    'altText': altText,
                    'template': template
                };
                api.appsTemplates.insert(appId, userId, postTemplate);
                $('#template-modal').modal('hide');
                $.notify('新增成功！', { type: 'success' });
                $('#modal-save').removeAttr('disabled');
                setTimeout(function() {
                    $appDropdown.find('#' + appId).click();
                }, 1000);
            };
        }
        function createConfirm() {
            let container = $('.template-view[rel="confirm"] .rounded-border');
            let text = container.find('.line-text').val();
            if (!text) {
                $.notify('說明文字不可為空', { type: 'warning' });
                return null;
            } else {
                let actions = getAction(container);
                let template = {
                    'type': 'confirm',
                    'text': text,
                    'actions': actions
                };
                return template;
            }
        }

        function createButtons() {
            let container = $('#carousel-container .item.active .rounded-border');
            let template = getColumn(container);
            if (!template) {
                $.notify('說明文字不可為空', { type: 'warning' });
                return null;
            } else {
                template['type'] = 'buttons';
                return template;
            }
        }

        function createCarousel() {
            let items = $('#carousel-container .item .rounded-border');
            let columns = [];
            items.each(function() {
                let col = getColumn($(this));
                if (col) columns.push(col);
            });
            if (columns.length > 0) {
                let template = {
                    'type': 'carousel',
                    'columns': columns
                };
                return template;
            } else return null;
        }

        function getColumn(container) {
            let thumbnailImageUrl = container.find('.line-thumbnailImageUrl').val();
            let title = container.find('.line-title').val();
            let text = container.find('.line-text').val();
            if (!text) return null;
            else {
                let actions = getAction(container);
                let column = {
                    'text': text,
                    'actions': actions
                };
                if (thumbnailImageUrl) column['thumbnailImageUrl'] = thumbnailImageUrl;
                if (title) column['title'] = title;
                return column;
            }
        }

        function getAction(container) {
            let $actions = container.find('.line-action');
            let actionArr = [];
            $actions.each(function() {
                let label = $(this).find('.row-label').val();
                let text = $(this).find('.row-text').val();
                if (!label) label = '---';
                if ('---' === label) text = ' ';
                else if (!text) text = label;
                actionArr.push({
                    'type': 'message',
                    'label': label,
                    'text': text
                });
            });
            return actionArr;
        }
    }
    // =====edit template end=====

    function dataRemove() {
        let appId = $(this).parent().parent().attr('rel');
        let templateId = $(this).parent().parent().attr('id');
        return showDialog('確定要刪除嗎？').then(function(isOK) {
            if (!isOK) {
                return;
            }
            return api.appsTemplates.remove(appId, templateId, userId).then(function(resJson) {
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
// mermaid.init({}, ".mermaidd");
// =====chart end=====
