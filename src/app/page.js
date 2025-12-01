"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../styles/home.module.css";

export default function LandingPage() {
  const router = useRouter();

  const handleSignUp = () => {
    router.push("/register");
  };
  const handleSignIn = () => {
    router.push("/login");
  };

  return (
    <div className={styles.container}>
      <nav className={styles.navbar}>
        <div className={styles.logo}>Gas Agency</div>
        <ul className={styles.navLinks}>
          <li className={styles.navItem2} onClick={handleSignUp}>Sign Up</li>
          <li className={styles.navItem} onClick={handleSignIn}>Sign In</li>
        </ul>
      </nav>
      <main className={styles.mainContent}>
        <h1 className={styles.title}>
          Welcome to Gas Agency
        </h1>
        <p className={styles.description}>
          Experience seamless gas delivery services right to your doorstep, anytime, with just a single click.
        </p>
        <div className={styles.heroButtons}>
          <button
            className={styles.ctaButton}
            onClick={handleSignIn}
          >
            Book Now
          </button>
          <button
            className={styles.signupButton}
            onClick={handleSignUp}
          >
            Sign up
          </button>
        </div>

        <div className={styles.servicesSection}>
          <h2 className={styles.sectionTitle}>Get a New Connection</h2>
          <div className={styles.serviceCards}>
            <div className={styles.card}>
              <div className={styles.cardIcon}>🔥</div>
              <h3>LPG Cylinder</h3>
              <p>Reliable cylinder delivery for your home cooking needs.</p>
              <button className={styles.cardButton} onClick={() => router.push('/register?type=Cylinder')}>Apply for Cylinder</button>
            </div>
            <div className={styles.card}>
              <div className={styles.cardIcon}>🔧</div>
              <h3>Piped Gas (PNG)</h3>
              <p>Continuous gas supply through pipeline. No booking hassles.</p>
              <button className={styles.cardButton} onClick={() => router.push('/register?type=Pipeline')}>Apply for Pipeline</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
