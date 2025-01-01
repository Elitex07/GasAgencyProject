'use client';
import { useEffect, useState } from 'react';
import styles from './page.module.css';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [allBookings, setAllBookings] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [newBookingDate, setNewBookingDate] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [newAddress, setNewAddress] = useState('');
    const [selectedOption, setSelectedOption] = useState('personalInfo');
  
    useEffect(() => {
      const fetchUser = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }
  
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
  
        if (!res.ok) {
          localStorage.removeItem('token'); // Clear invalid token
          router.push('/login');
          return;
        }
  
        const data = await res.json();
        setUser(data.user);
        setAllBookings(data.allBookings);
        if (data.user.type === 'admin') {
            const usersRes = await fetch('/api/users', {
              headers: { Authorization: `Bearer ${token}` },
            });
            const usersData = await usersRes.json();
            setAllUsers(usersData.users);
        }

      };
  
      fetchUser();
    }, [router]);
  
    const handleLogout = () => {
      localStorage.removeItem('token');
      router.push('/login');
    };

    const handleCreateBooking = async () => {
        if (!user.address) {
            alert('Please provide a valid address before creating a booking.');
            return;
        }

        const token = localStorage.getItem('token');
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ bookedOn: newBookingDate }),
        });

        if (res.ok) {
          const data = await res.json();
          setUser((prevUser) => ({
            ...prevUser,
            bookings: [...prevUser.bookings, data.booking],
          }));
          setNewBookingDate('');
        }
    };

    const handleRoleChange = async (userId, newRole) => {
      const token = localStorage.getItem('token');
      await fetch(`/api/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      // Update user data
      setAllBookings((prevBookings) =>
        prevBookings.map((booking) =>
          booking.user._id === userId ? { ...booking, user: { ...booking.user, type: newRole } } : booking
        )
      );
    };

    const handleBookingStatusChange = async (bookingId, newStatus) => {
        const token = localStorage.getItem('token');
        await fetch(`/api/bookings/${bookingId}/update`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ delivered: newStatus }),
        });
    
        // Update booking data
        setAllBookings((prevBookings) =>
          prevBookings.map((booking) =>
            booking._id === bookingId ? { ...booking, delivered: newStatus } : booking
          )
        );
    };

    const handleUpdateUser = async () => {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/users/me', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ username: newUsername, address: newAddress }),
        });
    
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setNewUsername('');
          setNewAddress('');
        }
    };

    const handleAdminUpdateUser = async (userId, newAddress) => {
        const token = localStorage.getItem('token');
        await fetch(`/api/users/${userId}/address`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ address: newAddress }),
        });
    
        // Update user data
        setAllUsers((prevUsers) =>
          prevUsers.map((user) =>
            user._id === userId ? { ...user, address: newAddress } : user
          )
        );
    };

    if (!user) return <h1>Loading...</h1>;
  
    return (
        <div className={styles.container}>
        <nav className={styles.navbar}>
          <div className={styles.logo}>Gas Agency</div>
          <ul className={styles.navLinks}>
            <li className={styles.navItem} onClick={handleLogout}>Logout</li>
          </ul>
        </nav>
        <div className={styles.sidebar}>
          <button className={styles.sidebarButton} onClick={() => setSelectedOption('personalInfo')}>Personal Information</button>
          <button className={styles.sidebarButton} onClick={() => setSelectedOption('bookings')}>Bookings</button>
          {user.type === 'admin' && (
            <button className={styles.sidebarButton} onClick={() => setSelectedOption('manageUsers')}>Manage Users</button>
          )}
        </div>
        <div className={styles.content}>
          {selectedOption === 'personalInfo' && (
            <>
              <h2 className={styles.headings}>Welcome, {user.username}</h2>
              <div className={styles.form}>
                <h3 className={styles.headings}>Update Your Information</h3>
                <input
                  type="text"
                  placeholder="New Username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className={styles.input}
                />
                <input
                  type="text"
                  placeholder="New Address"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className={styles.input}
                />
                <button className={styles.button} onClick={handleUpdateUser}>Update</button>
              </div>
            </>
          )}
          {selectedOption === 'bookings' && (
            <>
              <h3 className={styles.headings}>Your Bookings:</h3>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Booked On</th>
                    <th>Delivered</th>
                  </tr>
                </thead>
                <tbody>
                  {user.bookings.map((booking) => (
                    <tr key={booking._id}>
                      <td>{new Date(booking.bookedOn).toLocaleDateString()}</td>
                      <td>{booking.delivered ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className={styles.form}>
                <h3 className={styles.headings}>Create a Booking</h3>
                <input
                  type="date"
                  value={newBookingDate}
                  onChange={(e) => setNewBookingDate(e.target.value)}
                  className={styles.input}
                />
                <button className={styles.button} onClick={handleCreateBooking}>Book Now</button>
              </div>
            </>
          )}
          {selectedOption === 'manageUsers' && user.type === 'admin' && (
            <>
              <h3 className={styles.headings}>Manage Users:</h3>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Address</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map((user) => (
                    <tr key={user._id}>
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td>
                        <input
                          type="text"
                          value={user.address}
                          onChange={(e) => handleAdminUpdateUser(user._id, e.target.value)}
                          className={styles.input}
                        />
                      </td>
                      <td>{user.type}</td>
                      <td>
                        <select
                          value={user.type}
                          onChange={(e) => handleRoleChange(user._id, e.target.value)}
                          className={styles.select}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    );
  }