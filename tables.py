import sqlite3

CLEAR_ALL = False

c = sqlite3.connect("db/users.db")
c.execute("CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, pwhash TEXT, salt TEXT, bio TEXT);")
c.execute("CREATE TABLE IF NOT EXISTS follows (follower TEXT, followed TEXT);")
if CLEAR_ALL:
  c.execute("DELETE FROM users;")
  c.execute("DELETE FROM follows;")
c.commit()
c.close()

c = sqlite3.connect("db/content.db")
c.execute("CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY, date TEXT, author TEXT, content TEXT);")
c.execute("CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY, date TEXT, parentId INTEGER, author TEXT, content TEXT);")
c.execute("CREATE TABLE IF NOT EXISTS hearts (parentId INTEGER, user TEXT);")
if CLEAR_ALL:
  c.execute("DELETE FROM posts;")
  c.execute("DELETE FROM comments;")
  c.execute("DELETE FROM hearts;")
c.commit()
c.close()

"""
Database Schema:

             users
username |  pwhash  |   salt   |   bio   |

             follows
follower | followed |

             posts
    id   |   date   |  author  | content |

             comments
    id   |   date   | parentId | author  | content

             hearts
parentId |   user   |
"""