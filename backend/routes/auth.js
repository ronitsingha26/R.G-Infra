import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';
import { sendMail } from '../utils/mailer.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'abc_construction_secret';

function createTemporaryPassword() {
  return `RGI-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function forgotPasswordEmail({ name, userId, password }) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <div style="max-width:620px;margin:28px auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
    <div style="padding:22px 28px;background:#111827;color:#ffffff;">
      <div style="font-size:22px;font-weight:800;letter-spacing:.08em;">R.G INFRA</div>
      <div style="margin-top:6px;color:#fbbf24;font-size:12px;font-weight:700;letter-spacing:.18em;">ADMIN PORTAL ACCESS</div>
    </div>
    <div style="padding:26px 28px;">
      <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">Dear <strong>${name || 'Admin'}</strong>,</p>
      <p style="font-size:14px;line-height:1.65;margin:0 0 18px;">
        Your password reset request has been processed. Please use the credentials below to sign in.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
        <tr>
          <td style="width:140px;border:1px solid #e5e7eb;background:#f9fafb;padding:12px;font-weight:700;">User ID</td>
          <td style="border:1px solid #e5e7eb;padding:12px;font-weight:800;letter-spacing:.04em;">${userId}</td>
        </tr>
        <tr>
          <td style="border:1px solid #e5e7eb;background:#f9fafb;padding:12px;font-weight:700;">Temporary Password</td>
          <td style="border:1px solid #e5e7eb;padding:12px;font-weight:800;color:#b45309;letter-spacing:.04em;">${password}</td>
        </tr>
      </table>
      <p style="font-size:13px;line-height:1.6;margin:18px 0 0;color:#4b5563;">
        For security, change this password from Settings after login.
      </p>
    </div>
  </div>
</body>
</html>`;
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { userId, password } = req.body;
    if (!userId || !password) {
      return res.status(400).json({ error: 'User ID and password are required' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE user_id = ?', [userId]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid user ID and password' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid user ID and password' });

    const token = jwt.sign(
      { id: user.id, userId: user.user_id, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, userId: user.user_id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { userIdOrEmail } = req.body;
    if (!userIdOrEmail?.trim()) {
      return res.status(400).json({ error: 'User ID or email is required' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM users WHERE user_id = ? OR email = ? LIMIT 1',
      [userIdOrEmail.trim(), userIdOrEmail.trim()]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];
    const temporaryPassword = createTemporaryPassword();
    const hash = await bcrypt.hash(temporaryPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hash, user.id]);

    const to = user.email;
    if (!to) {
      return res.status(500).json({ error: 'No email configured for this user' });
    }

    const result = await sendMail({
      to,
      subject: 'R.G INFRA — Your user ID and temporary password',
      html: forgotPasswordEmail({
        name: user.name,
        userId: user.user_id,
        password: temporaryPassword,
      }),
    });

    if (!result.success) {
      return res.status(500).json({ error: result.reason || 'Unable to send password email' });
    }

    res.json({ message: `User ID and temporary password sent to ${to}` });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, user_id, name, email, role FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const u = rows[0];
    res.json({ id: u.id, userId: u.user_id, name: u.name, email: u.email, role: u.role });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/auth/profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim();

    if (!name) return res.status(400).json({ error: 'Name is required' });
    if (!email) return res.status(400).json({ error: 'Email is required for password recovery' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1',
      [email, req.user.id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email is already used by another user' });
    }

    await pool.query('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, req.user.id]);
    const [rows] = await pool.query('SELECT id, user_id, name, email, role FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const u = rows[0];
    res.json({ id: u.id, userId: u.user_id, name: u.name, email: u.email, role: u.role });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/auth/password
router.put('/password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id]);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
