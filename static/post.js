import util from "./util.js";

util.addPostButton();

const postId = window.location.href.match(/\/post\/(\d+)/)[1];

util.$("#comment").value = "";

fetch("/postdata/" + postId)
  .then(res => res.json())
  .then(post => {
    document.title = "Post by " + post.author;
    util.$("#comments").before(util.postTemplate(postId, post.author, post.content, post.date, post.hearts, post.hearted, post.comments.length));
    post.comments.forEach(comment => {
     util.$("#comments").append(util.commentTemplate(comment.id, comment.author, comment.content, comment.date));
    });
    if (window.location.hash) window.scrollTo(0, document.body.scrollHeight - util.$(window.location.hash).scrollHeight);
  });

util.$("#submit").addEventListener("click", function() {
  fetch('/createcomment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content: util.$("#comment").value,
      parentId: postId,
    })
  }).then(res => res.json())
  .then(res => {
    if (res.status === "success") {
      window.location.replace(res.message);
      window.location.reload();
    } else {
      util.dialog(res.message);
    }
  });
});

util.session.then(data => {
  if (data.logged_in) {
    util.$("#submit").parentElement.style.display = "block";
  }
});
