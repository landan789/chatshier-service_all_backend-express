(function() {
    if (!window.urlConfig) {
        console.warn('Please set up the configuration file of /config/url-config.js');
    }
    var serviceUrl = location.host;
    var wwwUrl = serviceUrl.replace(/^[\w-]+\./i, 'www.').replace(/:\d+$/i, '');
    var domain = serviceUrl.replace(/^[\w-]+\./i, '.').replace(/:\d+$/i, '');

    urlConfig.wwwwUrl = urlConfig.wwwUrl.replace(/^https?:\/\//i, '');
    var url = 'http://' + ('' === urlConfig.wwwwUrl ? wwwUrl : urlConfig.wwwUrl) + ('' === urlConfig.port ? '' : ':' + urlConfig.port);
    var indexUrl = url + urlConfig.index;
    $(document).ready(function() {
        $('#index').attr('href', indexUrl);
        $('[data-toggle="tooltip"]').tooltip('show'); // 避免蓋掉"請填寫這個欄位"
        $('[data-toggle="tooltip"]').tooltip('destroy'); // 避免蓋掉"請填寫這個欄位"
        $(document).on('click', '#login-btn', login); // 登入
    });

    function login(event) {
        // Button loading
        var $this = $(this);
        $this.button('loading');

        event.preventDefault();
        var email = document.getElementById('login-email').value;
        var password = document.getElementById('login-password').value;

        // Regular expression Testing
        // var emailRule = /^\w+((-\w+)|(\.\w+))*@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z]+$/;

        // validate ok or not
        auth.signInWithEmailAndPassword(email, password).then(function(result) {
            // var uid = auth.currentUser.uid;
            var name = auth.currentUser.displayName;
            email = auth.currentUser.email;

            document.cookie = 'name=' + name + ';domain=' + domain;
            document.cookie = 'email=' + email + ';domain=' + domain;
        }).catch(function(error) {
            $this.button('reset'); // Button loading reset
            if ('auth/wrong-password' !== error.code) {
                $('#login-email').tooltip('show'); // show
                window.setTimeout(function() {
                    $('#login-email').tooltip('destroy');
                }, 3000);
            } else {
                $('#login-password').tooltip('show'); // show 密碼錯誤
                window.setTimeout(function() {
                    $('#login-password').tooltip('destroy');
                }, 3000);
            }
        });
    }
})();
