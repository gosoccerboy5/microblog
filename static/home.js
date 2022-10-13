import util from "./util.js";

util.addPostButton();

util.session.then(session => {
  if (session.logged_in) util.$("#from").disabled = false;
});

function resetPosts(url) {
  document.querySelectorAll(".post").forEach(node => node.parentElement.parentElement.removeChild(node.parentElement));
  fetch(url)
    .then(res => res.json())
    .then(posts => posts.forEach(post => document.body.append(util.postTemplate(post.id, post.author, post.content, post.date, post.hearts, post.hearted, post.comments))));
}

resetPosts("/posts?from=all");

util.$("#from").value = "all";
util.$("#sort").value = "recent";

let onchange = function() {
  resetPosts("/posts?from=" + util.$("#from").value + "&sort=" + util.$("#sort").value);
};

util.$("#from").addEventListener("change", onchange);
util.$("#sort").addEventListener("change", onchange);