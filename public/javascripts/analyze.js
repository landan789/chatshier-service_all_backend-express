const socket = io.connect();
$(function() {
    window.dispatchEvent(firbaseEvent);

    socket.emit('request message time'); //向後端取得所有訊息的時間

    $(document).on('change', '.select-time', selectTime); //取得USER要分析的時間區間
    $(document).on('click', '#view-month', viewMonth); //以月份為最小單位
    $(document).on('click', '#view-date', viewDate); //
    $(document).on('click', '#view-hour', viewHour); //
    $(document).on('click', '#view-time', viewTime); //
    $(document).on('click', '#view-cloud', viewCloud); //
});

var msgTimeData = []; //所有訊息的時間
const HOUR = 3600000;
const DATE = 86400000;
var startTime; //決定圖表從哪個時間點開始畫
var endTime; //決定圖表畫到那個時間點結束
var FIRST_MSG_TIME = 0; //預設的startTime

socket.on('response message time', (data) => {
    if (data) {
        data = sortInitialData(data); //以時間排序
        console.log(data);
        msgTimeData = data;
        FIRST_MSG_TIME = data[0].time; //預設的startTime為最早的訊息的時間
    } else {
        FIRST_MSG_TIME = 0;
    }
    startTime = FIRST_MSG_TIME;
    endTime = Date.now();

    $('#btn-container button').prop('disabled', false); //資料載入完成，才開放USER按按鈕
});

function selectTime() {
    let start = $('.select-time#start').val();
    let end = $('.select-time#end').val();
    if (!start) startTime = FIRST_MSG_TIME; //若USER未選擇開始時間，則調至預設
    else startTime = new Date(start).getTime();
    if (!end) endTime = Date.now(); //若USER未選擇結束時間，則調製現在時間
    else endTime = new Date(end).getTime();
    if (startTime < endTime) $('#error-message').hide(); //若開始時間<結束時間，隱藏錯誤訊息
}

function viewCloud() {
    let msgData = [];
    if (!isValidTime()) {
        //確認開始時間是否小於結束時間
        $('#chartdiv').empty();
        return;
    } else {
        //確認完後，filter出時間區間內的資料
        msgData = getSelecedMsgData();
    }
    let text = msgData.join(',');
    let freqOptions = {
        workerUrl: './wordfreq.worker.js',
        languages: "chinese"
    };
    console.log(text);
    let wordfreq = WordFreqSync(freqOptions).process(text);
    console.log(wordfreq);

    let cloudOptions = {
        list: wordfreq,
        weightFactor: 3,
        clearCanvas: true
    }
    WordCloud($('#chartdiv')[0], cloudOptions);
}


function viewMonth() {
    let timeData = [];
    if (!isValidTime()) {
        //確認開始時間是否小於結束時間
        $('#chartdiv').empty();
        return;
    } else {
        //確認完後，filter出時間區間內的資料
        timeData = getSelecedTimeData();
    }

    function getMonthTime(t, n) {
        //t=10/15 n=1 => return 10/1
        //t=10/15 n=2 => return 11/1
        //日期都以毫秒number表示
        let date = new Date(t);
        let y = date.getFullYear();
        let m = date.getMonth() + n;
        if (m > 12) {
            m -= 12;
            y++;
        }
        let newDate = new Date(y + "/" + m);
        return newDate.getTime();
    }
    let chartData = []; //要餵給AmCharts的資料
    let nowSeg = getMonthTime(startTime, 1); //當前月份的時間
    let nextSeg = getMonthTime(startTime, 2); //下個月份的時間
    let count = 0; //當前月份的訊息數
    i = 0;
    while (i <= timeData.length) {
        let nowT = timeData[i];
        if (timeData[i] <= nextSeg) {
            //若這筆資料的時間還沒到下個月，則當前月份訊息數++
            count++;
            i++;
        } else {
            //若這筆資料已到下個月，則結算當前月份
            let date = new Date(nowSeg); //當前月份
            let timeStr = date.getMonth() + 1 + "月";
            chartData.push({
                "time": timeStr,
                "messages": count
            });
            nowSeg = nextSeg; //開始計算下個月份
            nextSeg = getMonthTime(nextSeg, 2);
            count = 0;
            if (i == timeData.length) break; //上面while迴圈是跑到i==length的地方，這樣才能正確結算最後一個月份
        }
    }
    generateChart(chartData); //將資料餵給AmCharts
}

function viewDate() {
    let timeData = [];
    if (!isValidTime()) {
        $('#chartdiv').empty();
        return;
    } else {
        timeData = getSelecedTimeData();
    }

    let chartData = [];
    let nowSeg = Math.floor(startTime / DATE) * DATE; //取得第一天的00:00的時間
    let nextSeg = nowSeg + DATE;
    let count = 0;
    i = 0;
    while (i <= timeData.length) {
        let nowT = timeData[i];
        if (nowT < nowSeg) console.log("WTF");
        if (nowT <= nextSeg) {
            count++;
            i++;
        } else {
            let date = new Date(nowSeg);
            let timeStr = getDateStr(date);
            chartData.push({
                "time": timeStr,
                "messages": count
            });
            count = 0;
            nowSeg = nextSeg;
            nextSeg += DATE;
            if (i == timeData.length) break;
        }
    }
    generateChart(chartData);
}

