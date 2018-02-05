var modal = $('#richmenu-modal');

$(document).ready(function() {
    // 設定 bootstrap notify 的預設值
    // 1. 設定為顯示後2秒自動消失
    // 2. 預設位置為螢幕中間上方
    // 3. 進場與結束使用淡入淡出
    $.notifyDefaults({
        delay: 2000,
        placement: {
            from: 'top',
            align: 'center'
        },
        animate: {
            enter: 'animated fadeInDown',
            exit: 'animated fadeOutUp'
        }
    });

    var startUserId = setInterval(() => {
        if(auth.currentUser) {
            clearInterval(startUserId);
            find();
        }
    },1000);

    $(document).on('click', '#del', function(){    //刪除
        let appId = $(this).parent().parent().attr('rel');
        let richmenuId = $(this).parent().parent().attr('id');
        remove(appId, richmenuId);
    });

    $('.content-bar').hide();
    $('.content-input').hide();
    $(document).on('click', '#modal-save', saveRichMenus);
    $(document).on('click', '#show-richmenu-modal', clearModal);
    $(document).on('change', '.image-ghost', uploadImage);
    $(document).on('click', 'input[name = richmenu-type]', photoTypeShow);
    $(document).on('click', 'input[name = content]', contentInputShow);
    $(document).on('click', '.box', contentBarShow);
        
     
});

function uploadImage() {
    let input = this;
    if (input.files && input.files[0]) {
        let file = input.files[0];
        // let reader = new FileReader();
        // console.log(file.width);           //圖片寬
        // console.log(file.height);          //圖片高
        // console.log(file.size + 'kB');     //圖片大小
        // console.log(file.type);            //圖片檔名
        // reader.onloadend = function(e){
        //     console.log(e);
        //     console.log(e.target.result);
        //     var image = new Image();
        //     image.onload = function(){
        //         console.log(image.width);
        //         console.log(image.height);
        //     }
        //     $('.show-richmenu-type').css('background','url('+ e.target.result +') center no-repeat').css('background-size', 'cover');
        // }
        let storageRef = firebase.storage().ref();
        let fileRef = storageRef.child(file.lastModified + '_' + file.name);
        fileRef.put(file).then(function(snapshot) {
            let url = snapshot.downloadURL;
            $('.show-richmenu-type').css('background','url('+ url +') center no-repeat').css('background-size', 'cover');
        });
    }
}

function photoTypeShow(){
    $('.content-bar').hide();
    $('.content-input').hide();
    modal.find('.show-richmenu-type').find('.box').remove();
    var checked = $(this).val();
    var typeBox = new typeObj();
    var box1 = typeBox.box1;
    var box2 = typeBox.box2;
    var box3 = typeBox.box3;
    var box4 = typeBox.box4;
    var box5 = typeBox.box5;
    var box6 = typeBox.box6;
    switch(checked){
        case "type1":
            modal.find('.show-richmenu-type').append(box1, box2, box3, box4, box5, box6);
            break;
        case "type2":
            box1.css('width','270px');
            box2.css('width','270px');
            box3.css('width','270px');
            box4.css('width','270px');
            modal.find('.show-richmenu-type').append(box1, box2, box3, box4);
            break;
        case "type3":
            box1.css('width','540px');
            modal.find('.show-richmenu-type').append(box1, box2, box3, box4);
            break;
        case "type4":
            box1.css('width','360px').css('height','360px');
            modal.find('.show-richmenu-type').append(box1, box2, box3);
            break;
        case "type5":
            box1.css('width','540px');
            box2.css('width','540px');
            modal.find('.show-richmenu-type').append(box1, box2);
            break;
        case "type6":
            box1.css('width','270px').css('height','360px');
            box2.css('width','270px').css('height','360px');
            modal.find('.show-richmenu-type').append(box1, box2);
            break;
        case "type7":
            box1.css('width','540px').css('height','360px');
            modal.find('.show-richmenu-type').append(box1);
            break;
    }
}

function contentInputShow(){
    $('.content-input').val('');
    var contentInputId = $(this).val();
    $('.content-input').hide();
    $('#' + contentInputId).show();
    $('#' + contentInputId).change(function(){
        var val = $(this).val();
        if( null !== val || undefined !== val){
            let boxId = $('.box.checked').attr('id');
            $('#'+boxId).attr('ref',val);
            $('#'+boxId).removeClass('checked');
        }
        
    });
}

function contentBarShow(){
    $('input[name = content]').removeAttr('checked');
    $('.content-input').val('');
    $('.content-bar').show();
    // $('.box').css('background-color','rgba(158,158,158,0)');
    $(this).css('background-color','rgba(158,158,158,0.7)');
    $(this).addClass('checked');
}

function clearModal() {
    console.log("clear");
    modal.find('input[type = text]').val('');
    modal.find('input[type = datetime-local]').val('');
    modal.find('input[type = url]').val('');
    modal.find('select').val('');
    modal.find('.show-richmenu-type').removeAttr('style');
    modal.find('.show-richmenu-type').find('.box').remove();
    appenedBox();
}

function appenedBox(){
    var typeBox = new typeObj();
    var box1 = typeBox.box1;
    var box2 = typeBox.box2;
    var box3 = typeBox.box3;
    var box4 = typeBox.box4;
    var box5 = typeBox.box5;
    var box6 = typeBox.box6;
    modal.find('.show-richmenu-type').append(box1, box2, box3, box4, box5, box6);
}

