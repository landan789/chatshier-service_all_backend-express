/**
 * firebase 連線出錯時會提出警告
 */
(function firebaseDisable() {
    var ALERT = {
        SECOND: 10
    };

    window.database.ref('.info').once('value', function(snap) {
        $(document).ready(function() {
            var $alertChatshier = $('#alert-chatshier');
            $alertChatshier.find('.close').on('click', function() {
                $alertChatshier
                    .removeClass('alert-in')
                    .addClass('hidden');
            });

            window.setInterval(function() {
                if (!snap) {
                    $alertChatshier
                        .removeClass('hidden')
                        .removeClass('alert-out')
                        .addClass('alert-in');
                } else if (!$alertChatshier.hasClass('hidden')) {
                    $alertChatshier.addClass('hidden');
                }
            }, ALERT.SECOND * 1000);
        });
    });
})();