function viewHour() {
    let timeData = [];
    if (!isValidTime()) {
        $('#chartdiv').empty();
        return;
    } else {
        timeData = getSelecedTimeData();
    }

    let chartData = [];
    let nowSeg = Math.floor(startTime / HOUR) * HOUR;
    let count = 0;
    i = 0;
    while (i <= timeData.length) {
        let nowT = timeData[i];
        if (nowSeg > nowT) console.log("WTF");
        if (nowT <= (nowSeg + HOUR)) {
            count++;
            i++;
        } else {
            let date = new Date(nowSeg);
            let timeStr = getDateStr(date) + " " + getTimeStr(date);
            // let dateStr = "";
            // if( date.getHours()==0 ) {
            //   dateStr = getDateStr(date);
            // }
            chartData.push({
                "time": timeStr,
                // "date": dateStr,
                "messages": count
            });
            count = 0;
            nowSeg += HOUR;
            if (i == timeData.length) break;
        }
    }
    // function getCursorTime(time) {
    //   let date = new Date(time);
    //   let m = minTwoDigits(date.getMonth()+1);
    //   let d = minTwoDigits(date.getDate());
    //   let h = minTwoDigits(date.getHours());
    //   return m+"/"+d+" "+h+":00";
    // }
    generateChart(chartData);
}

function viewTime() {
    //將所有資料彙整成以小時表示
    let timeData = [];
    if (!isValidTime()) {
        $('#chartdiv').empty();
        return;
    } else {
        timeData = getSelecedTimeData();
    }

    let timeArr = Array(24).fill(0); //建立陣列，儲存不同小時的訊息數
    let chartData = [];
    for (let i = 0; i < timeData.length; i++) {
        let hour = (new Date(timeData[i])).getHours();
        timeArr[hour - 1]++; //取得每個訊息的小時，並加至陣列裡
    }
    for (let i = 0; i < timeArr.length; i++) {
        let hr = minTwoDigits(i + 1);
        chartData.push({
            "time": hr + ":00",
            "messages": timeArr[i]
        });
    }
    generateChart(chartData);

}

function generateChart(chartData, cursorProvider) {
    //cursorProvider是一個FUNCTION，去產生滑鼠hover時顯示的資訊，但還沒寫
    var chart = AmCharts.makeChart("chartdiv", {
        "type": "serial",
        "theme": "light",
        "zoomOutButton": {
            "backgroundColor": '#000000',
            "backgroundAlpha": 0.15
        },
        "dataProvider": chartData,
        "categoryField": "time",
        "categoryAxis": {
            "markPeriodChange": false,
            "dashLength": 1,
            "gridAlpha": 0.15,
            "axisColor": "#DADADA",
            "autoWrap": true,
            "fontSize": 10
        },
        "graphs": [{
            "id": "g1",
            "valueField": "messages",
            "bullet": "round",
            "bulletBorderColor": "#FFFFFF",
            "bulletBorderThickness": 2,
            "lineThickness": 2,
            "lineColor": "#b5030d",
            "negativeLineColor": "#0352b5",
            "hideBulletsCount": 50
        }],
        "chartCursor": {
            "cursorPosition": "mouse",
            "categoryBalloonEnabled": true,
            "categoryBalloonFunction": cursorProvider
        },
        "chartScrollbar": {
            "graph": "g1",
            "scrollbarHeight": 40,
            "color": "#FFFFFF",
            "autoGridCount": true
        },
        "valueAxes": [{
            "title": "訊息數",
            "labelFrequency": 1,
            "minimum": 0,
            "baseValue": 999,
            "includeAllValues": true
        }]
    });
}

function sortInitialData(data) {
    for (let i = 0; i < data.length - 1; i++) {
        for (let j = i + 1; j < data.length; j++) {
            if (data[j].time < data[i].time) {
                let tmp = data[j];
                data[j] = data[i];
                data[i] = tmp;
            }
        }
    }
    return data;
}

function isValidTime() {
    //CHECK開始時間是否小於結束時間
    if (startTime > endTime) {
        $('#error-message').show(); //若否則顯示錯誤訊息
        return false;
    } else return true;
}

function getSelecedTimeData() {
    //將資料FILTER成在開始~結束時間內
    let timeData = [];
    console.log(startTime);
    console.log(endTime);
    for (let i = 0; i < msgTimeData.length; i++) {
        let t = msgTimeData[i].time;
        if (t > startTime && t < endTime) {
            timeData.push(t);
        }
    }
    console.log(timeData);
    return timeData;
}

function getSelecedMsgData() {
    //將資料FILTER成在開始~結束時間內
    let msgData = [];
    console.log(startTime);
    console.log(endTime);
    for (let i = 0; i < msgTimeData.length; i++) {
        let t = msgTimeData[i].time;
        if (t > startTime && t < endTime) {
            msgData.push(msgTimeData[i].message);
        }
    }
    console.log(msgData);
    return msgData;
}

function getDateStr(date) {
    let m = minTwoDigits(date.getMonth() + 1);
    let d = minTwoDigits(date.getDate());
    return m + "/" + d; //ex: "11/05", "04/10"
}

function getTimeStr(date) {
    let h = minTwoDigits(date.getHours());
    return h + ":00"; //ex: "14:00", "03:00"
}

function minTwoDigits(n) {
    return (n < 10 ? '0' : '') + n;
}