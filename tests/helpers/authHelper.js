const api = require("./client");
const { newUser } = require("./testData");

exports.register = (user) => api.post("/api/register").send(user);

exports.login = (email, password) =>
  api.post("/api/login").send({ email, password });

// Registers a fresh customer and logs in. Returns { user, token, userId }.
exports.createLoggedInUser = async () => {
  const user = newUser();
  await exports.register(user);
  const res = await exports.login(user.email, user.password);
  return { user, token: res.body.token, userId: res.body.userId };
};

exports.loginAsAdmin = async () => {
  const res = await exports.login(
    process.env.ADMIN_EMAIL,
    process.env.ADMIN_PASSWORD
  );
  return { token: res.body.token, userId: res.body.userId };
};

exports.bearer = (token) => ({ Authorization: `Bearer ${token}` });
