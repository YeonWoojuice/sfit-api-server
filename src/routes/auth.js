const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Secret keys (should be in .env in production)
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "access_secret";
const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || "refresh_secret";

// Helper: Generate Tokens
function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    ACCESS_TOKEN_SECRET,
    { expiresIn: "1h" }
  );
  const refreshToken = jwt.sign(
    { id: user.id, nonce: Math.random() },
    REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );
  return { accessToken, refreshToken };
}

// Check Username
router.post("/check-username", async (req, res) => {
  let { username } = req.body;
  const { ID, loginID } = req.body;

  if (ID) username = ID;
  if (loginID) username = loginID;

  if (!username) {
    return res.status(400).json({ message: "Username is required" });
  }

  try {
    const userCheck = await pool.query(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );
    if (userCheck.rows.length > 0) {
      return res
        .status(409)
        .json({ available: false, message: "이미 사용 중인 아이디입니다." });
    }
    res
      .status(200)
      .json({ available: true, message: "사용 가능한 아이디입니다." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Register
router.post("/register", async (req, res) => {
  // Support both backend standard and frontend specific fields
  let { username, password, name, phone, email } = req.body;
  const { ID, Password, Name, phonenumber, Email, EmailDomain } = req.body;

  // Map frontend fields if present
  if (ID) username = ID;
  if (Password) password = Password;
  if (Name) name = Name;
  if (phonenumber) phone = phonenumber;
  if (Email && EmailDomain) email = `${Email}@${EmailDomain}`;

  console.log("Register attempt:", username);

  if (!username || !password || !name || !phone || !email) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Check if user exists
    const userCheck = await pool.query(
      "SELECT id FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );
    if (userCheck.rows.length > 0) {
      return res
        .status(409)
        .json({ message: "Username or email already exists" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    const newUser = await pool.query(
      `INSERT INTO users (username, password_hash, name, phone, email) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id, username, role`,
      [username, passwordHash, name, phone, email]
    );

    res
      .status(201)
      .json({ message: "User registered successfully", user: newUser.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Login
router.post("/login", async (req, res) => {
  // Support both backend standard and frontend specific fields
  let { username, password } = req.body;
  const { loginID, loginPassword } = req.body;

  // Map frontend fields if present
  if (loginID) username = loginID;
  if (loginPassword) password = loginPassword;

  console.log("Login attempt:", username);

  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);
    const user = result.rows[0];

    if (!user) {
      console.log("User not found");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log("User found, checking password...");
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      console.log("Invalid password");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log("Password valid, generating tokens...");
    const { accessToken, refreshToken } = generateTokens(user);

    console.log("Hashing refresh token...");
    const rtHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    console.log("Saving refresh token...");
    await pool.query(
      `INSERT INTO auth_tokens (user_id, refresh_token_hash, expires_at) 
       VALUES ($1, $2, $3)`,
      [user.id, rtHash, expiresAt]
    );

    console.log("Login successful");
    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Refresh Token
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.sendStatus(401);

  try {
    // Verify JWT first
    const payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

    // Check if token exists in DB (and not revoked)
    const tokens = await pool.query(
      "SELECT * FROM auth_tokens WHERE user_id = $1 AND revoked_at IS NULL",
      [payload.id]
    );
    let validTokenRecord = null;

    for (const record of tokens.rows) {
      if (await bcrypt.compare(refreshToken, record.refresh_token_hash)) {
        validTokenRecord = record;
        break;
      }
    }

    if (!validTokenRecord) return res.sendStatus(403);

    // Refresh Token Rotation
    // 1. Revoke the old refresh token
    await pool.query("UPDATE auth_tokens SET revoked_at = $1 WHERE id = $2", [
      new Date(),
      validTokenRecord.id,
    ]);

    // 2. Generate new tokens
    const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [
      payload.id,
    ]);
    const user = userResult.rows[0];
    const newTokens = generateTokens(user);

    // 3. Save new refresh token
    const rtHash = await bcrypt.hash(newTokens.refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await pool.query(
      `INSERT INTO auth_tokens (user_id, refresh_token_hash, expires_at) 
       VALUES ($1, $2, $3)`,
      [user.id, rtHash, expiresAt]
    );

    // 4. Return both tokens
    res.json({
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
    });
  } catch (err) {
    console.error(err);
    return res.sendStatus(403);
  }
});

// Logout
router.post("/logout", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.sendStatus(204);

  try {
    // Find and revoke
    // We need to decode to get user_id to narrow down search
    const payload = jwt.decode(refreshToken);
    if (payload && payload.id) {
      const tokens = await pool.query(
        "SELECT * FROM auth_tokens WHERE user_id = $1",
        [payload.id]
      );
      for (const record of tokens.rows) {
        if (await bcrypt.compare(refreshToken, record.refresh_token_hash)) {
          await pool.query(
            "UPDATE auth_tokens SET revoked_at = NOW() WHERE id = $1",
            [record.id]
          );
          break;
        }
      }
    }
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.sendStatus(204); // Always return success for logout
  }
});

// Me
// Get user profile
router.get("/me", async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);

  try {
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET);
    const result = await pool.query(
      "SELECT id, username, name, email, role, phone, created_at FROM users WHERE id = $1",
      [payload.id]
    );
    if (result.rows.length === 0) return res.sendStatus(404);
    res.json(result.rows[0]);
  } catch (err) {
    return res.sendStatus(403);
  }
});

module.exports = router;
