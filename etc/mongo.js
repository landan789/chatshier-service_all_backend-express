use chatshier;
db.createUser(
  {
    user: "chsr",
    pwd: "0be44b96e3decd6a6b30cdb30c126089",
    roles: [ { role: "readWrite", db: "chatshier" } ]
  }
);