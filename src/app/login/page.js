'use client';
import React, { useState } from 'react';
import styles from '../../styles/login.module.css';
import { useRouter } from 'next/navigation';
import CustomAlert from '../CustomAlert';
import Link from 'next/link';

export default function Login() {
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [form, setForm] = useState({ email: '', password: '' });
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (data.message == 'Invalid credentials') {
      setAlertMessage(`Invalid Credentials`);
      setShowAlert(true);
      return;
    }
    if (res.ok) {
      localStorage.setItem('token', data.token);
      router.push('/dashboard');
    };
  };

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h2 className={styles.title}>Login</h2>
        <label className={styles.label}>
          Email
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={styles.input}
          />
        </label>
        <label className={styles.label}>
          Password
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className={styles.input}
          />
        </label>
        <button type="submit" className={styles.button}>Login</button>

        <p className={styles.text}>
          New to Gas agency? <Link href="/register">Sign Up</Link>
        </p>
      </form>
      {showAlert && <CustomAlert message={alertMessage} onClose={() => setShowAlert(false)} />}
    </div>
  );
}