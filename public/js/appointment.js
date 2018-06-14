/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var $jqDoc = $(document);
    var $appDropdown = $('.app-dropdown');
    var $appSelector = $('#app-select');
    var $modal = $('#appointmentAddModal');
    var $productSelector = $('#product-select');

    var api = window.restfulAPI;
    var nowSelectAppId = '';
    var userId;

    const NEW = 'NEW';

    const ICONS = {
        LINE: 'fab fa-line fa-fw line-color',
        FACEBOOK: 'fab fa-facebook-messenger fa-fw fb-messsenger-color'
    };

    try {
        var payload = window.jwt_decode(window.localStorage.getItem('jwt'));
        userId = payload.uid;
    } catch (ex) {
        userId = '';
    }

    $jqDoc.on('keyup', '#insert-member-name', insertMember);
    $jqDoc.on('keyup', '#insert-product-name', insertProduct);
    $jqDoc.on('click', '#renew', refreshModal);
    $jqDoc.on('click', '#delete-member-btn', deleteMember);
    $productSelector.change(determineNewProduct);

    $modal.on('hidden.bs.modal', refreshModal);

    function determineNewProduct() {
        let optionVal = $(this).val();
        if (NEW === optionVal) {
            $('.member-add').addClass('d-none');
            $('#member-list').empty();
            return $('#insert-product-name').val('');
        }
        $('#insert-product-name').val(optionVal);
        $('.member-add').removeClass('d-none');
    }

    function appSourceChanged() {
        let $dropdownItem = $(this);
        nowSelectAppId = $dropdownItem.attr('id');
        $appDropdown.find('.dropdown-text').text($dropdownItem.text());
    }

    function insertProduct(event) {
        var code = event.keyCode || event.which;
        if (13 === code) {
            // 1. api insert product
            let product = $(this).val();
            // api implementing
            // 2. remove d-none class of member-add
            $('.member-add').removeClass('d-none');
        }
    }

    function insertMember(event) {
        var code = event.keyCode || event.which;
        if (13 === code) {
            let member = $(this).val();
            let product = $modal.find('#insert-product-name').val();
            // 1. api insert member
            let str = showModalMember(member); // requires member id for deletion to work
            let str2 = showMember(member);
            $('#member-list').append(str);
            $(`#all-member-list #${product}`).append(str2);
            $('#insert-member-name').val('');
            var timetable = new Timetable();
            timetable.setScope(9, 3);
            timetable.addLocations([name]);
            var renderer = new Timetable.Renderer(timetable);
            renderer.draw(`.timetable-${name}`);
        }
    }

    function deleteMember() {
        // 1. api deletion
        $(this).parent('.list-group-item').remove();
    }

    function refreshModal() {
        $modal.find('[value="NEW"]').attr('selected', true);
        $modal.find('#insert-product-name').val('');
        $modal.find('.member-add').addClass('d-none');
        $modal.find('#insert-member-name').val('');
        $modal.find('#member-list').empty();
    }

    function showModalMember(name) {
        return `<li class="list-group-item">
            <div class="form-group row">
                <div class="col-8">
                    <input class="form-control form-control-sm" type="text" value="${name}" />
                </div>
                <div class="col-4">
                    <i class="fas fa-trash-alt text-danger float-right cursor-pointer my-2 mx-1" id="delete-member-btn"></i>
                    <i class="fas fa-pencil-alt float-right cursor-pointer my-2 mx-1"></i>
                </div>
            </div>
        </li>`;
    }

    function showMember(name) {
        return `<div class="pb-3">
            <h5><b>姓名</b>：${name}</h5>
            <div id="accordion">
                <div class="card">
                    <div class="card-header pb-0 pt-3" id="time">
                    <h5 class="mx-2 my-0">
                        <div class="form-group row">
                            <div class="col-2">
                                <button class="btn btn-link" data-toggle="collapse" data-target="#${name}" aria-expanded="true" aria-controls="${name}">
                                    時間表
                                </button>
                            </div>
                            <div class="col-10">
                                <input class="form-control" type="date" value="2011-08-19" id="example-date-input">
                            </div>
                        </div>
                    </h5>
                </div>
                <div id="${name}" class="p-3 collapse" aria-labelledby="time" data-parent="#accordion">
                    <div class="timetable-${name}"></div>
                </div>
            </div>
        </div>`;
    }

    return api.apps.findAll(userId).then(function(respJson) {
        var apps = respJson.data;
        var $dropdownMenu = $appDropdown.find('[aria-labelledby="appsDropdown"]');

        nowSelectAppId = '';
        for (var appId in apps) {
            var app = apps[appId];
            if (app.isDeleted ||
                app.type === api.apps.enums.type.CHATSHIER) {
                delete apps[appId];
                continue;
            }
            $dropdownMenu.append(
                '<a class="px-3 dropdown-item" id="' + appId + '">' +
                    '<i class="' + ICONS[app.type] + '"></i>' +
                    app.name +
                '</a>'
            );
            $appDropdown.find('#' + appId).on('click', appSourceChanged);
            $appSelector.append('<option value="' + appId + '">' + app.name + '</option>');

            nowSelectAppId = nowSelectAppId || appId;
        }

        if (nowSelectAppId) {
            $appDropdown.find('.dropdown-text').text(apps[nowSelectAppId].name);
            $productSelector.find('[value="new"]').attr('selected', true);
            $jqDoc.find('button.inner-add').removeAttr('disabled'); // 資料載入完成，才開放USER按按鈕
        }
    });
})();
