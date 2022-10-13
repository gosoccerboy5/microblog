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
