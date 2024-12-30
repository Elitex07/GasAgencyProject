"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function LandingPage() {
  const [hover, setHover] = useState(false);
  const router = useRouter();

  const handleSignUp = () => {
    console.log("Sign up clicked");
    router.push("/register");
  };

  return (
    <div className={styles.container}>
      <nav className={styles.navbar}>
        <div className={styles.logo}>Gas Agency</div>
        <ul className={styles.navLinks}>
          <li className={styles.navItem2} onClick={handleSignUp}>Sign Up</li>
          <li className={styles.navItem}>Sign In</li>
        </ul>
      </nav>
      <main className={styles.mainContent}>
        <h1
          className={styles.title}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          Welcome to Gas Agency
        </h1>
        <p className={styles.description}>
          Experience seamless gas delivery services right to your doorstep, anytime, with just a single click.
        </p>
        <button
          className={`${styles.ctaButton} ${hover ? styles.ctaHover : ""}`}
        >
          Book Now
        </button>
        <button
          className={`${styles.signupButton} ${hover ? styles.signupHover : ""}`}
          onClick={handleSignUp}
        >
          Sign up
        </button>
      </main>
    </div>
  );
}
