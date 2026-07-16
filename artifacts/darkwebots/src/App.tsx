export default function App() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return (
    <iframe
      src={`${base}/app.html`}
      style={{
        width: '100vw',
        height: '100vh',
        border: 'none',
        display: 'block',
      }}
      title="DARKWEBOTS"
    />
  );
}
