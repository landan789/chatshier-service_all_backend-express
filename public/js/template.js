/// <reference path='../../typings/client/index.d.ts' />
(function() {
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
    var previewImage = '';
    var file;
    var imageFile = {};
    var btnImage;
    var carouselImage=[];
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
    $(document).on('change', '.image-ghost', uploadImage);
    $(document).on('click', '#modal-save', saveTemplate);
    $(document).on('click', '#edit-btn', editTemplate);
    $(document).on('click', '#delete-btn', dataRemove);
    $(document).on('click', '#edit-modal-save', dataUpdate);
    $(document).on('click', '#show-template-modal', clearModal);
    $(document).on('focus', 'input[type="text"]', function() {
        $(this).select();
    });
    return api.apps.findAll(userId).then(function(respJson) {
        var appsData = respJson.data;
        var $dropdownMenu = $appDropdown.find('.dropdown-menu');
        $jqDoc.find('button.inner-add').attr('disabled',true);
        let nowSelectAppId = '';
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
        let a = $(this);
        imageFile = {
            0 : '',
            1 : '',
            2 : ''
        };
        imageUrl=[];
        let modal = $('#template-modal');
        modal.find('input').val('');
        modal.find('textarea').val('');
        $('#template-type').val('').trigger('change');
        modal.find('.line-thumbnailImageUrl').val('');
        modal.find('.image-upload').attr('src', '');
        modal.find('.carousel-inner').find('.carousel-item:first').addClass('active').siblings('.carousel-item').removeClass('active');
        modal.find('.app-select-bar').removeClass('d-none');
        modal.find('#edit-modal-save').addClass('d-none');
        modal.find('#modal-save').removeClass('d-none');
        checkCarouselSide();
    }

    function editTemplate() {
        clearModal();
        $('#show-template-modal').removeClass('d-none');
        $(".carousel-inner").carousel(0);
        $(".carousel-inner").carousel('pause');
        imageFile = {
        0 : '',
        1 : '',
        2 : ''};
        imageUrl=[];
        carouselImage=[];
        btnImage='';
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
            if ('confirm' === type){
                showConfirm(template);
            } ;
            if('buttons' === type) {
                showButtons(template);
            };
            if('carousel' === type) {
                showCarousel(template);
            };
        });
    }
        function showConfirm(template) {
            let container = $('.template-view[rel="confirm"] .rounded-border');
            container.find('.line-text').val(template.text);
            showAction(container, template.actions);
        }

        function showCarousel(template) {
            let items = $('#carousel-container .carousel-item .rounded-border');
            for (let i = 0; i < template.columns.length; i++) {
                showColumn(items.eq(i), template.columns[i]);
                 carouselImage[i]=template.columns[i].thumbnailImageUrl;
            }
        }

        function showButtons(template) {
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
                if(!data.text){
                    dom.find('.row-text').val(data.uri);
                }
                else{
                    dom.find('.row-text').val(data.text);
                }
            }
        }
        function dataUpdate(){
            $('#edit-modal-save').attr('disabled', true);
            let appId = $('#app-select option:selected').attr('id');
            let altText = $('#template-altText').val();
            let keyword = $('#template-keyword').val();
            let type = $('#template-type').val();
            let templateId = $('#template-id').text();
            let document = 'template';
            if (!altText) {
                $.notify('電腦版替代文字不可為空', { type: 'warning' });
                return null;
            } else {
                let template = null;
                if ('confirm' === type) template = createConfirm();
                else if ('buttons' === type) template = createButtons();
                else if ('carousel' === type){
                    template = createCarousel();
                } 
                if (!template) return null;
                else {
                    let putTemplate = {
                        'type': 'template',
                        'keyword': keyword,
                        'altText': altText,
                        'template': template
                    };
                        return Promise.all(Object.keys(imageFile).map((imageFileNum) => {
                            if(''!== imageFile[imageFileNum]){
                                return api.bot.uploadFile(appId,document,templateId, userId,imageFile[imageFileNum]).then((resJson)=>{
                                   return resJson.data;
                                 })
                            }
                        })).then((imageUrl)=>{
                           if('buttons'=== putTemplate.template.type){
                            putTemplate.template.thumbnailImageUrl = imageUrl[0] || btnImage || carouselImage[0];
                           }
                           if('carousel'=== putTemplate.template.type){
                            for(img in putTemplate.template.columns){
                                putTemplate.template.columns[img].thumbnailImageUrl = imageUrl[img] || carouselImage[img] || btnImage;
                               }
                            
                        }
                        }).then(()=>{
                            api.appsTemplates.update(appId, templateId, userId,putTemplate);
                                $('#template-modal').modal('hide');
                                $.notify('修改成功！', { type: 'success' });
                                $('#edit-modal-save').removeAttr('disabled');
                                setTimeout(function() {
                                    $appDropdown.find('#' + appId).click();
                                }, 1000);
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
                };
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
        let imageGhost = $(this).parents('.line-thumbnailImageUrl').find('.image-ghost').click();
    }

    function uploadImage() {
        /** @type {HTMLInputElement} */
        let input = this;
        let fileName = input.value;

        let activeIndex = $(this).parents('.carousel-item.active').index();

        if (input.files && input.files[0]) {
            /** @type {File} */
            file = input.files[0];
            imageFile[activeIndex]= Object.assign(file)
            var fileReader = new FileReader();
            var config = window.chatshier.config;
            if (file.type.indexOf('image') >= 0 && file.size > config.imageFileMaxSize) {
                $.notify('圖像檔案過大，檔案大小限制為: ' + Math.floor(config.imageFileMaxSize / (1024 * 1000)) + ' MB');
                return;
            }
            return new Promise(function(resolve, reject) {
                            fileReader.onload = function() {
                                resolve(fileReader.result);
                            };
                            fileReader.readAsDataURL(file);
                        }).then(function(imgBase64) {
                        previewImage= imgBase64;
                        $(input).siblings('img').attr('src', imgBase64);
            })
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

    function saveTemplate() { 
        $('#modal-save').attr('disabled', true);
        appId = $('#app-select option:selected').attr('id');
        keyword = $('#template-keyword').val();
        let type = $('#template-type').val();
        
        if (!keyword || !type) {
            $.notify('發送群組、觸發關鍵字及類型不可為空', { type: 'warning' });
        } else {
            let template = createTemplate(type);
            if (template) {
                return Promise.all(Object.keys(imageFile).map((imageFileNum) => {
                    if ('' !== imageFile[imageFileNum]) {
                        return api.bot.uploadFile(appId, userId, imageFile[imageFileNum]).then((resJson) => {
                            return resJson.data.url;
                        });
                    }
                })).then((imageUrl) => {
                    if ('buttons' === template.template.type) {
                        template.template.thumbnailImageUrl = imageUrl[0];
                    }
                    if ('carousel' === template.template.type) {
                        for (let img in template.template.columns) {
                            template.template.columns[img].thumbnailImageUrl = imageUrl[img];
                        }
                    }
                }).then(() => {
                    api.appsTemplates.insert(appId, userId, template);
                    $('#template-modal').modal('hide');
                    $.notify('新增成功！', { type: 'success' });
                    $('#modal-save').removeAttr('disabled');
                    setTimeout(function() {
                        $appDropdown.find('#' + appId).click();
                    }, 1000);
                    $('#template-modal').modal('toggle');
                });
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
                return postTemplate;
            };
        }  
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
        let container = $('#carousel-container .carousel-item.active .rounded-border');
        let thumbnailImageUrl = previewImage;
        let title = container.find('.line-title').val();
        let text = container.find('.line-text').val();
        let actions= getAction(container);
        if (!text) {
            $.notify('說明文字不可為空', { type: 'warning' });
            return null;
        } else {
            let template = {
                'type': 'buttons',
                'text':text,
                'title':title,
                'thumbnailImageUrl': thumbnailImageUrl,
                'actions': actions
            }
            return template;
        }
    }

    function createCarousel() {
        let items = $('#carousel-container .carousel-item .rounded-border');
        let columns = [];
        items.each(function() {
            let col = getColumn($(this));
            if (col) columns.push(col);
        });
        if (columns.length > 0) {
            let template = {
                'type': 'carousel',
                'thumbnailImageUrl':'',
                'columns': columns
            };
            return template;
        } else return null;
    }

    function getColumn(container) {
        let thumbnailImageUrl = previewImage;
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
