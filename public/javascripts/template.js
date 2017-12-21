const socket = io.connect();
var templateForm = $('#template-form');
var templateData = {};
var userId = "";
$(document).ready(function() {
    window.dispatchEvent(firbaseEvent);
});
$(function() {
    window.dispatchEvent(firbaseEvent);

    $(document).on('change', '#template-type', switchTemplateType);
    $('.template-view').hide();
    $('#carousel-container').on('slid.bs.carousel', checkCarouselSide);
    $(document).on('click', '.image-upload', clickImageUpload);
    $(document).on('change', '.image-ghost', uploadImage);
    $(document).on('click', '#modal-save', saveTemplate);
    $(document).on('contextmenu', '.template-btn', toggleTemplateStatus);
    $(document).on('dblclick', '.template-btn', showTemplate);
    // $(document).on('click', '.template-btn', showTemplateChart); //not done
    setTimeout(() => {
        userId = auth.currentUser.uid;
        loadChannelInfo();
    },2000);
    $(document).on('focus', 'input[type="text"]', function() {
        $(this).select();
    });
});

// =====load template start=====
function loadChannelInfo(callback) {
    socket.emit('request channels', userId, (data) => {
        console.log(data);
        if (data.chanId_1 && data.name1) appendToView(data.chanId_1, data.name1);
        if (data.chanId_2 && data.name2) appendToView(data.chanId_2, data.name2);
        // if( data.fbPageId && data.fbName ) container.append('<option value="'+data.fbPageId+'">'+data.fbName+'</option>');
        loadTemplate();
    });

    function appendToView(id, name) {
        let select = $('.channel-select');
        let navTabs = $('#view-all>.nav-tabs');
        let tabContent = $('#view-all>.tab-content');
        select.append('<option value="' + id + '">' + name + '</option>');
        navTabs.append('<li><a data-toggle="tab" href="#' + id + '">' + name + '</a></li>');
        tabContent.append('<div class="tab-pane fade" id="' + id + '"></div>');
    }
}

function loadTemplate() {
    socket.emit('request template', userId, (templates) => {
        $('.tab-pane').empty();
        console.log(templates);
        templateData = templates;
        let container = $('#view-all');
        for (let prop in templates) {
            let tab = container.find('.tab-pane#' + templates[prop].channelId);
            let keyword = templates[prop].keyword;
            let status = templates[prop].status;
            let btnClass = status == "open" ? "btn-success" : "btn-danger";
            tab.append('<button class="btn ' + btnClass + ' template-btn" id="' + prop + '">' + keyword + '</button>');
        }
    });
}
// =====load template end=====

// =====view template start=====
$(document).on('click', '#show-template-modal', clearModal);

function clearModal() {
    let modal = $('#template-modal');
    console.log("clear");
    modal.find('input').val('');
    modal.find('textarea').val('');
    modal.find('select').val('');
    modal.find('.line-thumbnailImageUrl').val('');
    modal.find('.image-upload').attr('src', '');
    modal.find('.carousel-inner').find('.item:first').addClass('active').siblings('.item').removeClass('active');
    checkCarouselSide();
}

function toggleTemplateStatus(e) {
    e.preventDefault();
    let id = $(this).attr('id');
    let channelId = $(this).parents('.tab-pane').attr('id');
    let status = "";
    if ($(this).hasClass('btn-success')) {
        // $(this).removeClass('btn-success').addClass('btn-danger');
        status = "close";
    } else {
        // $(this).addClass('btn-success').removeClass('btn-danger');
        status = "open";
    }
    socket.emit('change template', userId, id, {
        "status": status
    }, loadTemplate);
}

