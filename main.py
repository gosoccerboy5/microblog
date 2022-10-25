import os, bcrypt, re, sqlite3, json, time
from flask import Flask, request, session, render_template, jsonify, redirect
import tables

app = Flask(__name__)

app.secret_key = os.urandom(24).hex()

def sanitize(string):
  return string.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br>")
def get_date():
  return round(time.time() * 1000)
def error(msg):
  return {"status": "error", "message": msg}
def success(msg):
  return {"status": "success", "message": msg}

@app.get('/')
def index():
  return render_template("home.html")

@app.get("/about")
def about():
  return render_template("about.html")

@app.get("/login")
def login_page():
  return render_template("login.html")

@app.get("/new")
def create_post_page():
  return render_template("new.html")

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.get("/settings")
def settings_page():
  if "username" in session:
    c = sqlite3.connect("db/users.db")
    bio = c.execute("SELECT bio FROM users WHERE username = ?;", (session["username"], )).fetchone()[0]
    c.close()
    return render_template("settings.html", bio=bio)
  return error("Settings page request invalid: not signed in"), 403

@app.post("/set_settings")
def set_settings():
  if not "username" in session:
    return error("Settings failure: not signed in"), 403
  bio = request.get_json()["bio"]
  if type(bio) != str or len(bio) > 500:
    return error("Settings failure: bio invalid (too long)"), 400
  c = sqlite3.connect("db/users.db")
  c.execute("UPDATE users SET bio = ? WHERE username = ?;", (bio, session["username"]))
  c.commit()
  c.close()
  return success("Settings successfully updated"), 200

@app.get("/@<user>")
def user_page(user):
  c = sqlite3.connect("db/users.db")
  data = c.execute("SELECT * FROM users WHERE username = ?;", (user, )).fetchone()
  c.close()
  if data == None:
    return error("User does not exist"), 404
  return render_template("user.html", username=user, bio=data[3])

@app.get("/post/<post>")
def post_viewer(post):
  c = sqlite3.connect("db/content.db")
  exists = int(c.execute("SELECT COUNT(*) FROM posts WHERE id = ?;", (post, )).fetchone()[0]) > 0
  c.close()
  return render_template("post.html") if exists else render_template("404.html")

@app.get('/session')
def check_session():
  try:
    username = session['username']
    return {'username': username, 'logged_in': True}
  except KeyError:
    return {'logged_in': False, 'username': None}

@app.get("/@<user>/followers")
def followers(user):
  c = sqlite3.connect("db/users.db")
  data = [r[0] for r in c.execute("SELECT follower FROM follows WHERE followed = ?;", (user, )).fetchall()]
  c.close()
  if request.args.get("json") == "true":
    return data
  return render_template("followers.html", names=json.dumps(data))

@app.get("/@<user>/following")
def following(user):
  c = sqlite3.connect("db/users.db")
  data = [r[0] for r in c.execute("SELECT followed FROM follows WHERE follower = ?;", (user, )).fetchall()]
  c.close()
  if request.args.get("json") == "true":
    return data
  return render_template("following.html", names=json.dumps(data))

@app.get("/logout")
def logout():
  session.clear()
  return redirect("/")

@app.get("/postdata/<post>")
def postdata(post):
  did_heart = False
  c = sqlite3.connect("db/content.db")
  post_data = c.execute("SELECT * FROM posts WHERE id = ?;", (post, )).fetchone()
  hearts = c.execute("SELECT COUNT(DISTINCT user) FROM hearts WHERE parentId = ?;", (post, )).fetchone()[0]
  comments = c.execute("SELECT * FROM comments WHERE parentId = ? ORDER BY id;", (post, )).fetchall()
  if "username" in session and int(c.execute("SELECT COUNT(*) FROM hearts WHERE user = ? AND parentId = ?;", (session["username"],post_data[0])).fetchone()[0]) > 0:
    did_heart = True
  c.close()
  data = {
    "author": post_data[2],
    "content": post_data[3],
    "date": post_data[1],
    "hearts": hearts,
    "hearted": did_heart,
    "comments": [{"id": cmnt[0], "date": cmnt[1], "author": cmnt[3], "content": cmnt[4]} for cmnt in comments],
  }
  return data

