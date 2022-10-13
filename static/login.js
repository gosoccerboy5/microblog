import util from "./util.js";

util.$("#login").addEventListener("click", function() {
  fetch('/login', {
    headers: {
      'Content-Type': 'application/json'
    },
    method: 'POST',
    body: JSON.stringify({
      "username": util.$("#username").value,
      "password": util.$("#password").value,
    })
  }).then(res => res.json())
  .then(res => {
    if (res.status === "error") {
      util.$("#login").before(util.errorBox(res.message));
    } else  util.$("#login").before(util.successBox(res.message));
  });
})

util.$("#signup").addEventListener("click", function() {
  fetch('/signup', {
    headers: {
      'Content-Type': 'application/json'
    },
    method: 'POST',
    body: JSON.stringify({
      "username": util.$("#username").value,
      "password": util.$("#password").value,
    })
  }).then(res => res.json())
  .then(res => {
    if (res.status === "error") {
      util.$("#login").before(util.errorBox(res.message));
    } else util.$("#login").before(util.successBox(res.message));
  });
});

if (document.referrer !== "") {
  util.$("#back").style.display = "block";
}
