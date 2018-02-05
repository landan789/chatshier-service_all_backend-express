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

    var HOUR = 3600000;
    var DATE = 86400000;

    var messagesData = {}; // 所有訊息的時間
    var startTime; // 決定圖表從哪個時間點開始畫
    var endTime; // 決定圖表畫到那個時間點結束
    var FIRST_MSG_TIME = 0; // 預設的startTime
    var LAST_MSG_TIME = 0;

    var userId = '';
    var nowSelectAppId = '';
    var api = window.restfulAPI;
    var analyzeType = AnalyzeType.TIME; // 預設從最小單位顯示分析

    var $buttonGroup = $('.button-group');
    var $analyzeSdtPicker = $('#start_datetime_picker');
    var $analyzeEdtPicker = $('#end_datetime_picker');
    var $appDropdown = $('.tooltip-container .app-dropdown');
    var sTimePickerData = null;
    var eTimePickerData = null;

    window.auth.ready.then((currentUser) => {
        userId = currentUser.uid;

        $buttonGroup.find('.view-month').on('click', viewMonth);
        $buttonGroup.find('.view-date').on('click', viewDay);
        $buttonGroup.find('.view-hour').on('click', viewHour);
        $buttonGroup.find('.view-time').on('click', viewTime);
        $buttonGroup.find('.view-cloud').on('click', viewWordCloud);

        // 初始化 modal 裡的 datetime picker
        // 使用 moment.js 的 locale 設定 i18n 日期格式
        $analyzeSdtPicker.datetimepicker({ locale: 'zh-tw' });
        $analyzeEdtPicker.datetimepicker({ locale: 'zh-tw' });
        sTimePickerData = $analyzeSdtPicker.data('DateTimePicker');
        eTimePickerData = $analyzeEdtPicker.data('DateTimePicker');

        return api.chatshierApp.getAll(userId);
    }).then(function(respJson) {
        var appsData = respJson.data;
        messagesData = {};

        var $dropdownMenu = $appDropdown.find('.dropdown-menu');

        // 必須把訊息資料結構轉換為 chart 使用的陣列結構
        // 將所有的 messages 的物件全部塞到一個陣列之中
        nowSelectAppId = '';
        for (var appId in appsData) {
            var chatrooms = appsData[appId].chatrooms;
            messagesData[appId] = [];
            $dropdownMenu.append('<li><a id="' + appId + '">' + appsData[appId].name + '</a></li>');
            $appDropdown.find('#' + appId).on('click', appSourceChanged);

            if (!nowSelectAppId) {
                nowSelectAppId = appId;
            }

            for (var chatroomId in chatrooms) {
                var messages = chatrooms[chatroomId].messages;
                for (var messageId in messages) {
                    messagesData[appId].push(messages[messageId]);
                }
            }
        }

        $appDropdown.find('.dropdown-text').text(appsData[nowSelectAppId].name);
        messageDataPreprocess(messagesData[nowSelectAppId]);
        $('.button-group .btn-view').prop('disabled', false); // 資料載入完成，才開放USER按按鈕
    });

    function appSourceChanged(ev) {
        nowSelectAppId = ev.target.id;
        $appDropdown.find('.dropdown-text').text(ev.target.text);
        messageDataPreprocess(messagesData[nowSelectAppId]);
    }

    function messageDataPreprocess(messages) {
        if (messages.length > 0) {
            messages.sort(function(a, b) {
                return a.time - b.time; // 以時間排序，最早的在前
            });
            FIRST_MSG_TIME = messages[0].time; // 預設的 startTime 為最早的訊息的時間
            LAST_MSG_TIME = messages[messages.length - 1].time;
        } else {
            FIRST_MSG_TIME = LAST_MSG_TIME = 0;
        }
        startTime = FIRST_MSG_TIME;
        endTime = LAST_MSG_TIME;

        sTimePickerData.date(new Date(startTime));
        eTimePickerData.date(new Date(endTime));

        if (analyzeType === AnalyzeType.MONTH) {
            viewMonth();
        } else if (analyzeType === AnalyzeType.DAY) {
            viewDay();
        } else if (analyzeType === AnalyzeType.HOUR) {
            viewHour();
        } else if (analyzeType === AnalyzeType.TIME) {
            viewTime();
        } else if (analyzeType === AnalyzeType.WORDCLOUR) {
            viewWordCloud();
        }
    }

    function viewWordCloud() {
        analyzeType = AnalyzeType.WordCloud;
        var msgData = [];
        if (!isValidTime()) {
            // 確認開始時間是否小於結束時間
            $('#chartdiv').empty();
            return;
        } else {
            // 確認完後，filter出時間區間內的資料
            msgData = getSelecedMsgData();
        }

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
        window.WordCloud($('#chartdiv')[0], cloudOptions);
    }

    function viewMonth() {
        analyzeType = AnalyzeType.MONTH;
        var timeData = [];
        if (!isValidTime()) {
            // 確認開始時間是否小於結束時間
            $('#chartdiv').empty();
            return;
        } else {
            // 確認完後，filter出時間區間內的資料
            timeData = getSelecedTimeData();
        }

        function getMonthTime(t, n) {
            // t=10/15 n=1 => return 10/1
            // t=10/15 n=2 => return 11/1
            // 日期都以毫秒number表示
            var date = new Date(t);
            var y = date.getFullYear();
            var m = date.getMonth() + n;
            if (m > 12) {
                m -= 12;
                y++;
            }
            var newDate = new Date(y + '/' + m);
            return newDate.getTime();
        }
        var chartData = []; // 要餵給AmCharts的資料
        var nowSeg = getMonthTime(startTime, 1); // 當前月份的時間
        var nextSeg = getMonthTime(startTime, 2); // 下個月份的時間
        var count = 0; // 當前月份的訊息數
        var i = 0;
        while (i <= timeData.length) {
            var nowT = timeData[i];
            if (timeData[i] <= nextSeg) {
                // 若這筆資料的時間還沒到下個月，則當前月份訊息數++
                count++;
                i++;
            } else {
                // 若這筆資料已到下個月，則結算當前月份
                var date = new Date(nowSeg); // 當前月份
                var timeStr = date.getMonth() + 1 + '月';
                chartData.push({
                    time: timeStr,
                    messages: count
                });
                nowSeg = nextSeg; // 開始計算下個月份
                nextSeg = getMonthTime(nextSeg, 2);
                count = 0;
                if (i === timeData.length) break; // 上面while迴圈是跑到i==length的地方，這樣才能正確結算最後一個月份
            }
        }
        generateChart(chartData); // 將資料餵給AmCharts
    }

    function viewDay() {
        analyzeType = AnalyzeType.DAY;
        var timeData = [];
        if (!isValidTime()) {
            $('#chartdiv').empty();
            return;
        } else {
            timeData = getSelecedTimeData();
        }

        var chartData = [];
        var nowSeg = Math.floor(startTime / DATE) * DATE; // 取得第一天的00:00的時間
        var nextSeg = nowSeg + DATE;
        var count = 0;
        var i = 0;
        while (i <= timeData.length) {
            var nowT = timeData[i];
            if (nowT <= nextSeg) {
                count++;
                i++;
            } else {
                var date = new Date(nowSeg);
                var timeStr = getDateStr(date);
                chartData.push({
                    time: timeStr,
                    messages: count
                });
                count = 0;
                nowSeg = nextSeg;
                nextSeg += DATE;
                if (i === timeData.length) break;
            }
        }
        generateChart(chartData);
    }

    function viewHour() {
        analyzeType = AnalyzeType.HOUR;
        var timeData = [];
        if (!isValidTime()) {
            $('#chartdiv').empty();
            return;
        } else {
            timeData = getSelecedTimeData();
        }

        var chartData = [];
        var nowSeg = Math.floor(startTime / HOUR) * HOUR;
        var count = 0;
        var i = 0;
        while (i <= timeData.length) {
            var nowT = timeData[i];
            if (nowT <= (nowSeg + HOUR)) {
                count++;
                i++;
            } else {
                var date = new Date(nowSeg);
                var timeStr = getDateStr(date) + ' ' + getTimeStr(date);
                // var dateStr = '';
                // if( date.getHours()==0 ) {
                //   dateStr = getDateStr(date);
                // }
                chartData.push({
                    time: timeStr,
                    // date: dateStr,
                    messages: count
                });
                count = 0;
                nowSeg += HOUR;
                if (i === timeData.length) break;
            }
        }
        // function getCursorTime(time) {
        //   var date = new Date(time);
        //   var m = minTwoDigits(date.getMonth()+1);
        //   var d = minTwoDigits(date.getDate());
        //   var h = minTwoDigits(date.getHours());
        //   return m + '/' + d + ' ' + h + ':00';
        // }
        generateChart(chartData);
    }

    function viewTime() {
        analyzeType = AnalyzeType.TIME;
        // 將所有資料彙整成以小時表示
        var timeData = [];
        if (!isValidTime()) {
            $('#chartdiv').empty();
            return;
        } else {
            timeData = getSelecedTimeData();
        }

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

    function generateChart(chartData, cursorProvider) {
        var chart = AmCharts.makeChart('chartdiv', {
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

    function isValidTime() {
        // CHECK 開始時間是否小於結束時間
        if (startTime > endTime) {
            $('#error_message').show(); // 若否則顯示錯誤訊息
            return false;
        } else return true;
    }

    function getSelecedTimeData() {
        // 將資料過濾成在開始 ~ 結束時間內
        var timeData = [];
        var messages = messagesData[nowSelectAppId];
        for (var i = 0; i < messages.length; i++) {
            var t = messages[i].time;
            if (t >= startTime && t <= endTime) {
                timeData.push(t);
            }
        }
        return timeData;
    }

    function getSelecedMsgData() {
        // 將資料過濾成在開始 ~ 結束時間內
        var messages = messagesData[nowSelectAppId];
        var filteringMsgs = [];
        for (var i = 0; i < messages.length; i++) {
            var t = messages[i].time;
            if (t >= startTime && t <= endTime) {
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
