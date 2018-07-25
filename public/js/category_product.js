/// <reference path='../../typings/client/index.d.ts' />

(function() {
    const ICONS = {
        LINE: 'fab fa-line fa-fw line-color',
        FACEBOOK: 'fab fa-facebook-messenger fa-fw fb-messsenger-color'
    };

    /** @type {Chatshier.Models.Apps} */
    let apps = {};
    /** @type {Chatshier.Models.AppsCategories} */
    let appsCategories = {};
    let api = window.restfulAPI;
    let userId = '';
    let nowSelectAppId = '';

    try {
        let payload = window.jwt_decode(window.localStorage.getItem('jwt'));
        userId = payload.uid;
    } catch (ex) {
        userId = '';
    }

    const $appsDropdown = $('#appsDropdown');
    $appsDropdown.on('click', '.dropdown-menu .dropdown-item', appSourceChanged);

    return Promise.all([
        api.apps.findAll(userId)
    ]).then(([ appsResJson ]) => {
        apps = appsResJson.data;

        let $dropdownMenu = $appsDropdown.find('.dropdown-menu');
        let recentAppId = window.localStorage.getItem('recentAppId') || '';
        let firstAppId = '';

        for (let appId in apps) {
            let app = apps[appId];
            if (app.isDeleted ||
                app.type === api.apps.TYPES.CHATSHIER) {
                delete apps[appId];
                continue;
            }

            $dropdownMenu.append(
                '<a class="px-3 dropdown-item" app-id="' + appId + '">' +
                    '<i class="' + ICONS[app.type] + '"></i>' +
                    app.name +
                '</a>'
            );
            firstAppId = firstAppId || appId;
        }

        nowSelectAppId = recentAppId && apps[recentAppId] ? recentAppId : firstAppId;
        if (nowSelectAppId) {
            window.localStorage.setItem('recentAppId', nowSelectAppId);
            $appsDropdown.find('.dropdown-text').text(apps[nowSelectAppId].name);
        }
    });

    function appSourceChanged() {
        let $dropdownItem = $(this);
        nowSelectAppId = $dropdownItem.attr('app-id');
        window.localStorage.setItem('recentAppId', nowSelectAppId);
        $appsDropdown.find('.dropdown-text').text($dropdownItem.text());
    }
})();
