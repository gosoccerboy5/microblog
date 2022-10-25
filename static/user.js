import util from "./util.js";

util.addPostButton();

const username = window.location.href.match(/\@([\w-]+)/)[1];

Promise.all([util.session, fetch("/@"+username+"/followers?json=true").then(res => res.json()), fetch("/@"+username+"/following?json=true").then(res => res.json())])
  .then(data => {
    util.$("h1").after(util.createElement(`<div><a href="/@{{username}}/followers">{{followers}} followers</a> - <a href="/@{{username}}/following">{{following}} following</a></div>`, {username, followers: data[1].length, following: data[2].length}));    if (data[0].logged_in === false) return;
    let following = data[1].includes(data[0].username);
    const followButton = util.createElement(`<button id="follow">{{following}}</button>`, {following: following ? "Following" : "Follow"});
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
            followButton.innerText = "Following";
          } else {
            followButton.innerText = "Follow";
          }
        }
      });
    });
    util.$("p").after(followButton);
  });

const loadMore = util.$("#loadMore");
const postSetLength = 10;
let nextPostsStart = 0;

function resetPosts(url, reset=true) {
  if (reset) {
    nextPostsStart = 0;
    document.querySelectorAll(".post").forEach(node => node.parentElement.removeChild(node));
  }
  loadMore.style.display = "none";
  fetch(url)
    .then(res => res.json())
    .then(posts => posts.forEach(post => loadMore.before(util.postTemplate(post.id, post.author, post.content, post.date, post.hearts, post.hearted, post.comments))))
    .then(_ => loadMore.style.display = "block");
  nextPostsStart += postSetLength;
}

resetPosts("/posts?from=@" + username + "&count=" + postSetLength);

util.$("#sort").value = "recent";

let onchange = function() {
  resetPosts("/posts?from=@" + username + "&sort=" + util.$("#sort").value + "&count=" + postSetLength);
};

loadMore.addEventListener("click", function() {
  resetPosts("/posts?from=@" + username + "&sort=" + util.$("#sort").value + "&start=" + nextPostsStart + "&count=" + (postSetLength), false);
});

util.$("#sort").addEventListener("change", onchange);
