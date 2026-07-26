// --- 5. GRÁFICAS ---
const initCharts = () => {
    Chart.defaults.font.family = "'-apple-system', 'SF Pro Display', 'Poppins', sans-serif";
    Chart.defaults.color = 'rgba(255, 255, 255, 0.6)';

    new Chart(document.getElementById('safetyChart').getContext('2d'), {
        type: 'bar',
        data: { labels: ['Public', 'Taxis', 'Apps', 'Taylor'], datasets: [{ data: [15, 30, 65, 99], backgroundColor: ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.2)', 'rgba(255,255,255,0.4)', '#FFFFFF'], borderRadius: 16 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { display: false } }, x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.8)', font: { size: 14 } } } } }
    });
};
