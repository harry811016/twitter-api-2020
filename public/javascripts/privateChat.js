document.addEventListener("DOMContentLoaded", () => {
  let socket = io();
  let status = document.getElementById("status");
  let online = document.getElementById("online");
  let userSide = document.getElementById("users");
  let sendForm = document.getElementById("send-form").childNodes[1];
  let userInfo = document.getElementById("userInfo")
  let messages = document.getElementById("messages")

  socket.emit('login', userInfo.innerText)

  $('form').submit(function () {
    if ($('#m').val() !== '') {
      socket.emit('private chat message', $('#m').val(), $('#userId').val(), $('#userAvatar').val(), $('#userName').val())
      $('#m').val('')
    } else {
      sendForm.classList.add("wrong");
      sendForm.addEventListener('animationend', event => event.target.classList.remove('wrong'), { once: true })
    }
    return false;
  });

  socket.on("connect", function () {
    status.classList.remove("disconnected")
    status.innerText = `Connected`;
    status.classList.add("connected")
  });

  socket.on("disconnect", function () {
    status.classList.add("connected")
    status.innerText = `Disconnected`;
    status.classList.add("disconnected")
  });

  socket.on("online", function (amount, userlist) {
    online.innerText = amount;
    window.scrollTo(0, document.body.scrollHeight);
  });

  socket.on("oneLogin", function (user) {
    let userMsg = `
          <li>
          <span>${user} 上線。</span>
          </li>
          `
    $('#messages').append(userMsg);
  })

  socket.on("oneLeave", function (user) {
    let userMsg = `
          <li>
          <span>${user} 離線。</span>
          </li>
          `
    $('#messages').append(userMsg);
  })

  socket.on('send message', function (msg, id, avatar, name) {
    const event = new Date().toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit' })
    let chatColumn = `
          <li>
          <img src="${avatar}" alt="">
            <div>
              <strong>${name}</strong>
              <p>${msg}</p>
              <span id='time'>${event}</span>
            </div>
        </li>
        `
    $('#messages').append(chatColumn);
    $('#content').scrollTop($('#content')[0].scrollHeight - 50)

    // if ($('#messages').children.length > max_record) {
    //   rmMsgFromBox();
    // }
  });

  socket.on("privateChatRecord", function (msgs) {
    messages.innerHTML = ''
    for (let i = 0; i < msgs.length; i++) {
      let chatColumn = `
          <li>
          <img src="${msgs[i].User.avatar}" alt="">
            <div>
              <strong>${msgs[i].User.name}</strong>
              <p>${msgs[i].message}</p>
              <span id='time'>${new Date(msgs[i].createdAt).toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
        </li>
        `
      $('#messages').append(chatColumn);
    }
  })

  // socket.on("maxRecord", function (amount) {
  //   max_record = amount;
  // });


  // function rmMsgFromBox() {
  //   var childs = content.children;
  //   childs[0].remove();
  // }
});

function showChatHistory(user) {
  let socket = io();
  let loginUserId = user.getAttribute('user-id');
  let chatUserId = user.getAttribute('data-id')
  socket.emit('private-Record', loginUserId, chatUserId)
}

