// pages/LoginPage.jsx — port of login_screen.dart
//
// The Dart screen drove five AnimationControllers. Two of those are ambient
// loops (the gradient and the orbs) and they move whether or not React is
// looking, so they live in CSS keyframes — running them through state would
// re-render the whole tree sixty times a second for no reason. The three
// that respond to something (entrance stagger, error shake, button press)
// stay in JS, where framer-motion handles them.

import React, { useRef, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/Authcontext';
import { useToast } from '../components/Toast';
import Field from '../components/Field';
import '../styles/login.css';
import logo from "../assets/logo.jpeg"

const ORBS = [
  { rx: 0.12, ry: 0.10, r: 130, opacity: 0.07, dur: 8 },
  { rx: 0.88, ry: 0.22, r: 100, opacity: 0.05, dur: 11 },
  { rx: 0.72, ry: 0.78, r: 150, opacity: 0.06, dur: 6.5 },
  { rx: 0.08, ry: 0.82, r: 85, opacity: 0.04, dur: 9.5 },
];

/* The entrance the Dart Intervals described: logo springs, then the title,
   then the card, then the link. One parent variant, four children. */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.05 } },
};
const riseIn = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};
const dropIn = {
  hidden: { opacity: 0, y: -18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};
const popIn = {
  hidden: { opacity: 0, scale: 0.4, rotate: -9 },
  show: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { type: 'spring', stiffness: 260, damping: 14 },
  },
};

export default function LoginPage() {
  const { signIn } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  const shake = useAnimation();
  const formRef = useRef(null);

  const validate = () => {
    const next = {};
    if (!email.trim()) next.email = 'Enter your email address';
    if (!password) next.password = 'Enter your password';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const bumpShake = () => shake.start({
    x: [0, -9, 8, -6, 4, 0],
    transition: { duration: 0.42, ease: 'easeInOut' },
  });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) { bumpShake(); return; }

    setBusy(true);
    try {
      await signIn(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      bumpShake();
      toast.show(err.message.replace('Exception: ', ''), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="login-bg" aria-hidden="true" />
      <div className="login-orbs" aria-hidden="true">
        {ORBS.map((o, i) => (
          <span
            key={i}
            className="orb"
            style={{
              left: `${o.rx * 100}%`,
              top: `${o.ry * 100}%`,
              width: o.r * 2,
              height: o.r * 2,
              marginLeft: -o.r,
              marginTop: -o.r,
              '--orb-opacity': o.opacity,
              '--orb-dur': `${o.dur}s`,
            }}
          />
        ))}
      </div>
      <div className="login-hairline" aria-hidden="true" />

      <motion.div className="login-shell" animate={shake}>
        <motion.div
          className="login-stack"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <motion.div className="brand-mark" variants={popIn}>
            <img src={logo} alt="Saraswati Infra Logo" />
          </motion.div>

          <motion.div className="brand-title" variants={dropIn}>
            <h1>Saraswati Infra</h1>
            <span className="brand-tag">Real Estate Management</span>
          </motion.div>

          <motion.div className="login-card" variants={riseIn}>
            <div className="card-head">
              <span className="card-rule" />
              <div>
                <h2>Sign in</h2>
                <p>Welcome back. Use your work email.</p>
              </div>
            </div>

            <form ref={formRef} onSubmit={onSubmit} noValidate>
              <Field
                id="login-email"
                label="Email address"
                type="email"
                autoComplete="username"
                icon="mail"
                value={email}
                onChange={setEmail}
                error={errors.email}
              />

              <Field
                id="login-password"
                label="Password"
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                icon="lock"
                value={password}
                onChange={setPassword}
                error={errors.password}
                trailing={(
                  <button
                    type="button"
                    className="peek"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? '🙈' : '👁'}
                  </button>
                )}
              />

              <button type="submit" className="cta" disabled={busy}>
                <span className="cta-shimmer" aria-hidden="true" />
                <span className="cta-label">
                  {busy ? 'Signing in…' : 'Sign in'}
                </span>
              </button>
            </form>
          </motion.div>

          <motion.div variants={riseIn}>
            <Link className="register-link" to="/register">
              New employee? Register here
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}