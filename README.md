# 聊聊BAR 3D 多人房間版

單一網頁，不需要安裝或建置。用 Three.js 繪製「聊聊BAR」親師交流空間，含 7 位 Q 版人物與 6 種小遊戲，
可以建立房間、讓大家用手機或電腦一起玩。

## 放上 GitHub Pages
1. 在 GitHub 新增一個 repository（免費帳號請選 Public，Pages 才能使用）。
2. 把這個資料夾裡的所有檔案（index.html、config.js、lib 資料夾、README.md）上傳到 repository 根目錄。
3. Settings → Pages，Source 選 Deploy from a branch，Branch 選 main，資料夾選 /(root)，按 Save。
4. 等 1～2 分鐘，網址會是 https://<帳號>.github.io/<repository 名稱>/

## 怎麼一起玩
1. 房主打開網頁，按下方「多人房間」→「建立房間」，會得到 4 位代碼和邀請連結。
2. 其他人打開邀請連結（或輸入代碼）加入。每個人會自動分到一個還沒人用的人物，也可以在「多人房間」視窗改選。
3. 沒人選的人物，遊戲時由電腦代打。
4. 房主負責選場景和遊戲；輪到你的人物時，才能按遊戲按鈕。每個人可以移動、改姿勢、改名自己的人物，家具擺設大家都看得到。

## 連線方式與限制
- 連線使用 WebRTC（點對點），房主的瀏覽器就是「伺服器」：房主離開，房間就會關閉；不會保存任何遊戲資料。
- 預設透過 PeerJS 的免費公開服務幫大家互相找到對方，這項服務不保證永遠可用。
- 少數網路（部分學校、公司防火牆）會擋住 WebRTC，這時加入會失敗。可以改用手機行動網路，或自己架 PeerJS server（見 config.js）。
- 「同一台裝置的分頁（測試）」模式只能在同一台電腦、同一個瀏覽器開多個分頁測試。
- 網頁網址加上 ?lite=1 可以用省電畫質（關閉陰影），或按下方「省電畫質」。

## 授權
- lib/ 內的 three.min.js 與 OrbitControls.js 為 three.js r128（MIT 授權）。
- lib/peerjs.min.js 為 PeerJS（MIT 授權）。