@app.get("/posts")
def get_posts():
  user = request.args.get("from") or "all"
  sort = request.args.get("sort") or "recent"
  count = request.args.get("count") or "10000000000"
  start = request.args.get("start") or "0"
  c = sqlite3.connect("db/content.db")
  all_hearts = []
  if "username" in session:
    all_hearts = [row[0] for row in c.execute("SELECT parentId FROM hearts WHERE user = ?;", (session["username"], )).fetchall()]
  posts = []
  order_by = "(SELECT COUNT(DISTINCT user) FROM hearts h WHERE h.parentId = id)" if sort == "top" else "id"
  if user == "all":
    posts = c.execute(f"SELECT * FROM posts ORDER BY {order_by} DESC LIMIT ?, ?;", (start, count)).fetchall()
  elif user == "following" and "username" in session:
    c.execute("ATTACH DATABASE 'db/users.db' AS user_stuff;")
    posts = c.execute(f"SELECT * FROM posts WHERE author IN (SELECT followed FROM user_stuff.follows f WHERE f.follower = ?) ORDER BY {order_by} DESC LIMIT ?, ?;", (session["username"], start, count))
  elif user[0] == "@":
    posts = c.execute(f"SELECT * FROM posts WHERE author = ? ORDER BY {order_by} DESC LIMIT ?, ?;", (user[1:], start, count)).fetchall()
  else:
    return error("Post feed error: invalid request"), 400
  posts = [{"id": post[0], "date": post[1], "author": post[2], "content": post[3], "hearts": c.execute("SELECT COUNT(DISTINCT user) FROM hearts WHERE parentId = ?;", (post[0], )).fetchone()[0], "hearted": post[0] in all_hearts, "comments": c.execute("SELECT COUNT(*) FROM comments WHERE parentId = ?;", (post[0], )).fetchone()[0]} for post in posts]
  c.close()
  return jsonify(posts)

@app.post("/createpost")
def create_post():
  rq_json = request.get_json()
  if not "username" in session:
    return error("Post creation failure: not signed in"), 400
  username = session["username"]
  content = rq_json["content"]
  if type(content) != str:
    return error("Post creation failure: content must be a string"), 400
  content = content.strip()
  if len(content) == 0:
    return error("Post creation failure: post cannot be empty"), 400
  if len(content) > 500:
    return error("Post creation failure: post invalid (length may be too long"), 400
  if content.count("\n") >= 10:
    return error("Post creation failure: exceeds max linebreak limit")
  c = sqlite3.connect("db/content.db")
  id = int(c.execute("SELECT max(id) FROM posts;").fetchone()[0] or 0) + 1
  c.execute("INSERT INTO posts VALUES (?, ?, ?, ?);", (id, get_date(), username, sanitize(content)))
  c.commit()
  c.close()
  return success(f"/post/{id}"), 200

@app.post("/followaction")
def followaction():
  if not "username" in session:
    return error("Follow failure: you are not signed in"), 400
  to_follow = request.get_json()["username"]
  username = session["username"]
  c = sqlite3.connect("db/users.db")
  already_following = int(c.execute("SELECT COUNT(*) FROM follows WHERE follower = ? AND followed = ?;", (username, to_follow)).fetchone()[0]) > 0
  if not already_following:
    c.execute("INSERT INTO follows VALUES (?, ?);", (username, to_follow))
  else:
    c.execute("DELETE FROM follows WHERE follower = ? AND followed = ?;", (username, to_follow))
  c.commit()
  c.close()
  return success("unfollowed" if already_following else "followed"), 200

