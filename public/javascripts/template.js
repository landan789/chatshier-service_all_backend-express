const socket = io.connect();
var templateForm = $('#template-form');
$(function() {
  // socket.emit('request message time');
  $(document).on('change', '#template-type', switchTemplateType);
  $('.template-view').hide();
  $('#carousel-container').on('slid.bs.carousel', checkCarouselSide);
  $(document).on('click', '.image-upload', clickImageUpload);
  $(document).on('change', '.image-ghost', uploadImage);
  $(document).on('click', '#modal-create', createTemplate);
});

function switchTemplateType() {
  let type = $(this).val();
  let viewClass = '.template-view';
  let typeSelect = '[rel~="'+type+'"]';
  $(viewClass+':not('+typeSelect+')').hide();
  $(viewClass+typeSelect).show();
  checkCarouselSide();
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
          let url = snapshot.metadata.downloadURLs[0];
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
    }
    else if ($('.carousel-inner .item:last').hasClass('active')) {
        container.find('.right.carousel-control').hide();
        container.find('.left.carousel-control').show();
    }
    else {
        container.find('.carousel-control').show();
    }
}
function createTemplate() {
    let keyword = $('#template-keyword').val();
    let type = $('#template-type').val();
    let altText = $('#template-altText').val();
    if( !keyword || !type || !altText ) {
        alert("觸發關鍵字、類型、電腦版替代文字不可為空");
    }
    else {
        let template = getTemplate(type);
        if( template==-1 ) {
            alert("說明文字不可為空");
        }
        else {
            let data = {
                "keyword": keyword,
                "template": {
                    "type": "template",
                    "altText": altText,
                    "template": template
                }
            };
            console.log(data);
            socket.emit('create template', data);
        }
    }
}
function getTemplate(type) {
    if( type=="confirm" ) return createConfirm();
    else if( type=="buttons" ) return createButtons();
    else if( type=="carousel" ) return createCarousel();
    else console.log("getTemeplate ERR!");

    function createConfirm() {
        let container = $('.template-view[rel="confirm"] .rounded-border');
        let text = container.find('.line-text').val();
        if( !text ) return -1;

        let actions = getAction(container);
        let template = {
            "type": "confirm",
            "text": text,
            "actions": actions
        };
        return template;
    }
    function createButtons() {
        let container = $('#carousel-container .item.active .rounded-border');
        let template = getColumn(container);
        if( template==-1 ) return -1;
        else {
            template["type"] = "buttons";
            return template;
        }
    }
    function createCarousel() {
        let items = $('#carousel-container .item .rounded-border')
        let columns = []
        items.each(function() {
            let col = getColumn($(this));
            if( col!=-1 ) columns.push(col);
        });
        if( columns.length>0 ) {
            let template = {
                "type": "carousel",
                "columns": columns
            };
            return template;
        }
        else return -1;
    }
    function getColumn(container) {
        let thumbnailImageUrl = container.find('.line-thumbnailImageUrl').val();
        let title = container.find('.line-title').val();
        let text = container.find('.line-text').val();
        if( !text ) return -1;

        let actions = getAction(container);
        let column = {
            "thumbnailImageUrl": thumbnailImageUrl,
            "title": title,
            "text": text,
            "actions": actions
        };
        return column;
    }
    function getAction(container) {
        let $actions = container.find('.line-action');
        let actionArr = [];
        $actions.each(function() {
            let label = $(this).find('.row-label').val();
            let text = $(this).find('.row-text').val();
            if( !label ) {
                label = "---";
                text = "";
            }
            actionArr.push({
                "type": "message",
                "label": label,
                "text": text
            });
        });
        return actionArr;
    }
}