function saveRichMenus() {
    let richmenuId = $('#richmenu-id').val();
    let appId = $('#richmenu-appId').val();
    let status = $('#richmenu-status').val();
    let startTime = $('#start-time').val();
    let endTime = $('#end-time').val();
    let title = $('#title').val();
    let chatBarText = $('#chatbar-text').val();
    let type = $('input[name = richmenu-type]:checked').val();
    let typeNo = typeNum(type);
    let area = [];
    for(let i = 0 ; i <= typeNo-1 ; i++){
        area[i]= {
                'bounds':{
                    x: 0,
                    y: 0,
                    width: $('#box'+(i+1)).width(),
                    height: $('#box'+(i+1)).height()
                },
                'action': {
                    type: 'Message',
                    text: $('#box'+(i+1)).attr('ref')
                }
            }
    }
    
    
    // if (!channelId || !keyword || !type) {
    if (!appId || !type) {
        $.notify('發送群組、觸發關鍵字及類型不可為空', { type: 'warning' });
    } else {
        let template = createTemplate(type);
        if (template) {
            let data = {
                "appId": appId,
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

function typeNum(type){
    switch(type){
        case "type1":
            return 6;
            break;
        case "type2":
            return 4;
            break;
        case "type3":
            return 4;
            break;
        case "type4":
            return 3;
            break;
        case "type5":
            return 2;
            break;
        case "type6":
            return 2;
            break;
        case "type7":
            return 1;
            break;
    }
}

var tableObj = function(){
    this.tr = $('<tr>');
    this.th = $('<th>');
    this.td1 = $('<td>');
    this.td2 = $('<td>');
    this.td3 = $('<td>');
    this.td4 = $('<td>');
    this.td5 = $('<td>');
    this.td6 = $('<td>');
    this.UpdateBtn = $('<button>').attr('type','button')
                    .addClass('btn btn-default fa fa-pencil')
                    .attr('id','edit')
                    .attr('data-toggle','modal')
                    .attr('data-target','#richmenu-modal')
                    .attr('aria-hidden','true');
    this.DeleteBtn = $('<button>').attr('type','button')
                    .addClass('btn btn-default fa fa-trash-o')
                    .attr('id','del');
}

var typeObj = function(){
    this.box1 = $('<div>').addClass('box').attr('id','box1');
    this.box2 = $('<div>').addClass('box').attr('id','box2');
    this.box3 = $('<div>').addClass('box').attr('id','box3');
    this.box4 = $('<div>').addClass('box').attr('id','box4');
    this.box5 = $('<div>').addClass('box').attr('id','box5');
    this.box6 = $('<div>').addClass('box').attr('id','box6');
}

function find(){
    var jwt = localStorage.getItem("jwt");
    var userId = auth.currentUser.uid;
    $.ajax({
        type: 'GET',
        url: '/api/richmenus/users/' + userId,
        headers: {
            "Authorization": jwt
        },
        success: (data) => {
            let appIds = data.data;
            for (let i in appIds) {
                findOne(appIds[i]);
            }
        },
        error: (error) => {
            console.log(error);
        }
    });
}

function findOne(appId){
    var jwt = localStorage.getItem("jwt");
    var userId = auth.currentUser.uid;
    $.ajax({
        type: 'GET',
        url: '/api/richmenus/apps/'+ appId +'/users/' + userId,
        headers: {
            "Authorization": jwt
        },
        success: (data) => {
            let richmenus = data.data;
            for (let i in richmenus) {
                if (richmenus[i].delete !== 1) {
                    $('#prof-id').append(richmenus[i].user_id);
                    groupType(i, richmenus[i], appId);
                }
            }

        },
        error: (error) => {
            console.log(error);
        }
    }); 
}

function groupType(index, item, appId){
    var linkText = "";
    for(let i = 0 ;i < item.areas.length ; i++){
        if (0 === i){
            linkText = linkText + item.areas[i].action.type;
        }
        else{
            linkText = linkText + "，" +item.areas[i].action.type;
        }
    }
    var list = new tableObj();
    var title = list.th.text(item.name);
    var chatBarText = list.td1.text(item.chatBarText);
    var app = list.td2.text(appId);
    var link = list.td3.text(linkText);
    var time = list.td4.text(item.delete);
    var status = list.td5.text('開放');
    var btns = list.td6.append(list.UpdateBtn, list.DeleteBtn);
    var trGrop = list.tr.attr('id', index).attr('rel', appId).append(title, chatBarText, app, link, time, status, btns);
    $('table.table').append(trGrop);
}

function remove(appId, richmenuId){
    var jwt = localStorage.getItem("jwt");
    var userId = auth.currentUser.uid;
    $.ajax({
        type: 'DELETE',
        url: '/api/richmenus/' + richmenuId + '/apps/' + appId + '/users/' + userId,
        headers: {
            "Authorization": jwt
        },
        success: () => {
            $('#'+richmenuId).remove();
            $.notify('刪除成功！', { type: 'success' });
        },
        error: (error) => {
            $.notify('刪除失敗: ' + error.msg, { type: 'danger' });
            console.log(error);
        }
    });

}