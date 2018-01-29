var MessagesAPI = (function() {
    var responseChecking = function(response) {
        return Promise.resolve().then(function() {
            if (!response.ok) {
                return Promise.reject(new Error(response.status + ' ' + response.statusText));
            }
            return response.json();
        }).then(function(respJson) {
            if (1 !== respJson.status) {
                return Promise.reject(new Error(respJson.status + ' ' + respJson.msg));
            }
            return respJson;
        });
    };

    /**
     * MessagesAPI 建構子
     *
     * @param {*} jwt - API 傳輸時必須攜帶的 json web token
     */
    function MessagesAPI(jwt) {
        this.jwt = jwt || '';
        this.reqHeaders = new Headers();
        this.reqHeaders.set('Content-Type', 'application/json');
    };

    /**
     * 取得每個 App 使用者的所有聊天室資訊
     *
     * @param {string} userId - 使用者的 firebase ID
     */
    MessagesAPI.prototype.getAll = function(userId) {
        var destUrl = urlConfig.apiUrl + '/api/apps-chatrooms-messages/users/' + userId;
        var reqInit = {
            method: 'GET',
            headers: this.reqHeaders
        };

        return window.fetch(destUrl, reqInit).then(function(response) {
            return responseChecking(response);
        });
    };

    /**
     * 取得使用者指定的 App 內的所有聊天室資訊
     *
     * @param {string} appId - 要查找的使用者的 App ID
     * @param {string} userId - 使用者的 firebase ID
     */
    MessagesAPI.prototype.getAllByAppId = function(appId, userId) {
        var destUrl = urlConfig.apiUrl + '/api/apps-chatrooms-messages/apps/' + appId + '/users/' + userId;
        var reqInit = {
            method: 'GET',
            headers: this.reqHeaders
        };

        return window.fetch(destUrl, reqInit).then(function(response) {
            return responseChecking(response);
        });
    };

    return MessagesAPI;
})();

(function() {
    var HOUR = 3600000;
    var DATE = 86400000;

    var messageDataArray = []; // 所有訊息的時間
    var startTime; // 決定圖表從哪個時間點開始畫
    var endTime; // 決定圖表畫到那個時間點結束
    var FIRST_MSG_TIME = 0; // 預設的startTime
    var LAST_MSG_TIME = 0;

    var userId = '';
    var messagesAPI = new MessagesAPI(null);

    var $jqDoc = $(document);

    auth.ready.then((currentUser) => {
        userId = currentUser.uid;
        messagesAPI.jwt = window.localStorage.getItem('jwt');
        messagesAPI.reqHeaders.set('Authorization', messagesAPI.jwt);

        $jqDoc.on('change', '.select-time', selectTime); // 取得USER要分析的時間區間
        $jqDoc.on('click', '#view_month', viewMonth); // 以月份為最小單位
        $jqDoc.on('click', '#view_date', viewDate);
        $jqDoc.on('click', '#view_hour', viewHour);
        $jqDoc.on('click', '#view_time', viewTime);
        $jqDoc.on('click', '#view_cloud', viewCloud);

        return messagesAPI.getAll(userId);
    }).then(function(respJson) {
        var appsMessages = respJson.data;
        messageDataArray.length = 0;

        // 必須把訊息資料結構轉換為 chart 使用的陣列結構
        // 將所有的 messages 的物件全部塞到一個陣列之中
        for (var appId in appsMessages) {
            var chatrooms = appsMessages[appId].chatrooms;
            for (var chatroomId in chatrooms) {
                var messages = chatrooms[chatroomId].messages;
                for (var messageId in messages) {
                    messageDataArray.push(messages[messageId]);
                }
            }
        }

        if (messageDataArray.length > 0) {
            messageDataArray.sort(function(a, b) {
                return a.time - b.time; // 以時間排序，最早的在前
            });
            FIRST_MSG_TIME = messageDataArray[0].time; // 預設的 startTime 為最早的訊息的時間
            LAST_MSG_TIME = messageDataArray[messageDataArray.length - 1].time;
        } else {
            FIRST_MSG_TIME = LAST_MSG_TIME = 0;
        }
        startTime = FIRST_MSG_TIME;
        endTime = LAST_MSG_TIME;

        $('.select-time#analyze_start_time').prop('value', new Date(startTime).toISOString().split('T').shift());
        $('.select-time#analyze_end_time').prop('value', new Date(endTime).toISOString().split('T').shift());

        $('#btn-container button').prop('disabled', false); // 資料載入完成，才開放USER按按鈕
        viewTime(); // 預設從最小單位顯示分析
    });

    function selectTime() {
        var start = $('.select-time#analyze_start_time').val();
        var end = $('.select-time#analyze_end_time').val();

        // 若 USER 未選擇開始時間，則調至預設
        if (!start) {
            startTime = FIRST_MSG_TIME;
        } else {
            startTime = new Date(start).getTime();
        }

        if (!end) {
            endTime = Date.now(); // 若USER未選擇結束時間，則調製現在時間
        } else {
            endTime = new Date(end).getTime();
        }

        if (startTime < endTime) {
            $('#error_message').hide(); // 若開始時間 < 結束時間，隱藏錯誤訊息
        }
    }

    function viewCloud() {
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

    function viewDate() {
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
        // cursorProvider 是一個 FUNCTION，去產生滑鼠 hover 時顯示的資訊，但還沒寫
        var chart = window.AmCharts.makeChart('chartdiv', {
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
        $('#chartdiv .amcharts-main-div a[href="http://www.amcharts.com"]').remove();
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
        for (var i = 0; i < messageDataArray.length; i++) {
            var t = messageDataArray[i].time;
            if (t >= startTime && t <= endTime) {
                timeData.push(t);
            }
        }
        return timeData;
    }

    function getSelecedMsgData() {
        // 將資料過濾成在開始 ~ 結束時間內
        var msgData = [];
        for (var i = 0; i < messageDataArray.length; i++) {
            var t = messageDataArray[i].time;
            if (t >= startTime && t <= endTime) {
                msgData.push(messageDataArray[i].text);
            }
        }
        return msgData;
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
