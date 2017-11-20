var apiai = require('apiai');
var apiai_app = apiai('689400146a084761a69baa61bfd2a412');
var apiaiReply = {};

apiaiReply.process = function( inputMessage, callback ) {
  let request = apiai_app.textRequest(inputMessage, {
    sessionId: '0896c04e-218b-4951-b75d-2d09e1ce7d4b'
  });
  request.on('response', function(response) {
    let action = response.result.action ;
    let speech = response.result.fulfillment.messages[0].speech ;
    let parameter = response.result.parameters ;
    let complete = !response.result.actionIncomplete ;
    let userSay = response.result.resolvedQuery ;
    console.log("api.ai input="+response.result.resolvedQuery+", action="+action);
    if(action != 'input.unknown'){
      // console.log("result = ");
      // console.log(response.result) ;
      if(action == 'tinistart.faq'){
        let type = speech ;
        //let content = '';
        let incomplete = response.result.actionIncomplete ;
        // console.log(type) ;
        if(incomplete){
          let replyMessage = speech;
          let replyTemplate = {
            type: 'text',
            text: speech
          };
          callback(replyMessage, replyTemplate);
        }
        else if(type == 'principal'){
          let replyMessage = "關於負責人";
          let replyTemplate = {
            "type": "template",
            "altText": "關於負責人",
            "template": {
              "type": "buttons",
              "title": "關於負責人",
              "text": "以下是有關負責人的常見問題",
              "actions": [{
                "type": "postback",
                "label": "請問什麼樣的人可以擔任負責人?",
                "data": "1-1"
              }]
            }
          };
          callback(replyMessage, replyTemplate);
        }
        else if(type == 'money'){
          let replyMessage = '關於資本額';
          let replyTemplate = {
            "type": "template",
            "altText": "關於資本額",
            "template": {
              "type": "buttons",
              "title": "關於資本額",
              "text": "以下是有關資本額的常見問題",
              "actions": [{
                "type": "postback",
                "label": "公司的資本額有最低限制嗎",
                "data": "2-1",
              },{
                "type": "postback",
                "label": "資本額要在銀行放多久才能用",
                "data": "2-2",
              },{
                "type": "postback",
                "label": "資本額一定要經過會計師簽證查核嗎",
                "data": "2-3",
              },{
                "type": "postback",
                "label": "我能請人代做資本額嗎",
                "data": "2-4",
              }]
            }
          };
          callback(replyMessage, replyTemplate);
        }
        else if(type == 'servies'){
          let replyMessage = '關於附加服務';
          let replyTemplate = {
            "type": "template",
            "altText": "關於附加服務",
            "template": {
              "type": "buttons",
              "title": "關於附加服務",
              "text": "以下是有關附加服務的常見問題",
              "actions": [{
                "type": "postback",
                "label": "什麼是商務中心",
                "data": "3-1",
              },{
                "type": "postback",
                "label": "商務中心可以提供什麼服務",
                "data": "3-2",
              },{
                "type": "postback",
                "label": "App製作是怎麼樣的服務",
                "data": "3-3",
              },{
                "type": "postback",
                "label": "什麼樣的人適合使用商務中心",
                "data": "3-4",
              }]
            }
          };
          callback(replyMessage, replyTemplate);
        }
        else if(type == 'bank'){
          let replyMessage = '關於銀行帳戶';
          let replyTemplate = {
            "type": "template",
            "altText": "關於銀行帳戶",
            "template": {
              "type": "buttons",
              "title": "關於銀行帳戶",
              "text": "以下是有關銀行帳戶的常見問題",
              "actions": [{
                "type": "postback",
                "label": "如何挑選辦理的銀行",
                "data": "4-1",
              },{
                "type": "postback",
                "label": "如何將公司籌備處帳戶變成正式帳戶",
                "data": "4-2",
              },{
                "type": "postback",
                "label": "我可以在不同銀行開設公司銀行帳戶嗎",
                "data": "4-3",
              }]
            }
          }
          callback(replyMessage, replyTemplate);
        }
        else if(type == 'starting'){
          let replyMessage = '關於公司設立';
          let replyTemplate = {
            "type": "template",
            "altText": "關於公司設立",
            "template": {
              "type": "carousel",
              "columns": [
                {
                  "text": "以下是有關公司設立的常見問題",
                  "actions": [
                    {
                      "type": "postback",
                      "label": "印章不見時有什麼要注意的?",
                      "data": "5-1",
                    },
                    {
                      "type": "postback",
                      "label": "我可以不設立公司或行號就開始營業嗎?",
                      "data": "5-2",
                    },
                    {
                      "type": "postback",
                      "label": "想用的名稱已被使用，但處於解散狀態",
                      "data": "5-3",
                    }
                  ]
                },{
                  "text": "以下是有關公司設立的常見問題",
                  "actions": [
                    {
                      "type": "postback",
                      "label": "想開小吃店或小店面還需要設立公司嗎",
                      "data": "5-4",
                    },
                    {
                      "type": "postback",
                      "label": "請問我需要準備些什麼東西?",
                      "data": "5-5",
                    },
                    {
                      "type": "postback",
                      "label": "沒有建物所有權狀的話要怎麼辦?",
                      "data": "5-6",
                    }
                  ]
                },{
                  "text": "以下是有關公司設立的常見問題",
                  "actions": [
                    {
                      "type": "postback",
                      "label": "如果公司大小章不見的話要怎麼處理?",
                      "data": "5-7",
                    },
                    {
                      "type": "postback",
                      "label": "外國人在台灣設立公司時的步驟有什麼不同?",
                      "data": "5-8",
                    },
                    {
                      "type": "postback",
                      "label": "公司申請要用的文件和資料要怎樣交給你們?",
                      "data": "5-9",
                    }
                  ]
                },{
                  "text": "以下是有關公司設立的常見問題",
                  "actions": [
                    {
                      "type": "postback",
                      "label": "我該設立有限公司還是股份有限公司?",
                      "data": "5-10",
                    },
                    {
                      "type": "postback",
                      "label": "營業項目要設多少個?有限制嗎?",
                      "data": "5-11",
                    },
                    {
                      "type": "postback",
                      "label": " ",
                      "data": " ",
                    }
                  ]
                }
              ]
            }
          }
          callback(replyMessage, replyTemplate);
        }
        else if(type == 'business'){
          let replyMessage = '關於營業項目';
          let replyTemplate = {
            "type": "template",
            "altText": "關於營業項目",
            "template": {
              "type": "buttons",
              "title": "關於營業項目",
              "text": "以下是有關營業項目的常見問題",
              "actions": [{
                "type": "postback",
                "label": "什麼是特許營業項目",
                "data": "6-1",
              },{
                "type": "postback",
                "label": "我能自行增加製造產品的項目嗎",
                "data": "6-2",
              }]
            }
          }
          callback(replyMessage, replyTemplate);
        }
        else if(type == 'price'){
          let replyMessage = '關於價格方案';
          let replyTemplate = {
            "type": "template",
            "altText": "關於價格方案",
            "template": {
              "type": "buttons",
              "title": "關於價格方案",
              "text": "以下是有關價格方案的常見問題",
              "actions": [{
                "type": "postback",
                "label": "為什麼有特許營業項目時要另外計算費用?",
                "data": "7-1",
              },{
                "type": "postback",
                "label": "兩個方案差別在哪?",
                "data": "7-2",
              }]
            }
          }
          callback(replyMessage, replyTemplate);
        }
        else if(type == 'insurance'){
          let replyMessage = '關於勞健保';
          let replyTemplate = {
            "type": "template",
            "altText": "關於勞健保",
            "template": {
              "type": "buttons",
              "title": "關於勞健保",
              "text": "以下是有關勞健保的常見問題",
              "actions": [{
                "type": "postback",
                "label": "我的員工很少，能不投保勞健保嗎?",
                "data": "10-1",
              },{
                "type": "postback",
                "label": "我是負責人，我要怎麼投勞保?",
                "data": "10-2",
              },{
                "type": "postback",
                "label": "我是負責人，我要怎麼投健保?",
                "data": "10-3",
              },{
                "type": "postback",
                "label": "現在加保勞健保會被追繳勞健保嗎?",
                "data": "10-4",
              }]
            }
          }
          callback(replyMessage, replyTemplate);
        }
        else if(type == 'other'){
          let replyMessage = '常見問題';
          let replyTemplate = {
            "type": "template",
            "altText": "常見問題",
            "template": {
              "type": "carousel",
              "columns": [
                {
                  "text": "以下是其他常見問題",
                  "actions":[
                    {
                      "type": "postback",
                      "label": "請問貴公司的提供服務的區域有哪些?",
                      "data": "8-1",
                    },
                    {
                      "type": "postback",
                      "label": "請問貴公司的服務時間?",
                      "data": "8-2",
                    },
                    {
                      "type": "postback",
                      "label": "你們怎麼幫我們進行客服代理的服務?",
                      "data": "8-3",
                    }
                  ]
                },{
                  "text": "以下是其他常見問題",
                  "actions":[
                    {
                      "type": "postback",
                      "label": "我要怎麼向你們付費並取得正式文件?",
                      "data": "8-4",
                    },
                    {
                      "type": "postback",
                      "label": "我可以不用統一發票嗎?",
                      "data": "9-1",
                    },
                    {
                      "type": "postback",
                      "label": " ",
                      "data": " ",
                    }
                  ]
                }
              ]
            }
          }
          callback(replyMessage, replyTemplate);
        }
        else console.log("api.ai type error");
        return;
      }
    }
    else {
      // console.log("action = ");
      // console.log(action);
      callback("-1", null);
    }

  });
  request.on('error', function(error) {
    console.log(error);
  });
  request.end();
} // end of apiai

module.exports = apiaiReply;
