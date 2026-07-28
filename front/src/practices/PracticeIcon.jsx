const icons = {
  target: <path d="M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9Zm0-4.2a4.8 4.8 0 1 0-4.8-4.8 4.8 4.8 0 0 0 4.8 4.8Zm0-3.1a1.7 1.7 0 1 0-1.7-1.7 1.7 1.7 0 0 0 1.7 1.7Z" />,
  database: <path d="M5 7c0-2 3.1-3.5 7-3.5S19 5 19 7s-3.1 3.5-7 3.5S5 9 5 7Zm0 5c0 2 3.1 3.5 7 3.5S19 14 19 12M5 17c0 2 3.1 3.5 7 3.5S19 19 19 17V7" />,
  edit: <path d="m4 20 4.7-1 10-10a2.2 2.2 0 0 0-3.1-3.1l-10 10L4 20Zm10.5-12.5 3 3M13 20h7" />,
  check: <path d="M20 6 9 17l-5-5" />,
  send: <path d="M21 3 10 14M21 3l-7 18-4-7-7-4 18-7Z" />,
  spark: <path d="M12 3l1.5 5L19 10l-5.5 2L12 17l-1.5-5L5 10l5.5-2L12 3Zm6 11 .7 2.2L21 17l-2.3.8L18 20l-.7-2.2L15 17l2.3-.8L18 14Z" />,
  copy: <path d="M8 8h11v11H8V8Zm-3 8V5h11" />,
  external: <path d="M14 4h6v6M13 11l7-7M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" />,
  sheet: <path d="M7 3h7l4 4v14H7V3Zm7 0v5h4M9.5 12h5M9.5 15h5M9.5 18h3" />,
  link: <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1m-1 9a5 5 0 0 1-7 0 5 5 0 0 1 0-7l2-2a5 5 0 0 1 7 0" />,
  play: <path d="m7 4 12 8-12 8V4Z" />,
  star: <path d="m12 3 2.7 5.9 6.3.7-4.7 4.4 1.3 6.4L12 17.2 6.4 20.4l1.3-6.4L3 9.6l6.3-.7L12 3Z" />,
  layers: <path d="m12 3 9 5-9 5-9-5 9-5Zm9 9-9 5-9-5m18 4-9 5-9-5" />,
  brain: <path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 1 5 3 3 0 0 0 4 3V4Zm6 0a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-1 5 3 3 0 0 1-4 3V4Z" />,
  ruler: <path d="M3 15 15 3l6 6L9 21l-6-6Zm4-2 2 2m1-5 2 2m1-5 2 2" />,
}

export default function PracticeIcon({ name }) {
  return (
    <svg className="practice-icon" viewBox="0 0 24 24" aria-hidden="true">
      {icons[name]}
    </svg>
  )
}
