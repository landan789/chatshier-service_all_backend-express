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
    var analyzeType = AnalyzeType.TIME;

    var $chartBody = $('#chartBody');
    var $analyzeSdtPicker = $('#startDatetimePicker');
    var $analyzeEdtPicker = $('#endDatetimePicker');
    var $startDatetimeInput = $analyzeSdtPicker.find('input[name="startDatetime"]');
    var $endDatetimeInput = $analyzeEdtPicker.find('input[name="endDatetime"]');
    var $appDropdown = $('#appDropdown');
    var $chartDropdown = $('#chartDropdown');
    var sTimePickerData = null;
    var eTimePickerData = null;
    var wordfreq = null;

    var userId;
    try {
        var payload = window.jwt_decode(window.localStorage.getItem('jwt'));
        userId = payload.uid;
    } catch (ex) {
        userId = '';
    }

    $chartDropdown.find('.view-month').on('click', viewMonth);
    $chartDropdown.find('.view-date').on('click', viewDay);
    $chartDropdown.find('.view-hour').on('click', viewHour);
    $chartDropdown.find('.view-time').on('click', viewTime);
    $chartDropdown.find('.view-cloud').on('click', viewWordCloud);

    if (!window.isMobileBrowser()) {
        // 初始化 modal 裡的 datetime picker
        // 使用 moment.js 的 locale 設定 i18n 日期格式
        var dateNow = Date.now();
        var datetimePickerInitOpts = {
            sideBySide: true,
            locale: 'zh-tw',
            defaultDate: dateNow,
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

        // 綁定日期變更時的事件
        $analyzeSdtPicker.on('dp.change', function(ev) {
            startTime = ev.date.toDate().getTime();
            renderChart();
        });
        $analyzeEdtPicker.on('dp.change', function(ev) {
            endTime = ev.date.toDate().getTime();
            renderChart();
        });
    } else {
        $startDatetimeInput.attr('type', 'datetime-local');
        $endDatetimeInput.attr('type', 'datetime-local');
        $analyzeSdtPicker.on('click', '.input-group-prepend', function() {
            $startDatetimeInput.focus();
        });
        $analyzeEdtPicker.on('click', '.input-group-prepend', function() {
            $endDatetimeInput.focus();
        });
        $startDatetimeInput.on('change', function(ev) {
            startTime = new Date(ev.target.value).getTime();
            renderChart();
        });
        $endDatetimeInput.on('change', function(ev) {
            endTime = new Date(ev.target.value).getTime();
            renderChart();
        });
    }

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
                '<span class="dropdown-item" app-id="' + appId + '">' + appsData[appId].name + '</span>'
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

            $appDropdown.find('.dropdown-toggle').removeAttr('disabled'); // 有資料，才開放USER按按鈕
            $('.button-group .btn').removeAttr('disabled');
        }
    });

    function appSourceChanged(ev) {
        nowSelectAppId = $(ev.target).attr('app-id');
        $appDropdown.find('.dropdown-text').text(ev.target.text);
        messageDataPreprocess(messagesDataArray[nowSelectAppId]);
    }

    function messageDataPreprocess(messages) {
        var dateNow = Date.now();
        if (messages.length > 0) {
            messages.sort(function(a, b) {
                return new Date(a.time).getTime() - new Date(b.time).getTime(); // 以時間排序，最早的在前
            });
            FIRST_MSG_TIME = new Date(messages[0].time).getTime(); // 預設的 startTime 為最早的訊息的時間
            LAST_MSG_TIME = new Date(messages[messages.length - 1].time).getTime();
        } else {
            FIRST_MSG_TIME = LAST_MSG_TIME = dateNow;
        }
        startTime = FIRST_MSG_TIME;
        endTime = LAST_MSG_TIME;

        if (sTimePickerData && eTimePickerData) {
            sTimePickerData.date(new Date(startTime));
            eTimePickerData.date(new Date(endTime));
        } else {
            $startDatetimeInput.val(toDatetimeLocal(new Date(startTime)));
            $endDatetimeInput.val(toDatetimeLocal(new Date(endTime)));
        }

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

    function viewMonth(ev) {
        analyzeType = AnalyzeType.MONTH;
        $chartBody.removeAttr('style');
        ev && $chartDropdown.find('.dropdown-text').text($(ev.target).text());
        wordfreq && wordfreq.stop() && wordfreq.empty();
        wordfreq = void 0;

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
        while (nowSeg < endTime) {
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
            timeData.unshift(msgTime); // 把第一筆不符合判斷式的data加回陣列
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

    function viewDay(ev) {
        analyzeType = AnalyzeType.DAY;
        $chartBody.removeAttr('style');
        ev && $chartDropdown.find('.dropdown-text').text($(ev.target).text());
        wordfreq && wordfreq.stop() && wordfreq.empty();
        wordfreq = void 0;

        var timeData = getSelecedTimeData();
        var chartData = [];
        var xAxisLabalMap = {};
        var nowSeg = Math.floor(startTime / DATE) * DATE; // 取得第一天的00:00的時間
        var nextSeg = nowSeg + DATE;
        var magCount = 0;

        while (nowSeg < endTime) {
            var msgTime = timeData.shift();
            if (msgTime <= nextSeg) {
                magCount++;
                continue;
            }

            var date = new Date(nowSeg);
            var xAxisLabal = getDateStr(date);
            xAxisLabalMap[xAxisLabal] = true;
            chartData.push({
                time: xAxisLabal,
                messages: magCount
            });

            magCount = 0;
            nowSeg = nextSeg;
            nextSeg += DATE;
            timeData.unshift(msgTime); // 把第一筆不符合判斷式的data加回陣列
        }

        // 將開始時間與結束時間加入資料內以便顯示時間區間
        // var beginDate = new Date(startTime);
        // var beginLabel = getDateStr(beginDate);
        var endDate = new Date(endTime);
        var endLabel = getDateStr(endDate);

        !xAxisLabalMap[endLabel] && chartData.push({
            time: endLabel,
            messages: magCount
        });
        xAxisLabalMap[endLabel] = true;

        generateChart(chartData);
    }

    function viewHour(ev) {
        analyzeType = AnalyzeType.HOUR;
        $chartBody.removeAttr('style');
        ev && $chartDropdown.find('.dropdown-text').text($(ev.target).text());
        wordfreq && wordfreq.stop() && wordfreq.empty();
        wordfreq = void 0;

        var timeData = getSelecedTimeData();
        var chartData = [];
        var xAxisLabalMap = {};
        var nowSeg = Math.floor(startTime / HOUR) * HOUR;
        var magCount = 0;

        while (nowSeg < endTime) {
            var msgTime = timeData.shift();
            if (msgTime <= (nowSeg + HOUR)) {
                magCount++;
                continue;
            }

            var date = new Date(nowSeg);
            var xAxisLabal = getDateStr(date) + ' ' + getTimeStr(date);
            xAxisLabalMap[xAxisLabal] = true;

            chartData.push({
                time: xAxisLabal,
                messages: magCount
            });
            magCount = 0;
            nowSeg += HOUR;
            timeData.unshift(msgTime); // 把第一筆不符合判斷式的data加回陣列
        }

        // 將起始時間與結束時間加入資料內以便顯示時間區間
        // var beginDate = new Date(startTime);
        // var beginLabel = getDateStr(beginDate) + ' ' + getTimeStr(beginDate);
        var endDate = new Date(endTime);
        var endLabel = getDateStr(endDate) + ' ' + getTimeStr(endDate);

        !xAxisLabalMap[endLabel] && chartData.push({
            time: endLabel,
            messages: magCount
        });
        xAxisLabalMap[endLabel] = true;

        generateChart(chartData);
    }

    function viewTime(ev) {
        analyzeType = AnalyzeType.TIME;
        $chartBody.removeAttr('style');
        ev && $chartDropdown.find('.dropdown-text').text($(ev.target).text());
        wordfreq && wordfreq.stop() && wordfreq.empty();
        wordfreq = void 0;

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

    function viewWordCloud(ev) {
        analyzeType = AnalyzeType.WORDCLOUR;
        $chartBody.removeAttr('style');
        ev && $chartDropdown.find('.dropdown-text').text($(ev.target).text());
        wordfreq && wordfreq.stop() && wordfreq.empty();
        wordfreq = new window.WordFreqSync({
            workerUrl: '/lib/js/wordfreq.worker.js',
            minimumCount: 1 // 過濾文字出現的最小次數最小
        });

        var msgData = getSelecedMsgData();
        var text = msgData.join(',');
        var cloudOptions = {
            list: wordfreq.process(text),
            // 文字雲字體基本大小
            weightFactor: 24,
            minSize: 8,
            clearCanvas: true,
            backgroundColor: '#eafaff'
        };
        window.WordCloud($chartBody.get(0), cloudOptions);
    }

    function generateChart(chartData, cursorProvider) {
        chartInstance && chartInstance.clear();

        chartInstance = window.AmCharts.makeChart($chartBody.get(0), {
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
            }],
            listeners: [{
                event: 'rendered',
                method: function() {
                    // chart 渲染完後，移除 AmCharts 的廣告文字
                    $chartBody.find('a[href="http://www.amcharts.com"]').remove();
                }
            }]
        });
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

    /**
     * @param {Date} date
     */
    function toDatetimeLocal(date) {
        var YYYY = date.getFullYear();
        var MM = ten(date.getMonth() + 1);
        var DD = ten(date.getDate());
        var hh = ten(date.getHours());
        var mm = ten(date.getMinutes());
        var ss = ten(date.getSeconds());

        function ten(i) {
            return (i < 10 ? '0' : '') + i;
        }

        return YYYY + '-' + MM + '-' + DD + 'T' +
                hh + ':' + mm + ':' + ss;
    }
})();
