// pages/RegisterEmployeePage.jsx — port of register_employee_screen.dart
//
// Same fields and the same validation rules the Dart form ran. On success
// it routes back to the login screen rather than popping a Navigator, and
// the new account lands with isAccessGranted:false, so the copy says so
// plainly instead of the old "Registration successful! Please login."

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';

import { registerEmployee } from '../services/Authservice';
import { useToast } from '../components/Toast';
import Field from '../components/Field';
import '../styles/login.css';

export default function RegisterEmployeePage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirm: '',
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Enter your full name';
    if (!form.email.trim()) next.email = 'Enter your email address';
    else if (!form.email.includes('@')) next.email = 'That email address looks incomplete';
    if (form.password.length < 6) next.password = 'Use at least 6 characters';
    if (form.confirm !== form.password) next.confirm = 'Both passwords must match';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setBusy(true);
    try {
      await registerEmployee({
        email: form.email,
        name: form.name,
        groupName: '',
        password: form.password,
      });
      toast.show('Account created. An admin will grant access shortly.', 'success');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.show(err.message.replace('Exception: ', ''), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="login-bg" aria-hidden="true" />
      <div className="login-hairline" aria-hidden="true" />

      <div className="login-shell">
        <motion.div
          className="login-stack"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link className="back-link" to="/login">← Back to sign in</Link>

          <div className="login-card">
            <div className="card-head">
              <span className="card-rule" />
              <div>
                <h2>Create your account</h2>
                <p>An admin approves new accounts before first sign-in.</p>
              </div>
            </div>

            <form onSubmit={onSubmit} noValidate>
              <Field
                id="reg-name"
                label="Full name"
                icon="person"
                autoComplete="name"
                value={form.name}
                onChange={set('name')}
                error={errors.name}
              />
              <Field
                id="reg-email"
                label="Email address"
                type="email"
                icon="mail"
                autoComplete="email"
                value={form.email}
                onChange={set('email')}
                error={errors.email}
              />
              <Field
                id="reg-password"
                label="Password"
                type="password"
                icon="lock"
                autoComplete="new-password"
                value={form.password}
                onChange={set('password')}
                error={errors.password}
              />
              <Field
                id="reg-confirm"
                label="Confirm password"
                type="password"
                icon="lock"
                autoComplete="new-password"
                value={form.confirm}
                onChange={set('confirm')}
                error={errors.confirm}
              />

              <button type="submit" className="cta" disabled={busy}>
                <span className="cta-shimmer" aria-hidden="true" />
                <span className="cta-label">
                  {busy ? 'Creating account…' : 'Create account'}
                </span>
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}