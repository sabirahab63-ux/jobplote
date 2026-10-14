export default function StatusBadge({
  status,
}) {
  const classes = {
    Applied: "status-applied",
    Shortlisted: "status-shortlisted",
    Hired: "status-hired",
    Rejected: "status-rejected",
  };

  return (
    <span
      className={`badge ${
        classes[status] || "status-applied"
      }`}
    >
      {status}
    </span>
  );
}