const $ = document.querySelector.bind(document);

function HTMLify(text, r={"b":"b","i":"i","strikethrough":"s"}) {
  let newText = text;
  //images
  newText = newText.replaceAll(/\[img](https?:\/\/\w+(\.\w+)+(\/[^ ]*)?)\[\/img]/g, "<img src='$1' style='max-width:90%'>");
  // Urls
  newText = newText.replaceAll(/\[url=(https?:\/\/\w+(?:\.\w+)+(?:\/[^ ]*)?)\](.*?)\[\/url\]/g, "<a href='$1'>$2</a>");
  console.log(newText)
  // @ symbol
  newText = newText.replaceAll(/(\s|^)(@\w+)/g, "$1<a href='/$2'>$2</a>");
  // BBCode
  newText = newText.replaceAll(/\[\/?(\w+?)\]/g, s => {
    let tag = s.slice(1, s.length - 1);
    if (s[1] == "/") tag = tag.slice(1);
    return r[tag] ? `<${s[1] === "/" ? "/" : ""}${r[tag]}>` : "";
  });
  return newText;
}

const createElement = function(innerHtml, replacements, sanitize=true) {
  const div = document.createElement("div");
  div.innerHTML = innerHtml.replaceAll(/(?:[^\\](\\\\)*)(\{\{\w+}})/g, function(match) {
    let value = String(replacements[match.slice(3, match.length - 2)]) ?? "";
    return match.replace(/\{\{(\w+)}}/, n => sanitize ? value.replaceAll("&", "&amp;", ">", "&gt;", "<", "&lt;") : value);
  });
  return div.children[0];
}

const dialog = function(message) {
  let div = createElement(`<div><button class="ok">✖</button><div>Alert</div><hr><span>{{message}}</span><div>`, {message});
  div.className = "dialog";
  document.body.append(div);
  document.body.className = "has-modal";
  return new Promise(resolve => {
    div.querySelector(".ok").addEventListener("click", function() {
      div.parentElement.removeChild(div);
      document.body.className = document.body.className.replace(/\bhas-modal\b/, "");
      resolve();
    });
  });
};

const postTemplate = function(id, author, content, date, hearts, hearted, comments) {
  let div = createElement(`<div class="post" title="{{date}}">
    <a href="/@{{author}}">@{{author}}</a>
    <hr>
    <div class="content">
      {{content}}
    </div>
    <hr>
    <span class="hearts" title="Likes"><span class="heart">🖤</span> <span class="heartcount">{{hearts}}</span></span>
    <span class="comments" title="Comments">💬 {{comments}}</span>
  </div>`, {author, content: HTMLify(content), hearts, date, id, comments}, false);
  if (hearted) div.querySelector(".heart").innerText = "❤️";
  div.addEventListener("click", function(event) {
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
  return createElement(`<div class="comment" title="{{date}}" id="comment-{{id}}">
    <a href="/@{{author}}">@{{author}}</a>
    <hr>
    <div class="content">
      {{content}}
    </div>
  </div>`, {id, author, content: HTMLify(content), date}, false);
}

const errorBox = function(message) {
  return createElement(`<div class="error">{{message}}<span style="cursor:pointer;" onclick="this.parentElement.parentElement.removeChild(this.parentElement)">✖</span></div>`, {message});
}
const successBox = function(message) {
  return createElement(`<div class="success">{{message}}<span style="cursor:pointer;" onclick="this.parentElement.parentElement.removeChild(this.parentElement)">✖</span></div>`, {message});
}

let session = fetch("/session").then(res => res.json());
if ($("#sessioninfo")) {
  session.then(data => {
    if (!data.logged_in) $("#sessioninfo").innerHTML = "You are not signed in. <a href='/login'>Sign in here.</a>";
    else $("#sessioninfo").innerHTML = "<a href='/@" + data.username + "'>You are signed in as " + data.username + ".</a> <a href='/settings'>Settings</a> <a href='/logout'>Logout</a>";
  });
}

let createPost = createElement(`<div class="bg-primary-500 text-white rounded-full h-16 w-16 flex items-center justify-center fixed bottom-4 right-4 cursor-pointer z-50"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="h-6 w-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg></div>`);
createPost.className = "createPost";
createPost.addEventListener("click", function() {
  window.location.replace("/new");
});

const addPostButton = () => session.then(res => {if (res.logged_in) document.body.append(createPost)});

export default {
  createElement,
  $,
  postTemplate,
  commentTemplate,
  errorBox,
  successBox,
  session,
  addPostButton,
  dialog,
  HTMLify,
};
