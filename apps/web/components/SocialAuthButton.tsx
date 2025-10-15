"use client";

type Provider = "google" | "apple";

interface Props {
  provider: Provider;
  text: string;
  onClick: () => void;
  className?: string;
}

export default function SocialAuthButton({ provider, text, onClick, className }: Props) {
  const icon = provider === "google" ? "/icons/google.svg" : "/icons/apple.svg";
  const alt = provider === "google" ? "Google" : "Apple";

  return (
    <button
      type="button"
      onClick={onClick}
      dir="rtl"
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "520px",
        height: "56px",
        borderRadius: "9999px",
        backgroundColor: "#ffffff",
        color: "#0e0f12",
        border: "1px solid rgba(0, 0, 0, 0.05)",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingRight: "56px",
        paddingLeft: "20px",
        fontWeight: 700,
        fontSize: "18px",
        lineHeight: 1,
        transition: "box-shadow 0.2s ease",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)";
      }}
      className={className}
    >
      <span style={{ pointerEvents: "none", whiteSpace: "nowrap", textAlign: "center" }}>
        {text}
      </span>
      <img
        src={icon}
        alt={alt}
        style={{
          position: "absolute",
          right: "16px",
          top: "50%",
          transform: "translateY(-50%)",
          width: "24px",
          height: "24px",
        }}
      />
    </button>
  );
}