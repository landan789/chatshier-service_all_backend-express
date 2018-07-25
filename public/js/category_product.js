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
    const $categoriesWrapper = $('#categoriesWrapper');
    $appsDropdown.on('click', '.dropdown-menu .dropdown-item', appSourceChanged);

    $(document).on('click', '#insertCategoryTestBtn', insertCategory);
    $(document).on('click', '#insertProductTestBtn', insertProduct);

    return api.apps.findAll(userId).then((resJson) => {
        apps = resJson.data;

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
            return renderCategories(nowSelectAppId);
        }
    });

    function appSourceChanged() {
        let $dropdownItem = $(this);
        nowSelectAppId = $dropdownItem.attr('app-id');
        window.localStorage.setItem('recentAppId', nowSelectAppId);
        $appsDropdown.find('.dropdown-text').text($dropdownItem.text());
        return renderCategories(nowSelectAppId);
    }

    function renderCategories(appId) {
        return Promise.resolve().then(() => {
            if (!appsCategories[appId]) {
                return api.appsCategories.findAll(appId, userId).then((resJson) => {
                    let _appsCategories = resJson.data;
                    appsCategories[appId] = { categories: {} };
                    if (!_appsCategories[appId]) {
                        return appsCategories[appId].categories;
                    }
                    Object.assign(appsCategories[appId].categories, _appsCategories[appId].categories);
                    return appsCategories[appId].categories;
                });
            }
            return appsCategories[appId].categories;
        }).then((categories) => {
            $categoriesWrapper.empty();
            console.log(categories);
            for (let categoryId in categories) {
                let category = categories[categoryId];
                let categoryHtml = (
                    '<pre category-id="' + categoryId + '">' + JSON.stringify(category, void 0, 4) + '</pre>'
                );

                if (category.parent_id) {
                    let $parentCategory = $categoriesWrapper.find('[category-id="' + category.parent_id + '"]');
                    if ($parentCategory.length) {
                        $parentCategory.append(categoryHtml);
                    }
                    continue;
                }
                $categoriesWrapper.append(categoryHtml);
            }
        });
    }

    function insertCategory() {
        let category = {
            parent_id: '5b584521fbddb6197a98e0e6',
            name: '測試類別',
            description: '類別描述_' + Date.now()
        };

        let appId = nowSelectAppId;
        return api.appsCategories.insert(appId, userId, category).then((resJson) => {
            let _appsCategories = resJson.data;
            if (!appsCategories[appId]) {
                appsCategories[appId] = { categories: {} };
            }
            Object.assign(appsCategories[appId].categories, _appsCategories[appId].categories);
            return renderCategories(appId);
        });
    }

    function insertProduct() {

    }
})();
