interface ErrorStateProps {
  message: string;
}

export default function ErrorState({ message }: ErrorStateProps) {
  return (
    <p style={{ fontSize: "12px", color: "#EF4444", background: "#FEF2F2", borderRadius: "8px", padding: "8px 12px", margin: "8px 0 0" }}>
      {message}
    </p>
  );
}
