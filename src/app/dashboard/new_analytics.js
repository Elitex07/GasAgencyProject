{
    selectedOption === 'analytics' && user.type === 'admin' && (
        <>
            <h3 className={styles.headings}>Analytics by Connection Type</h3>

            {/* Pipeline Section */}
            <div className={styles.statCard} style={{ display: 'block', marginBottom: '2rem' }}>
                <h4 className={styles.headings} style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#3498db' }}>Pipeline Usage by Area</h4>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Area</th>
                            <th>Customers</th>
                            <th>Total Usage</th>
                            <th>Revenue</th>
                        </tr>
                    </thead>
                    <tbody>
                        {usageStats.stats && usageStats.stats.pipeline ? (
                            Object.entries(usageStats.stats.pipeline).map(([area, stats]) => {
                                const maxUsage = Math.max(...Object.values(usageStats.stats.pipeline).map(s => s.totalUsage), 1);
                                const percentage = (stats.totalUsage / maxUsage) * 100;
                                return (
                                    <tr key={area}>
                                        <td>{area}</td>
                                        <td>{stats.customers}</td>
                                        <td style={{ minWidth: '200px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{stats.totalUsage} units</span>
                                                <div style={{
                                                    width: '100%',
                                                    height: '6px',
                                                    backgroundColor: '#ecf0f1',
                                                    borderRadius: '3px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <div style={{
                                                        width: `${percentage}%`,
                                                        height: '100%',
                                                        backgroundColor: '#3498db',
                                                        borderRadius: '3px',
                                                        transition: 'width 0.5s ease-in-out'
                                                    }}></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>₹{stats.totalCost.toLocaleString()}</td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr><td colSpan="4">No Pipeline data available</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Cylinder Section */}
            <div className={styles.statCard} style={{ display: 'block' }}>
                <h4 className={styles.headings} style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#e67e22' }}>Cylinder Bookings by Area</h4>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Area</th>
                            <th>Customers</th>
                            <th>Total Bookings</th>
                        </tr>
                    </thead>
                    <tbody>
                        {usageStats.stats && usageStats.stats.cylinder ? (
                            Object.entries(usageStats.stats.cylinder).map(([area, stats]) => {
                                const maxBookings = Math.max(...Object.values(usageStats.stats.cylinder).map(s => s.totalBookings), 1);
                                const percentage = (stats.totalBookings / maxBookings) * 100;
                                return (
                                    <tr key={area}>
                                        <td>{area}</td>
                                        <td>{stats.customers}</td>
                                        <td style={{ minWidth: '200px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{stats.totalBookings} bookings</span>
                                                <div style={{
                                                    width: '100%',
                                                    height: '6px',
                                                    backgroundColor: '#ecf0f1',
                                                    borderRadius: '3px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <div style={{
                                                        width: `${percentage}%`,
                                                        height: '100%',
                                                        backgroundColor: '#e67e22',
                                                        borderRadius: '3px',
                                                        transition: 'width 0.5s ease-in-out'
                                                    }}></div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr><td colSpan="3">No Cylinder data available</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    )
}
