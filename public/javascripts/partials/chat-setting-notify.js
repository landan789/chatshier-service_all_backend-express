/**
 * 當群組欄位有空著的時候會出現警告訊息
 *
 *
 */
(function chatSettingNotify() {
    $('#chat-setting-incomplete .close').on('click', function() {
        $('#chat-setting-incomplete').removeClass('alert-in');
        $('#chat-setting-incomplete').addClass('hidden');
    });


    setTimeout(() => {
        database.ref('users/' + auth.currentUser.uid).once('value', (s) => {
            let conditionOR = s.val().chanSecret_1.trim() === '' || s.val().chanSecret_2.trim() === '' || s.val().fbAppSecret.trim() === '';
            let conditionAND = s.val().chanSecret_1.trim() === '' && s.val().chanSecret_2.trim() === '' && s.val().fbAppSecret.trim() === '';
            if (conditionOR && !conditionAND) {
                $('#chat-setting-incomplete').removeClass('hidden');
                $('#chat-setting-incomplete').removeClass('alert-out');
                $('#chat-setting-incomplete').addClass('alert-in');
            } else {
                $('#chat-setting-incomplete').addClass('hidden');
            }
        });
    }, 2 * 1000);

})();