function showTemplate() {
    $('#show-template-modal').click();

    let id = $(this).attr('id');
    let keyword = $(this).text();
    let channelId = $(this).parents('.tab-pane').attr('id');
    let status = $(this).hasClass('btn-success') ? "open" : "close";

    let data = templateData[id];
    console.log(data);
    let template = data.template.template;
    let type = template ? template.type : data.template.type;
    $('#template-id').val(id);
    $('#template-channelId').val(channelId);
    $('#template-keyword').val(keyword);
    $('#template-status').val(status);
    $('#template-type').val(type).trigger('change');
    $('#template-altText').val(data.template.altText);
    if (type == "text") showText();
    else if (type == "confirm") showConfirm();
    else if (type == "buttons") showButtons();
    else if (type == "carousel") showCarousel();

    function showText() {
        $('#template-text').val(data.template.text);
    }

    function showConfirm() {
        let container = $('.template-view[rel="confirm"] .rounded-border');
        container.find('.line-text').val(template.text);
        showAction(container, template.actions);
    }

    function showCarousel() {
        let items = $('#carousel-container .item .rounded-border');
        for (let i = 0; i < template.columns.length; i++) {
            showColumn(items.eq(i), template.columns[i]);
        }
    }

    function showButtons() {
        let container = $('#carousel-container .item.active .rounded-border');
        showColumn(container, template);
    }

    function showColumn(container, column) {
        container.find('.line-thumbnailImageUrl').val(column.thumbnailImageUrl);
        container.find('.line-thumbnailImageUrl>img').attr("src", column.thumbnailImageUrl);
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
    if (type == "carousel") checkCarouselSide();
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
    let propId = $('#template-id').val();
    let channelId = $('#template-channelId').val();
    let keyword = $('#template-keyword').val();
    let status = $('#template-status').val();
    let type = $('#template-type').val();
    if (!channelId || !keyword || !type) {
        alert("發送群組、觸發關鍵字及類型不可為空");
    } else {
        let template = createTemplate(type);
        if (template) {
            let data = {
                "channelId": channelId,
                "keyword": keyword,
                "status": status,
                "template": template
            };
            console.log(data);
            if (propId) {
                socket.emit('change template', userId, propId, data, loadTemplate);
            } else {
                socket.emit('create template', userId, data, loadTemplate);
            }
            $('#template-modal').modal('toggle');
        }
    }
}

function createTemplate(type) {
    if (type == "text") {
        let text = $('.template-view[rel="text"] #template-text').val();
        if (!text) {
            alert('文字不可為空');
            return null;
        } else return {
            "type": "text",
            "text": text
        };
    } else {
        let altText = $('#template-altText').val();
        if (!altText) {
            alert('電腦版替代文字不可為空');
            return null;
        } else {
            let template = null;
            if (type == "confirm") template = createConfirm();
            else if (type == "buttons") template = createButtons();
            else if (type == "carousel") template = createCarousel();

            if (!template) return null;
            else return {
                "type": "template",
                "altText": altText,
                "template": template
            };
        }
    }

    function createConfirm() {
        let container = $('.template-view[rel="confirm"] .rounded-border');
        let text = container.find('.line-text').val();
        if (!text) {
            alert('說明文字不可為空');
            return null;
        } else {
            let actions = getAction(container);
            let template = {
                "type": "confirm",
                "text": text,
                "actions": actions
            };
            return template;
        }
    }

    function createButtons() {
        let container = $('#carousel-container .item.active .rounded-border');
        let template = getColumn(container);
        if (!template) {
            alert('說明文字不可為空');
            return null;
        } else {
            template["type"] = "buttons";
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
                "type": "carousel",
                "columns": columns
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
                "text": text,
                "actions": actions
            };
            if (thumbnailImageUrl) column["thumbnailImageUrl"] = thumbnailImageUrl;
            if (title) column["title"] = title;
            return column;
        }
    }

    function getAction(container) {
        let $actions = container.find('.line-action');
        let actionArr = [];
        $actions.each(function() {
            let label = $(this).find('.row-label').val();
            let text = $(this).find('.row-text').val();
            if (!label) label = "---";
            if (label == "---") text = " ";
            else if (!text) text = label;
            actionArr.push({
                "type": "message",
                "label": label,
                "text": text
            });
        });
        return actionArr;
    }
}
// =====edit template end=====

// =====chart start=====
function showTemplateChart() {
    let id = $(this).attr('id');
    let allTemplateList = JSON.parse(JSON.stringify(templateData));
    let nodeDataArray = [];
    let linkDataArray = [];
    let childList = getDeepProperty(getDeepProperty(templateList[id], "actions"), "text");
    console.log(childList);
    removeChildInGlobal();
    let parentList = getParentList();
}

function getDeepProperty(obj, property) {
    if (typeof obj != "object" || !property) return [];
    let list = [];
    for (let prop in obj) {
        if (prop == property) {
            list.push(obj[prop]);
        } else {
            let aList = getDeepProperty(obj[prop], property);
            list = list.concat(aList);
        }
    }
    return list;
}

// mermaid.init({}, ".mermaidd");


// =====chart end=====