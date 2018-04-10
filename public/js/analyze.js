/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var AnalyzeType = Object.freeze({
        0: 'MONTH',
        1: 'DAY',
        2: 'HOUR',
        3: 'TIME',
        4: 'WORDCLOUR',
        MONTH: 0,
        DAY: 1,
        HOUR: 2,
        TIME: 3,
        WORDCLOUR: 4
    });

    var HOUR = 60 * 60 * 1000;
    var DATE = 24 * HOUR;

    var chartInstance = null;
    var messagesDataArray = {}; // 所有訊息的時間
    var startTime; // 決定圖表從哪個時間點開始畫
    var endTime; // 決定圖表畫到那個時間點結束
    var FIRST_MSG_TIME = 0; // 預設的startTime
    var LAST_MSG_TIME = 0;

    var nowSelectAppId = '';
    var api = window.restfulAPI;
    var analyzeType = AnalyzeType.MONTH; // 預設從每日單位顯示分析

    var $buttonGroup = $('.button-group');
    var $analyzeSdtPicker = $('#start_datetime_picker');
    var $analyzeEdtPicker = $('#end_datetime_picker');
    var $appDropdown = $('.tooltip-container .app-dropdown');
    var sTimePickerData = null;
    var eTimePickerData = null;
    var date = Date.now();

    var userId;
    try {
        var payload = window.jwt_decode(window.localStorage.getItem('jwt'));
        userId = payload.uid;
    } catch (ex) {
        userId = '';
    }

    $buttonGroup.find('.view-month').on('click', viewMonth);
    $buttonGroup.find('.view-date').on('click', viewDay);
    $buttonGroup.find('.view-hour').on('click', viewHour);
    $buttonGroup.find('.view-time').on('click', viewTime);
    $buttonGroup.find('.view-cloud').on('click', viewWordCloud);

    // 初始化 modal 裡的 datetime picker
    // 使用 moment.js 的 locale 設定 i18n 日期格式
    var datetimePickerInitOpts = {
        sideBySide: true,
        locale: 'zh-tw',
        defaultDate: date,
        icons: {
            time: 'far fa-clock',
            date: 'far fa-calendar-alt',
            up: 'fas fa-chevron-up',
            down: 'fas fa-chevron-down',
            previous: 'fas fa-chevron-left',
            next: 'fas fa-chevron-right',
            today: 'fas fa-sun',
            clear: 'far fa-trash-alt',
            close: 'fas fa-times'
        }
    };
    $analyzeSdtPicker.datetimepicker(datetimePickerInitOpts);
    $analyzeEdtPicker.datetimepicker(datetimePickerInitOpts);
    sTimePickerData = $analyzeSdtPicker.data('DateTimePicker');
    eTimePickerData = $analyzeEdtPicker.data('DateTimePicker');

    return Promise.all([
        api.apps.findAll(userId),
        api.appsChatrooms.findAll(userId)
    ]).then(function(respJsons) {
        var appsData = respJsons.shift().data;
        var messagesData = respJsons.shift().data;

        var $dropdownMenu = $appDropdown.find('.dropdown-menu');

        // 必須把訊息資料結構轉換為 chart 使用的陣列結構
        // 將所有的 messages 的物件全部塞到一個陣列之中
        nowSelectAppId = '';
        messagesDataArray = {};
        for (var appId in appsData) {
            messagesDataArray[appId] = [];
            $dropdownMenu.append(
                '<a class="dropdown-item" app-id="' + appId + '">' + appsData[appId].name + '</a>'
            );
            $appDropdown.find('.dropdown-item[app-id="' + appId + '"]').on('click', appSourceChanged);
            nowSelectAppId = nowSelectAppId || appId;

            if (messagesData[appId]) {
                var chatrooms = messagesData[appId].chatrooms;
                for (var chatroomId in messagesData[appId].chatrooms) {
                    var messages = chatrooms[chatroomId].messages || {};

                    for (var messageId in messages) {
                        messagesDataArray[appId].push(messages[messageId]);
                    }
                }
            }
        }

        if (nowSelectAppId) {
            $appDropdown.find('.dropdown-text').text(appsData[nowSelectAppId].name);
            messageDataPreprocess(messagesDataArray[nowSelectAppId]);
            $('.app-view .dropdown-toggle').removeAttr('disabled'); // 有資料，才開放USER按按鈕
            $('div.button-group .btn-view').removeAttr('disabled');
        }
        // 綁定日期變更時的事件
        $analyzeSdtPicker.on('dp.change', function(ev) {
            startTime = ev.date.toDate().getTime();
            renderChart();
        });
        $analyzeEdtPicker.on('dp.change', function(ev) {
            endTime = ev.date.toDate().getTime();
            renderChart();
        });
    });

    function appSourceChanged(ev) {
        nowSelectAppId = $(ev.target).attr('app-id');
        $appDropdown.find('.dropdown-text').text(ev.target.text);
        messageDataPreprocess(messagesDataArray[nowSelectAppId]);
    }

    function messageDataPreprocess(messages) {
        if (messages.length > 0) {
            messages.sort(function(a, b) {
                return new Date(a.time).getTime() - new Date(b.time).getTime(); // 以時間排序，最早的在前
            });
            FIRST_MSG_TIME = new Date(messages[0].time).getTime(); // 預設的 startTime 為最早的訊息的時間
            LAST_MSG_TIME = new Date(messages[messages.length - 1].time).getTime();
        } else {
            FIRST_MSG_TIME = LAST_MSG_TIME = date;
        }
        startTime = FIRST_MSG_TIME;
        endTime = LAST_MSG_TIME;

        sTimePickerData.date(new Date(startTime));
        eTimePickerData.date(new Date(endTime));

        renderChart();
    }

    function renderChart() {
        // 確認開始時間是否小於結束時間，小於時顯示通知
        if (startTime > endTime) {
            $.notify('無資料！開始時段須比結束時段早', { type: 'warning' });
        }

        switch (analyzeType) {
            case AnalyzeType.MONTH:
                return viewMonth();
            case AnalyzeType.DAY:
                return viewDay();
            case AnalyzeType.HOUR:
                return viewHour();
            case AnalyzeType.TIME:
                return viewTime();
            case AnalyzeType.WORDCLOUR:
                return viewWordCloud();
            default:
                break;
        }
    }

    function viewMonth() {
        analyzeType = AnalyzeType.MONTH;
        var timeData = getSelecedTimeData();

        var chartData = []; // 要餵給AmCharts的資料
        var beginDate = new Date(startTime);
        var endDate = new Date(endTime);

        var nextDate = new Date(startTime);
        nextDate.setHours(0, 0, 0);
        var nowSeg = nextDate.getTime(); // 當前月份的時間

        nextDate < endDate && nextDate.setMonth(nextDate.getMonth() + 1);
        nextDate > endDate && nextDate.setDate(endDate.getDate());

        var nextSeg = nextDate.getTime(); // 下個月份的時間
        var msgCount = 0; // 當前月份的訊息數

        var xAxisLabalMap = {};
        while (timeData.length) {
            var msgTime = timeData.shift();
            if (msgTime <= nextSeg) {
                // 若這筆資料的時間還沒到下個月，則當前月份訊息數++
                msgCount++;
                continue;
            }

            // 若這筆資料已到下個月，則結算當前月份
            var date = new Date(nowSeg); // 當前月份
            var xAxisLabal = (date.getMonth() + 1) + '月';
            xAxisLabalMap[xAxisLabal] = true;

            chartData.push({
                time: xAxisLabal,
                messages: msgCount
            });

            nowSeg = nextSeg; // 開始計算下個月份
            nextDate.setMonth(nextDate.getMonth() + 1);
            nextSeg = nextDate.getTime();
            msgCount = 0;
        }

        // 將起始時間與結束時間加入資料內以便顯示時間區間
        var beginLabel = (beginDate.getMonth() + 1) + '月';
        var endLabel = (endDate.getMonth() + 1) + '月';

        !xAxisLabalMap[beginLabel] && chartData.unshift({
            time: beginLabel,
            messages: msgCount
        });
        xAxisLabalMap[beginLabel] = true;

        !xAxisLabalMap[endLabel] && chartData.push({
            time: endLabel,
            messages: msgCount
        });
        xAxisLabalMap[endLabel] = true;

        generateChart(chartData); // 將資料餵給AmCharts
    }

    function viewDay() {
        analyzeType = AnalyzeType.DAY;
        var timeData = getSelecedTimeData();

        var chartData = [];
        var nowSeg = Math.floor(startTime / DATE) * DATE; // 取得第一天的00:00的時間
        var nextSeg = nowSeg + DATE;
        var magCount = 0;

        while (timeData.length) {
            var msgTime = timeData.shift();
            if (msgTime <= nextSeg) {
                magCount++;
                continue;
            }

            var date = new Date(nowSeg);
            var xAxisLabal = getDateStr(date);
            chartData.push({
                time: xAxisLabal,
                messages: magCount
            });

            magCount = 0;
            nowSeg = nextSeg;
            nextSeg += DATE;
            timeData.unshift(msgTime); // 把第一筆不符合判斷式的data加回陣列
        }

        // 將起始時間與結束時間加入資料內以便顯示時間區間
        var beginDate = new Date(startTime);
        var endDate = new Date(endTime);
        var beginLabel = getDateStr(beginDate);
        var endLabel = getDateStr(endDate);

        beginLabel !== endLabel && chartData.push({
            time: endLabel,
            messages: magCount
        });

        generateChart(chartData);
    }

    function viewHour() {
        analyzeType = AnalyzeType.HOUR;
        var timeData = getSelecedTimeData();

        var chartData = [];
        var nowSeg = Math.floor(startTime / HOUR) * HOUR;
        var magCount = 0;

        while (timeData.length) {
            var msgTime = timeData.shift();
            if (msgTime <= (nowSeg + HOUR)) {
                magCount++;
                continue;
            }

            var date = new Date(nowSeg);
            var xAxisLabal = getDateStr(date) + ' ' + getTimeStr(date);

            chartData.push({
                time: xAxisLabal,
                messages: magCount
            });
            magCount = 0;
            nowSeg += HOUR;
            timeData.unshift(msgTime); // 把第一筆不符合判斷式的data加回陣列
        }

        // 將起始時間與結束時間加入資料內以便顯示時間區間
        var beginDate = new Date(startTime);
        var endDate = new Date(endTime);
        var beginLabel = getDateStr(beginDate) + ' ' + getTimeStr(beginDate);
        var endLabel = getDateStr(endDate) + ' ' + getTimeStr(endDate);

        beginLabel !== endLabel && chartData.push({
            time: endLabel,
            messages: magCount
        });

        generateChart(chartData);
    }

    function viewTime() {
        analyzeType = AnalyzeType.TIME;
        // 將所有資料彙整成以小時表示
        var timeData = getSelecedTimeData();

        var timeArr = Array(24).fill(0); // 建立陣列，儲存不同小時的訊息數
        var chartData = [];
        var i = 0;

        for (i = 0; i < timeData.length; i++) {
            var hour = (new Date(timeData[i])).getHours();
            timeArr[hour - 1]++; // 取得每個訊息的小時，並加至陣列裡
        }

        for (i = 0; i < timeArr.length; i++) {
            var hr = minTwoDigits(i + 1);
            chartData.push({
                time: hr + ':00',
                messages: timeArr[i]
            });
        }
        generateChart(chartData);
    }

    function viewWordCloud() {
        analyzeType = AnalyzeType.WORDCLOUR;
        var msgData = getSelecedMsgData();

        var text = msgData.join(',');
        var wordfreq = new window.WordFreqSync({
            workerUrl: '/lib/js/wordfreq.worker.js',
            minimumCount: 1 // 過濾文字出現的最小次數最小
        });
        var cloudOptions = {
            list: wordfreq.process(text),
            weightFactor: 32, // 文字雲字體大小
            clearCanvas: true
        };
        window.WordCloud(document.getElementById('chartBody'), cloudOptions);
    }

    function generateChart(chartData, cursorProvider) {
        chartInstance && chartInstance.clear();

        chartInstance = window.AmCharts.makeChart('chartBody', {
            type: 'serial',
            theme: 'light',
            zoomOutButton: {
                backgroundColor: '#000000',
                backgroundAlpha: 0.15
            },
            dataProvider: chartData,
            categoryField: 'time',
            categoryAxis: {
                markPeriodChange: false,
                dashLength: 1,
                gridAlpha: 0.15,
                axisColor: '#DADADA',
                autoWrap: true,
                fontSize: 10
            },
            graphs: [{
                id: 'g1',
                valueField: 'messages',
                bullet: 'round',
                bulletBorderColor: '#FFFFFF',
                bulletBorderThickness: 2,
                lineThickness: 2,
                lineColor: '#b5030d',
                negativeLineColor: '#0352b5',
                hideBulletsCount: 50
            }],
            chartCursor: {
                cursorPosition: 'mouse',
                categoryBalloonEnabled: true,
                categoryBalloonFunction: cursorProvider
            },
            chartScrollbar: {
                graph: 'g1',
                scrollbarHeight: 40,
                color: '#FFFFFF',
                autoGridCount: true
            },
            valueAxes: [{
                title: '訊息數',
                labelFrequency: 1,
                minimum: 0,
                baseValue: 999,
                includeAllValues: true
            }]
        });

        // chart 建立完後，移除 AmCharts 的廣告文字
        $('a[href="http://www.amcharts.com"]').remove();
    }

    function getSelecedTimeData() {
        // 將資料過濾成在開始 ~ 結束時間內
        return messagesDataArray[nowSelectAppId].reduce(function(output, message) {
            let messageTime = new Date(message.time).getTime();
            if (messageTime >= startTime && messageTime <= endTime) {
                output.push(messageTime);
            }
            return output;
        }, []);
    }

    function getSelecedMsgData() {
        // 將資料過濾成在開始 ~ 結束時間內
        var messages = messagesDataArray[nowSelectAppId];
        var filteringMsgs = [];
        for (var i = 0; i < messages.length; i++) {
            var messageTime = new Date(messages[i].time).getTime();
            if (messageTime >= startTime && messageTime <= endTime) {
                filteringMsgs.push(messages[i].text);
            }
        }
        return filteringMsgs;
    }

    function getDateStr(date) {
        var m = minTwoDigits(date.getMonth() + 1);
        var d = minTwoDigits(date.getDate());
        return m + '/' + d; // ex: '11/05', '04/10'
    }

    function getTimeStr(date) {
        var h = minTwoDigits(date.getHours());
        return h + ':00'; // ex: '14:00', '03:00'
    }

    function minTwoDigits(n) {
        return (n < 10 ? '0' : '') + n;
    }
})();
