= Release 1.4.0 =
MASTER release: Not Ready
RELEASE release: Not Ready
== Features ==
 * Changed: change app list UI in setting page
 * Created: add feature of payment setting in app setting, support ECPay, Spgateway
 * Created: richmenu support switch to other richmenu
 * Created: richmenu can send a form link to consumer for fill personal profile
 * Created: richmenu can set donate option for consumer donation
 * Created: compose support text condition
 * Created: compose support image, imagemap, template message type, and emoji input for text message
 * Created: keyword reply support image, imagemap, template message type, and emoji input for text message
 * Created: auto reply support image, imagemap, template message type, and emoji input for text message
 * Created: greeting support image, imagemap, template message type, and emoji input for text message
 * Created: chatroom support emoji input for text message
== Bug Fixes ==
 * Fixed: fix group member remove issue, chatroom messager not remove after group member removed
 * Fixed: prevent assignee not found if the user has left the group

= Release 1.3.1 =
MASTER release: 2018-06-08
RELEASE release: 2018-06-05
== Features ==
 * Removed: remove scroll to top button of control panel
== Bug Fixes ==
 * Fixed: fix LINE richmenu link logic


= Release 1.3.0 =
MASTER release: 2018-06-05
RELEASE release: 2018-05-28
== Features ==
 * Created: support LINE group and room chat with LINE
 * Created: custom naming platform group chatroom name
 * Created: custom naming platform consumer name
 * Created: click image content will stretch the image
 * Created: add sound and title blink when new message is come
 * Created: user can link fan pages by facebook login
 * Created: add link of line developers on add modal
 * Created: add scroll button for scroll to top or bottom
 * Created: user can reset password now
 * Created: tags feature
 * Created: vendor can send files to the consumors via Dropbox
 * Creared: T2-7 [聊天室] 更新用戶資料 - 可以更改 LINE 用戶別名
 
== Bug Fixes ==
 * Fixed: signin form not auto complete email
 * Fixed: sometime refresh token is too late
 * Fixed: support file type message for LINE
 * Fixed: UI changes when line consumer unfollow
 * Fixed: remove manually add facebook fan page
 * Fixed: update the compose filter logic
 * Fixed: add periods setting for autoreply
 * Fixed: greeting can be updated
 * Fixed: customized compose

= Release 1.2.4 =
MASTER Released: 2018-04-27
== Features ==

== Bug Fixes ==
 * Fixed: set cookie value is not ASCII (browser: safari)
 
= Release 1.2.3 =
MASTER Released: 2018-04-25
== Features ==

== Bug Fixes ==
 * Fixed: some UI bugs
 * refacted: switch the classes of controller to ES6 class syntax
 
 = Release 1.2.2 =
MASTER Released: 2018-04-24
== Features ==
 * Created: [MASTER 1.2.2][chat][UI:RWD]
 * Created: [MASTER 1.2.2][calendar][UI:RWD]
 * Created: [MASTER 1.2.2][ticket][UI:RWD]
 * Created: [MASTER 1.2.2][analyze][UI:RWD]
 * Created: [MASTER 1.2.2][compose][UI:RWD]
 * Created: [MASTER 1.2.2][autoreply][UI:RWD]
 * Created: [MASTER 1.2.2][keywordsreply][UI:RWD]
 * Created: [MASTER 1.2.2][greeting][UI:RWD]
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
 * Created: keywordreply with fizzy searching
 * Created: compose with fields (customized fields)
 * Created: google calandar
 * Created: storage via Dropbox
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
 * Created: chat one on one page
 * Created: internal chat group page
 * Created: indivisiual calendar page
 * Created: ticket page
 * Created: analysis page
 * Created: compose page
 * Created: autoreply page
 * Created: keywordreply page
 * Created: greeting page
 * Created: app setting
 * Created: group setting page
 * Created: user setting page
 * Created: signout page
 * Created: signup page
 * Created: signin page

== Bug Fixes ==
 * Fixed issue #0039: [MASTER 1.0.0] 若有兩個群組以上，聊天室中內部群組成員會顯示所有群組成員

