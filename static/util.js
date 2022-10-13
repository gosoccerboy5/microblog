const $ = document.querySelector.bind(document);

function HTMLify(text, r) {
  let newText = text;
  //BBCode
  newText = newText.replaceAll(/\[\/?(\w+?)\]/g, s => {
    let tag = s.slice(1, s.length - 1);
    if (s[1] == "/") tag = tag.slice(1);
    return r[tag] ? `<${s[1] === "/" ? "/" : ""}${r[tag]}>` : "";
  });
  //@ symbol
  newText = newText.replaceAll(/(\s|^)(@\w+)/g, "<a href='/$2'>$2</a>");
  //Urls
  newText = newText.replaceAll(/(https?:\/\/\w+(\.\w+)+(\/[^ ]*)?)/g, "<a href='$1'>$1</a>");
  return newText;
}

const createDiv = function(innerHtml, replacements, sanitize=true) {
  const div = document.createElement("div");
  div.innerHTML = innerHtml.replaceAll(/(?:[^\\](\\\\)*)(\{\{\w+}})/g, function(match) {
    let value = String(replacements[match.slice(3, match.length - 2)]) ?? "";
    return match.replace(/\{\{(\w+)}}/, n => sanitize ? value.replaceAll("&", "&amp;", ">", "&gt;", "<", "&lt;") : value);
  });
  return div;
}

const dialog = function(message) {
  let div = createDiv(`<button class="ok">✖</button><div>Alert</div><hr><span>{{message}}</span>`, {message});
  div.className = "dialog";
  document.body.append(div);
  document.body.className = "has-modal";
  return new Promise(resolve => {
    div.querySelector(".ok").addEventListener("click", function() {
      this.parentElement.parentElement.removeChild(this.parentElement);
      document.body.className = document.body.className.replace(/\bhas-modal\b/, "");
      resolve();
    });
  });
};

const replacements = {"b":"b","i":"i","strikethrough":"s"};

const postTemplate = function(id, author, content, date, hearts, hearted, comments) {
  let div = createDiv(`<div class="post" title="{{date}}">
    <a href="/@{{author}}">@{{author}}</a>
    <hr>
    <div class="content">
      {{content}}
    </div>
    <hr>
    <span class="hearts" title="Likes"><span class="heart">🖤</span> <span class="heartcount">{{hearts}}</span></span>
    <span class="comments" title="Comments">💬 {{comments}}</span>
  </div>`, {author, content: HTMLify(content, replacements), hearts, date, id, comments}, false);
  if (hearted) div.querySelector(".heart").innerText = "❤️";
  div.children[0].addEventListener("click", function(event) {
    if (event.target.className !== "hearts" && event.target.parentElement.className !== "hearts") {
      window.location.href = '/post/' + String(id);
    }
  });
  div.querySelector(".hearts").addEventListener("click", function(evt) {
    fetch('/heartaction', {
      headers: {
        'Content-Type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify({id})
    }).then(res => res.json())
    .then(res => {
      if (res.status === "error") {
        dialog(res.message);
      } else {
        const heart = div.querySelector(".heart"), heartcount = div.querySelector(".heartcount");
        if (res.message === "hearted") {
          heart.innerText = "❤️";
          heartcount.innerText = Number(heartcount.innerText) + 1;
        } else {
          heart.innerText = "🖤";
          heartcount.innerText = Number(heartcount.innerText) - 1;
        }
      }
    })
  });
  return div;
};

const commentTemplate = function(id, author, content, date) {
  return createDiv(`<div class="comment" title="{{date}}" id="comment-{{id}}">
    <a href="/@{{author}}">@{{author}}</a>
    <hr>
    <div class="content">
      {{content}}
    </div>
  </div>`, {id, author, content: HTMLify(content, replacements), date}, false);
}

const errorBox = function(message) {
  return createDiv(`<div class="error">{{message}}<span style="cursor:pointer;" onclick="this.parentElement.parentElement.removeChild(this.parentElement)">✖</span></div>`, {message});
}
const successBox = function(message) {
  return createDiv(`<div class="success">{{message}}<span style="cursor:pointer;" onclick="this.parentElement.parentElement.removeChild(this.parentElement)">✖</span></div>`, {message});
}

let session = fetch("/session").then(res => res.json());
if ($("#sessioninfo")) {
  session.then(data => {
    if (!data.logged_in) $("#sessioninfo").innerHTML = "You are not signed in. <a href='/login'>Sign in here.</a>";
    else $("#sessioninfo").innerHTML = "<a href='/@" + data.username + "'>You are signed in as " + data.username + ".</a> <a href='/settings'>Settings</a> <a href='/logout'>Logout</a>";
  });
}

let createPost = createDiv(`<div class="bg-primary-500 text-white rounded-full h-16 w-16 flex items-center justify-center fixed bottom-4 right-4 cursor-pointer z-50"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="h-6 w-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg></div>`);
createPost.className = "createPost";
createPost.addEventListener("click", function() {
  window.location.replace("/new");
});

const addPostButton = () => session.then(res => {if (res.logged_in) document.body.append(createPost)});

export default {
  createDiv,
  $,
  postTemplate,
  commentTemplate,
  errorBox,
  successBox,
  session,
  addPostButton,
  dialog,
};
