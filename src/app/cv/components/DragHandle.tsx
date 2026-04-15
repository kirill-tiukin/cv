export default function DragHandle({ index }: { index: number }) {
  return (
    <div
      title="Drag to reorder"
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 4, cursor: "grab",
        userSelect: "none", flexShrink: 0, padding: "0 6px",
        minWidth: 28,
      }}
    >
      <span style={{
        fontSize: 10, fontWeight: 700, color: "var(--text-3)",
        fontFamily: "Syne", lineHeight: 1,
      }}>
        {index + 1}
      </span>
      <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
        {[0, 4, 8].map(y => (
          <g key={y}>
            <circle cx="3" cy={y + 3} r="1.2" fill="var(--text-3)" />
            <circle cx="7" cy={y + 3} r="1.2" fill="var(--text-3)" />
          </g>
        ))}
      </svg>
    </div>
  );
}
