const { newUser } = require("./helpers/testData");
const { register, login } = require("./helpers/authHelper");

describe("Auth API: POST /api/register and /api/login", () => {
  const user = newUser();

  describe("Register", () => {
    test("registers a new customer (201)", async () => {
      const res = await register(user);
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ message: "User registered successfully" });
    });

    test("rejects duplicate email (400)", async () => {
      const res = await register(user);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Email already in use");
    });

    // The app has no input validation, so these are expected to expose bugs.
    test.failing("rejects empty body with a 4xx, not 500 (validation)", async () => {
      const res = await register({});
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });

    test.failing("rejects missing password with a 4xx, not 500 (validation)", async () => {
      const res = await register({ name: "No Pass", email: newUser().email });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });

    test("ignores a self-assigned admin role (privilege escalation)", async () => {
      const evil = newUser({ role: "admin" });
      await register(evil);
      const res = await login(evil.email, evil.password);
      expect(res.status).toBe(200);
      expect(res.body.role).toBe("customer");
    });
  });

  describe("Login", () => {
    test("logs in with valid credentials (200)", async () => {
      const res = await login(user.email, user.password);
      expect(res.status).toBe(200);
      expect(typeof res.body.token).toBe("string");
      expect(res.body.token.split(".")).toHaveLength(3); // JWT format
      expect(res.body.role).toBe("customer");
      expect(res.body.userId).toBeDefined();
    });

    test("does not return the password in the response", async () => {
      const res = await login(user.email, user.password);
      expect(JSON.stringify(res.body)).not.toContain(user.password);
    });

    test("rejects wrong password (400)", async () => {
      const res = await login(user.email, "WrongPassword!");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid credentials");
    });

    test("rejects unknown email (400)", async () => {
      const res = await login(newUser().email, "whatever");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid credentials");
    });

    test("wrong password and unknown email give the same error (no user enumeration)", async () => {
      const a = await login(user.email, "WrongPassword!");
      const b = await login(newUser().email, "WrongPassword!");
      expect(a.body).toEqual(b.body);
    });

    test.failing("rejects missing password with a 4xx, not 500 (validation)", async () => {
      const res = await login(user.email, undefined);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });
  });
});

