'use client';
import { useState } from 'react';
import styles from './page.module.css';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CustomAlert from '../CustomAlert';

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const router = useRouter();
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if(data.message == 'User already exists') {
      setAlertMessage(`Email already in use`);
      setShowAlert(true);
      router.push('/login');
      return;
    }
    alert(data.message);
  };

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h2 className={styles.title}>Register</h2>
        <label className={styles.label}>
          Username
          <input
            type="text"
            name="username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className={styles.input}
          />
        </label>
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
        <button type="submit" className={styles.button}>Register</button>

        <p className={styles.text}>
        Already registered? <Link href="/login">Sign In</Link>
        </p>
      </form>
      {showAlert && <CustomAlert message={alertMessage} onClose={() => setShowAlert(false)} />}
    </div>
  );
}
