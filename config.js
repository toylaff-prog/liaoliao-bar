// 多人房間的連線設定（預設使用 PeerJS 公開的免費服務，不需要修改）。
// 1) 如果學校或公司網路擋住公開服務，可以自己架一台 PeerJS server（https://github.com/peers/peerjs-server），
//    然後把下面的設定取消註解並填入你的伺服器位址。
window.LLBAR_PEER = {
  // host: 'peer.example.com',
  // port: 443,
  // path: '/',
  // secure: true
};
// 2) 預設已內建免費的 STUN／TURN。如果有些網路還是連不上，可以再加入自己的 TURN 伺服器（以下為範例格式）。
//    加入後，程式會同時使用內建的伺服器和你加的伺服器。
window.LLBAR_ICE = [
  // { urls: 'turn:turn.example.com:3478', username: 'user', credential: 'password' }
];
