# Chatshier 錢掌櫃
------------
## **一、資料夾**
### 1. bin
系統開始服務的地方  
npm start指令的起始點(./bin/www)

### 2. config
全域的設定檔

* 錯誤格式訊息
* 成功格式訊息  
* 資料庫設定檔  
* 群組/聊天室的資料庫格式  
* Socket設定

### 3. controllers
執行對應api路徑下的需求取得models的資料  
處理完後把資料傳給前端

### 4. cores
內部核心功能  

* controllers - 用來管理群組跟使用者驗證

### 5. etc
Linux 環境設定檔

* redis.conf - socket 用的附載平衡器

### 6. helpers
處理內部server端的函式庫

* timer - 操作時間的格式至unix time
* bot - 接收訊息後的判斷，使否有需要回覆訊息
* facebook - facebook bot的訊息判斷

### 7. middlewares
中介函式

* jwt token - 使用者token判斷是否有權限

### 8. models
處理資料庫存取的地方  
一個檔案代表一個資料庫集合(collection)

### 9. public
browser client端的檔案

* config - client端的firebase, socket, chatshier設定
* css - stylesheet資料夾
* image - 圖檔資料夾
* js - javascript client端資料夾
* json - 專案格式檔
* lib - 函式庫(含bootstrap, font-awesome, fullcalendar等)

### 10. routes
處理 url 的部分 

* api.js - api路徑，使用controllers取得資料
* index.js - express view engine的路徑

### 11. schedules
排程功能

### 12. services
處理外部server端的函式庫

* bot.js - LINE跟Facebook bot的訊息接收
* wechat.js - 額外的 wechat 相關函式

### 13. sockets
處理socket

* index.js - 處理socket的檔案

### 14. templates
存放 Server 端動態渲染的模板，如 Email

### 15. third_party
放置未發佈至 npm 的第三方 modules
需要進行 local module install

* ecpay_invoice_nodejs - https://github.com/ECPay/Invoice_Node.js
* ecpay_payment_nodejs - https://github.com/ECPay/ECPayAIO_Node.js
    - 在更新此 Repository 時需注意，原 Repository 的資料夾的名稱為 ECPAY_Payment_node_js ，為了統一因此改為小寫命名

### 16. typings
typing 檔案

### 17. view
express view engine: ejs

## **二、檔案**

### 1. eslintrc
ES Lint的設定檔

### 2. app.js
執行中介軟體(middlewares)的檔案

### 3. package.json
node module的設定檔

------------
## **三、Coding Style**
### 1. 命名
**JAVASCRIPT NODE SERVER**

* 檔案名稱使用 小寫底線間格


**JAVASCRIPT CLIENT**

* 檔案名稱使用 hyphen小寫間隔


**JAVASCRIPT**

* 變數名稱使用 首字小寫駝峰
* 函數命名使用 首字小寫駝峰

**CSS**

* 檔案名稱使用 hyphen小寫間隔
* 類別ID名稱使用 hyphen小寫間隔

**SQL**

* SQL關鍵字使用全大寫，
* 資料庫名稱、表格名稱、欄位名稱 全使用小寫底線

**NoSQL**

* 時間內容使用 Unix Time，如 :1540000000 ，命名：***Time，如：createdTime。
* 布林命名開頭使用 "is" 、尾端使用 adj 或 Vpp ，如：isDeleted，isChecked。
------------
## **四、Test Case**
專案的test case會使用trello的看板追蹤  
連結：[test-casechatshier](https://trello.com/b/lanbapYw/test-casechatshier)

