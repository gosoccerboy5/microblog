import util from "./util.js";

util.addPostButton();

util.session.then(session => {
  if (session.logged_in) util.$("#from").disabled = false;
});

const loadMore = util.$("#loadMore");
const postSetLength = 10;
let nextPostsStart = 0;

function resetPosts(url, reset=true) {
  if (reset) {
    nextPostsStart = 0;
    document.querySelectorAll(".post").forEach(node => node.parentElement.parentElement.removeChild(node.parentElement));
  }
  loadMore.style.display = "none";
  fetch(url)
    .then(res => res.json())
    .then(posts => posts.forEach(post => loadMore.before(util.postTemplate(post.id, post.author, post.content, post.date, post.hearts, post.hearted, post.comments))))
    .then(_ => loadMore.style.display = "block");
  nextPostsStart += postSetLength;
}

resetPosts("/posts?from=all&count=" + postSetLength);

util.$("#from").value = "all";
util.$("#sort").value = "recent";

let onchange = function() {
  resetPosts("/posts?from=" + util.$("#from").value + "&sort=" + util.$("#sort").value + "&count=" + postSetLength);
};

loadMore.addEventListener("click", function() {
  resetPosts("/posts?from=" + util.$("#from").value + "&sort=" + util.$("#sort").value + "&start=" + nextPostsStart + "&count=" + (postSetLength), false);
});

util.$("#from").addEventListener("change", onchange);
util.$("#sort").addEventListener("change", onchange);