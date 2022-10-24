import util from "./util.js";

const btn = util.$("#submit");

btn.addEventListener("click", function() {
  fetch('/createpost', {
    headers: {
      'Content-Type': 'application/json'
    },
    method: 'POST',
    body: JSON.stringify({
      content: util.$("#postcontent").value,
    })
  }).then(res => res.json())
  .then(res => {
    if (res.status === "success") {
      window.location.replace(res.message);
    } else {
      util.dialog(res.message);
    }
  });
});

util.$("#question").addEventListener("click", function() {
  const msg = "You can @ another user to link to their profile, and use a limited subset of BBCode tags ([b]bold[/b], [i]italic[/i], [s]strikethrough[/s], [spoiler]spoiler![/spoiler], [img]https://example.com/img.png[/img], [url=https://example.com]Link![/url])";
  util.dialog(msg);
});