@app.post("/heartaction")
def heartaction():
  if not "username" in session:
    return error("Heart failure: you are not signed in"), 400
  postId = request.get_json()["id"]
  username = session["username"]
  c = sqlite3.connect("db/content.db")
  if c.execute("SELECT COUNT(*) FROM posts WHERE id = ?;", [postId]).fetchone()[0] == 0:
    c.close()
    return error("Heart failure: post does not exist")
  if session["username"] == c.execute("SELECT author FROM posts WHERE id = ?;", [postId]).fetchone()[0]:
    c.close()
    return error("Heart failure: you cannot heart your own post")
  has_hearted = c.execute("SELECT COUNT(*) FROM hearts WHERE parentId = ? AND user = ?;", (postId, username)).fetchone()[0] > 0
  if has_hearted:
    c.execute("DELETE FROM hearts WHERE parentId = ? and user = ?;", (postId, username))
  else:
    c.execute("INSERT INTO hearts VALUES (?, ?);", (postId, username))
  c.commit()
  c.close()
  return success("unhearted" if has_hearted else "hearted"), 200
  
@app.post("/createcomment")
def create_comment():
  print("here?")
  rq_json = request.get_json()
  if not "username" in session:
    return error("Comment creation failure: not signed in"), 400
  content = rq_json["content"]
  date = get_date()
  author = session["username"]
  parentId = rq_json["parentId"]
  if type(content) != str:
    return error("Comment creation failure: content must be a string"), 400
  content = content.strip()
  if len(content) == 0:
    return error("Comment creation failure: comment cannot be empty"), 400
  if len(content) > 200:
    return error("Comment creation failure: comment invalid (length may be too long"), 400
  if content.count("\n") >= 5:
    return error("Comment creation failure: exceeds max linebreak limit"), 400
  c = sqlite3.connect("db/content.db")
  if c.execute("SELECT COUNT(id) FROM posts WHERE id = ?;", [parentId]).fetchone()[0] != 1:
    c.close()
    return error("Comment creation failure: parent post does not exist"), 400
  id = int(c.execute("SELECT MAX(id) FROM comments;").fetchone()[0] or 0) + 1
  c.execute("INSERT INTO comments VALUES (?, ?, ?, ?, ?);", (id, date, parentId, author, sanitize(content)))
  c.commit()
  c.close()
  return success(f"/post/{parentId}#comment-{id}"), 200

@app.post("/signup")
def signup():
  rq_json = request.get_json()
  username = rq_json["username"]
  password = rq_json["password"]
  if not re.compile("^[\w-]{3,20}$").fullmatch(username):
    return error("Signup failure: username must be 3-20 characters long and made of only underscores, dashes, numbers, and letters"), 400
  if len(password) < 5:
    return error("Signup failure: password should be over 5 characters long for security"), 400
  c = sqlite3.connect("db/users.db")
  if c.execute("SELECT * FROM users WHERE username = ?;", (username, )).fetchone() is not None:
    c.close()
    return error("Signup failure: username already exists"), 400
  salt = bcrypt.gensalt()
  hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
  c.execute("INSERT INTO users VALUES(?, ?, ?, \"No bio provided.\");", (username, hashed.decode("utf-8"), salt.decode("utf-8")))
  c.commit()
  c.close()
  session["username"] = username
  return success("Successfully signed up!"), 200
  
@app.post("/login")
def login():
  rq_json = request.get_json()
  username = rq_json["username"]
  password = rq_json["password"]
  c = sqlite3.connect("db/users.db")
  user_data = c.execute("SELECT * FROM users WHERE username = ?;", (username, )).fetchone()
  c.close()
  if user_data == None:
    return error("Login failure: username not found"), 400
  if bcrypt.hashpw(password.encode("utf-8"), user_data[2].encode("utf-8")).decode("utf-8") != user_data[1]:
    return error("Login failure: password incorrect"), 400
  session["username"] = username
  return success("Login successful!"), 200

if __name__ == "__main__":
  app.run(host='0.0.0.0', port=3000)
