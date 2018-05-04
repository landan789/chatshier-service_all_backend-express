= Release 1.2.5 =
Released: 2018-05-02
== Features ==
 * Add: Support LINE group and room chat with LINE@
 * Add: click image content will stretch the image

== Bug Fixes ==
 * Fixed: message panel not scroll to bottom
 * Fixed: message text new line not work

= Release 1.2.4 =
Released: 2018-04-27
== Features ==

== Bug Fixes ==
 * Fixed: set cookie value is not ASCII (browser: safari)
 
= Release 1.2.3 =
Released: 2018-04-25
== Features ==

== Bug Fixes ==
 * Fixed: some UI bugs
 * refacted: switch the classes of controller to ES6 class syntax
 
 = Release 1.2.2 =
Released: 2018-04-24
== Features ==
 * creadted: [MASTER 1.2.2][chat][UI:RWD]
 * creadted: [MASTER 1.2.2][calendar][UI:RWD]
 * creadted: [MASTER 1.2.2][ticket][UI:RWD]
 * creadted: [MASTER 1.2.2][analyze][UI:RWD]
 * creadted: [MASTER 1.2.2][compose][UI:RWD]
 * creadted: [MASTER 1.2.2][autoreply][UI:RWD]
 * creadted: [MASTER 1.2.2][keywordsreply][UI:RWD]
 * creadted: [MASTER 1.2.2][greeting][UI:RWD]
== Bug Fixes ==
 * Fixed: some UI bugs
 * Fixed: [MASTER 1.2.2][chat][isDeleted group member or none status group member should not chat on the group]
 * refactor(controller): switch to ES6 class syntax
 = Release 1.2.1 =
Released: 2018-04-13
== Features ==

== Bug Fixes ==
 * Fixed: some bugs

 = Release 1.2.0 =
Released: 2018-04-12
== Features ==
 * changed: database from Firebase to MongoDB
 * upgraded: Bootstrap from v3 to v4

== Bug Fixes ==
 * Fixed: T2-7     [MASTER 1.2.0][聊天室][更新用戶資料 : 個人資料電話欄位更新refresh會消失]
 * Fixed: T2-8     [MASTER 1.2.0][聊天室][搜尋待辦事項 : 打中文無法搜尋]
 * Fixed: T2-8     [MASTER 1.2.0][聊天室][新增待辦事項 : 新增完再按一下新增 欄位沒清空]
 * Fixed: T2-8     [MASTER 1.2.0][新增待辦事項][新增待辦事項 : 電話欄位沒顯示]
 * Fixed: T4-2     [MASTER 1.2.0][新增待辦事項][新增待辦事項 : 客戶會撈出所有客戶]
 * Fixed: T5-1-1   [MASTER 1.2.0][訊息分析][選擇時間範圍 : 當開始時間及結束時間，未超過一天或未超過一小時，不會顯示資料]
 * Fixed: T5-1-2   [MASTER 1.2.0][訊息分析][瀏覽單位月、日、小時 : 開始時間及結束時間，會影響“單位：日“ 及 ”單位：小時”的資料顯示]
 * Fixed: T6-3-2   [MASTER 1.2.0][訊息][搜尋關鍵字回覆 : 無法搜尋]
 * Fixed: T6-2-2   [MASTER 1.2.0][訊息][搜尋自動回覆 : 打中文無法搜尋]
 * Fixed: T6-1-2   [MASTER 1.2.0][訊息][搜尋群發 : 打中文無法搜尋]
 * Fixed: T6-4-2   [MASTER 1.2.0][訊息][新增加好友回覆 : 加好友回覆會連同自動回覆訊息一起回]
 * Fixed: T7-1-4-2 [MASTER 1.2.0][設定][更新內部群組名稱 : 聊天室中的名稱無改變]
 * Fixed: T7-1-4-1 [MASTER 1.2.0][設定][新增內部群組 : 第二次新增時會有前一次的名稱]
 * Fixed: changed database schema of `composes` with `fields` (customized fields)
 
 = Release 1.1.0 =
Released: 2018-03-14

== Features ==
 * created: keywordreply with fizzy searching
 * created: compose with fields (customized fields)
 * created: google calandar
 * created: storage via Dropbox
 * changed: signup page from jQuery to React
 * changed: signin page from jQuery to React
 * changed: ticket page from jQuery to React

= Release 1.0.1 =
Released: 2018-03-5

== Bug Fixes ==
 * Fixed: issue #0042: [MASTER 1.0.1][聊天室][右側的用戶資料沒有顯示]

 = Release 1.0.0 =
Released: 2018-03-5

== Features ==
 * created: chat one on one page
 * created: internal chat group page
 * created: indivisiual calendar page
 * created: ticket page
 * created: analysis page
 * created: compose page
 * created: autoreply page
 * created: keywordreply page
 * created: greeting page
 * created: app setting
 * created: group setting page
 * created: user setting page
 * created: signout page
 * created: signup page
 * created: signin page

== Bug Fixes ==
 * Fixed issue #0039: [MASTER 1.0.0] 若有兩個群組以上，聊天室中內部群組成員會顯示所有群組成員

