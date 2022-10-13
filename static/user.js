import util from "./util.js";

util.addPostButton();

const username = window.location.href.match(/\@([\w-]+)/)[1];

function resetPosts(url) {
  document.querySelectorAll(".post").forEach(node => node.parentElement.parentElement.removeChild(node.parentElement));
  fetch(url)
    .then(res => res.json())
    .then(posts => posts.forEach(p => document.body.append(util.postTemplate(p.id, p.author, p.content, p.date, p.hearts, p.hearted, p.comments))));
}

resetPosts("/posts?from=@" + username);

Promise.all([util.session, fetch("/@"+username+"/followers?json=true").then(res => res.json()), fetch("/@"+username+"/following?json=true").then(res => res.json())])
  .then(data => {
    util.$("h1").after(util.createDiv(`<a href="/@{{username}}/followers">{{followers}} followers</a> - <a href="/@{{username}}/following">{{following}} following</a>`, {username, followers: data[1].length, following: data[2].length}));    if (data[0].logged_in === false) return;
    let following = data[1].includes(data[0].username);
    const followButton = util.createDiv(`<button id="follow">{{following}}</button>`, {following: following ? "Following" : "Follow"});
    const btn = followButton.querySelector("button");
    followButton.addEventListener("click", function() {
      fetch('/followaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({username}),
      }).then(res => res.json())
      .then(res => {
        if (res.status === "error") {
          alert(res.message);
        } else {
          if (res.message === "followed") {
            btn.innerText = "Following";
          } else {
            btn.innerText = "Follow";
          }
        }
      });
    });
    util.$("p").after(followButton);
  });

util.$("#sort").children[0].value = "recent";
util.$("#sort").addEventListener("change", function() {
  resetPosts("/posts?from=@" + username + "&sort=" + this.children[0].value);
});
