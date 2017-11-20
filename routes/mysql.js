var express = require('express');
var router = express.Router();
var mysql = require('mysql');

var con = mysql.createConnection({
  // host: "192.168.0.135",
  // host: "192.168.0.124",
  // path: "%",
  // user: "Colman",
  // password: "shield123"
});

con.connect(function(err) {
  if (err) {
    // console.log(err);
    console.log("Shield in MySql Connected FAIL!");
  }
  else {
    console.log("Shield in MySQL Connected!");
    setSqlUpdate();
  }
});

function setSqlUpdate() {
  setInterval( function() {
    console.log("check worker update");

    con.query('SELECT * FROM questionnaire.update_info ORDER BY ID DESC LIMIT 1', function(err, result, fields) {
      let update_to = result[0].update_to;      //取得上次更新VOTE資料庫到哪

      let sql = 'SELECT * FROM questionnaire.vote WHERE questionnaire.vote.ID > ? ORDER BY worker_id';
      con.query( sql, update_to,  function(err, result, fields) {
        //取得上次更新VOTE資料庫之後，產生的新資料
        if( result.length==0 ) {
          //no need to update
          console.log("no need update");  //若產生的新資料，長度=0，則不需更新
        }
        else {
          console.log("need update");     //若有產生新資料，則須更新
          let vote_data = [];             //將同樣WORKER_ID的VOTE_SCORE包一起，減少存取DB的動作

          //在SELECT DB時，已經將DATA以WORKER_ID排序了
          while( result.length>0 ) {      //只要還有待處理的VOTE資料
            let worker_id = result[0].worker_id;  //取得現在要包的WORKER_ID
            let scores = [];
            while( result.length>0 ) {
              if( result[0].worker_id == worker_id ) {    //只要這一筆資料還在同一個WORKER_ID
                scores.push( result[0].vote_score );      //就把這個VOTE的分數PUSH進SCORES陣列
                result.splice(0,1);                       //並把此VOTE移出待處理的陣列
              }
              else break;                     //如果不在同個WORKER_ID，就先跳出迴圈
            }
            vote_data.push({                  //PUSH一個物件，物件包含WORKER_ID及他獲得的評價分數們的陣列
              worker_id: worker_id,
              scores: scores
            });
          }
          console.log(vote_data);

          vote_data.map( function(data) {
            con.query('SELECT * FROM questionnaire.worker WHERE questionnaire.worker.ID = ? ', data.worker_id, function(err, result, fields) {
              let worker = result[0];   //獲得此WORKER之前在DB的資料
              for( let i in data.scores ) {   //將前面獲得的VOTE_DATA裡面的每個SCORE，加進去此WORKER的資料
                let n = data.scores[i];
                worker["score_"+n+"_count"]++;
                worker["vote_count"]++;
              }
              let sum = 0;
              for( let i = 1; i<=5; i++ ) {   //加完SCORE後，計算出總共得分
                sum += i * worker["score_"+i+"_count"];
              }
              worker.score = sum/worker.vote_count; //計算出平均得分
              // console.log(worker);      //CONSOLE此WORKER更新後的資料
              con.query('UPDATE questionnaire.worker SET vote_count = ? '
              + ', score_5_count = ?, score_4_count = ?, score_3_count = ?, score_2_count = ?, score_1_count = ?'
              + ', score = ?'
              + ' WHERE ID = ?'
              , [worker.vote_count, worker.score_5_count, worker.score_4_count, worker.score_3_count
                , worker.score_2_count, worker.score_1_count, worker.score, data.worker_id]
              , function(err, rows) {   //UPDATE進資料庫
                if(err) throw err;
              });
            });
          });

          //紀錄這次更新到哪
          con.query('SELECT ID FROM questionnaire.vote ORDER BY ID DESC LIMIT 1', function(err, result, fields) {
            //取得VOTE的最後一筆資料的ID
            let new_update_to = result[0].ID;
            console.log("update_to = "+new_update_to);
            con.query('INSERT INTO questionnaire.update_info SET ?', {update_to: new_update_to}, function(err, rows) {
              if(err) throw err;  //將此資訊寫進DB，下次就知道要從這筆資料後更新
            });
          }); //end con.query
        } //end else
      }); //end con.query vote
    }); //end con.query update_info

  }, 10*1000 );
}

module.exports = con;
