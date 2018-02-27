
(function() {
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
})();
